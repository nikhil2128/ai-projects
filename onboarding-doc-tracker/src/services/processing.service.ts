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
import { getTenantByReceivingEmail } from './tenant.service';
import { ProcessingResult, Tenant, TrackingRecord } from '../types';

export interface ProcessingRunResult {
  success: boolean;
  messageId: string;
  tenantId?: string;
  employeeName?: string;
  employeeEmail?: string;
  folderUrl?: string;
  documentsUploaded?: string[];
  documentsFailed?: Array<{ name: string; error: string }>;
  warnings?: string[];
  error?: string;
  failedAtStep?: string;
}

/**
 * Processes a single email stored in S3 by SES:
 *
 * 1. Parse raw MIME email from S3 -> extract sender + recipient + PDF attachments
 * 2. Resolve tenant from recipient email address
 * 3. Check DynamoDB to skip already-processed emails
 * 4. Create employee folder on OneDrive (using tenant's Azure credentials)
 * 5. Upload normalized documents (concurrently, with partial success)
 * 6. Generate sharing link
 * 7. Notify HR via SES (non-critical — failure here doesn't fail the pipeline)
 * 8. Record in DynamoDB
 */
export async function processEmailFromS3(
  bucket: string,
  key: string
): Promise<ProcessingRunResult> {
  let messageId = key;
  let employeeName = '';
  let employeeEmail = '';
  let tenant: Tenant | null = null;
  const warnings: string[] = [];

  try {
    const submission = await parseEmailFromS3(bucket, key);
    messageId = submission.messageId;
    employeeName = submission.employeeName;
    employeeEmail = submission.employeeEmail;

    tenant = await getTenantByReceivingEmail(submission.recipientEmail);
    if (!tenant) {
      throw new StepError(
        'tenant-resolution',
        `No tenant registered for receiving email "${submission.recipientEmail}"`
      );
    }

    if (tenant.status !== 'active') {
      throw new StepError(
        'tenant-resolution',
        `Tenant "${tenant.companyName}" is inactive`
      );
    }

    if (await isAlreadyProcessed(messageId)) {
      return {
        success: true,
        messageId,
        tenantId: tenant.tenantId,
        employeeName,
        warnings: ['Already processed — skipped'],
      };
    }

    const folder = await createEmployeeFolder(employeeName, tenant);

    const { uploaded, failed: uploadFailures } = await uploadAllDocuments(
      folder.id,
      submission.attachments,
      tenant
    );

    if (uploaded.length === 0) {
      const failureDetails = uploadFailures
        .map((f) => `${f.name}: ${f.error}`)
        .join('; ');
      throw new StepError(
        'upload',
        `All ${uploadFailures.length} document(s) failed to upload: ${failureDetails}`
      );
    }

    if (uploadFailures.length > 0) {
      for (const f of uploadFailures) {
        warnings.push(`Upload failed for ${f.name}: ${f.error}`);
      }
    }

    let sharingLink: string;
    try {
      sharingLink = await createSharingLink(folder.id, tenant);
    } catch (error) {
      sharingLink = folder.webUrl || '';
      warnings.push(
        `Sharing link creation failed, using folder URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const result: ProcessingResult = {
      tenantId: tenant.tenantId,
      messageId,
      employeeName,
      employeeEmail,
      folderUrl: sharingLink,
      documentsUploaded: uploaded,
      processedAt: new Date().toISOString(),
    };

    try {
      await notifyHrOfUpload(result, tenant);
    } catch (error) {
      warnings.push(
        `HR notification failed (documents are uploaded): ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const trackingRecord: TrackingRecord = {
      ...result,
      status: 'processed',
      ...(warnings.length > 0 && { error: warnings.join(' | ') }),
    };
    await saveProcessingRecord(trackingRecord);

    return {
      success: true,
      messageId,
      tenantId: tenant.tenantId,
      employeeName,
      folderUrl: sharingLink,
      documentsUploaded: uploaded,
      ...(uploadFailures.length > 0 && { documentsFailed: uploadFailures }),
      ...(warnings.length > 0 && { warnings }),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const failedAtStep =
      error instanceof StepError ? error.step : 'unknown';

    console.error(
      `Failed to process email s3://${bucket}/${key} at step "${failedAtStep}":`,
      errorMessage
    );

    await recordFailure(
      tenant?.tenantId || 'unknown',
      messageId,
      employeeName,
      employeeEmail,
      errorMessage
    );

    return {
      success: false,
      messageId,
      tenantId: tenant?.tenantId,
      employeeName: employeeName || undefined,
      employeeEmail: employeeEmail || undefined,
      error: errorMessage,
      failedAtStep,
    };
  }
}

class StepError extends Error {
  constructor(
    public readonly step: string,
    message: string
  ) {
    super(message);
    this.name = 'StepError';
  }
}
