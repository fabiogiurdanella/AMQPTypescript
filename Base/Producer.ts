import { connect, Channel, Connection, Message, Options } from 'amqplib/callback_api';
import { AMQPMessanger } from '../Abstract/AbstractMessanger';

const NUM_RETRIES = 5;

export class AMQPProducer extends AMQPMessanger {  
    constructor(queue: string, routingKey: string) {
        super(queue, routingKey, null);
    }

    public async publish(method: string, correlationID: string, body: any) {
        let retries = 0;
        try {
            await this.startConnection();
            if (this.channel && this.connection) {
                
                const message: Buffer = Buffer.from(JSON.stringify(body));
                const options: Options.Publish = {
                    contentType: method,
                    correlationId: correlationID,
                };
                
                this.channel.sendToQueue(this.queue, message, options);

                await this.closeConnection();
            }
        } catch (err) {
            console.error(err);
            if (retries++ >= NUM_RETRIES) {
                throw new Error('Max retries reached');
            }
            
            console.log('Retrying to connect to', this.RABBITMQ_HOSTNAME);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await this.publish(method, correlationID, body);
        }
    }

}