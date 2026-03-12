import { sendExportReadyEmail, resetClient } from './email.service';

const mockSesSend = jest.fn().mockResolvedValue({ MessageId: 'test-message-id' });
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: mockSesSend,
  })),
  SendEmailCommand: jest.fn().mockImplementation((params) => params),
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetClient();
    process.env.SES_REGION = 'us-east-1';
    process.env.SES_FROM_EMAIL = 'exports@test.com';
  });

  describe('sendExportReadyEmail', () => {
    it('should send an email with correct parameters', async () => {
      await sendExportReadyEmail(
        'user@example.com',
        'https://s3.example.com/download',
        'report.csv',
        1500,
      );

      const { SendEmailCommand } = require('@aws-sdk/client-ses');
      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Source: 'exports@test.com',
          Destination: { ToAddresses: ['user@example.com'] },
          Message: expect.objectContaining({
            Subject: {
              Data: 'Your data export is ready — report.csv',
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: expect.stringContaining('report.csv'),
                Charset: 'UTF-8',
              },
            },
          }),
        }),
      );
      expect(mockSesSend).toHaveBeenCalled();
    });

    it('should include download URL and record count in the email body', async () => {
      await sendExportReadyEmail(
        'user@example.com',
        'https://s3.example.com/download-link',
        'orders.csv',
        42000,
      );

      const { SendEmailCommand } = require('@aws-sdk/client-ses');
      const callArgs = SendEmailCommand.mock.calls[0][0];
      const htmlBody = callArgs.Message.Body.Html.Data;

      expect(htmlBody).toContain('https://s3.example.com/download-link');
      expect(htmlBody).toContain('orders.csv');
      expect(htmlBody).toContain('42,000');
    });
  });
});
