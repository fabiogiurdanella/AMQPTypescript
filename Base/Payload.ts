import { ConsumeMessage } from "amqplib";

export type CallbackFunction = (msg: ConsumeMessage | null) => void;

export enum BBSenderMethod {}

export enum BBPaymentsMethod {}

export type AMQPMethod = BBSenderMethod | BBPaymentsMethod;

export enum AMQPStatus {
    OK      = "ok",
    ERROR   = "error",
}

export class AMQPPayload {
    constructor(
        public method: AMQPMethod,
        public body: string
    ) { }
}

export class AMQPResponse {
    constructor(
        public method: AMQPMethod,
        public status: AMQPStatus,
        public data: any
    ) { }

    toJson(): string {
        const returnObj: any = {
            method: this.method,
            status: this.status,
        };

        if (Array.isArray(this.data)) {
            returnObj.data = [];
            for (const item of this.data) {
                returnObj.data.push(item);
            }
        } else if (typeof this.data === "object") {
            returnObj.data = this.data;
        } else {
            returnObj.data = this.data;
        }

        return JSON.stringify(returnObj);
    }

    toString(): string {
        return this.toJson();
    }
}
