import { AMQPMessanger } from '../Abstract/abstractMessanger';
import { CallbackFunction } from './payload';

export class AMQPConsumer extends AMQPMessanger {

  constructor(queue: string, routingKey: string, callback: CallbackFunction) {
    super(queue, routingKey, callback);
  }
}