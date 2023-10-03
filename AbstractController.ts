import { AMQPBody, AMQPMethod, AMQPPayload, AMQPResponse, AMQPStatus } from "./Base/Payload";
import { AMQPProvider, AMQPProviderType } from "./Base/Provider";
import { v4 as uuidv4 } from 'uuid';

export class AMQPController {
    
    private amqpProvider: AMQPProvider;

    public constructor(amqpProviderType: AMQPProviderType) {
        try {
            this.amqpProvider = AMQPProvider.getInstance(amqpProviderType);      
        } catch (err) {
            throw err;
        }
    }

    public async getData(amqpMethod: AMQPMethod, body: string) {
        try {
            const payload = new AMQPPayload(amqpMethod, body);

            const correlationID = await this.__sendData(payload);
            const response = await this.__waitData(correlationID, amqpMethod);

            if (response.status === AMQPStatus.ERROR) {
                throw new Error(response.data);
            }

            return response;

        } catch (err) {
            const amqpResponse = new AMQPResponse(amqpMethod, AMQPStatus.ERROR, err.message);
            return amqpResponse;
        }
    }


    private async __sendData(payload: AMQPPayload) {
        try {
            const method = payload.method;
            const data = payload.body.toString()
            const correlationID = uuidv4() as string;

            await this.amqpProvider.publish(method, data, correlationID);

            return correlationID;
        } catch (err) {
            throw err;
        }
    }

    private async __waitData(correlationID: string, method: AMQPMethod): Promise<AMQPResponse> {        
        return new Promise((resolve, reject) => {
            const checkResponse = () => {
                if (this.amqpProvider.responseObject[correlationID]) {
                    const response = this.amqpProvider.responseObject[correlationID];
                    delete this.amqpProvider.responseObject[correlationID];
                    console.log(`Ricevuto messaggio con correlationID ${correlationID}`);
                    
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