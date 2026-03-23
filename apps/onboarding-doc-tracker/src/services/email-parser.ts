import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { simpleParser } from 'mailparser';
import { config } from '../config';
import { EmployeeSubmission } from '../types';
import { normalizeDocumentBatch } from './document-normalizer';
import { withRetry } from '../utils/resilience';

const s3 = new S3Client({ region: config.aws.region });

/**
 * Reads a raw MIME email from S3 (deposited by SES), parses it,
 * and extracts sender info, recipient, and PDF attachments into an EmployeeSubmission.
 */
export async function parseEmailFromS3(
  bucket: string,
  key: string
): Promise<EmployeeSubmission> {
  const rawEmail = await withRetry(
    async () => {
      const response = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      return response.Body!.transformToString();
    },
    {
      maxAttempts: config.processing.retryMaxAttempts,
      baseDelayMs: config.processing.retryBaseDelayMs,
    }
  );
  const parsed = await simpleParser(rawEmail);

  const sender = parsed.from?.value[0];
  if (!sender) {
    throw new Error(`Could not extract sender from email at s3://${bucket}/${key}`);
  }

  const toField = parsed.to;
  let recipientEmail = '';
  if (toField) {
    const addresses = Array.isArray(toField) ? toField : [toField];
    for (const group of addresses) {
      if (group && 'value' in group) {
        const first = group.value[0];
        if (first?.address) {
          recipientEmail = first.address;
          break;
        }
      }
    }
  }

  const employeeName = extractEmployeeName(sender.name, sender.address);

  const pdfAttachments = (parsed.attachments || []).filter(
    (att) =>
      att.contentType === 'application/pdf' ||
      att.filename?.toLowerCase().endsWith('.pdf')
  );

  if (pdfAttachments.length === 0) {
    throw new Error(
      `No PDF attachments found in email from ${sender.address}`
    );
  }

  const filenames = pdfAttachments.map(
    (att) => att.filename || 'unnamed.pdf'
  );
  const nameMapping = normalizeDocumentBatch(filenames, employeeName);

  return {
    messageId: parsed.messageId || key,
    recipientEmail,
    employeeName,
    employeeEmail: sender.address || '',
    subject: parsed.subject || '',
    receivedAt: (parsed.date || new Date()).toISOString(),
    attachments: pdfAttachments.map((att) => {
      const originalName = att.filename || 'unnamed.pdf';
      return {
        originalName,
        normalizedName: nameMapping.get(originalName) || originalName,
        contentBytes: att.content.toString('base64'),
        contentType: att.contentType,
        size: att.size,
      };
    }),
  };
}

function extractEmployeeName(
  displayName: string | undefined,
  emailAddress: string | undefined
): string {
  if (displayName && displayName.trim().length > 0) {
    return displayName.trim();
  }

  if (!emailAddress) return 'Unknown';

  const localPart = emailAddress.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
