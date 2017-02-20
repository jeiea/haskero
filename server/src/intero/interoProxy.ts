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
 * Handle communication with intero
 * Intero responds on stderr and stdout without any synchronisation
 * InteroProxy hides the complexity behind a simple interface: you send a request and you get a response. All the synchronisation is done by the proxy
 */
export class InteroProxy {
    private rawout: string;
    private rawoutErr: string;
    private isInteroProcessUp: boolean = true;
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
        return '\u0004';
    }

    /**
     * End of communication char in CMD
     */
    public static get EOTInteroCmd(): string {
        return '"\\4"';
    }

    public constructor(private interoProcess: child_process.ChildProcess) {
        this.rawout = '';
        this.rawoutErr = '';
        this.onRawResponseQueue = [];
        this.interoProcess.on('exit', this.onExit);
        this.interoProcess.on('error', this.onError);
        this.interoProcess.stdout.on('data', this.onData);
        this.interoProcess.stderr.on('data', this.onDataErr);
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
            this.onRawResponseQueue.push({ resolve: resolve, reject: reject });
            let req = rawRequest + '\n';
            this.interoProcess.stdin.write(req);
            DebugUtils.instance.log('>' + req);
        };
        return new Promise(executor);
    }

    /**
     * Kill the underlying intero process
     */
    public kill() {
        this.rawout = '';
        this.rawoutErr = '';
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

    private static endsWith(str: string, suffix: string): boolean {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    }

    // create an instance function to force the 'this' capture
    private onData = (data: Buffer) => {
        let chunk = data.toString();
        this.rawout += chunk;
        DebugUtils.instance.log(chunk);
        if (InteroProxy.endsWith(chunk, InteroProxy.EOTUtf8)) {
            //On linux, issue with synchronisation between stdout and stderr :
            // - use a set time out to wait 50ms for stderr to finish to write data after we recieve the EOC char from stdin
            setTimeout(this.onResponse, 50);
        }
    }

    //executed when an error is emitted  on stdin
    private onStdInError = (er: any) => {
        DebugUtils.instance.log("error stdin : " + er);
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.reject(er);
        }
    }

    // create an instance function to force the 'this' capture
    private onDataErr = (data: Buffer) => {
        let chunk = data.toString();
        this.rawoutErr += chunk;
        DebugUtils.instance.log(chunk);
    }

    private onExit = (code: number) => {
        this.isInteroProcessUp = false;
        let rawout = this.rawout;
        let rawerr = this.rawoutErr;
        this.rawout = '';
        this.rawoutErr = '';
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

    private onResponse = () => {
        DebugUtils.instance.log('>>><<<');
        let rawout = this.rawout;
        let rawerr = this.rawoutErr;
        this.rawout = '';
        this.rawoutErr = '';
        if (this.onRawResponseQueue.length > 0) {
            let resolver = this.onRawResponseQueue.shift();
            resolver.resolve(new RawResponse(rawout, rawerr));
        }
    }
}