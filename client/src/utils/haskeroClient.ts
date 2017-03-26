import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import * as stack from '../utils/stack';

export interface HaskeroSettings {
    intero: InteroSettings,
    maxAutoCompletionDetails: number
}

export interface InteroSettings {
    ignoreDotGhci: boolean,
    startupParams: [string]
}

export interface HaskeroClientInitOptions {
    settings: HaskeroSettings,
    targets: string[]
}

export class HaskeroClient implements vscode.Disposable {

    private _client: vscli.LanguageClient;
    public get client(): vscli.LanguageClient {
        return this._client;
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
        synchronize: {
            // Synchronize the setting section 'haskero' to the server
            configurationSection: 'haskero'
            //     // Notify the server about file changes to '.clientrc files contain in the workspace
            //     fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        },

        //using a callback here because LanguageClient detects if initializationOptions is a func and call it
        //thanks to this trick, we can change initOptions AFTER the LanguageClient instanciation
        //(usefull for changing cabals targets when LanguageClient has stoped working on an invalid target)
        initializationOptions: () => {
            return HaskeroClient.initOptions
        }
    };

    private static initOptions: HaskeroClientInitOptions;

    constructor(serverModule: string, private readonly debug: boolean) {
        // The debug options for the server
        let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };

        this.serverOptions = {
            run: { module: serverModule, transport: vscli.TransportKind.ipc },
            debug: { module: serverModule, transport: vscli.TransportKind.ipc } //, options: debugOptions }
            //remove options here otherwise we experience node socket error msg
        }
    }

    public start(initOptions: HaskeroClientInitOptions): vscode.Disposable {
        HaskeroClient.initOptions = initOptions;
        this._client = new vscli.LanguageClient('Haskero', 'Haskero', this.serverOptions, this.clientOptions, this.debug);
        this.disposable = this._client.start();
        return this;
    }

    public getTargets(): Promise<string[]> {
        return stack.getTargets()
            .then(targets => Promise.resolve(targets))
            .catch(reason => {
                if (reason.message.indexOf("Invalid argument", 0) > -1) {
                    const stackmsg = "Stack version is too low for the change targets feature. Update stack (min version = 1.2.0)";
                    reason.message = stackmsg + "\r\n\r\n" + reason.message;
                    vscode.window.showErrorMessage(stackmsg);
                }
                this._client.error('Error loading stack targets: ' + reason.message);
                return Promise.reject(reason);
            });
    }

    public dispose() {
        if (this.disposable) {
            this.disposable.dispose();
            this._client = null;
        }
    }
}