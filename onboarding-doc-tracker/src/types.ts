export interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount: number };
}

export interface GraphSharingLink {
  id: string;
  link: {
    webUrl: string;
    type: string;
    scope: string;
  };
}

export interface S3EventRecord {
  s3: {
    bucket: { name: string };
    object: { key: string };
  };
}

export interface S3Event {
  Records: S3EventRecord[];
}

export interface SQSRecord {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: {
    ApproximateReceiveCount: string;
    SentTimestamp: string;
    SenderId: string;
    ApproximateFirstReceiveTimestamp: string;
  };
  messageAttributes: Record<string, unknown>;
  md5OfBody: string;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}

export interface SQSEvent {
  Records: SQSRecord[];
}

export interface SQSBatchResponse {
  batchItemFailures: Array<{ itemIdentifier: string }>;
}

// ── Multi-tenant ──

/**
 * What is stored in DynamoDB. The Azure client secret is NOT stored here —
 * it lives in AWS Secrets Manager and is referenced by `azureClientSecretArn`.
 */
export interface Tenant {
  tenantId: string;
  companyName: string;
  receivingEmail: string;
  hrEmail: string;
  hrUserId: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecretArn: string;
  oneDriveRootFolder: string;
  sesFromEmail: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * API input when creating/updating a tenant. The caller supplies the actual
 * `azureClientSecret` value; the service stores it in Secrets Manager.
 */
export interface CreateTenantInput {
  companyName: string;
  receivingEmail: string;
  hrEmail: string;
  hrUserId: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  oneDriveRootFolder: string;
  sesFromEmail: string;
}

export interface UpdateTenantInput {
  companyName?: string;
  receivingEmail?: string;
  hrEmail?: string;
  hrUserId?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  oneDriveRootFolder?: string;
  sesFromEmail?: string;
}

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

// ── Domain types ──

export interface EmployeeSubmission {
  messageId: string;
  recipientEmail: string;
  employeeName: string;
  employeeEmail: string;
  subject: string;
  receivedAt: string;
  attachments: DocumentAttachment[];
}

export interface DocumentAttachment {
  originalName: string;
  normalizedName: string;
  contentBytes: string; // base64-encoded
  contentType: string;
  size: number;
}

export interface ProcessingResult {
  tenantId: string;
  messageId: string;
  employeeName: string;
  employeeEmail: string;
  folderUrl: string;
  documentsUploaded: string[];
  processedAt: string;
}

export interface TrackingRecord {
  tenantId: string;
  messageId: string;
  employeeName: string;
  employeeEmail: string;
  folderUrl: string;
  documentsUploaded: string[];
  processedAt: string;
  status: 'processed' | 'failed';
  error?: string;
}

export type DocumentType =
  | 'passport'
  | 'driving_license'
  | 'identity_document'
  | 'birth_certificate'
  | 'address_proof'
  | 'pan_card'
  | 'voter_id'
  | 'aadhaar'
  | 'social_security'
  | 'visa'
  | 'work_permit'
  | 'document';

// ── Audit ──

export interface AuditEntry {
  timestamp: string;
  action: string;
  tenantId?: string;
  actor: string;
  details?: Record<string, unknown>;
}
