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

export interface EmployeeSubmission {
  messageId: string;
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
  messageId: string;
  employeeName: string;
  employeeEmail: string;
  folderUrl: string;
  documentsUploaded: string[];
  processedAt: string;
}

export interface TrackingRecord {
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
