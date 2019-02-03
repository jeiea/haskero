'use strict';

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
  private servers: Array<T> = [];
  private clients: Array<Deferred<T>> = [];

  public receive(): Promise<T> {
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
      const cs = this.clients;
      if (cs.length === 0) {
          this.servers.push(obj);
      }
      else {
          cs.shift().resolve(obj);
      }
  }

  public dispose() {
      this.clients.forEach(c => c.reject('disposed'));
  }
}
