/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	InitializeParams, InitializeResult, TextDocumentPositionParams,
	CompletionItem, CompletionItemKind, Files
} from 'vscode-languageserver';

import child_process = require('child_process');
import {InteroProxy} from './intero/interoProxy';
import {InitRequest, InitResponse} from './intero/commands/init';
import {ReloadRequest, ReloadResponse} from './intero/commands/reload';
import {InteroDiagnostic} from './intero/commands/interoDiagnostic'

import {Uri} from './intero/uri';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);
const interoProxy = new InteroProxy(intero);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;
	connection.console.log("onInitialize");

	const initRequest = new InitRequest();
	initRequest.send(interoProxy, (resp: InitResponse) => { connection.console.log("intero init done"); });

	return {
		capabilities: {

			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	connection.console.log(change.document.uri);
	validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
	languageServerExample: ExampleSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = settings.languageServerExample.maxNumberOfProblems || 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: TextDocument): void {

	let problems = 0;
	connection.console.log(textDocument.uri);
	var ur = new Uri(textDocument.uri);
	const reloadRequest = new ReloadRequest(new Uri(textDocument.uri));
	connection.console.log(reloadRequest.filePath);

	reloadRequest.send(interoProxy, (response : ReloadResponse) => {
		let diagnostics: Diagnostic[] = [];
		diagnostics = response.diagnostics.
		filter(d => d.filePath.toLowerCase() == ur.toFilePath().toLowerCase()).map((interoDiag : InteroDiagnostic) : Diagnostic => {
			return {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: { line: interoDiag.line, character: interoDiag.col},
					end: { line: interoDiag.line, character: interoDiag.col }
				},
				message: interoDiag.message,
				source: 'intero'
			}
		});
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	});

	// diagnostics.push({
	// 			severity: DiagnosticSeverity.Warning,
	// 			range: {
	// 				start: { line: i, character: index},
	// 				end: { line: i, character: index + 10 }
	// 			},
	// 			message: `${line.substr(index, 10)} should be spelled TypeScript`,
	// 			source: 'ex'
	// 		});


	// Send the computed diagnostics to VSCode.

}

connection.onDidChangeWatchedFiles((change) => {
	// Monitored files have change in VSCode
	connection.console.log('We recevied an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.

	const file = textDocumentPosition.textDocument.uri;







	return [
		{
			label: 'Ls',
			kind: CompletionItemKind.Text,
			data: { id: 1, text: 'test.toString()' }
		},
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text,
			data: { id: 2, text: 'details' }
		}
	]
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data.id === 1) {
		item.detail = 'Ls details';
		item.documentation = item.data.text;
	} else if (item.data.id === 2) {
		item.detail = 'JavaScript details';
		item.documentation = item.data.text;
	}
	return item;
});

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});

connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();