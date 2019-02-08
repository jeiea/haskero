'use strict';

import stream = require("stream");

export class Deferred<T> implements Promise<T> {
    public resolve: (value?: T | PromiseLike<T>) => void;
    public reject: (reason?: any) => void;
    private promise: Promise<T>;

    public constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
        onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    public catch<TResult = never>(
        onrejected?: (reason: any) => TResult | PromiseLike<TResult>
    ): Promise<T | TResult> {
        return this.promise.catch(onrejected);
    }

    [Symbol.toStringTag]: 'Promise';
}

export class Channel<T> {
    private readonly servers: Array<T> = [];
    private readonly clients: Array<Deferred<T>> = [];
    private disposed = false;

    public receive(): Promise<T> {
        this.throwIfDisposed();
        const ss = this.servers;
        if (ss.length === 0) {
            const prom = new Deferred<T>();
            this.clients.push(prom)
            return prom;
        }
        else {
            return Promise.resolve(ss.shift());
        }
    }

    public send(obj: T) {
        this.throwIfDisposed();
        const cs = this.clients;
        if (cs.length === 0) {
            this.servers.push(obj);
        }
        else {
            cs.shift().resolve(obj);
        }
    }

    private throwIfDisposed() {
        if (this.disposed) {
            throw 'Already disposed';
        }
    }

    public dispose() {
        this.disposed = true;
        this.clients.forEach(c => c.reject('disposed'));
    }
}

export class AsyncWriter {
    private err: Error;

    public constructor(public writer: stream.Writable) {
        writer.on('error', e => { this.err = e; });
    }

    public async write(chunk: string | Buffer): Promise<void> {
        if (this.err) {
            throw this.err;
        }
        if (this.writer.write(chunk)) {
            return;
        }
        return new Promise(resolve => {
            this.writer.once('drain', resolve);
        });
    }
}
