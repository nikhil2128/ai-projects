import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    hr: { userId: 'test-user-id', email: 'hr@test.com' },
    onedrive: { rootFolder: 'Onboarding Documents' },
  },
}));

const mockGraphFetch = vi.hoisted(() => vi.fn());
const mockGraphUpload = vi.hoisted(() => vi.fn());
vi.mock('../services/graph-client', () => ({
  graphFetch: mockGraphFetch,
  graphUpload: mockGraphUpload,
}));

import {
  createEmployeeFolder,
  uploadDocument,
  uploadAllDocuments,
  createSharingLink,
} from '../services/onedrive.service';
import { DocumentAttachment } from '../types';

describe('onedrive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmployeeFolder', () => {
    it('creates root folder and employee subfolder when neither exist', async () => {
      // findChildFolder for root → no existing folder
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      // create root folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'root-folder-id',
        name: 'Onboarding Documents',
      });
      // findChildFolder for employee → no existing
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      // create employee folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'employee-folder-id',
        name: 'John Doe',
      });

      const folder = await createEmployeeFolder('John Doe');

      expect(folder.id).toBe('employee-folder-id');
      expect(folder.name).toBe('John Doe');
      expect(mockGraphFetch).toHaveBeenCalledTimes(4);
    });

    it('reuses existing root folder if found', async () => {
      // findChildFolder for root → found
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'existing-root-id', name: 'Onboarding Documents', folder: { childCount: 5 } },
        ],
      });
      // findChildFolder for employee → no existing
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      // create employee folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-emp-id',
        name: 'Jane Smith',
      });

      const folder = await createEmployeeFolder('Jane Smith');

      expect(folder.id).toBe('new-emp-id');
      // Only 3 calls: find root (hit), find employee (miss), create employee
      expect(mockGraphFetch).toHaveBeenCalledTimes(3);
    });

    it('reuses existing employee folder if found', async () => {
      // find root → found
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'root-id', name: 'Onboarding Documents', folder: { childCount: 3 } },
        ],
      });
      // find employee → found
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'existing-emp-id', name: 'Alice', folder: { childCount: 2 } },
        ],
      });

      const folder = await createEmployeeFolder('Alice');

      expect(folder.id).toBe('existing-emp-id');
      expect(mockGraphFetch).toHaveBeenCalledTimes(2);
    });

    it('handles findChildFolder error gracefully and creates new folder', async () => {
      // findChildFolder throws → treated as not found
      mockGraphFetch.mockRejectedValueOnce(new Error('Graph API error'));
      // create root folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-root-id',
        name: 'Onboarding Documents',
      });
      // findChildFolder for employee → error
      mockGraphFetch.mockRejectedValueOnce(new Error('Network error'));
      // create employee folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-emp-id',
        name: 'Bob',
      });

      const folder = await createEmployeeFolder('Bob');
      expect(folder.id).toBe('new-emp-id');
    });

    it('ignores non-folder items in findChildFolder results', async () => {
      // findChildFolder returns items without folder property (files, not folders)
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'file-id', name: 'Onboarding Documents' }, // no folder property
        ],
      });
      // create root folder since no folder matched
      mockGraphFetch.mockResolvedValueOnce({
        id: 'root-id',
        name: 'Onboarding Documents',
      });
      // findChildFolder for employee
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      // create employee folder
      mockGraphFetch.mockResolvedValueOnce({
        id: 'emp-id',
        name: 'Test',
      });

      const folder = await createEmployeeFolder('Test');
      expect(folder.id).toBe('emp-id');
    });
  });

  describe('uploadDocument', () => {
    it('uploads a single document to the specified folder', async () => {
      const attachment: DocumentAttachment = {
        originalName: 'passport.pdf',
        normalizedName: 'john_doe_passport.pdf',
        contentBytes: Buffer.from('pdf-content').toString('base64'),
        contentType: 'application/pdf',
        size: 1024,
      };

      mockGraphUpload.mockResolvedValue({
        id: 'uploaded-file-id',
        name: 'john_doe_passport.pdf',
      });

      const result = await uploadDocument('folder-123', attachment);

      expect(result.id).toBe('uploaded-file-id');
      expect(mockGraphUpload).toHaveBeenCalledOnce();

      const uploadPath = mockGraphUpload.mock.calls[0][0];
      expect(uploadPath).toContain('folder-123');
      expect(uploadPath).toContain('john_doe_passport.pdf');
    });
  });

  describe('uploadAllDocuments', () => {
    it('uploads all attachments and returns their names', async () => {
      const attachments: DocumentAttachment[] = [
        {
          originalName: 'passport.pdf',
          normalizedName: 'john_doe_passport.pdf',
          contentBytes: Buffer.from('pdf1').toString('base64'),
          contentType: 'application/pdf',
          size: 100,
        },
        {
          originalName: 'dl.pdf',
          normalizedName: 'john_doe_driving_license.pdf',
          contentBytes: Buffer.from('pdf2').toString('base64'),
          contentType: 'application/pdf',
          size: 200,
        },
      ];

      mockGraphUpload
        .mockResolvedValueOnce({ id: 'f1', name: 'john_doe_passport.pdf' })
        .mockResolvedValueOnce({ id: 'f2', name: 'john_doe_driving_license.pdf' });

      const names = await uploadAllDocuments('folder-id', attachments);

      expect(names).toEqual([
        'john_doe_passport.pdf',
        'john_doe_driving_license.pdf',
      ]);
      expect(mockGraphUpload).toHaveBeenCalledTimes(2);
    });

    it('returns empty array for no attachments', async () => {
      const names = await uploadAllDocuments('folder-id', []);
      expect(names).toEqual([]);
      expect(mockGraphUpload).not.toHaveBeenCalled();
    });
  });

  describe('createSharingLink', () => {
    it('creates an organization-scoped view link and returns the URL', async () => {
      mockGraphFetch.mockResolvedValue({
        id: 'link-id',
        link: {
          webUrl: 'https://sharepoint.com/share/abc123',
          type: 'view',
          scope: 'organization',
        },
      });

      const url = await createSharingLink('folder-id');

      expect(url).toBe('https://sharepoint.com/share/abc123');

      const callArgs = mockGraphFetch.mock.calls[0];
      expect(callArgs[0]).toContain('folder-id');
      expect(callArgs[0]).toContain('createLink');
      const body = JSON.parse(callArgs[1].body);
      expect(body.type).toBe('view');
      expect(body.scope).toBe('organization');
    });
  });
});
