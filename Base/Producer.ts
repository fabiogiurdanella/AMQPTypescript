import { Options } from 'amqplib/callback_api';
import { AMQPMessanger } from '../Abstract/abstractMessanger';

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
                
                const origin = process.env.BB_ORIGIN;
                if (!origin) {
                    throw new Error("Missing Origin of software")
                }

                const message: Buffer = Buffer.from(JSON.stringify(body));
                const options: Options.Publish = {
                    contentType: origin + "|" + method,
                    correlationId: correlationID,
                };

                if (this.channel) {

                }
                
                this.channel.sendToQueue(this.queue, message, options);
                await new Promise((resolve) => setTimeout(resolve, 1500)); // Timer di 1.5 secondi per evitare di sovraccaricare il server
            }
        } catch (err) {
            throw err;
        }
    }
}