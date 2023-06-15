export enum AMQPMethod {
    EXCEPTION                   = "exception",
    
    SEND_EMAIL                  = "send_email",
    
    SAVE_FILE                   = "save_file",
    READ_FILE                   = "read_file",
    DELETE_FILE                 = "delete_file",
    
    SEND_NOTIFICATION           = "send_notification",
    UNKNOWN                     = "unknown",
}

export class AMQPBody {
    constructor(object: any) {
        for (const key in object) {
            if (object.hasOwnProperty(key)) {
                this[key] = object[key];
            }
        }
    }

    toString(): string {
        return JSON.stringify(this);
    }
}

export enum AMQPStatus {
    OK      = "ok",
    ERROR   = "error",
}

export class AMQPPayload {
    constructor(
        public method: AMQPMethod,
        public body: AMQPBody
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
