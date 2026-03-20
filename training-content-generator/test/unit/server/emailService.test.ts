const { createTransportMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { sendQuestionnaireEmails } from "../../../server/services/emailService";

describe("emailService", () => {
  const originalEnv = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  beforeEach(() => {
    createTransportMock.mockReset();
    sendMailMock.mockReset();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  });

  it("falls back to console previews when SMTP is not configured", async () => {
    const result = await sendQuestionnaireEmails(
      ["alex@example.com", "jamie@example.com"],
      "Assessment",
      "http://localhost/questionnaire/q1"
    );

    expect(result).toEqual({
      sent: ["alex@example.com", "jamie@example.com"],
      failed: [],
    });
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(2);
  });

  it("sends configured emails and collects failures", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "mailer@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = "training@example.com";

    sendMailMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Mailbox unavailable"));
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    const result = await sendQuestionnaireEmails(
      ["alex@example.com", "jamie@example.com"],
      "Assessment",
      "http://localhost/questionnaire/q1",
      "Enablement Team"
    );

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "mailer@example.com",
        pass: "secret",
      },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      from: '"Enablement Team" <training@example.com>',
      to: "alex@example.com",
      subject: "Training Assessment: Assessment",
    });
    expect(result).toEqual({
      sent: ["alex@example.com"],
      failed: ["jamie@example.com"],
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to send to jamie@example.com:",
      expect.any(Error)
    );
  });
});
