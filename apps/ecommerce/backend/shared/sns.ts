import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const client = new SNSClient({ region: REGION });

export async function publishToTopic<T>(
  topicArn: string,
  message: T,
  eventType: string
): Promise<void> {
  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: {
      eventType: {
        DataType: "String",
        StringValue: eventType,
      },
    },
  });
  await client.send(command);
}
