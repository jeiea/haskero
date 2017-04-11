'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { InsertTypeAbove } from './commands/insertTypeAbove'
import { SelectTarget } from './commands/selectTargets'
import { EditorUtils } from './utils/editorUtils'
import { getTargets } from './utils/stack';
import { noTargets, allTargets } from './utils/targets';
import { HaskeroClient, HaskeroClientInitOptions, InteroSettings, HaskeroSettings } from './utils/haskeroClient';

export function activate(context: vscode.ExtensionContext) {

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    let haskeroClient = new HaskeroClient(serverModule, true);

    let initOptions: HaskeroClientInitOptions = {
        settings: getSettings(),
        targets: [] //no target for starting the extension
    };

    haskeroClient.start(initOptions);

    registerCommands(haskeroClient, context);
    createTargetSelectionButton(context);

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(haskeroClient);
}

/**
 * Returns value if value is not null or undefined, otherwise returns defaultValue
*/
function df<T>(value: T, defaultValue: T): T {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    else {
        return value;
    }
}

function getSettings(): HaskeroSettings {
    ///get initialization settings from current workspace getConfiguration
    let interoSettings: InteroSettings = {
        stackPath: df(<string>vscode.workspace.getConfiguration('haskero.intero').get('stackPath'), 'stack'),
        startupParams: df(<[string]>vscode.workspace.getConfiguration('haskero.intero').get('startupParams'), ['--no-build', '--no-load']),
        ghciOptions: df(<[string]>vscode.workspace.getConfiguration('haskero.intero').get('ghciOptions'), ['-Wall']),
        ignoreDotGhci: df(<boolean>vscode.workspace.getConfiguration('haskero.intero').get('ignoreDotGhci'), true)
    };

    let haskeroSettings: HaskeroSettings = {
        intero: interoSettings,
        debugMode: df(<boolean>vscode.workspace.getConfiguration('haskero').get('debugMode'), false),
        maxAutoCompletionDetails: df(<number>vscode.workspace.getConfiguration('haskero').get('maxAutoCompletionDetails'), 100)
    }

    return haskeroSettings;
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
    barItem.text = "Default target";
    barItem.command = SelectTarget.id;
    barItem.show();
    context.subscriptions.push(
        SelectTarget.onTargetsSelected.event((haskeroTargets) => {
            barItem.text = haskeroTargets.toText();
        })
    );
}