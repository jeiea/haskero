'use strict';

import * as vsrv from 'vscode-languageserver';
import { DebugUtils } from './debug/debugUtils'
import { HaskeroService } from './haskeroService'
import { UriUtils } from './intero/uri';

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
    return haskeroService.initialize(connection, params.initializationOptions.targets);
});
// connection.onNotification("setTargets", (targets: string[]) => {
//     haskeroService.setTargets(targets, () => {
//         // Revalidate any open text documents
//         documents.all().forEach((doc) =>
//             haskeroService.validateTextDocument(connection, doc))
//     });
// });

connection.onRequest("changeTargets", (targets: string[]): Promise<string> => {
    return haskeroService.changeTargets(targets);
    // () => {
    //     // Revalidate any open text documents
    //     documents.all().forEach((doc) =>
    //         haskeroService.validateTextDocument(connection, doc))

});

documents.onDidOpen((event): Promise<void> => {
    return haskeroService.validateTextDocument(connection, event.document);
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
    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getHoverInformation(textDocument, documentInfo.position);
    }
});

connection.onCompletion((documentInfo): Promise<vsrv.CompletionItem[]> => {
    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getCompletionItems(textDocument, documentInfo.position);
    }
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