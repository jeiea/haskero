'use strict';

import { InteroRequest } from './commands/interoRequest'
import { InteroResponse } from './commands/interoResponse'
import { InitRequest, InitResponse } from './commands/init'
import { DebugUtils } from '../debug/debugUtils'
import child_process = require('child_process');
import stream = require('stream');

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

    public rawout: string;
    public rawerr: string;

    constructor(private stdout: stream.Readable, private stderr: stream.Readable, private onAnswer: (rawout: string, rawerr: string) => void) {
        this.rawout = '';
        this.rawerr = '';
        stdout.on('data', this.onData);
        stderr.on('data', this.onDataErr);
    }

    // create an instance function to force the 'this' capture
    private onData = (data: Buffer) => {
        let chunk = data.toString();
        DebugUtils.instance.log(chunk);

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
        DebugUtils.instance.log('>>><<<');
        this.onAnswer(rawout, this.rawerr);
        this.rawerr = "";
    }

    public clear() {
        this.rawerr = '';
        this.rawout = '';
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
     * End of communication utf8 char
     */
    public static get EOTUtf8(): string {
        // return '\u0004';
        return '@';
    }

    /**
     * End of communication char in CMD
     */
    public static get EOTInteroCmd(): string {
        // return '"\\4"';
        return '@';
    }

    public constructor(private interoProcess: child_process.ChildProcess) {

        this.onRawResponseQueue = [];
        this.interoProcess.on('exit', this.onExit);
        this.interoProcess.on('error', this.onError);
        this.responseReader = new ResponseReader(this.interoProcess.stdout, this.interoProcess.stderr, this.onResponse);
        this.interoProcess.stdin.on('error', this.onStdInError);
    }

    /**
     * Send a request to intero
     */
    public sendRawRequest(rawRequest: string): Promise<RawResponse> {
        if (!this.isInteroProcessUp) {
            return Promise.reject(this.errorMsg);
        }
        let executor = (resolve, reject): void => {
            let req = rawRequest + '\n';
            this.interoProcess.stdin.write(req);
            this.onRawResponseQueue.push({ resolve: resolve, reject: reject });
            DebugUtils.instance.log('>' + req);
        };
        return new Promise(executor);
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
        this.errorMsg = `Failed to start process 'stack', Haskero must be used on stack projects only. ${reason}`;
    }

    private onResponse = (rawout: string, rawerr: string) => {
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.resolve(new RawResponse(rawout, rawerr));
        }
    }
}