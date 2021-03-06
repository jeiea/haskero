'use strict';

import * as vsrv from 'vscode-languageserver';
import { CodeActionService } from "./codeActions/codeActionService";
import { CommandsService } from "./commands/commandsService";
import { DebugUtils } from './debug/debugUtils';
import * as features from "./features";
import { HaskeroService } from './haskeroService';
import { HaskeroSettings } from './haskeroSettings';
import { TypeInfoKind } from './intero/commands/typeAt';
import { UriUtils } from './utils/uriUtils';


// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: vsrv.IConnection = vsrv.createConnection();
DebugUtils.init(false, connection);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: vsrv.TextDocuments = new vsrv.TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let haskeroService = new HaskeroService();

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
connection.onInitialize((params): Promise<vsrv.InitializeResult> => {
    workspaceRoot = params.rootPath;
    return haskeroService.initialize(connection, params.initializationOptions.settings, params.initializationOptions.targets);
});

connection.onRequest("changeTargets", (targets: string[]): Promise<string> => {
    return haskeroService.changeTargets(targets)
        .then((msg) => {
            documents.all().forEach((doc) => haskeroService.validateTextDocument(connection, doc));
            return Promise.resolve(msg);
        });
});

connection.onRequest("insertTypeAbove", (documentInfo): Promise<vsrv.Hover> => {
    const documentURI = documentInfo.textDocument.uri;
    if (UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getHoverInformation(textDocument, documentInfo.position, TypeInfoKind.Generic);
    }
});

connection.onExecuteCommand((exeCmdParams: vsrv.ExecuteCommandParams): void => {
    let cmd = CommandsService.getCommandInstance(exeCmdParams);
    if (!cmd) {
        console.log("Unknown command : ");
        console.dir(exeCmdParams);
        return null;
    }
    cmd.execute(connection.workspace, documents, haskeroService);
});

documents.onDidOpen((event): Promise<void> => {
    return haskeroService.validateTextDocument(connection, event.document);
});

connection.onInitialized((initializedParams: vsrv.InitializedParams) => {
    haskeroService.onInitialized();
});

// The settings have changed.
// Is sent on server activation as well.
connection.onDidChangeConfiguration((change) => {
    let settings = <HaskeroSettings>change.settings.haskero;
    DebugUtils.instance.isDebugOn = settings.debugMode;
    return haskeroService.changeSettings(settings)
        .then((msg) => {
            documents.all().forEach((doc) => haskeroService.validateTextDocument(connection, doc));
        })
        .catch(reason => {
            // A DidChangeConfiguration request doesn't have a response so we use showErrorMessage
            // to show an error message
            connection.window.showErrorMessage("Error while loading Haskero configuration: " + reason);
        });
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
        return haskeroService.getHoverInformation(textDocument, documentInfo.position, TypeInfoKind.Instanciated);
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

/**
 * Code action lifecycle:
 *  - a bunch of diagnostics are sent from the server to the client (errors, warings, etc)
 *  - each diagnostic is a candidate for a codeAction
 *  - each time the user is hovering a range of code where diagnosics are attached (warning, error, etc.) a codeAction request is sent
 *    from the client to the server (ie : this very function is executed) with all the diagnotics for this range of code sent as parameters
 *  - the codeAction request needs a response containing one or several commands with unique ID and custom parameters
 *  - the title of the commands are displayed to the user, next to the line
 *  - when the user clicks on a command, a commandRequest is sent to the server with the command id and custom parameters
 *  - the onExecuteCommand function is executed with the command id/parameters and a WorkspaceEdit response is sent back to the client
 *    to modify corresponding files
 */
connection.onCodeAction((params: vsrv.CodeActionParams): vsrv.Command[] => {
    let CAs = CodeActionService.CodeActions;
    return params.context.diagnostics
        .map(diag =>
            CAs.map(codeAction =>
                codeAction.getCommand(params.textDocument, diag)
            ))
        .reduce((accu, commands) => accu.concat(commands), []) //flatten commands[][] to commands[]
        .filter(c => c !== null);
});

connection.onRenameRequest(features.rename(documents, haskeroService));


documents.onDidSave(e => {
    return haskeroService.validateTextDocument(connection, e.document);
});

// Listen on the connection
connection.listen();