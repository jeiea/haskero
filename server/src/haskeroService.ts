import * as vsrv from 'vscode-languageserver';

import child_process = require('child_process');
import { InteroProxy } from './intero/interoProxy';
import { InitRequest, InitResponse } from './intero/commands/init';
import { ReloadRequest, ReloadResponse } from './intero/commands/reload';
import { InteroDiagnostic, InteroDiagnosticKind } from './intero/commands/interoDiagnostic'
import { LocAtRequest, LocAtResponse } from './intero/commands/locAt'
import { UsesRequest, UsesResponse } from './intero/commands/uses'
import { TypeAtRequest, TypeAtResponse } from './intero/commands/typeAt'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './documentUtils'
import { UriUtils } from './intero/uri';
import { DebugUtils } from './debug/debugUtils'

const serverCapabilities: vsrv.InitializeResult = {
    capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: vsrv.TextDocumentSyncKind.Full,
        // support type info on hover
        hoverProvider: true,
        // support goto definition
        definitionProvider: true,
        // support find usage (ie: find all references)
        referencesProvider: true,
        // Tell the client that the server support code complete
        completionProvider: {
            // doesn't support completion details
            resolveProvider: false
        }
    }
}

/**
 * Exposes all haskero capabilities to the server
 */
export class HaskeroService {
    private interoProxy: InteroProxy;
    private connection: vsrv.IConnection;

    public initialize(connection: vsrv.IConnection, targets: string[]): Promise<vsrv.InitializeResult> {
        connection.console.log("Initializing Haskero...");
        this.connection = connection;

        return this.startInteroAndHandleErrors(targets)
            .then(() => {
                this.connection.console.log("Haskero initialization done.");
                return Promise.resolve(serverCapabilities);
            });
    }

    private startInteroAndHandleErrors(targets: string[]): Promise<void> {
        // Launch the intero process
        return this.spawnIntero(targets)
            .then((resp): Promise<void> => {
                if (resp.isInteroInstalled) {
                    return Promise.resolve();
                } else {
                    return Promise.reject("Intero is not installed. See installation instructions here : https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing");
                }
            })
            .catch(reason => {
                return Promise.reject<vsrv.InitializeError>({
                    code: 1,
                    message: reason + ". Look Haskero output tab for further information",
                    data: { retry: false }
                });
            });
    }

    public changeTargets(targets: string[]): Promise<string> {
        // It seems that we have to restart ghci to set new targets,
        // would be nice if there were a ghci command for it.
        this.connection.console.log(`Restarting intero with targets: ${targets}`)
        return this.startInteroAndHandleErrors(targets)
            .then((): Promise<string> => {
                this.connection.console.log("Restart done.");
                return Promise.resolve(`Intero restarted with targets: ${targets}`);
                //check opened documents
            });
    }

    public getDefinitionLocation(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.Location> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        const locAtRequest = new LocAtRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        return locAtRequest
            .send(this.interoProxy)
            .then((response): Promise<vsrv.Location> => {
                if (response.isOk) {
                    let fileUri = UriUtils.toUri(response.filePath);
                    let loc = vsrv.Location.create(fileUri, DocumentUtils.toVSCodeRange(response.range));
                    return Promise.resolve(loc);
                }
                else {
                    return Promise.resolve(null);
                }
            });
    }

