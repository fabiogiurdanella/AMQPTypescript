import { connect, Channel, Connection, Message } from 'amqplib/callback_api';
import { AMQPMessanger } from '../Abstract/AbstractMessanger';

const NUM_RETRIES = 5;

type CallbackFunction = (msg: Message) => void;
export class AMQPConsumer extends AMQPMessanger {

  constructor(queue: string, routingKey: string, callback: CallbackFunction) {
    super(queue, routingKey, callback);
  }

  public async listenToConsumerQueue(): Promise<void> { 
    let retries = 0;
    try {
      await this.startConnection();
    } catch (err) {
      console.error(err);
      if (retries++ >= NUM_RETRIES) {
        throw new Error('Max retries reached');
      }
      
      console.log('Retrying to connect to', this.RABBITMQ_HOSTNAME);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await this.listenToConsumerQueue();
    }
  }

}
