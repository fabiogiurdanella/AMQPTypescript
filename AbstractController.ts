import { AMQPBody, AMQPMethod, AMQPPayload, AMQPResponse, AMQPStatus } from "./Base/Payload";
import { AMQPProvider } from "./Base/Provider";
import { v4 as uuidv4 } from 'uuid';

export class AMQPController {
    
    private amqpProvider: AMQPProvider;

    public constructor() {
        try {
            this.amqpProvider = AMQPProvider.getInstance();      
        } catch (err) {
            throw err;
        }
    }

    public async getData(amqpMethod: AMQPMethod, body: string) {
        try {
            const payload = new AMQPPayload(amqpMethod, body);

            const uuid = this.__sendData(payload);
            const response = await this.__waitData(uuid, amqpMethod);

            if (response.status === AMQPStatus.ERROR) {
                throw new Error(response.data);
            }

            return response;

        } catch (err) {
            const amqpResponse = new AMQPResponse(amqpMethod, AMQPStatus.ERROR, err.message);
            return amqpResponse;
        }
    }


    private __sendData(payload: AMQPPayload) {
        try {
            const method = payload.method;
            const data = payload.body.toString()
            const uuid = uuidv4() as string;

            console.log(`Invio data a ${method} con uuid ${uuid}`);

            this.amqpProvider.publish(method, data, uuid);

            return uuid;
        } catch (err) {
            throw err;
        }
    }

    private async __waitData(uuid: string, method: AMQPMethod): Promise<AMQPResponse> {
        console.log(`In attesa di ricevere messaggio con uuid ${uuid} e method ${method}`);
        
        return new Promise((resolve, reject) => {
            const checkResponse = () => {
                if (this.amqpProvider.responseObject[uuid]) {
                    const response = this.amqpProvider.responseObject[uuid];
                    delete this.amqpProvider.responseObject[uuid];
                    console.log(`Ricevuto messaggio con uuid ${uuid}`);
                    
                    const responseObj = JSON.parse(response);
                    if (responseObj.status === "error") {
                        reject(new Error(responseObj.data));
                    } else {
                        const amqpResponse = new AMQPResponse(method, AMQPStatus.OK, responseObj.data);
                        resolve(amqpResponse);
                    }
                } else {
                    setTimeout(checkResponse, 100); // Riprova dopo 100 millisecondi
                }
            };
            
            checkResponse();
        });
    }
    
}