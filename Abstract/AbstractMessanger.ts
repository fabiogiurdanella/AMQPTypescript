// import { Channel, Connection, Message, Options } from 'amqplib/callback_api';
import { Channel, Connection, Message, Options, connect } from 'amqplib'

type CallbackFunction = (msg: Message) => void;

export abstract class AMQPMessanger {
    protected connection: Connection | null = null;
    protected channel: Channel | null = null;

    protected RABBITMQ_USER = process.env.RABBITMQ_USER || '';
    protected RABBITMQ_PASS = process.env.RABBITMQ_PASS || '';
    protected RABBITMQ_HOSTNAME = process.env.RABBITMQ_HOSTNAME || '';
    protected RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
    protected RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || '';

    protected queue: string;
    protected routingKey: string;

    private callback: ((msg: Message) => void);

    constructor(queue: string, routingKey: string, callback: CallbackFunction) {
        try {
            this.__validateEnvVariables();
        } catch (err) {
            throw err;
        }

        this.queue = queue;
        this.routingKey = routingKey;
        this.callback = callback;
    }

    private __validateEnvVariables(): void {
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
    private async __createConnection(): Promise<void> {
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
            })

            console.log('Connected to', this.RABBITMQ_HOSTNAME);
        } catch (err) {
            console.error('Failed to connect:', err);
            throw err;
        }
    }

    private async __createChannel(): Promise<void> {
        if (!this.connection) {
            throw new Error('No connection available.');
        }

        try {
            this.channel = await this.connection.createChannel();
            this.channel.assertExchange(this.RABBITMQ_EXCHANGE, 'direct', { durable: false });

        } catch (err) {
            console.error('Failed to create channel:', err);
            throw err;
        }
    }

    private async __createQueues(): Promise<void> {
        if (!this.channel) {
            throw new Error('No channel available.');
        }

        try {
            this.channel.assertQueue(this.queue, { durable: false });
            this.channel.bindQueue(this.queue, this.RABBITMQ_EXCHANGE, this.routingKey);
            if (this.callback !== null) {
                this.channel.consume(this.queue, this.callback, { noAck: true });
            }
        } catch (err) {
            console.error('Failed to create queue:', err);
            throw err;
        }
    }

    protected async startConnection(): Promise<void> {
        await this.__createConnection();
        await this.__createChannel();
        await this.__createQueues();
        console.log('Queues are open');
        console.log('Connection and channel are open');
    }

    public async closeConnection() {

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                if (this.channel) {
                    await this.channel.close();
                }
        
                if (this.connection) {
                    await this.connection.close();
                }
        
                // Resetto le variabili
                this.channel = null;
                this.connection = null;
            }, 1000);
        });


    }
}