import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendQuestionnaireEmails(
  emails: string[],
  questionnaireTitle: string,
  questionnaireUrl: string,
  fromName: string = "Training Team"
): Promise<{ sent: string[]; failed: string[] }> {
  const transporter = createTransporter();
  const fromEmail = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"] ?? "training@company.com";

  if (!transporter) {
    console.warn(
      "SMTP not configured — logging emails to console instead. " +
      "Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable email."
    );
    emails.forEach((email) => {
      console.log(`[EMAIL PREVIEW] To: ${email} | Subject: Training Assessment: ${questionnaireTitle} | Link: ${questionnaireUrl}`);
    });
    return { sent: emails, failed: [] };
  }

  const sent: string[] = [];
  const failed: string[] = [];

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Training Assessment: ${questionnaireTitle}`,
        html: buildEmailHTML(questionnaireTitle, questionnaireUrl),
      });
      sent.push(email);
    } catch (err) {
      console.error(`Failed to send to ${email}:`, err);
      failed.push(email);
    }
  }

  return { sent, failed };
}

function buildEmailHTML(title: string, url: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;text-align:center;">
      <div style="width:56px;height:56px;margin:0 auto 24px;background:linear-gradient(135deg,#3b82f6,#7c3aed);border-radius:14px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">📋</span>
      </div>
      <h1 style="color:#e2e8f0;font-size:24px;margin:0 0 8px;">Training Assessment</h1>
      <p style="color:#94a3b8;font-size:16px;margin:0 0 32px;line-height:1.5;">
        You have been assigned a knowledge assessment for:<br>
        <strong style="color:#c4b5fd;">${title}</strong>
      </p>
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;">
        Start Assessment
      </a>
      <p style="color:#64748b;font-size:13px;margin:24px 0 0;line-height:1.5;">
        Please enter your email address in the questionnaire so your responses can be recorded.
      </p>
    </div>
    <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">
      This is an automated message from the Training Content Generator.
    </p>
  </div>
</body>
</html>`;
}
