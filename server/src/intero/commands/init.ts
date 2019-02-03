'use strict';

import { InteroAgent } from '../interoAgent'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { InteroDiagnostic, InteroDiagnosticKind } from './interoDiagnostic'
import { InteroUtils } from '../interoUtils'
import { allMatchs } from "../../utils/regexpUtils";

/**
 * Response from interoInit request
 */
export class InitResponse implements InteroResponse {

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

    public constructor(rawout: string, rawerr: string) {
        this._rawout = rawout;
        this._rawerr = rawerr;

        this._isOk = true;

        //find errors first
        const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchErrors = this.removeDuplicates(allMatchs(rawerr, regErrors));
        let diagnostics = matchErrors.map(this.matchTo(InteroDiagnosticKind.error));

        const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchWarnings = this.removeDuplicates(allMatchs(rawerr, regWarnings));
        diagnostics = diagnostics.concat(matchWarnings.map(this.matchTo(InteroDiagnosticKind.warning)));

        this._diagnostics = diagnostics;
    }

    private removeDuplicates(matches: RegExpExecArray[]): RegExpExecArray[] {
        let matchToKey = (m: RegExpExecArray) => m[0].trim();
        //list all matches and accumulate them in one object (hash key : match)
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
 * Initialises intero.
 * Changes the EOC char used by intero proxy to slice stdin in several responses
 */
export class InitRequest implements InteroRequest<InitResponse> {

    public constructor() {
    }

    public async send(interoAgent: InteroAgent): Promise<InitResponse> {
        // const changePromptRequest = ':set prompt ' + InteroAgent.EOTInteroCmd;
        const changePromptRequest = '\n';
        let response = await interoAgent.evaluate(changePromptRequest)
        return new InitResponse(response.rawout, response.rawerr);
    }
}
