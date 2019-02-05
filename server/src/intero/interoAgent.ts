'use strict';

import { Disposable } from 'vscode-jsonrpc';
import { DebugUtils } from '../debug/debugUtils';
import { Channel } from '../utils/promiseUtils';
import { IInteroRepl, IInteroResponse } from "./commands/abstract";
import child_process = require('child_process');
import stream = require('stream');
import os = require('os');

class DelimitReader {

    public buffer = '';
    private blocks = new Channel<string>();
    private error;

    public constructor(
        private delimiter: string,
        stdin: stream.Writable,
        stdout: stream.Readable
    ) {
        stdin.on('error', e => this.onError(e));
        stdout.on('data', x => this.onData(x));
        stdout.on('error', e => this.onError(e));
    }

    public take(): Promise<string> {
        try {
            return this.blocks.receive();
        }
        catch (e) {
            throw this.error || e;
        }
    }

    private onData(data: Buffer) {
        this.buffer += data.toString();
        const blocks = this.buffer.split(this.delimiter);
        while (blocks.length > 1) {
            const b = blocks.shift();
            this.blocks.send(b);

            const idxNextBlock = b.length + this.delimiter.length;
            this.buffer = this.buffer.substr(idxNextBlock);
        }
    }

    private onError(err: Error) {
        this.blocks.dispose();
        this.error = err;
    }
}

export class InteroAgent implements IInteroRepl, Disposable {
    private static readonly inputDelimiter = '\n:set PIPI_DELIMIT_TRANSACTION\n';
    private readonly stdoutReader: DelimitReader;
    private readonly stderrReader: DelimitReader;
    private previous: Promise<any>;
    private errorMsg: string;

    public constructor(private interoProcess: child_process.ChildProcess) {
        const intero = this.interoProcess;
        intero.on('exit', x => this.onExit(x));
        intero.on('error', x => this.onError(x));

        const prompt = '{-        TRANSACTION        -}';
        const stderrConsideredPrompt = prompt + prompt;
        this.stdoutReader = new DelimitReader(stderrConsideredPrompt, intero.stdin, intero.stdout);
        const oDelim = "Some flags have not been recognized: PIPI_DELIMIT_TRANSACTION" + os.EOL;
        this.stderrReader = new DelimitReader(oDelim, intero.stdin, intero.stderr);

        // Drop intero bootstrap message and set delimiter prompt
        this.previous = this.evaluate(`:set prompt ${prompt}`);
    }

    public evaluate(expr: string): Promise<IInteroResponse> {
        DebugUtils.instance.connectionLog(`evaluate: ${expr}`);
        return this.sendStatement(expr + InteroAgent.inputDelimiter);
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

    private async sendStatement(expr: string): Promise<IInteroResponse> {
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
            return <IInteroResponse>{ isOk: false };
        }
    }

    private onExit(code: number) {
        this.errorMsg = `Process exited with code ${code}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        DebugUtils.instance.connectionLog(this.errorMsg);
    }

    private onError(code: Error) {
        this.errorMsg = `Failed to start intero instance: ${code.message}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        DebugUtils.instance.connectionLog(this.errorMsg);
    }
}

export class InteroTransaction implements IInteroRepl {
    private intero: IInteroRepl;
    private previousTransaction: Promise<any>;

    public constructor(intero: IInteroRepl, previousTransaction?: Promise<IInteroResponse>) {
        this.intero = intero;
        this.previousTransaction = previousTransaction || Promise.resolve();
    }

    public async evaluate(expr: string): Promise<IInteroResponse> {
        await this.previousTransaction;
        return this.intero.evaluate(expr);
    }

    public async withLock<T>(transaction: (self: InteroTransaction) => Promise<T>): Promise<T> {
        const repl = new InteroTransaction(this.intero, this.previousTransaction);
        const work = transaction(repl);
        this.previousTransaction = work;
        return await work;
    }
}
