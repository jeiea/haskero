'use strict';

import { Disposable } from 'vscode-jsonrpc';
import { Channel, Deferred } from '../utils/promiseUtils';
import { InteroResponse } from './commands/interoResponse';
import child_process = require('child_process');
import stream = require('stream');
import os = require('os');

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

    public take(): Promise<string> {
        this.stdin.write(this.inputDelimiter);
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

export class InteroAgent implements Disposable {
    private readonly stdoutReader: DelimitReader;
    private readonly stderrReader: DelimitReader;
    private previous = Promise.resolve(<InteroResponse>{});
    private errorMsg: string;

    public constructor(private interoProcess: child_process.ChildProcess) {
        const intero = this.interoProcess;
        intero.on('exit', x => this.onExit(x));
        intero.on('error', x => this.onError(x));

        const prompt = '{-        TRANSACTION        -}';
        this.stdoutReader = new DelimitReader('', prompt, intero.stdin, intero.stdout);
        const iDelim = ':set PIPI_DELIMIT_TRANSACTION\n';
        const oDelim = "Some flags have not been recognized: PIPI_DELIMIT_TRANSACTION" + os.EOL;
        this.stderrReader = new DelimitReader(iDelim, oDelim, intero.stdin, intero.stderr);

        intero.stdin.write(`:set prompt ${prompt}\n`);
        this.stdoutReader.take();
        this.stderrReader.take();
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
        if (this.errorMsg) {
            throw this.errorMsg;
        }
        await this.previous;
        this.interoProcess.stdin.write(expr);
        try {
            const rawout = await this.stdoutReader.take();
            const rawerr = await this.stderrReader.take();
            return { rawout, rawerr, isOk: true };
        }
        catch (e) {
            return <InteroResponse>{ isOk: false };
        }
    }

    private onExit(code: number) {
        this.errorMsg = `Process exited with code ${code}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        console.log(this.errorMsg);
    }

    private onError(code: Error) {
        this.errorMsg = `Failed to start intero instance: ${code.message}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        console.log(this.errorMsg);
    }
}
