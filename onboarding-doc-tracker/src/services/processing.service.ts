import { parseEmailFromS3 } from './email-parser';
import {
  createEmployeeFolder,
  uploadAllDocuments,
  createSharingLink,
} from './onedrive.service';
import { notifyHrOfUpload } from './notification.service';
import {
  isAlreadyProcessed,
  saveProcessingRecord,
  recordFailure,
} from './tracking.service';
import { ProcessingResult, TrackingRecord } from '../types';

export interface ProcessingRunResult {
  success: boolean;
  messageId: string;
  employeeName?: string;
  folderUrl?: string;
  documentsUploaded?: string[];
  error?: string;
}

/**
 * Processes a single email stored in S3 by SES:
 *
 * 1. Parse raw MIME email from S3 → extract sender + PDF attachments
 * 2. Check DynamoDB to skip already-processed emails
 * 3. Create employee folder on OneDrive
 * 4. Upload normalized documents
 * 5. Generate sharing link
 * 6. Notify HR via SES
 * 7. Record in DynamoDB
 */
export async function processEmailFromS3(
  bucket: string,
  key: string
): Promise<ProcessingRunResult> {
  let messageId = key;

  try {
    const submission = await parseEmailFromS3(bucket, key);
    messageId = submission.messageId;

    if (await isAlreadyProcessed(messageId)) {
      return { success: true, messageId, employeeName: submission.employeeName };
    }

    const folder = await createEmployeeFolder(submission.employeeName);
    const uploadedNames = await uploadAllDocuments(
      folder.id,
      submission.attachments
    );
    const sharingLink = await createSharingLink(folder.id);

    const result: ProcessingResult = {
      messageId,
      employeeName: submission.employeeName,
      employeeEmail: submission.employeeEmail,
      folderUrl: sharingLink,
      documentsUploaded: uploadedNames,
      processedAt: new Date().toISOString(),
    };

    await notifyHrOfUpload(result);

    const trackingRecord: TrackingRecord = {
      ...result,
      status: 'processed',
    };
    await saveProcessingRecord(trackingRecord);

    return {
      success: true,
      messageId,
      employeeName: submission.employeeName,
      folderUrl: sharingLink,
      documentsUploaded: uploadedNames,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to process email s3://${bucket}/${key}:`, errorMessage);

    await recordFailure(messageId, '', '', errorMessage);

    return { success: false, messageId, error: errorMessage };
  }
}
