import { OrderPlacedEvent, OrderEventPublisher } from "./types";
import { publishToTopic } from "./sns";

export class SnsOrderEventPublisher implements OrderEventPublisher {
  constructor(private topicArn: string) {}

  async publishOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await publishToTopic(this.topicArn, event, "OrderPlaced");
  }
}

export class LocalOrderEventPublisher implements OrderEventPublisher {
  async publishOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    console.log("[local] OrderPlaced event:", JSON.stringify(event, null, 2));
  }
}
