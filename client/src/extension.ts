'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { InsertTypeAbove } from './commands/insertTypeAbove'
import { SelectTarget } from './commands/selectTargets'
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

    getTargets().then((targets) => {
        clientOptions.initializationOptions.targets = targets;

        // Create the language client and start the client.
        client = new vscli.LanguageClient('Haskero', 'Haskero', serverOptions, clientOptions, false);

        // Register all plugin commands
        registerCommands(client, context);

        // Create the target selection button
        createTargetSelectionButton(context);

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());
    });
}

/**
 * Register all Haskero available commands
 */
function registerCommands(client: vscli.LanguageClient, context: vscode.ExtensionContext) {
    const cmds = [
        new InsertTypeAbove(client),
        new SelectTarget(client),
    ];

    cmds.forEach((cmd) => {
        context.subscriptions.push(vscode.commands.registerCommand(cmd.id, cmd.handler));
    });
}

/**
 * Create the Cabal target selection button in the status bar
 */
function createTargetSelectionButton(context: vscode.ExtensionContext) {
    const barItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    barItem.text = SelectTarget.allTargets;
    barItem.command = SelectTarget.id;
    barItem.show();
    context.subscriptions.push(
        SelectTarget.onTargetsSelected.event((newTarget) => {
            const isAll = newTarget === SelectTarget.allTargets
            barItem.text = isAll ? newTarget : newTarget.split(':').splice(1).join(':')
        })
    );
}