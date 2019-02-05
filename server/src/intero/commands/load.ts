'use strict';

import { allMatchs } from "../../utils/regexpUtils";
import { UriUtils } from '../../utils/uriUtils';
import { InteroAgent } from '../interoAgent';
import { InteroUtils } from '../interoUtils';
import { IInteroDiagnostic, IInteroRequest, IInteroResponse, InteroDiagnosticKind } from "./abstract";

/**
 * Load response, returns diagnostics (errors and warnings)
 */
export class LoadResponse implements IInteroResponse {

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

    private _diagnostics: IInteroDiagnostic[];
    public get diagnostics(): IInteroDiagnostic[] {
        return this._diagnostics;
    }

    public readonly errors: IInteroDiagnostic[];
    public readonly warnings: IInteroDiagnostic[];

    public constructor(rawout: string, rawerr: string, parseDiagnostics: boolean) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        if (parseDiagnostics) {
            //find errors first
            const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchErrors = this.removeDuplicates(allMatchs(rawerr, regErrors));
            this.errors = matchErrors.map(this.matchTo(InteroDiagnosticKind.error));

            const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchWarnings = this.removeDuplicates(allMatchs(rawerr, regWarnings));
            this.warnings = matchWarnings.map(this.matchTo(InteroDiagnosticKind.warning));

            this._diagnostics = this.errors.concat(this.warnings);
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
    private matchTo = (kind: InteroDiagnosticKind) => (match: RegExpExecArray): IInteroDiagnostic => {
        return new IInteroDiagnostic(match[1], +match[2], +match[3], match[4], kind);
    }
}

/**
 * Reload request
 */
export class LoadRequest implements IInteroRequest<LoadResponse> {

    public constructor(
        private readonly uris: string[],
        private readonly parseDiagnostics: boolean
    ) { }

    public async send(interoAgent: InteroAgent): Promise<LoadResponse> {
        const filePaths = this.uris.map(UriUtils.toFilePath);
        const escapedFilePaths = filePaths.map(InteroUtils.escapeFilePath);
        const load = `:l ${escapedFilePaths.join(' ')}`;
        let response = await interoAgent.evaluate(load)
        return new LoadResponse(response.rawout, response.rawerr, this.parseDiagnostics);
    }
}
