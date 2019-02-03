'use strict';

import { Disposable } from 'vscode-jsonrpc';
import { DebugUtils } from '../debug/debugUtils';
import { InteroResponse } from './commands/interoResponse';
import child_process = require('child_process');
import stream = require('stream');
import os = require('os');

/**
 * A raw response from intero.
 * As intero can respond on stdout and stderr at the same time, it contains both responses
 */
export class RawResponse {
    public rawout: string;
    public rawerr: string;

    constructor(rawout: string, rawerr: string) {
        this.rawout = rawout;
        this.rawerr = rawerr;
    }
}

/**
 * Package chunks of data in clean unique response
 */
class ResponseReader {

    public rawout: string = '';
    public rawerr: string = '';
    private timeout: NodeJS.Timeout;

    constructor(
        private stdout: stream.Readable,
        private stderr: stream.Readable,
        private onAnswer: (rawout: string, rawerr: string) => void
    ) {
        stdout.on('data', this.onData);
        stderr.on('data', this.onDataErr);
    }

    // create an instance function to force the 'this' capture
    private onData = (data: Buffer) => {
        let chunk = data.toString();
        DebugUtils.instance.log('<<< intero onData:\r\n' + chunk);

        //the EOT char is not always at the end of a chunk
        //eg : if we send two questions before the first answer comes back, we can get chunk with the form:
        // end_of_raw_answer1 EOT start_of_raw_answer2
        // or even:
        // end_of_raw_answer1 EOT full_raw_answer2 EOT start_of_raw_answer3
        let responsesChunks = chunk.split(InteroProxy.EOTUtf8);
        this.rawout += responsesChunks.shift();


        while (responsesChunks.length > 0) {
            //On linux, issue with synchronisation between stdout and stderr :
            // - use a set time out to wait 50ms for stderr to finish to write data after we recieve the EOC char from stdin
            setTimeout(this.onResponse(this.rawout), 50);
            this.rawout = responsesChunks.shift();
        }
    }

    // create an instance function to force the 'this' capture
    private onDataErr = (data: Buffer) => {
        let chunk = data.toString();
        this.rawerr += chunk;
        DebugUtils.instance.log(chunk);
    }

    private onResponse = (rawout: string) => () => {
        DebugUtils.instance.log('<<< end of intero response');
        this.onAnswer(rawout, this.rawerr);
        this.rawerr = "";
    }

    public clear() {
        this.rawerr = '';
        this.rawout = '';
    }
}

class InteroResponseReader {

    public rawout: string = '';
    public rawerr: string = '';
    private timeout: NodeJS.Timeout;

    constructor(
        private stdout: stream.Readable,
        private stderr: stream.Readable,
        private onAnswer: (rawout: string, rawerr: string) => void
    ) {
        stdout.on('data', this.onData);
        stderr.on('data', this.onDataErr);
    }

    // create an instance function to force the 'this' capture
    private onData(data: Buffer) {
        let chunk = data.toString();
        DebugUtils.instance.log('<<< intero onData:\r\n' + chunk);

        let responsesChunks = chunk.split(InteroProxy.EOTUtf8);
        this.rawout += responsesChunks.shift();

        while (responsesChunks.length > 0) {
            setTimeout(this.onResponse(this.rawout), 50);
            this.rawout = responsesChunks.shift();
        }
    }

    private onDataErr(data: Buffer) {
        let chunk = data.toString();
        this.rawerr += chunk;
        DebugUtils.instance.log(chunk);
    }

    private onResponse = (rawout: string) => () => {
        DebugUtils.instance.log('<<< end of intero response');
        this.onAnswer(rawout, this.rawerr);
        this.rawerr = "";
    }

    public clear() {
        this.rawerr = '';
        this.rawout = '';
    }
}

class Deferred<T> implements Promise<T> {
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

class Channel<T> {
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

class DelimitReader {

    public buffer = '';
    private complete = new Deferred<string>();
    private blocks = new Channel<string>();

    public constructor(
        private inputDelimiter: string, private outputDelimiter: string,
        private stdin: stream.Writable, stdout: stream.Readable
    ) {
        stdin.on('error', x => this.onError(x));
        stdout.on('data', x => this.onData(x));
    }

    public delimitAndTake(): Promise<string> {
        this.stdin.write(this.inputDelimiter);
        return this.take();
    }

    public take(): Promise<string> {
        return this.blocks.receive();
    }

    private onData(data: Buffer) {
        this.buffer += data.toString();
        const blocks = this.buffer.split(this.outputDelimiter);
        while (blocks.length > 1) {
            const b = blocks.shift();
            this.blocks.send(b);

            const idxNextBlock = b.length + this.outputDelimiter.length;
            this.buffer = this.buffer.substr(idxNextBlock);
        }
    }

    private onError(err: Error) {
        this.complete.reject(err);
    }
}

class InteroAgent implements Disposable {
    private static readonly prompt = '{-        TRANSACTION        -}';
    private readonly stdoutReader: DelimitReader;
    private readonly stderrReader: DelimitReader;
    // private readonly requests = new Channel<Deferred<InteroResponse>>();
    private previous = Promise.resolve(<InteroResponse>{});

