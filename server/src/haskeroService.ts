'use strict';

import * as vsrv from 'vscode-languageserver';
import * as uuid from 'node-uuid'
import * as tmp from 'tmp'
import * as fs from 'fs'

import child_process = require('child_process');
import { InteroProxy } from './intero/interoProxy';
import { InitRequest, InitResponse } from './intero/commands/init';
import { ReloadRequest, ReloadResponse } from './intero/commands/reload';
import { InteroDiagnostic, InteroDiagnosticKind } from './intero/commands/interoDiagnostic'
import { LocAtRequest, LocAtResponse } from './intero/commands/locAt'
import { UsesRequest, UsesResponse } from './intero/commands/uses'
import { TypeAtRequest, TypeAtResponse, TypeInfoKind } from './intero/commands/typeAt'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { CompleteRequest, CompleteResponse } from './intero/commands/complete'
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './utils/documentUtils'
import { UriUtils } from './utils/uriUtils';
import { DebugUtils } from './debug/debugUtils'
import { Features } from './features/features'
import { CompletionUtils } from './completionUtils'
import { HaskeroSettings, InteroSettings } from './haskeroSettings'
import { InteroRequest } from "./intero/commands/interoRequest";
import { InteroResponse } from "./intero/commands/interoResponse";
import { platform } from 'os';

const serverCapabilities: vsrv.InitializeResult = {
    capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: vsrv.TextDocumentSyncKind.Full,
        // // support type info on hover
        // hoverProvider: true,
        // // support goto definition
        // definitionProvider: true,
        // // support find usage (ie: find all references)
        // referencesProvider: true,
        // // Tell the client that the server support code complete
        // completionProvider: {
        //     // doesn't support completion details
        //     resolveProvider: false
        // }
    }
}

/**
 * Exposes all haskero capabilities to the server
 */
export class HaskeroService {
    private interoProxy: InteroProxy;
    private connection: vsrv.IConnection;
    private features: Features;
    private initializationOk: boolean;
    private interoNotFOunt = "Executable named intero not found";
    private settings: HaskeroSettings;
    private currentTargets: string[];


    public executeInteroRequest<V extends InteroResponse>(request: InteroRequest<V>): Promise<V> {
        return request.send(this.interoProxy);
    }

    public async initialize(connection: vsrv.IConnection, settings: HaskeroSettings, targets: string[]): Promise<vsrv.InitializeResult> {
        connection.console.log("Initializing Haskero...");
        this.settings = settings;
        this.connection = connection;
        this.features = new Features(connection);
        this.currentTargets = targets;

        try {
            await this.startInteroAndHandleErrors(targets);

            //server capabilities are sent later with a client/registerCapability request (just send the document sync capability here)
            //see onInitialized method
            this.initializationOk = true;
            return serverCapabilities;
        }
        catch (e) {
            this.initializationOk = false;
            throw e;
        }
    }

    public onInitialized() {
        if (this.initializationOk) {
            this.features.registerAllFeatures();
            this.connection.console.log("Haskero initialization done.");
        }
        else {
            this.connection.console.log("Haskero initialization failed.");
        }
    }

    private async startInteroAndHandleErrors(targets: string[]): Promise<void> {
        // Launch the intero process
        try {
            await this.spawnIntero(targets);
            return;
        }
        catch (reason) {
            throw <vsrv.InitializeError>({
                code: 1,
                message: reason,
                retry: false,
                data: { retry: false }
            });
        }
    }


    public async changeTargets(targets: string[]): Promise<string> {
        // It seems that we have to restart ghci to set new targets,
        // would be nice if there were a ghci command for it.

        const prettyString = (ts) => {
            if (ts.length === 0) {
                return "default targets";
            }
            else {
                return `${ts.join(' ')}`;
            }
        }

        this.connection.console.log('Restarting intero with targets: ' + prettyString(targets));
        try {
            await this.startInteroAndHandleErrors(targets);
            this.connection.console.log("Restart done.");
            this.features.registerAllFeatures();
            this.currentTargets = targets;
            return 'Intero restarted with targets: ' + prettyString(targets);
        }
        catch (reason) {
            this.features.unregisterAllFeatures();
            throw reason.message;
        }
    }

    public async changeSettings(newSettings: HaskeroSettings): Promise<string> {
        //if ghci options have changed we need to restart intero
        if (this.settings.intero.ignoreDotGhci != newSettings.intero.ignoreDotGhci ||
            this.settings.intero.stackPath != newSettings.intero.stackPath ||
            JSON.stringify(this.settings.intero.startupParams.sort()) != JSON.stringify(newSettings.intero.startupParams.sort()) ||
            JSON.stringify(this.settings.intero.ghciOptions.sort()) != JSON.stringify(newSettings.intero.ghciOptions.sort())) {

            // console.log("change in settings detected\r\n>old settings:\r\n");
            // console.dir(this.settings);
            // console.log("\r\nnew settings:\r\n");
            // console.dir(newSettings);

            this.settings = newSettings;
            //chaging targets restarts intero
            return await this.changeTargets(this.currentTargets);
        }
        else {
            this.settings = newSettings;
            return "Settings updated";
        }
    }

