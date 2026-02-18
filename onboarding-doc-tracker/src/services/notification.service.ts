import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';
import { ProcessingResult } from '../types';

const ses = new SESClient({ region: config.aws.region });

/**
 * Sends an HTML email to HR via SES with a link to the employee's
 * OneDrive folder containing their onboarding documents.
 */
export async function notifyHrOfUpload(
  result: ProcessingResult
): Promise<void> {
  const htmlBody = `
    <h2>Onboarding Documents Received</h2>
    <p><strong>Employee:</strong> ${result.employeeName}</p>
    <p><strong>Email:</strong> ${result.employeeEmail}</p>
    <p><strong>Received:</strong> ${new Date(result.processedAt).toLocaleString()}</p>
    <hr />
    <p><strong>Documents uploaded:</strong></p>
    <ul>
      ${result.documentsUploaded.map((name) => `<li>${name}</li>`).join('\n      ')}
    </ul>
    <p>
      <a href="${result.folderUrl}" style="display:inline-block;padding:10px 20px;background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;">
        View Documents on OneDrive
      </a>
    </p>
    <hr />
    <p style="color:#888;font-size:12px;">
      This is an automated notification from the Onboarding Document Tracker.
    </p>
  `.trim();

  await ses.send(
    new SendEmailCommand({
      Source: config.ses.fromEmail,
      Destination: {
        ToAddresses: [config.hr.email],
      },
      Message: {
        Subject: {
          Data: `Onboarding Documents Received — ${result.employeeName}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
    })
  );
}
