import { connect, Channel, Connection, Message, Options } from 'amqplib/callback_api';
import { AMQPMessanger } from '../Abstract/AbstractMessanger';

export class AMQPProducer extends AMQPMessanger {  
    constructor(queue: string, routingKey: string) {
        super(queue, routingKey, null);
    }

    public async publish(method: string, correlationID: string, body: any) {
        try {
            if (!this.connection) {
                throw new Error('Connection not established');
            }

            if (this.channel && this.connection) {
                
                const origin = process.env.BBSENDER_ORIGIN;
                
                const message: Buffer = Buffer.from(JSON.stringify(body));
                const options: Options.Publish = {
                    contentType: origin + "|" + method,
                    correlationId: correlationID,
                };
                
                this.channel.sendToQueue(this.queue, message, options);
                console.log('Message sent to queue', this.queue, 'with correlationID', correlationID);
                await new Promise((resolve) => setTimeout(resolve, 1500)); // Timer di 1.5 secondi per evitare di sovraccaricare il server
            }
        } catch (err) {
            throw err;
        }
    }
}