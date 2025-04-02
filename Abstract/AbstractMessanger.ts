import { Channel, ChannelModel, Options, connect } from 'amqplib'
import { CallbackFunction } from '../Base/payload';
import { LoggerHandler } from '../Utility/LoggerHandler';

const NUM_RETRIES = 5;

export abstract class AMQPMessanger {
    protected connection: ChannelModel | null = null;
    protected channel: Channel | null = null;
    
    protected RABBITMQ_USER = process.env.RABBITMQ_USER || '';
    protected RABBITMQ_PASS = process.env.RABBITMQ_PASS || '';
    protected RABBITMQ_HOSTNAME = process.env.RABBITMQ_HOSTNAME || '';
    protected RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
    protected RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || '';

    protected queue: string;
    protected routingKey: string;

    protected retries: number = 0;

    private callback: CallbackFunction | null;

    constructor(queue: string, routingKey: string, callback: CallbackFunction | null) {
        try {
            this.validateEnvVariables();
        } catch (err) {
            throw err;
        }

        this.queue = queue;
        this.routingKey = `${routingKey}_rk`;
        this.callback = callback;
    }

    private validateEnvVariables(): void {
        const requiredVariables = [
            'RABBITMQ_USER',
            'RABBITMQ_PASS',
            'RABBITMQ_HOSTNAME',
            'RABBITMQ_PORT',
            'RABBITMQ_EXCHANGE',
        ];

        for (const variable of requiredVariables) {
            if (!process.env[variable]) {
                throw new Error(`Environment variable ${variable} is not defined.`);
            }
        }
    }

    /**
     * This function creates a connection to a RabbitMQ server using the provided credentials and
     * connection options.
     */
    private async createConnection(): Promise<void> {
        // const connectionString = `amqp://${this.RABBITMQ_USER}:${this.RABBITMQ_PASS}@${this.RABBITMQ_HOSTNAME}:${this.RABBITMQ_PORT}`;
        if (this.connection) {
            return;
        }

        const connectionOptions: Options.Connect = {
            protocol: 'amqp',
            hostname: this.RABBITMQ_HOSTNAME,
            port: parseInt(this.RABBITMQ_PORT),
            username: this.RABBITMQ_USER,
            password: this.RABBITMQ_PASS,
        };
        
        try {
            this.connection = await connect(connectionOptions, {
                timeout: 20000,
                heartbeat: 60,
            });

            this.connection.on('close', async () => {
                LoggerHandler.warn("Connection closed. Attempting to reconnect...");
                await this.closeConnection();
                await this.startMessanger();
            });

            this.connection.on('error', async () => {
                LoggerHandler.warn("Connection closed. Attempting to reconnect...");
                await this.closeConnection();
                await this.startMessanger();
            });

        } catch (err) {
            console.error('Failed to connect:', err);
            throw err;
        }
    }

    private async createChannel(): Promise<void> {
        if (!this.connection) {
            throw new Error('No connection available.');
        }

        try {
            this.channel = await this.connection.createChannel();
            
            this.channel.on('close', async () => {
                LoggerHandler.warn("Channel closed. Attempting to reconnect...");
                await this.closeConnection();
                await this.startMessanger();
            });

            await this.channel.assertExchange(this.RABBITMQ_EXCHANGE, 'direct', { durable: false });

        } catch (err) {
            console.error('Failed to create channel:', err);
            throw err;
        }
    }

    private async createQueues(): Promise<void> {
        if (!this.channel) {
            throw new Error('No channel available.');
        }

        
        try {
            await this.channel.assertQueue(this.queue, { durable: false });
            await this.channel.bindQueue(this.queue, this.RABBITMQ_EXCHANGE, this.routingKey);
            if (this.callback !== null) {
                this.channel.consume(this.queue, this.callback, { noAck: true });
            }

        } catch (err) {
            console.error('Failed to create queue:', err);
            throw err;
        }
    }

    private async startConnection(): Promise<void> {
        await this.createConnection();
        await this.createChannel();
        await this.createQueues();
    }

    public async startMessanger(): Promise<void> {
        try {
            await this.startConnection();
        } catch (err) {
            LoggerHandler.log(`Retries: ${this.retries}`)
            if (this.retries++ >= NUM_RETRIES) {
                throw new Error('Max retries reached');
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
            // await this.__startConnection();
            await this.startMessanger();
        }
    }

    public async closeConnection() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
    
            if (this.connection) {
                await this.connection.close();
            }
    
            // Resetto le variabili
            this.channel = null;
            this.connection = null;
        } catch (err) {
            throw err;
        }
    }
}