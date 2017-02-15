'use strict';

import * as path from 'path';

import {
	window,
	workspace,
	commands,
	Disposable,
	ExtensionContext,
	StatusBarAlignment,
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from 'vscode-languageclient';

import { getTargets } from './stack';

export function activate(context: ExtensionContext) {
	const disposables: Disposable[] = [];

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));

	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };

	// The language client
	let languageClient: LanguageClient;

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc } //, options: debugOptions }
	}

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: ['haskell'],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: 'languageServerExample',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		initializationOptions: {
			targets: []
		}
	}

	getTargets().then((targets) => {
		clientOptions.initializationOptions.targets = targets;

		// Create the language client and start the client.
		languageClient = new LanguageClient('Haskero', 'Haskero', serverOptions, clientOptions, false);

		// Create the target selection button
		registerTargetSelection(targets, (newTargets) =>
			languageClient.sendNotification('setTargets', [newTargets]));

		// Push the disposable to the context's subscriptions so that the
		// client can be deactivated on extension deactivation
		context.subscriptions.push(languageClient.start());
	});
}

function registerTargetSelection(targets: string[], setTarget: (newTarget: string[]) => void) {
	if (!targets || targets.length == 0) return;

	const allTargets = 'All targets';
	const barItem = window.createStatusBarItem(StatusBarAlignment.Right, Number.MIN_VALUE);
	barItem.text = allTargets;
	barItem.command = 'haskero.selectTargets';
	barItem.show();

	commands.registerCommand('haskero.selectTargets', () => {
		window.showQuickPick([allTargets].concat(targets)).then((newTarget) => {
			const isAll = newTarget === allTargets;
			setTarget(!isAll ? [newTarget] : targets);
			barItem.text = isAll ? allTargets : newTarget.split(':').splice(1).join(':')
		});
	});
}