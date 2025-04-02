import { ConsumeMessage, Message } from "amqplib";
import { AMQPConsumer } from "./consumer";
import { AMQPProducer } from "./producer";

type ResponseObject = Record<string, string>;

export enum AMQPProviderType {
    BBSENDER = "BBSENDER",
    BBPAYMENTS = "BBPAYMENTS",
}

export class AMQPProvider {
    private consumerQueue: string;
    private consumerQueueRoutingKey: string;

    private producerQueue: string;
    private producerQueueRoutingKey: string;

    public responseObject: ResponseObject;

    private consumer: AMQPConsumer;
    private producer: AMQPProducer;

    // private static instance: AMQPProvider;
    private static instances: Map<AMQPProviderType, AMQPProvider> = new Map();

    private constructor(consumerQueue: string, producerQueue: string) {
        // Definisco le code e le routing key
        this.consumerQueue = consumerQueue;
        this.consumerQueueRoutingKey = consumerQueue + "_rk";

        this.producerQueue = producerQueue;
        this.producerQueueRoutingKey = producerQueue + "_rk";

        // Definisco l'oggetto di risposta
        this.responseObject = {};

        // Definisco il consumer
        this.consumer = new AMQPConsumer(this.consumerQueue, this.consumerQueue, this.dataReceivedResponse.bind(this));

        // Definisco il producer
        this.producer = new AMQPProducer(this.producerQueue, this.producerQueueRoutingKey);
    }

    // public static createIstance(consumerQueue: string, producerQueue: string): AMQPProvider {
    //     if (!AMQPProvider.instance) {
    //         AMQPProvider.instance = new AMQPProvider(consumerQueue, producerQueue);
    //     }
    //     return AMQPProvider.instance;
    // }
    public static createIstance(consumerQueue: string, producerQueue: string, amqpProviderType: AMQPProviderType): AMQPProvider {
        if (!AMQPProvider.instances.has(amqpProviderType)) {
            const instance = new AMQPProvider(consumerQueue, producerQueue);
            AMQPProvider.instances.set(amqpProviderType, instance);
        }
        return AMQPProvider.instances.get(amqpProviderType) as AMQPProvider;
    }



    public static getInstance(amqpProviderType: AMQPProviderType): AMQPProvider {
        // if (!AMQPProvider.instance) {
        //     throw new Error("AMQPProvider non inizializzato");
        // }
        // return AMQPProvider.instance;
        const instance = AMQPProvider.instances.get(amqpProviderType);
        if (!instance) {
            throw new Error("AMQPProvider non inizializzato");
        }

        return instance;
    }

    public dataReceivedResponse(msg: ConsumeMessage | null) {
        if (msg) {
            this.responseObject[msg.properties.correlationId] = msg.content.toString();
        }
    }

    public async provideListening() {
        try {
            await this.consumer.startMessanger()
        } catch (err) {
            console.log(err);
            // Chiudo la connessione
            await this.consumer.closeConnection();
        }
    }

    public async providePublishing() {
        try {
            await this.producer.startMessanger();
        } catch (err) {
            console.log(err);
            // Chiudo la connessione
            await this.producer.closeConnection();
        }
    }


    public async publish(method: string, body: string, correlationID: string) {
        console.log(`Invio data a ${method} con correlationID ${correlationID}`);
        await this.producer.publish(method, correlationID, body);
    }    
}