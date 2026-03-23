import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';
import { ProcessingResult, Tenant } from '../types';
import { withRetry } from '../utils/resilience';
import { escapeHtml } from '../utils/sanitize';

const ses = new SESClient({ region: config.aws.region });

/**
 * Sends an HTML email to HR via SES with a link to the employee's
 * OneDrive folder containing their onboarding documents.
 * All user-supplied values are HTML-escaped to prevent injection.
 */
export async function notifyHrOfUpload(
  result: ProcessingResult,
  tenant: Tenant,
): Promise<void> {
  const name = escapeHtml(result.employeeName);
  const email = escapeHtml(result.employeeEmail);
  const company = escapeHtml(tenant.companyName);
  const date = escapeHtml(new Date(result.processedAt).toLocaleString());
  const folderUrl = encodeURI(result.folderUrl);

  const docList = result.documentsUploaded
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('\n      ');

  const htmlBody = `
    <h2>Onboarding Documents Received</h2>
    <p><strong>Employee:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Company:</strong> ${company}</p>
    <p><strong>Received:</strong> ${date}</p>
    <hr />
    <p><strong>Documents uploaded:</strong></p>
    <ul>
      ${docList}
    </ul>
    <p>
      <a href="${folderUrl}" style="display:inline-block;padding:10px 20px;background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;">
        View Documents on OneDrive
      </a>
    </p>
    <hr />
    <p style="color:#888;font-size:12px;">
      This is an automated notification from the Onboarding Document Tracker.
    </p>
  `.trim();

  const subject = `Onboarding Documents Received — ${name}`;

  await withRetry(
    () =>
      ses.send(
        new SendEmailCommand({
          Source: tenant.sesFromEmail,
          Destination: {
            ToAddresses: [tenant.hrEmail],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
            },
          },
        }),
      ),
    {
      maxAttempts: config.processing.retryMaxAttempts,
      baseDelayMs: config.processing.retryBaseDelayMs,
      isRetryable: (error) => {
        if (error && typeof error === 'object' && 'name' in error) {
          const name = (error as { name: string }).name;
          return name === 'Throttling' || name === 'ServiceUnavailableException';
        }
        return false;
      },
    },
  );
}