    public getHoverInformation(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.Hover> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        if (!wordRange.isEmpty) {
            const typeAtRequest = new TypeAtRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
            return typeAtRequest
                .send(this.interoProxy)
                .then((response): Promise<vsrv.Hover> => {
                    let typeInfo: vsrv.MarkedString = { language: 'haskell', value: response.type };
                    let hover: vsrv.Hover = { contents: typeInfo };
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

    public getCompletionItems(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.CompletionItem[]> {
        let {word, range} = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new CompleteAtRequest(textDocument.uri, DocumentUtils.toInteroRange(range), word);

        return completeAtRequest
            .send(this.interoProxy)
            .then((response: CompleteAtResponse) => {
                return response.completions.map(c => { return { label: c, kind: vsrv.CompletionItemKind.Variable }; });
            });
    }

    public getReferencesLocations(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.Location[]> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        const usesRequest = new UsesRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        return usesRequest
            .send(this.interoProxy)
            .then((response): Promise<vsrv.Location[]> => {
                if (response.isOk) {
                    return Promise.resolve(
                        response.locations.map((interoLoc) => {
                            let fileUri = UriUtils.toUri(interoLoc.file);
                            return vsrv.Location.create(fileUri, DocumentUtils.toVSCodeRange(interoLoc.range));
                        })
                    );
                }
                else {
                    return Promise.resolve(null);
                }
            });
    }

    public validateTextDocument(connection: vsrv.IConnection, textDocument: vsrv.TextDocumentIdentifier): Promise<void> {
        let problems = 0;
        DebugUtils.instance.connectionLog("validate : " + textDocument.uri);

        //when a file is opened in diff mode in VSCode, its url is not a path on disk
        if (UriUtils.isFileProtocol(textDocument.uri)) {
            const reloadRequest = new ReloadRequest(textDocument.uri);
            DebugUtils.instance.connectionLog(textDocument.uri);

            return reloadRequest
                .send(this.interoProxy)
                .then((response: ReloadResponse) => {
                    this.sendDocumentDiagnostics(connection, response.diagnostics.filter(d => {
                        return d.filePath.toLowerCase() === UriUtils.toFilePath(textDocument.uri).toLowerCase();
                    }), textDocument.uri);
                    return Promise.resolve();
                });
        }
        else {
            return Promise.resolve();
        }
    }

    /**
     * Spawn an intero process (stack ghci --with-ghc intero ... targets)
     * and set `interoProxy`.
     */
    private spawnIntero(targets: string[]): Promise<InitResponse> {
        const stackOptions = ['ghci', '--with-ghc', 'intero', '--no-build', '--no-load', '--ghci-options="-ignore-dot-ghci -Wall"'].concat(targets);
        this.connection.console.log(`Spawning process 'stack' with command 'stack ${stackOptions.join(' ')}'`);

        if (this.interoProxy) {
            this.interoProxy.kill();
        }

        const intero = child_process.spawn('stack', stackOptions);
        this.interoProxy = new InteroProxy(intero);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return new InitRequest()
                    .send(this.interoProxy)
                    .then((resp: InitResponse) => resolve(resp))
                    .catch(reject)
            }, 2000)
        });
    }

    private sendAllDocumentsDiagnostics(connection: vsrv.IConnection, interoDiags: InteroDiagnostic[]) {
        //map the interoDiag to a vsCodeDiag and add it to the map of grouped diagnostics
        let addToMap = (accu: Map<string, vsrv.Diagnostic[]>, interoDiag: InteroDiagnostic): Map<string, vsrv.Diagnostic[]> => {
            let uri = UriUtils.toUri(interoDiag.filePath);
            let vsCodeDiag = this.interoDiagToVScodeDiag(interoDiag);
            if (accu.has(uri)) {
                accu.get(uri).push(vsCodeDiag);
            }
            else {
                let vsCodeDiags = new Array<vsrv.Diagnostic>();
                vsCodeDiags.push(vsCodeDiag);
                accu.set(uri, vsCodeDiags);
            }
            return accu;
        };

        //group diag by uri
        let groupedDiagnostics = interoDiags.reduce<Map<string, vsrv.Diagnostic[]>>(addToMap, new Map<string, vsrv.Diagnostic[]>());

        groupedDiagnostics.forEach((diags, documentUri) => {
            connection.sendDiagnostics({ uri: documentUri, diagnostics: diags });
        });
    }

    private interoDiagToVScodeDiag(interoDiag: InteroDiagnostic): vsrv.Diagnostic {
        return {
            severity: interoDiag.kind === InteroDiagnosticKind.error ? vsrv.DiagnosticSeverity.Error : vsrv.DiagnosticSeverity.Warning,
            range: {
                start: { line: interoDiag.line, character: interoDiag.col },
                end: { line: interoDiag.line, character: interoDiag.col }
            },
            message: interoDiag.message,
            source: 'hs'
        };
    }

    private sendDocumentDiagnostics(connection: vsrv.IConnection, interoDiags: InteroDiagnostic[], documentUri: string) {
        let diagnostics: vsrv.Diagnostic[] = [];
        diagnostics = interoDiags.map(this.interoDiagToVScodeDiag);
        connection.sendDiagnostics({ uri: documentUri, diagnostics });
    }
}