    public async getDefinitionLocation(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.Location> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        const locAtRequest = new LocAtRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        let response = await locAtRequest.send(this.interoProxy);
        if (response.isOk) {
            let fileUri = UriUtils.toUri(response.filePath);
            let loc = vsrv.Location.create(fileUri, DocumentUtils.toVSCodeRange(response.range));
            return loc;
        }
        else {
            return null;
        }
    }

    public async getHoverInformation(textDocument: vsrv.TextDocument, position: vsrv.Position, infoKind: TypeInfoKind): Promise<vsrv.Hover> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        if (!wordRange.isEmpty) {
            const typeAtRequest = new TypeAtRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word, infoKind);
            let response = await typeAtRequest.send(this.interoProxy);
            let typeInfo: vsrv.MarkedString = { language: 'haskell', value: response.type };
            let hover: vsrv.Hover = { contents: typeInfo };
            if (typeInfo.value !== null && typeInfo.value !== "") {
                return hover;
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }

    public getCompletionItems(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.CompletionItem[]> {
        const currentLine = DocumentUtils.getPositionLine(textDocument, position);
        if (currentLine.startsWith("import ")) {
            return CompletionUtils.getImportCompletionItems(this.interoProxy, textDocument, position, currentLine);
        }
        else {
            return CompletionUtils.getDefaultCompletionItems(this.interoProxy, textDocument, position, this.settings.maxAutoCompletionDetails);
        }
    }

    public getResolveInfos(item: vsrv.CompletionItem): Promise<vsrv.CompletionItem> {
        return CompletionUtils.getResolveInfos(this.interoProxy, item);
    }

    public async getReferencesLocations(textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.Location[]> {
        let wordRange = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.Stop);
        const usesRequest = new UsesRequest(textDocument.uri, DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        let response = await usesRequest.send(this.interoProxy);
        if (response.isOk) {
            return response.locations.map((interoLoc) => {
                let fileUri = UriUtils.toUri(interoLoc.file);
                return vsrv.Location.create(fileUri, DocumentUtils.toVSCodeRange(interoLoc.range));
            });
        }
        else {
            return null;
        }
    }

    public async validateTextDocument(connection: vsrv.IConnection, textDocument: vsrv.TextDocumentIdentifier): Promise<void> {
        let problems = 0;
        DebugUtils.instance.connectionLog("validate : " + textDocument.uri);

        //when a file is opened in diff mode in VSCode, its url is not a path on disk
        if (UriUtils.isFileProtocol(textDocument.uri)) {
            const reloadRequest = new ReloadRequest(textDocument.uri);
            DebugUtils.instance.connectionLog(textDocument.uri);

            let response = await reloadRequest.send(this.interoProxy);
            this.sendDocumentDiagnostics(connection, response.diagnostics.filter(d => {
                return d.filePath.toLowerCase() === UriUtils.toFilePath(textDocument.uri).toLowerCase();
            }), textDocument.uri);
            return;
        }
        else {
            return;
        }
    }

    private getStartupParameters(): string[] {
        let ghciOptions: string[] = [];
        if (this.settings.intero.ignoreDotGhci) {
            ghciOptions.push('-ignore-dot-ghci');
        }
        ghciOptions = ghciOptions.concat(this.settings.intero.ghciOptions);
        //concat startup params AFTER default ghci-options (otherwise, it's impossible to override default ghci-options like -fno-warn-name-shadowing)
        return [`--ghci-options=${ghciOptions.join(' ')}`]
            .concat(this.settings.intero.startupParams);
    }

    private prettifyStartupParamsCmd(parameters: string[]) {
        return parameters.map(p => {
            if (p.indexOf(' ') > -1) {
                return "\"" + p + "\"";
            }
            else {
                return p;
            }
        }).join(' ');
    }

    /**
     * Spawn an intero process (stack ghci --with-ghc intero ... targets)
     * and set `interoProxy`.
     */
    private spawnIntero(targets: string[]): Promise<InitResponse> {
        const rootOptions = ['ghci', '--with-ghc', 'intero'];
        const allOptions = rootOptions.concat(this.getStartupParameters()).concat(targets);
        const stackPath = this.settings.intero.stackPath;

        this.connection.console.log(`Spawning process 'stack' with command '${stackPath} ${this.prettifyStartupParamsCmd(allOptions)}'`);

        if (this.interoProxy) {
            this.interoProxy.kill();
        }

        let intero;
        if (process.platform === 'win32') {
            let options = allOptions.map(x => x.includes(' ') ? `"${x}"` : x);
            intero = child_process.exec(`chcp 65001 & "${stackPath}" ${options.join(' ')} `);
        } else {
            intero = child_process.spawn(stackPath, allOptions);
        }
        this.interoProxy = new InteroProxy(intero);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return new InitRequest()
                    .send(this.interoProxy)
                    .then((resp: InitResponse) => resolve(resp))
                    .catch(reason => {
                        if (reason.indexOf(this.interoNotFOunt, 0) > -1) {
                            return reject("Intero is not installed. See installation instructions here : https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing (details in Haskero tab output)\r\n\r\nDetails\r\n\r\n" + reason);
                        }
                        reject(reason);
                    })
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