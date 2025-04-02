import { AMQPMethod, AMQPPayload, AMQPResponse, AMQPStatus } from "./Base/payload";
import { AMQPProvider, AMQPProviderType } from "./Base/provider";
import { v4 as uuidv4 } from 'uuid';

export class AMQPService {
    
    private amqpProvider: AMQPProvider;

    public constructor(amqpProviderType: AMQPProviderType) {
        this.amqpProvider = AMQPProvider.getInstance(amqpProviderType);      
    }

    public async getData(amqpMethod: AMQPMethod, body: string) {
        try {
            const payload = new AMQPPayload(amqpMethod, body);

            const correlationID = await this.sendData(payload);
            const response = await this.waitData(correlationID, amqpMethod);

            if (response.status === AMQPStatus.ERROR) {
                throw new Error(response.data);
            }

            return response;

        } catch (err: any) {
            const amqpResponse = new AMQPResponse(amqpMethod, AMQPStatus.ERROR, err.message);
            return amqpResponse;
        }
    }


    private async sendData(payload: AMQPPayload) {
        const method = payload.method;
        const data = payload.body.toString()
        const correlationID = uuidv4() as string;

        await this.amqpProvider.publish(method, data, correlationID);

        return correlationID;
    }

    private async waitData(correlationID: string, method: AMQPMethod): Promise<AMQPResponse> {        
        const timeout = 60000;
        const start = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkResponse = () => {
                if (this.amqpProvider.responseObject[correlationID]) {
                    const response = this.amqpProvider.responseObject[correlationID];
                    delete this.amqpProvider.responseObject[correlationID];
                    
                    const responseObj = JSON.parse(response);
                    if (responseObj.status === "error") {
                        reject(new Error(responseObj.data));
                    } else {
                        const amqpResponse = new AMQPResponse(method, AMQPStatus.OK, responseObj.data);
                        resolve(amqpResponse);
                    }
                } else if (Date.now() - start > timeout) {
                    reject(new Error("Timeout waiting for AMQP response."));
                } else {
                    setTimeout(checkResponse, 200);
                }
            };
            
            checkResponse();
        });
    }
    
}