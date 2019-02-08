'use strict';

import { HaskeroSettings } from '../haskeroSettings';
import { AsyncWriter, Channel } from '../utils/promiseUtils';
import { IInteroRepl, IInteroResponse } from "./commands/abstract";
import child_process = require('child_process');
import stream = require('stream');
import os = require('os');

class DelimitReader {

    public buffer = '';
    private blocks = new Channel<string>();
    private error: Error;

    public constructor(private delimiter: string, stdout: stream.Readable) {
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

export class InteroAgent implements IInteroRepl {
    private static readonly inputDelimiter = '\n:set PIPI_DELIMIT_TRANSACTION\n';
    private readonly stdinWriter: AsyncWriter;
    private readonly stdoutReader: DelimitReader;
    private readonly stderrReader: DelimitReader;
    private prevInput = Promise.resolve();
    private errorMsg: string;

    public constructor(private interoProcess: child_process.ChildProcess) {
        const intero = this.interoProcess;
        intero.on('exit', (x, y) => this.onExit(x, y));
        intero.on('error', x => this.onError(x));

        this.stdinWriter = new AsyncWriter(intero.stdin);
        const prompt = '{-        TRANSACTION        -}';
        const stderrConsideredPrompt = prompt + prompt;
        this.stdoutReader = new DelimitReader(stderrConsideredPrompt, intero.stdout);
        const oDelim = "Some flags have not been recognized: PIPI_DELIMIT_TRANSACTION" + os.EOL;
        this.stderrReader = new DelimitReader(oDelim, intero.stderr);

        // Drop intero bootstrap message and set delimiter prompt
        this.evaluate(`:set prompt ${prompt}`);
    }

    public async evaluate(expr: string): Promise<IInteroResponse> {
        if (this.errorMsg) {
            throw this.errorMsg;
        }
        await this.queueStatement(expr + InteroAgent.inputDelimiter);
        return await this.takeResult();
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

    private queueStatement(stmt: string): Promise<void> {
        this.prevInput = this.sendStatement(stmt);
        return this.prevInput;
    }

    private async sendStatement(stmt: string): Promise<void> {
        await this.prevInput;
        await this.stdinWriter.write(stmt);
    }

    private async takeResult(): Promise<IInteroResponse> {
        const rawout = await this.stdoutReader.take();
        const rawerr = await this.stderrReader.take();
        return { rawout, rawerr, isOk: true };
    }

    private onExit(code: number, signal: string) {
        this.errorMsg = `Process exited with ${code || signal}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
    }

    private onError(code: Error) {
        this.errorMsg = `Failed to start intero instance: ${code.message}\r\n\r\n`
            + `stdout:\r\n${this.stdoutReader.buffer}\r\n\r\n`
            + `stderr:\r\n${this.stderrReader.buffer}\r\n`;
        console.log(this.errorMsg);
    }
}

export class InteroTransaction implements IInteroRepl {
    private intero: IInteroRepl;
    private transaction: Promise<any>;

    public constructor(intero: IInteroRepl, previousTransaction?: Promise<IInteroResponse>) {
        this.intero = intero;
        this.transaction = previousTransaction || Promise.resolve();
    }

    public evaluate(expr: string): Promise<IInteroResponse> {
        this.transaction = this.chainedEvaluation(expr);
        return this.transaction;
    }

    public withLock<T>(transaction: (self: InteroTransaction) => Promise<T>): Promise<T> {
        const repl = new InteroTransaction(this.intero, this.transaction);
        this.transaction = transaction(repl);
        return this.transaction;
    }

    public dispose(): void {
        this.intero.dispose();
    }

    private async chainedEvaluation(expr: string): Promise<IInteroResponse> {
        await this.transaction;
        return await this.intero.evaluate(expr);
    }
}

export class InteroFactory {

    private static interoNotFound = 'Executable named intero not found';

    public constructor(private settings: HaskeroSettings) {
    }

    public async create(targets: string[]): Promise<InteroTransaction> {
        const interoProc = await this.spawn(targets);
        const intero = new InteroAgent(interoProc);
        const transactioner = new InteroTransaction(intero);
        return transactioner;
    }

    /**
     * Spawn an intero process (stack ghci --with-ghc intero ... targets)
     * and set `interoAgent`.
     */
    public async spawn(targets: string[]): Promise<child_process.ChildProcess> {
        try {
            if (process.platform === 'win32') {
                return child_process.spawn('cmd', ['/c', 'chcp', '65001', '&', ...this.getSpawnArguments(targets)]);
            }
            else {
                const [stack, ...args] = this.getSpawnArguments(targets);
                return child_process.spawn(stack, args);
            }
        }
        catch (reason) {
            if (reason.includes(InteroFactory.interoNotFound)) {
                throw "Intero is not installed. See installation instructions here : https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing (details in Haskero tab output)\r\n\r\nDetails\r\n\r\n" + reason;
            }
            throw reason;
        }
    }

    public getSpawnArguments(targets: string[]): string[] {
        const rootOptions = ['ghci', '--with-ghc', 'intero'];
        const options = rootOptions.concat(this.getStartupParameters()).concat(targets);
        return [this.settings.intero.stackPath, ...options];
    }

    private getStartupParameters(): string[] {
        let ghciOptions: string[] = [];
        const setting = this.settings.intero;
        if (setting.ignoreDotGhci) {
            ghciOptions.push('-ignore-dot-ghci');
        }
        ghciOptions = ghciOptions.concat(setting.ghciOptions);
        //concat startup params AFTER default ghci-options (otherwise, it's impossible to override default ghci-options like -fno-warn-name-shadowing)
        return [`--ghci-options=${ghciOptions.join(' ')}`].concat(setting.startupParams);
    }
}
