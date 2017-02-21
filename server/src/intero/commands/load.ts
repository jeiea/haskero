'use strict';

import { RawResponse, InteroProxy } from '../interoProxy'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { InteroDiagnostic, InteroDiagnosticKind } from './interoDiagnostic'
import { InteroUtils } from '../interoUtils'
import { UriUtils } from '../uri'

/**
 * Load response, returns diagnostics (errors and warnings)
 */
export class LoadResponse implements InteroResponse {

    private _filePath: string;
    private _isOk: boolean;
    private _rawout: string;
    private _rawerr: string;

    public get isOk(): boolean {
        return this._isOk;
    }

    public get rawout(): string {
        return this._rawout;
    }

    public get rawerr(): string {
        return this._rawerr;
    }

    private _diagnostics: InteroDiagnostic[];
    public get diagnostics(): InteroDiagnostic[] {
        return this._diagnostics;
    }

    public constructor(rawout: string, rawerr: string, parseDiagnostics: boolean) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        if (parseDiagnostics) {
            //find errors first
            const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchErrors = this.removeDuplicates(InteroUtils.allMatchs(rawerr, regErrors));
            let diagnostics = matchErrors.map(this.matchTo(InteroDiagnosticKind.error));

            const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchWarnings = this.removeDuplicates(InteroUtils.allMatchs(rawerr, regWarnings));
            diagnostics = diagnostics.concat(matchWarnings.map(this.matchTo(InteroDiagnosticKind.warning)));

            this._diagnostics = diagnostics;
        }
        else {
            this._diagnostics = [];
        }
    }

    private removeDuplicates(matches: RegExpExecArray[]): RegExpExecArray[] {
        let matchToKey = (m: RegExpExecArray) => m[0].trim();
        //List all matches and accumulate them in one object (hash key : match)
        let matchesSetObject = matches.reduce((accu, m) => { accu[matchToKey(m)] = m; return accu; }, {});
        //Get all values
        return Object.keys(matchesSetObject).map(key => matchesSetObject[key]);
    }

    //curried definition for partial application
    private matchTo = (kind: InteroDiagnosticKind) => (match: RegExpExecArray): InteroDiagnostic => {
        return new InteroDiagnostic(match[1], +match[2], +match[3], match[4], kind);
    }
}

/**
 * Reload request
 */
export class LoadRequest implements InteroRequest {

    public constructor(private readonly uri: string, private readonly parseDiagnostics) {

    }

    public send(interoProxy: InteroProxy): Promise<LoadResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        const load = `:l ${escapedFilePath}`;
        return interoProxy.sendRawRequest(load)
            .then((response: RawResponse) => {
                return Promise.resolve(new LoadResponse(response.rawout, response.rawerr, this.parseDiagnostics));
            });
    }
}