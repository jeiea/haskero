'use strict';

import {RawResponse, InteroProxy} from '../interoProxy'
import {InteroRequest} from './interoRequest'
import {InteroResponse} from './interoResponse'
import {Uri} from '../uri'
import {InteroDiagnostic, InteroDiagnosticKind} from './interoDiagnostic'

export class ReloadResponse implements InteroResponse {

    //private static get warningsPattern() : RegExp { return /([^:]+):(\d+):(\d+): Warning:\n?([\s\S]+?)(?:\n\n|\n[\S]+)/g;  }
    private static get errorsPattern(): RegExp { return new RegExp('(.*):(\\d+):(\\d+):((?:\\n\\s{4,}.*)+)', 'g'); }

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

        //find errors first
        const regErrors = /([^\r\n]+):(\d+):(\d+):\r?\n([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/g;
        let matchErrors = this.removeDuplicates(this.allMatchs(rawerr, regErrors));
        let diagnostics = matchErrors.map(this.matchTo(InteroDiagnosticKind.error));

        // if (matchErrors.length < 1) {
        const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/g;
        let matchWarnings = this.removeDuplicates(this.allMatchs(rawerr, regWarnings));
        diagnostics = diagnostics.concat(matchWarnings.map(this.matchTo(InteroDiagnosticKind.warning)));
        // }
        this._diagnostics = diagnostics;
    }

    private removeDuplicates(matches: RegExpExecArray[]): RegExpExecArray[] {
        let matchToKey = (m: RegExpExecArray) => m[0];
        let matchesSetObject = matches.reduce((accu, m) => { accu[matchToKey(m)] = m; return accu; }, {});
        return Object.keys(matchesSetObject).map(key => matchesSetObject[key]);
    }

    //curried definition for partial application
    private matchTo = (kind: InteroDiagnosticKind) => (match: RegExpExecArray): InteroDiagnostic => {
        return new InteroDiagnostic(match[1], +match[2], +match[3], match[4], kind);
    }

    private allMatchs(text: string, regexp: RegExp): RegExpExecArray[] {
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray;

        while ((match = regexp.exec(text)) != null) {
            matches.push(match);
        }
        return matches;
    }
}

export class ReloadRequest implements InteroRequest {

    private _filePath: string;
    public get filePath(): string {
        return this._filePath;
    }

    public constructor(fileUri: Uri) {
        this._filePath = fileUri.toFilePath();
    }

    public send(interoProxy: InteroProxy): Promise<ReloadResponse> {
        // const reloadRequest = ':l ' + this._filePath;
        const reloadRequest = ':r';
        return interoProxy.sendRawRequest(reloadRequest)
            .then((response: RawResponse) => {
                return Promise.resolve(new ReloadResponse(response.rawout, response.rawerr));
            });
    }

    // private onRawResponse(onInteroResponse: (r: ReloadResponse) => void): (rawout: string, rawerr: string) => void {
    //     return (rawout: string, rawerr: string) => {
    //         return onInteroResponse(new ReloadResponse(rawout, rawerr));
    //     };
    // }
}
