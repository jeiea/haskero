'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { InsertTypeAbove } from './commands/insertTypeAbove'
import { SelectTarget } from './commands/selectTargets'
import { EditorUtils } from './utils/editorUtils'
import { getTargets } from './utils/stack';
import { allTargets, convertTargets } from './utils/targets';
import { HaskeroClient, HaskeroClientInitOptions } from './utils/haskeroClient';

export function activate(context: vscode.ExtensionContext) {

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));

    let haskeroClient = new HaskeroClient(serverModule, false);

    getTargets()
        .then((targets) => {
            let initOptions: HaskeroClientInitOptions = {
                targets: targets
            };

            haskeroClient.start(initOptions);

            // Register all plugin commands
            registerCommands(haskeroClient, context);

            // Create the target selection button
            createTargetSelectionButton(context);

            // Push the disposable to the context's subscriptions so that the
            // client can be deactivated on extension deactivation
            context.subscriptions.push(haskeroClient);
        })
        .catch(reason => {
            console.log('Error loading stack: ' + reason);
        });
}

/**
 * Register all Haskero available commands
 */
function registerCommands(haskeroClient: HaskeroClient, context: vscode.ExtensionContext) {
    const cmds = [
        new InsertTypeAbove(haskeroClient),
        new SelectTarget(haskeroClient),
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
    barItem.text = allTargets;
    barItem.command = SelectTarget.id;
    barItem.show();
    context.subscriptions.push(
        SelectTarget.onTargetsSelected.event((newTarget) => {
            const isAll = newTarget === allTargets
            barItem.text = isAll ? newTarget : newTarget.split(':').splice(1).join(':')
        })
    );
}