import { Readable } from 'stream';
import { uploadStream, getPresignedUrl, deleteObject, resetClient } from './s3.service';

jest.mock('@aws-sdk/lib-storage', () => {
  const mockDone = jest.fn().mockResolvedValue({});
  const mockOn = jest.fn().mockReturnThis();
  return {
    Upload: jest.fn().mockImplementation(() => ({
      done: mockDone,
      on: mockOn,
    })),
    __mockDone: mockDone,
    __mockOn: mockOn,
  };
});

const mockSend = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({
    ...params,
    _type: 'GetObject',
  })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({
    ...params,
    _type: 'DeleteObject',
  })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

describe('S3Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetClient();
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_PRESIGN_EXPIRES = '3600';
    process.env.S3_REGION = 'us-east-1';
  });

  describe('uploadStream', () => {
    it('should upload a stream to S3 and return the key', async () => {
      const body = Readable.from(['test data']);
      const result = await uploadStream('test/key.csv', body);

      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test/key.csv',
            ContentType: 'text/csv',
          }),
        }),
      );

      const { __mockDone } = require('@aws-sdk/lib-storage');
      expect(__mockDone).toHaveBeenCalled();
      expect(result).toBe('test/key.csv');
    });

    it('should use custom content type when provided', async () => {
      const body = Readable.from(['test']);
      await uploadStream('test/key.json', body, 'application/json');

      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            ContentType: 'application/json',
          }),
        }),
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should return a presigned URL for the given key', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const url = await getPresignedUrl('exports/file.csv');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'exports/file.csv',
        }),
        { expiresIn: 3600 },
      );
      expect(url).toBe('https://s3.example.com/signed-url');
    });
  });

  describe('deleteObject', () => {
    it('should delete an object from S3', async () => {
      await deleteObject('exports/old-file.csv');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'exports/old-file.csv',
        }),
      );
    });
  });
});
