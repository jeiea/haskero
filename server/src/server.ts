/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter, Hover,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	InitializeParams, InitializeResult, TextDocumentPositionParams,
	CompletionItem, CompletionItemKind, Files, TextDocumentIdentifier, Location, Range, Position
} from 'vscode-languageserver';

import child_process = require('child_process');
import {InteroProxy} from './intero/interoProxy';
import {InitRequest, InitResponse} from './intero/commands/init';
import {ReloadRequest, ReloadResponse} from './intero/commands/reload';
import {InteroDiagnostic, InteroDiagnosticKind} from './intero/commands/interoDiagnostic'
import {LocAtRequest, LocAtResponse} from './intero/commands/locAt'
import {TypeAtRequest, TypeAtResponse} from './intero/commands/typeAt'
import {CompleteAtRequest, CompleteAtResponse} from './intero/commands/completeAt'
import {DocumentUtils, WordSpot, NoMatchAtCursorBehaviour} from './documentUtils'


import {UriUtils} from './intero/uri';

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
	connection.console.log("Initializing intero...");

	const initRequest = new InitRequest();
	initRequest.send(interoProxy)
		.then((resp: InitResponse) => { connection.console.log("Intero initialization done."); });

	return {
		capabilities: {

			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			hoverProvider: true,
			definitionProvider: true,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
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

connection.onDefinition((documentInfo): Promise<Location> => {
	if (UriUtils.isFileProtocol(documentInfo.textDocument.uri)) {
		let doc = documents.get(documentInfo.textDocument.uri);
		let filePath = UriUtils.toFilePath(documentInfo.textDocument.uri);
		let wordRange = DocumentUtils.getIdentifierAtPosition(doc, documentInfo.position, NoMatchAtCursorBehaviour.Stop);
		const locAtRequest = new LocAtRequest(filePath, wordRange.range.start.line + 1, wordRange.range.start.character, wordRange.range.end.line + 1, wordRange.range.end.character, wordRange.word);

		return locAtRequest.send(interoProxy)
			.then((response) => {
				let fileUri = UriUtils.toUri(response.filePath);
				let loc = Location.create(fileUri, Range.create(Position.create(response.startLine - 1, response.startColumn - 1), Position.create(response.endLine - 1, response.endColumn - 1)));
				return Promise.resolve(loc);
			});
	}
});

connection.onHover((documentInfo): Promise<Hover> => {
	if (UriUtils.isFileProtocol(documentInfo.textDocument.uri)) {
		let doc = documents.get(documentInfo.textDocument.uri);
		let filePath = UriUtils.toFilePath(documentInfo.textDocument.uri);
		let wordRange = DocumentUtils.getTextAtPosition(doc, documentInfo.position, NoMatchAtCursorBehaviour.Stop);

		if (!wordRange.isEmpty) {
			const typeAtRequest = new TypeAtRequest(filePath, wordRange.range.start.line + 1, wordRange.range.start.character, wordRange.range.end.line + 1, wordRange.range.end.character, wordRange.word);
			return typeAtRequest.send(interoProxy).then((response) => {
				let typeInfo = { language: 'haskell', value: response.type };
				let hover = { contents: typeInfo };
				if (typeInfo.value !== null) {
					return Promise.resolve(hover);
				}
				else {
					return Promise.resolve(null);
				}
			});
		}
		else {
			return Promise.resolve(null);
		}
	}
});

function validateTextDocument(textDocument: TextDocumentIdentifier): void {
	let problems = 0;
	connection.console.log("validate : " + textDocument.uri);

	if (UriUtils.isFileProtocol(textDocument.uri)) {
		const reloadRequest = new ReloadRequest(textDocument.uri);
		connection.console.log(reloadRequest.filePath);

		reloadRequest.send(interoProxy)
			.then((response: ReloadResponse) => {
				let diagnostics: Diagnostic[] = [];
				console.log("err/war number before filter : " + response.diagnostics.length);
				diagnostics = response.diagnostics.
					filter(d => {
						// console.log("file path doc : [" + d.filePath.toLowerCase() + "]");
						// console.log("file path diag : [" + UriUtils.toFilePath(textDocument.uri).toLowerCase() + "]");
						return d.filePath.toLowerCase() === UriUtils.toFilePath(textDocument.uri).toLowerCase();
					}).map((interoDiag: InteroDiagnostic): Diagnostic => {
						return {
							severity: interoDiag.kind === InteroDiagnosticKind.error ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
							range: {
								start: { line: interoDiag.line, character: interoDiag.col },
								end: { line: interoDiag.line, character: interoDiag.col }
							},
							message: interoDiag.message,
							source: 'intero'
						}
					});
				console.log("err/war number after filter : " + diagnostics.length);
				connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
				return Promise.resolve();
			});
	}
}


// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.

	let doc = documents.get(textDocumentPosition.textDocument.uri);
	let filePath = UriUtils.toFilePath(textDocumentPosition.textDocument.uri);
	let {word, range} = DocumentUtils.getTextAtPosition(doc, textDocumentPosition.position, NoMatchAtCursorBehaviour.LookLeft);

	const completeAtRequest = new CompleteAtRequest(filePath, range.start.line + 1, range.start.character,
		range.end.line + 1, range.end.character, word);

	return completeAtRequest.send(interoProxy)
		.then((response: CompleteAtResponse) => {

			return response.completions.map(c => { return { label: c, kind: CompletionItemKind.Variable }; });
			// return [
			// 		{
			// 			label: 'Ls',
			// 			kind: CompletionItemKind.Text,
			// 			data: { id: 1, text: 'test.toString()' }
			// 		},
			// 		{
			// 			label: 'JavaScript',
			// 			kind: CompletionItemKind.Text,
			// 			data: { id: 2, text: 'details' }
			// 		}
			// 	]
		});
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	// if (item.data.id === 1) {
	// 	item.detail = 'Ls details';
	// 	item.documentation = item.data.text;
	// } else if (item.data.id === 2) {
	// 	item.detail = 'JavaScript details';
	// 	item.documentation = item.data.text;
	// }
	return item;
});

// connection.onDidOpenTextDocument((handler) => {
// 	connection.console.log(handler.textDocument.uri);i
// 	validateTextDocument(handler.textDocument);
// });

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
connection.onDidSaveTextDocument((handler) => {
	connection.console.log(handler.textDocument.uri);
	validateTextDocument(handler.textDocument);
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