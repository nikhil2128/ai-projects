import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getConfig } from '../config';

let sesClient: SESClient | null = null;

function getClient(): SESClient {
  if (!sesClient) {
    const cfg = getConfig();
    sesClient = new SESClient({ region: cfg.ses.region });
  }
  return sesClient;
}

export function resetClient(): void {
  sesClient = null;
}

export async function sendExportReadyEmail(
  to: string,
  downloadUrl: string,
  fileName: string,
  totalRecords: number,
): Promise<void> {
  const cfg = getConfig();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your Data Export is Ready</h2>
      <p>Your export has been completed successfully.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">File</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${fileName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">Total Records</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${totalRecords.toLocaleString()}</td>
        </tr>
      </table>
      <p>
        <a href="${downloadUrl}"
           style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Download CSV
        </a>
      </p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
        This download link will expire in 7 days. If you need a new link, please create a new export.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated message from the Data Export Service.
      </p>
    </div>
  `.trim();

  await getClient().send(
    new SendEmailCommand({
      Source: cfg.ses.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: {
          Data: `Your data export is ready — ${fileName}`,
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
  );
}
