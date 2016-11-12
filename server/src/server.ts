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
import {DebugUtils} from './debug/DebugUtils'

import {UriUtils} from './intero/uri';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
DebugUtils.init(true, connection);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let interoProxy : InteroProxy;

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
connection.onInitialize((params): Promise<InitializeResult> => {
	workspaceRoot = params.rootPath;
	connection.console.log("Initializing intero...");

	//launch the intero process
	const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);
	interoProxy = new InteroProxy(intero);

	const initRequest = new InitRequest();
	return initRequest.send(interoProxy)
		.then((resp: InitResponse) => {
			connection.console.log("sdfdsf ");
			if (resp.isInteroInstalled) {
				connection.console.log("Intero initialization done.");
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
			}
			else {
				connection.console.log("Error: Intero is not installed. See installation instructions here : https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing");
				return {
					capabilities: {}
				}
			}
		});
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
		let wordRange = DocumentUtils.getIdentifierAtPosition(doc, documentInfo.position, NoMatchAtCursorBehaviour.Stop);

		if (!wordRange.isEmpty) {
			const typeAtRequest = new TypeAtRequest(filePath, wordRange.range.start.line + 1, wordRange.range.start.character, wordRange.range.end.line + 1, wordRange.range.end.character, wordRange.word);
			return typeAtRequest.send(interoProxy).then((response) => {
				let typeInfo = { language: 'haskell', value: response.type };
				let hover = { contents: typeInfo };
				if (typeInfo.value !== null && typeInfo.value !== "") {
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

function validateTextDocument(textDocument: TextDocumentIdentifier): Promise<void> {
	let problems = 0;
	connection.console.log("validate : " + textDocument.uri);

	if (UriUtils.isFileProtocol(textDocument.uri)) {
		const reloadRequest = new ReloadRequest(textDocument.uri);
		connection.console.log(reloadRequest.filePath);

		return reloadRequest.send(interoProxy)
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
	else {
		return Promise.resolve();
	}
}

// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.

	let doc = documents.get(textDocumentPosition.textDocument.uri);
	let filePath = UriUtils.toFilePath(textDocumentPosition.textDocument.uri);
	let {word, range} = DocumentUtils.getIdentifierAtPosition(doc, textDocumentPosition.position, NoMatchAtCursorBehaviour.LookLeft);

	const completeAtRequest = new CompleteAtRequest(filePath, range.start.line + 1, range.start.character,
		range.end.line + 1, range.end.character, word);

	return completeAtRequest.send(interoProxy)
		.then((response: CompleteAtResponse) => {
			return response.completions.map(c => { return { label: c, kind: CompletionItemKind.Variable }; });
		});
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	return item;
});

documents.onDidSave( e => {
	connection.console.log(e.document.uri);
	return validateTextDocument(e.document);
});

// Listen on the connection
connection.listen();