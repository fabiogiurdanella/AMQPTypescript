import { Message } from "amqplib";
import { AMQPConsumer } from "./Consumer";
import { AMQPProducer } from "./Producer";

type ResponseObject = Record<string, string>;
type CallbackFunction = (msg: Message) => void;

export class AMQPProvider {
    private consumerQueue: string;
    private consumerQueueRoutingKey: string;

    private producerQueue: string;
    private producerQueueRoutingKey: string;

    public responseObject: ResponseObject;

    private consumer: AMQPConsumer;
    private producer: AMQPProducer;

    private static instance: AMQPProvider;

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

    public static createIstance(consumerQueue: string, producerQueue: string): AMQPProvider {
        if (!AMQPProvider.instance) {
            AMQPProvider.instance = new AMQPProvider(consumerQueue, producerQueue);
        }
        return AMQPProvider.instance;
    }

    public static getInstance(): AMQPProvider {
        if (!AMQPProvider.instance) {
            throw new Error("AMQPProvider non inizializzato");
        }
        return AMQPProvider.instance;
    }

    public dataReceivedResponse(message: Message) {
        console.log("Messaggio ricevuto dal consumer con correlationID: " + message.properties.correlationId);
        console.log("Messaggio ricevuto dal consumer con body: " + message.content.toString());

        this.responseObject[message.properties.correlationId] = message.content.toString();
    }

    public async listen() {
        try {
            await this.consumer.listenToConsumerQueue();
        } catch (err) {
            console.log(err);
            // Chiudo la connessione
            await this.consumer.closeConnection();
        }
    }

    public publish(method: string, body: string, correlationID: string) {
        this.producer.publish(method, correlationID, body);
    }
}