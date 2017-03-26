'use strict';

import * as vsrv from 'vscode-languageserver';
import { DebugUtils } from './debug/debugUtils'
import { HaskeroService } from './haskeroService'
import { UriUtils } from './intero/uri';
import { HaskeroSettings, InteroSettings } from './haskeroSettings'


// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: vsrv.IConnection = vsrv.createConnection(new vsrv.IPCMessageReader(process), new vsrv.IPCMessageWriter(process));
DebugUtils.init(false, connection);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: vsrv.TextDocuments = new vsrv.TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let haskeroService: HaskeroService;

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
connection.onInitialize((params): Promise<vsrv.InitializeResult> => {
    workspaceRoot = params.rootPath;
    haskeroService = new HaskeroService();
    console.dir(params.initializationOptions.settings);
    return haskeroService.initialize(connection, params.initializationOptions.settings, params.initializationOptions.targets);
});

connection.onRequest("changeTargets", (targets: string[]): Promise<string> => {
    return haskeroService.changeTargets(targets)
        .then((msg) => {
            documents.all().forEach((doc) => haskeroService.validateTextDocument(connection, doc));
            return Promise.resolve(msg);
        });
});

documents.onDidOpen((event): Promise<void> => {
    return haskeroService.validateTextDocument(connection, event.document);
});

connection.onInitialized((initializedParams: vsrv.InitializedParams) => {
    haskeroService.onInitialized();
});

// The settings have changed. Is sent on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
    let settings = <HaskeroSettings>change.settings.haskero;
    console.dir(settings);
    haskeroService.changeSettings(settings);
    // Revalidate any open text documents
    documents.all().forEach(<(value: vsrv.TextDocument, index: number, array: vsrv.TextDocument[]) => void>Function.bind(haskeroService.validateTextDocument, connection));
});

connection.onDefinition((documentInfo): Promise<vsrv.Location> => {
    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getDefinitionLocation(textDocument, documentInfo.position);
    }
});

connection.onHover((documentInfo): Promise<vsrv.Hover> => {
    DebugUtils.instance.connectionLog("onHover request");

    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getHoverInformation(textDocument, documentInfo.position);
    }
});

connection.onCompletion((documentInfo: vsrv.TextDocumentPositionParams): Promise<vsrv.CompletionItem[]> => {
    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getCompletionItems(textDocument, documentInfo.position);
    }
});

connection.onCompletionResolve((item: vsrv.CompletionItem) => {
    return haskeroService.getResolveInfos(item);
});

connection.onReferences((referenceParams: vsrv.ReferenceParams): Promise<vsrv.Location[]> => {
    const documentURI = referenceParams.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getReferencesLocations(textDocument, referenceParams.position);
    }
});

documents.onDidSave(e => {
    return haskeroService.validateTextDocument(connection, e.document);
});

// Listen on the connection
connection.listen();