    public constructor(private interoProcess: child_process.ChildProcess) {
        const intero = this.interoProcess;
        intero.on('exit', x => this.onExit(x));
        intero.on('error', x => this.onError(x));

        const iDelim = ':set PIPI_DELIMIT_TRANSACTION\n';
        const oDelim = "Some flags have not been recognized: PIPI_DELIMIT_TRANSACTION" + os.EOL;
        this.stderrReader = new DelimitReader(iDelim, oDelim, intero.stdin, intero.stderr);
        this.stdoutReader = new DelimitReader('', InteroAgent.prompt, intero.stdin, intero.stdout);

        intero.stdin.write(`:set prompt ${InteroAgent.prompt}\n`);
        this.stdoutReader.take();
        this.stderrReader.delimitAndTake();
    }

    public evaluate(expr: string): Promise<InteroResponse> {
        return this.queueStatement(expr + os.EOL);
    }

    public dispose() {
        if (this.interoProcess.killed) {
            return;
        }
        this.interoProcess.removeAllListeners();
        this.interoProcess.stdout.removeAllListeners();
        this.interoProcess.stderr.removeAllListeners();
        this.interoProcess.stdin.removeAllListeners();
        this.interoProcess.kill();
    }

    private async queueStatement(expr: string): Promise<InteroResponse> {
        this.previous = this.sendStatement(expr);
        return this.previous;
    }

    private async sendStatement(expr: string): Promise<InteroResponse> {
        await this.previous;
        this.interoProcess.stdin.write(expr);
        console.log(`sendStatement: ${expr}`);
        try {
            const rawout = await this.stdoutReader.delimitAndTake();
            console.log(`rawout: ${rawout}`);
            const rawerr = await this.stderrReader.delimitAndTake();
            console.log(`rawerr: ${rawerr}`);
            return { rawout, rawerr, isOk: true };
        }
        catch (e) {
            return <InteroResponse>{ isOk: false };
        }
    }

    private onExit(code: number) {
        let errorMsg = `Process exited with code ${code}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        console.log(errorMsg);
    }

    private onError(code: any) {
        let errorMsg = `Failed to start intero instance: ${code}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        console.log(errorMsg);
    }
}

/**
 * Handle communication with intero
 * Intero responds on stderr and stdout without any synchronisation
 * InteroProxy hides the complexity behind a simple interface: you send a request and you get a response. All the synchronisation is done by the proxy
 */
export class InteroProxy {

    private isInteroProcessUp: boolean = true;
    private responseReader: ResponseReader;

    /**
     * Error message emitted when interoProcess emits an error and stop to working
     */
    private errorMsg: string;
    /**
     * Manage a request <-> response queue.
     * Each request is paired with a response.
     */
    private onRawResponseQueue: Array<{ resolve: (response: RawResponse) => void, reject: any }>;

    /**
     * End of transmission utf8 char
     */
    public static get EOTUtf8(): string {
        return '\u0004';
        //return '@';
    }

    /**
     * End of transmission char in CMD
     */
    public static get EOTInteroCmd(): string {
        return '"\\4"';
        //return '@';
    }

    // public constructor(private interoProcess: child_process.ChildProcess) {

    //     this.onRawResponseQueue = [];
    //     this.interoProcess.on('exit', this.onExit);
    //     this.interoProcess.on('error', this.onError);
    //     this.responseReader = new ResponseReader(this.interoProcess.stdout, this.interoProcess.stderr, this.onResponse);
    //     this.interoProcess.stdin.on('error', this.onStdInError);
    //     this.interoProcess.stdin.write('\n');
    // }
    private agent: InteroAgent;
    public constructor(private interoProcess: child_process.ChildProcess) {
        this.agent = new InteroAgent(interoProcess);
    }

    /**
     * Send a request to intero
     */
    public sendRawRequest(rawRequest: string): Promise<RawResponse> {
        return this.agent.evaluate(rawRequest);
        // if (!this.isInteroProcessUp) {
        //     return Promise.reject(this.errorMsg);
        // }
        // let executor = (resolve, reject): void => {
        //     let req = rawRequest + '\n';
        //     this.interoProcess.stdin.write(req);
        //     this.onRawResponseQueue.push({ resolve: resolve, reject: reject });
        //     DebugUtils.instance.log('>>> ' + req);
        // };
        // return new Promise(executor);
    }

    /**
     * Kill the underlying intero process
     */
    public kill() {
        this.interoProcess.removeAllListeners();
        this.interoProcess.stdout.removeAllListeners();
        this.interoProcess.stderr.removeAllListeners();
        this.interoProcess.stdin.removeAllListeners();

        this.onRawResponseQueue.forEach(resolver => {
            resolver.reject("Intero process killed by Haskero");
        });
        this.interoProcess.kill();
        this.onRawResponseQueue = [];
        this.responseReader = null;
        this.isInteroProcessUp = false;
    }

    //executed when an error is emitted  on stdin
    private onStdInError = (er: any) => {
        DebugUtils.instance.log("error stdin : " + er);
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.reject(er);
        }
    }

    private onExit = (code: number) => {
        this.isInteroProcessUp = false;
        let rawout = this.responseReader.rawout;
        let rawerr = this.responseReader.rawerr;
        this.responseReader.clear();
        this.errorMsg = `process exited with code ${code}\r\n\r\nstdout:\r\n${rawout}\r\n\r\nstderr:\r\n${rawerr}\r\n`;
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.reject(this.errorMsg);
        }
    }

    private onError = (reason: string) => {
        this.isInteroProcessUp = false;
        this.errorMsg = `Failed to start process 'stack', Haskero must be used on stack projects only. Details: ${reason}`;
    }

    private onResponse = (rawout: string, rawerr: string) => {
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.resolve(new RawResponse(rawout, rawerr));
        }
    }
}