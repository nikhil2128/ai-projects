import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { Readable } from 'stream';

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

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'GetObject' })),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'DeleteObject' })),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

describe('S3Service', () => {
  let service: S3Service;

  const mockConfig: Record<string, unknown> = {
    's3.endpoint': 'http://localhost:9000',
    's3.bucket': 'test-bucket',
    's3.presignExpiresSeconds': 3600,
    's3.region': 'us-east-1',
    's3.accessKey': 'testkey',
    's3.secretKey': 'testsecret',
    's3.forcePathStyle': true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) =>
              mockConfig[key] !== undefined ? mockConfig[key] : defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should configure S3 client with values from config', () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          region: 'us-east-1',
          forcePathStyle: true,
        }),
      );
    });
  });

  describe('uploadStream', () => {
    it('should upload a stream to S3 and return the key', async () => {
      const body = Readable.from(['test data']);
      const result = await service.uploadStream('test/key.csv', body);

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
      await service.uploadStream('test/key.json', body, 'application/json');

      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            ContentType: 'application/json',
          }),
        }),
      );
    });

    it('should register httpUploadProgress listener', async () => {
      const body = Readable.from(['test']);
      await service.uploadStream('test/key.csv', body);

      const { __mockOn } = require('@aws-sdk/lib-storage');
      expect(__mockOn).toHaveBeenCalledWith('httpUploadProgress', expect.any(Function));
    });
  });

  describe('getPresignedUrl', () => {
    it('should return a presigned URL for the given key', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const url = await service.getPresignedUrl('exports/file.csv');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'exports/file.csv' }),
        { expiresIn: 3600 },
      );
      expect(url).toBe('https://s3.example.com/signed-url');
    });
  });

  describe('deleteObject', () => {
    it('should delete an object from S3', async () => {
      await service.deleteObject('exports/old-file.csv');

      const { __mockSend } = require('@aws-sdk/client-s3');
      expect(__mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'exports/old-file.csv',
        }),
      );
    });
  });
});
