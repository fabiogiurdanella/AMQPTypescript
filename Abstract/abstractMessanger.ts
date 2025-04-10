import { Channel, Connection, Options, connect } from 'amqplib'
import { CallbackFunction } from '../Base/payload';
import { LoggerHandler } from '../../loggerHander';

const NUM_RETRIES = 5;

export abstract class AMQPMessanger {
      /**
     * Variabile statica che indica se siamo già nel mezzo di una procedura di riconnessione,
     * per evitare che più istanze tentino di riconnettersi in parallelo.
     */
    private static isReconnecting = false;

    /**
     * Connessione statica condivisa da tutte le sottoclassi che estendono AMQPMessanger.
     */
    private static sharedConnection: Connection | null = null;

    /**
     * Ogni istanza avrà il proprio canale, ma la connessione è una sola.
     */
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
    // Tarek è passato di qua, ciao Tarek quanto ti senti Tarek? Ciao Tarek, si mi hai scoperto, mi sento molto Tarek grazie, e tu come stai? Molto bene Tarek, mi sento proprio Tarek oggi.

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
        * Ritorna la connessione condivisa, creandola se non esiste già.
        * Aggancia gli eventi 'close' ed 'error' per la riconnessione.
    */
    private async getConnection(): Promise<Connection> {
        // Se la connessione statica esiste già, la riutilizzo
        if (AMQPMessanger.sharedConnection) {
            return AMQPMessanger.sharedConnection;
        }
    
        const connectionOptions: Options.Connect = {
            protocol: 'amqp',
            hostname: this.RABBITMQ_HOSTNAME,
            port: parseInt(this.RABBITMQ_PORT),
            username: this.RABBITMQ_USER,
            password: this.RABBITMQ_PASS,
        };
    
        // Creo la connessione (unica per tutte le sottoclassi)
        const connection = await connect(connectionOptions, {
            timeout: 20000,
            heartbeat: 60,
        });
    
        // Salvo la connessione nella variabile statica
        AMQPMessanger.sharedConnection = connection;
    
        // Gestisco eventi di 'close' ed 'error'
        connection.on('close', async () => {
            LoggerHandler.warn('Connection closed. Attempting to reconnect...');
            await this.handleCloseOrError();
        });
    
        connection.on('error', async (err) => {
            LoggerHandler.warn(`Connection error: ${err}. Attempting to reconnect...`);
            await this.handleCloseOrError();
        });
    
        return connection;
    }

    private async handleCloseOrError(): Promise<void> {
        // Se è già in corso una riconnessione, non faccio nulla
        if (AMQPMessanger.isReconnecting) {
            return;
        }
        AMQPMessanger.isReconnecting = true;

        try {
            await this.closeConnection();
            await this.startMessanger();
        } catch (err: any) {
            LoggerHandler.error(`Error while reconnecting: ${err.message}`);
        } finally {
            AMQPMessanger.isReconnecting = false;
        }
    }

    private async createChannel(): Promise<void> {
        const connection = await this.getConnection();
        this.channel = await connection.createChannel();
        
        this.channel.on('close', async () => {
            LoggerHandler.warn("Channel closed. Attempting to reconnect...");
            await this.handleCloseOrError();
        });

        await this.channel.assertExchange(this.RABBITMQ_EXCHANGE, 'direct', { durable: false });
    }

    /**
        * Crea e collega la coda e la routingKey, e se esiste un callback,
        * avvia la consumer (consume).
    */
    private async createQueues(): Promise<void> {
        if (!this.channel) {
            throw new Error('No channel available.');
        }

        await this.channel.assertQueue(this.queue, { durable: false });
        await this.channel.bindQueue(this.queue, this.RABBITMQ_EXCHANGE, this.routingKey);
        if (this.callback !== null) {
            this.channel.consume(this.queue, this.callback, { noAck: true });
        }
    }

    public async startMessanger(): Promise<void> {
        try {
            await this.getConnection();
            await this.createChannel();
            await this.createQueues();
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
    
            if (AMQPMessanger.sharedConnection) {
                await AMQPMessanger.sharedConnection.close();
            }
        } catch (err) {
            LoggerHandler.error(`Error closing connection: ${err}`);
        } finally {
            AMQPMessanger.sharedConnection = null;
            this.channel = null;
        }
    }
}