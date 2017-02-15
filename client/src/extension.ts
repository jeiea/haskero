'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { InsertTypeAbove } from './commands/insertTypeAbove'
import { EditorUtils } from './utils/editorUtils'
import { getTargets } from './utils/stack';

export function activate(context: vscode.ExtensionContext) {

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    // The language client
    let client: vscli.LanguageClient;

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: vscli.ServerOptions = {
        run: { module: serverModule, transport: vscli.TransportKind.ipc },
        debug: { module: serverModule, transport: vscli.TransportKind.ipc } //, options: debugOptions }
    }

    // Options to control the language client
    let clientOptions: vscli.LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: ['haskell'],
        // synchronize: {
        //     // Synchronize the setting section 'languageServerExample' to the server
        //     configurationSection: 'languageServerExample',
        //     // Notify the server about file changes to '.clientrc files contain in the workspace
        //     fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        // },
        initializationOptions: {
            targets: []
        }
    }

    //register all plugin commands
    registerCommands(client, context);

    getTargets().then((targets) => {
        clientOptions.initializationOptions.targets = targets;

        // Create the language client and start the client.
        client = new vscli.LanguageClient('Haskero', 'Haskero', serverOptions, clientOptions, false);

        // Create the target selection button
        registerTargetSelection(targets, (newTargets) =>
            client.sendNotification('setTargets', [newTargets]));

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());
    });
}

/**
 * Register all Haskero available commands
 */
function registerCommands(client: vscli.LanguageClient, context: vscode.ExtensionContext) {
    let insertTypeAboveCmd = new InsertTypeAbove(client);
    let insertTypeAboveDisposable = vscode.commands.registerCommand(insertTypeAboveCmd.id, insertTypeAboveCmd.handler);
    context.subscriptions.push(insertTypeAboveDisposable);
}

/**
 * Register the target selection button in the status bar
 */
function registerTargetSelection(targets: string[], setTarget: (newTarget: string[]) => void) {
    if (!targets || targets.length == 0) return;

    const allTargets = 'All targets';
    const barItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    barItem.text = allTargets;
    barItem.command = 'haskero.selectTargets';
    barItem.show();

    vscode.commands.registerCommand('haskero.selectTargets', () => {
        vscode.window.showQuickPick([allTargets].concat(targets)).then((newTarget) => {
            const isAll = newTarget === allTargets;
            setTarget(!isAll ? [newTarget] : targets);
            barItem.text = isAll ? allTargets : newTarget.split(':').splice(1).join(':')
        });
    });
}