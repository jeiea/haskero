'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { InsertTypeAbove } from './commands/insertTypeAbove'
import { EditorUtils } from './utils/editorUtils'

export function activate(context: vscode.ExtensionContext) {

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: vscli.ServerOptions = {
        run: { module: serverModule, transport: vscli.TransportKind.ipc },
        debug: { module: serverModule, transport: vscli.TransportKind.ipc } //, options: debugOptions }
    }

    // Options to control the language client
    let clientOptions: vscli.LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: ['haskell']
        // synchronize: {
        //     // Synchronize the setting section 'languageServerExample' to the server
        //     configurationSection: 'languageServerExample',
        //     // Notify the server about file changes to '.clientrc files contain in the workspace
        //     fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        // }
    }

    // Create the language client and start the client.
    let client = new vscli.LanguageClient('Haskero', 'Haskero', serverOptions, clientOptions, false);
    let disposable = client.start();

    //register all plugin commands
    registerCommands(client, context);

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    //disposables.push(...disposable);

    context.subscriptions.push(disposable);
}

/**
 * Register all Haskero available commands
 */
function registerCommands(client: vscli.LanguageClient, context: vscode.ExtensionContext) {
    let insertTypeAboveCmd = new InsertTypeAbove(client);
    let insertTypeAboveDisposable = vscode.commands.registerCommand(insertTypeAboveCmd.id, insertTypeAboveCmd.handler);
    context.subscriptions.push(insertTypeAboveDisposable);
}