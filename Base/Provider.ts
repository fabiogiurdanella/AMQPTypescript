import { Message } from "amqplib";
import { AMQPConsumer } from "./Consumer";
import { AMQPProducer } from "./Producer";
import { Semaphore } from "./Semaphore";

type ResponseObject = Record<string, string>;
type CallbackFunction = (msg: Message) => void;

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

    private semaphore: Semaphore;

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

        // Definisco il semaphore del producer
        this.semaphore = new Semaphore(1);

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

    public dataReceivedResponse(message: Message) {
        this.responseObject[message.properties.correlationId] = message.content.toString();
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