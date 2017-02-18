import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';

export interface HaskeroClientInitOptions {
    targets: string[]
}

export class HaskeroClient implements vscode.Disposable {

    private _client: vscli.LanguageClient;
    public get client(): vscli.LanguageClient {
        return this._client;
    }

    // private _isStarted: boolean;
    public get isStarted(): boolean {
        //return this._isStarted;
        return this.client.isConnectionActive(); //Compile thanks to a hack in vscode-languageclient/lib/main.d.ts => remove 'private'
        //we can't rely on the public onDidChangeState function to know if the LanguageClient is started (bug ?)
    }

    private disposable: vscode.Disposable;

    // The debug options for the server
    private readonly debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    private readonly serverOptions: vscli.ServerOptions;

    // Options to control the language client
    private readonly clientOptions: vscli.LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: ['haskell'],
        // synchronize: {
        //     // Synchronize the setting section 'languageServerExample' to the server
        //     configurationSection: 'languageServerExample',
        //     // Notify the server about file changes to '.clientrc files contain in the workspace
        //     fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        // },

        //using a callback here because LanguageClient detects if initializationOptions is a func and call it
        //thanks to this trick, we can change initOptions AFTER the LanguageClient instanciation
        //(usefull for changing cabals targets when LanguageClient has stoped working on an invalid target)
        initializationOptions: () => {
            return HaskeroClient.initOptions
        }
    };

    private static initOptions = {
        targets: []
    };

    constructor(serverModule: string, private readonly debug: boolean) {
        this.serverOptions = {
            run: { module: serverModule, transport: vscli.TransportKind.ipc },
            debug: { module: serverModule, transport: vscli.TransportKind.ipc }//, options: debugOptions }
        }
        //this._isStarted = false;
        this._client = new vscli.LanguageClient('Haskero', 'Haskero', this.serverOptions, this.clientOptions, this.debug);
    }

    public start(initOptions: HaskeroClientInitOptions): vscode.Disposable {
        HaskeroClient.initOptions = initOptions;
        this.disposable = this._client.start();
        //this._isStarted = true;
        return this;
    }

    public stop() {
        this._client.stop();
        //this._isStarted = false;
    }

    public dispose() {
        if (this.disposable) {
            this.disposable.dispose();
            this._client = null;
            //this._isStarted = false;
        }
    }
}