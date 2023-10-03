import { connect, Channel, Connection, Message } from 'amqplib/callback_api';
import { AMQPMessanger } from '../Abstract/AbstractMessanger';

type CallbackFunction = (msg: Message) => void;
export class AMQPConsumer extends AMQPMessanger {

  constructor(queue: string, routingKey: string, callback: CallbackFunction) {
    super(queue, routingKey, callback);
  }
}
