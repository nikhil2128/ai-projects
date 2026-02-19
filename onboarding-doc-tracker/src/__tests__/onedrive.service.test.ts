import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tenant } from '../types';

vi.mock('../config', () => ({
  config: {
    processing: { uploadConcurrency: 3 },
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

const testTenant: Tenant = {
  tenantId: 'tenant-001',
  companyName: 'Test Corp',
  receivingEmail: 'onboarding@testcorp.com',
  hrEmail: 'hr@testcorp.com',
  hrUserId: 'test-user-id',
  azureTenantId: 'azure-tenant-id',
  azureClientId: 'azure-client-id',
  azureClientSecret: 'azure-client-secret',
  oneDriveRootFolder: 'Onboarding Documents',
  sesFromEmail: 'noreply@testcorp.com',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('onedrive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmployeeFolder', () => {
    it('creates root folder and employee subfolder when neither exist', async () => {
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'root-folder-id',
        name: 'Onboarding Documents',
      });
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'employee-folder-id',
        name: 'John Doe',
      });

      const folder = await createEmployeeFolder('John Doe', testTenant);

      expect(folder.id).toBe('employee-folder-id');
      expect(folder.name).toBe('John Doe');
      expect(mockGraphFetch).toHaveBeenCalledTimes(4);

      // Verify credentials are passed through
      const firstCallCredentials = mockGraphFetch.mock.calls[0][2];
      expect(firstCallCredentials.tenantId).toBe('azure-tenant-id');
      expect(firstCallCredentials.clientId).toBe('azure-client-id');
    });

    it('uses tenant-specific drive path', async () => {
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'root-id',
        name: 'Onboarding Documents',
      });
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'emp-id',
        name: 'Alice',
      });

      await createEmployeeFolder('Alice', testTenant);

      const firstCallPath = mockGraphFetch.mock.calls[0][0];
      expect(firstCallPath).toContain('/users/test-user-id/drive');
    });

    it('reuses existing root folder if found', async () => {
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'existing-root-id', name: 'Onboarding Documents', folder: { childCount: 5 } },
        ],
      });
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-emp-id',
        name: 'Jane Smith',
      });

      const folder = await createEmployeeFolder('Jane Smith', testTenant);

      expect(folder.id).toBe('new-emp-id');
      expect(mockGraphFetch).toHaveBeenCalledTimes(3);
    });

    it('reuses existing employee folder if found', async () => {
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'root-id', name: 'Onboarding Documents', folder: { childCount: 3 } },
        ],
      });
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'existing-emp-id', name: 'Alice', folder: { childCount: 2 } },
        ],
      });

      const folder = await createEmployeeFolder('Alice', testTenant);

      expect(folder.id).toBe('existing-emp-id');
      expect(mockGraphFetch).toHaveBeenCalledTimes(2);
    });

    it('handles findChildFolder error gracefully and creates new folder', async () => {
      mockGraphFetch.mockRejectedValueOnce(new Error('Graph API error'));
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-root-id',
        name: 'Onboarding Documents',
      });
      mockGraphFetch.mockRejectedValueOnce(new Error('Network error'));
      mockGraphFetch.mockResolvedValueOnce({
        id: 'new-emp-id',
        name: 'Bob',
      });

      const folder = await createEmployeeFolder('Bob', testTenant);
      expect(folder.id).toBe('new-emp-id');
    });

    it('ignores non-folder items in findChildFolder results', async () => {
      mockGraphFetch.mockResolvedValueOnce({
        value: [
          { id: 'file-id', name: 'Onboarding Documents' },
        ],
      });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'root-id',
        name: 'Onboarding Documents',
      });
      mockGraphFetch.mockResolvedValueOnce({ value: [] });
      mockGraphFetch.mockResolvedValueOnce({
        id: 'emp-id',
        name: 'Test',
      });

      const folder = await createEmployeeFolder('Test', testTenant);
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

      const result = await uploadDocument('folder-123', attachment, testTenant);

      expect(result.id).toBe('uploaded-file-id');
      expect(mockGraphUpload).toHaveBeenCalledOnce();

      const uploadPath = mockGraphUpload.mock.calls[0][0];
      expect(uploadPath).toContain('folder-123');
      expect(uploadPath).toContain('john_doe_passport.pdf');
      expect(uploadPath).toContain('/users/test-user-id/drive');

      // Verify credentials passed through
      const credentials = mockGraphUpload.mock.calls[0][2];
      expect(credentials.tenantId).toBe('azure-tenant-id');
    });
  });

  describe('uploadAllDocuments', () => {
    it('uploads all attachments and returns upload result', async () => {
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

      const result = await uploadAllDocuments('folder-id', attachments, testTenant);

      expect(result.uploaded).toEqual([
        'john_doe_passport.pdf',
        'john_doe_driving_license.pdf',
      ]);
      expect(result.failed).toEqual([]);
      expect(mockGraphUpload).toHaveBeenCalledTimes(2);
    });

    it('returns empty arrays for no attachments', async () => {
      const result = await uploadAllDocuments('folder-id', [], testTenant);
      expect(result.uploaded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(mockGraphUpload).not.toHaveBeenCalled();
    });

    it('handles partial upload failures', async () => {
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
          normalizedName: 'john_doe_dl.pdf',
          contentBytes: Buffer.from('pdf2').toString('base64'),
          contentType: 'application/pdf',
          size: 200,
        },
      ];

      mockGraphUpload
        .mockResolvedValueOnce({ id: 'f1' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const result = await uploadAllDocuments('folder-id', attachments, testTenant);

      expect(result.uploaded).toEqual(['john_doe_passport.pdf']);
      expect(result.failed).toEqual([{ name: 'john_doe_dl.pdf', error: 'Upload failed' }]);
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

      const url = await createSharingLink('folder-id', testTenant);

      expect(url).toBe('https://sharepoint.com/share/abc123');

      const callArgs = mockGraphFetch.mock.calls[0];
      expect(callArgs[0]).toContain('folder-id');
      expect(callArgs[0]).toContain('createLink');
      expect(callArgs[0]).toContain('/users/test-user-id/drive');
      const body = JSON.parse(callArgs[1].body);
      expect(body.type).toBe('view');
      expect(body.scope).toBe('organization');
    });
  });
});
