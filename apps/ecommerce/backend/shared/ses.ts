import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const client = new SESClient({ region: REGION });

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@example.com";

export async function sendEmail(
  to: string[],
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: to },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: htmlBody },
        Text: { Data: textBody },
      },
    },
  });
  await client.send(command);
}
