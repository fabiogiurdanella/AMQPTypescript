export class Semaphore {
    private count: number;
    private waitQueue: (() => void)[] = [];

    constructor(initialCount: number = 1) {
        this.count = initialCount;
    }

    public async acquire(correlationID: string) {
        if (this.count > 0) {
            console.log('Semaphore acquired for: ', correlationID);
            this.count--;
        } else {
            console.log('Semaphore not acquired for: ', correlationID, '. Adding to wait queue');
            await new Promise<void>((resolve) => this.waitQueue.push(resolve));
        }
    }

    public release(correlationID: string) {
        console.log('Releasing semaphore for: ', correlationID);
        this.count++;
        const next = this.waitQueue.shift();
        if (next) {
            next();
        }
    }
}