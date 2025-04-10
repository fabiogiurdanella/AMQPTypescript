import { ConsumeMessage } from "amqplib";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { createTransport } from "nodemailer";
import { LoggerHandler } from "../../loggerHander";
import { AMQPConsumer } from "./consumer";
import { AMQPProducer } from "./producer";

type ResponseObject = Record<string, string>;

export enum AMQPProviderType {
    BBSENDER = "BBSENDER",
    BBPAYMENTS = "BBPAYMENTS",
}

export class AMQPProvider {
    private consumerQueue: string;
    private producerQueue: string;

    public responseObject: ResponseObject;

    private consumer: AMQPConsumer;
    private producer: AMQPProducer;

    // private static instance: AMQPProvider;
    private static instances: Map<AMQPProviderType, AMQPProvider> = new Map();

    private constructor(consumerQueue: string, producerQueue: string) {
        // Definisco le code e le routing key
        this.consumerQueue = consumerQueue;

        this.producerQueue = producerQueue;

        // Definisco l'oggetto di risposta
        this.responseObject = {};

        /*
        Si usa .bind(this) per mantenere il contesto dell'istanza corrente di AMQPProvider all'interno della funzione di callback `dataReceivedResponse`.
        
        In JavaScript, quando un metodo viene passato come riferimento (come nel caso di una callback), il contesto `this` di quel metodo non viene automaticamente mantenuto. 
        Di conseguenza, `this` all'interno della funzione potrebbe diventare undefined o fare riferimento a un oggetto diverso.
        
        Usando .bind(this), fissiamo esplicitamente `this` all'istanza corrente di AMQPProvider.
        In questo modo, ogni volta che `dataReceivedResponse` viene chiamato come callback
        (in questo caso, dall'oggetto consumer), `this` punterà correttamente all'istanza di AMQPProvider.
        
        Senza .bind(this), qualsiasi riferimento a `this` all'interno di `dataReceivedResponse` non funzionerebbe correttamente, poiché `this` perderebbe il collegamento all'oggetto AMQPProvider.
        */
        // Definisco il consumer
        this.consumer = new AMQPConsumer(this.consumerQueue, this.consumerQueue, this.dataReceivedResponse.bind(this))

        // Definisco il producer
        this.producer = new AMQPProducer(this.producerQueue, this.producerQueue);
    }

    // public static createIstance(consumerQueue: string, producerQueue: string): AMQPProvider {
    //     if (!AMQPProvider.instance) {
    //         AMQPProvider.instance = new AMQPProvider(consumerQueue, producerQueue);
    //     }
    //     return AMQPProvider.instance;
    // }
    public static createInstance(consumerQueue: string, producerQueue: string, amqpProviderType: AMQPProviderType): AMQPProvider {
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

    public dataReceivedResponse(message: ConsumeMessage | null) {
        if (!message) {
            return;
        }

        LoggerHandler.log(`Ricevuto messaggio con correlationID: ${message.properties.correlationId}`)
        this.responseObject[message.properties.correlationId] = message.content.toString();
    }

    public async provideListening() {
        try {
            await this.consumer.startMessanger()
        } catch (err) {
            // Chiudo la connessione
            await this.consumer.closeConnection();

            // INVIO UNA MAIL DI ERRORE
            await this.__sendOfflineMail();
        }
    }

    public async providePublishing() {
        try {
            await this.producer.startMessanger();
        } catch (err) {
            // Chiudo la connessione
            await this.producer.closeConnection();

            // INVIO UNA MAIL DI ERRORE
            await this.__sendOfflineMail();
        }
    }


    public async publish(method: string, body: string, correlationID: string) {
        LoggerHandler.log(`Invio data a ${method} con correlationID ${correlationID}`);
        await this.producer.publish(method, correlationID, body);
    }

    private __sendOfflineMail() {

        const smtpHost = "smtps.aruba.it";
        const smtpPort = 465;
        const smtpUser = "sviluppo@thebbsway.com";
        const smtpPassword = "Th3BbsW4y22!";

        const mailerOptions: SMTPTransport.Options = {
            host: smtpHost,
            port: smtpPort,
            ignoreTLS: true,
            secure: true,
            auth: {
                user: smtpUser,
                pass: smtpPassword
            },
            from: smtpUser,
            to: smtpUser
        };

        const smptTrasporter = createTransport(mailerOptions);

        const mail = {
            from: "no-reply@lacasadelformaggio.it",
            subject: "Casa Del Formaggio AMQP Provider Offline",
            to: "sviluppo@thebbsway.com",
            html: `
                <html>
                    <body>
                        <h1>Casa Del Formaggio AMQP Provider</h1>
                        <p>Il server è offline</p>
                    </body>
                </html>
            `
        };

        return new Promise<boolean>((resolve, reject) => {
            smptTrasporter.sendMail(mail, (err, info) => {
                // Notifico eventuali errori
                if (err) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });

    }

}