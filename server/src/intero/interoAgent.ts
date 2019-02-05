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
        private inputDelimiter: string, private outputDelimiter: string,
        private stdin: stream.Writable, stdout: stream.Readable
    ) {
        stdin.on('error', e => this.onError(e));
        stdout.on('data', x => this.onData(x));
        stdout.on('error', e => this.onError(e));
    }

    public take(): Promise<string> {
        this.stdin.write(this.inputDelimiter);
        try {
            return this.blocks.receive();
        }
        catch {
            throw this.error;
        }
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
        this.blocks.dispose();
        this.error = err;
    }
}

export class InteroAgent implements IInteroRepl, Disposable {
    private readonly stdoutReader: DelimitReader;
    private readonly stderrReader: DelimitReader;
    private previous = Promise.resolve(<IInteroResponse>{});
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

    public evaluate(expr: string): Promise<IInteroResponse> {
        DebugUtils.instance.connectionLog(`evaluate: ${expr}`);
        console.log(`evaluate: ${expr}`);
        return this.sendStatement(expr + os.EOL);
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
            DebugUtils.instance.connectionLog(`evaluated: "${rawout}" "${rawerr}"`);
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

class InteroTransaction implements IInteroRepl {
    private intero: IInteroRepl;
    private previousTransaction: Promise<IInteroResponse>;

    public constructor(intero: IInteroRepl, previousTransaction?: Promise<IInteroResponse>) {
        this.intero = intero;
        this.previousTransaction = previousTransaction || Promise.resolve(<IInteroResponse>{});
    }

    public async evaluate(expr: string): Promise<IInteroResponse> {
        await this.previousTransaction;
        return this.intero.evaluate(expr);
    }

    public async withLock(transaction: (self: InteroTransaction) => Promise<IInteroResponse>) {
        const repl = new InteroTransaction(this.intero, this.previousTransaction);
        this.previousTransaction = transaction(repl);
        await this.previousTransaction;
    }
}
