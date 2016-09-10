import {InteroProxy, RawResponse} from '../interoProxy'
import {InteroRequest} from './interoRequest'
import {InteroResponse} from './interoResponse'
import {InteroDiagnostic, InteroDiagnosticKind} from './interoDiagnostic'

export class InitResponse implements InteroResponse {

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
        let matchWarnings = this.allMatchs(rawerr);
        this._diagnostics = matchWarnings.map(this.matchToWarning);
    }

    private matchToWarning(match: RegExpExecArray): InteroDiagnostic {
        return new InteroDiagnostic(match[1], +match[2], +match[3], match[4], InteroDiagnosticKind.warning);
    }

    private allMatchs(text: string): RegExpExecArray[] {
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray;
        const reg = /([^:]+):(\d+):(\d+): Warning:\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/g;
        while ((match = reg.exec(text)) != null) {
            matches.push(match);
        }
        return matches;
    }
}

export class InitRequest implements InteroRequest {

    public constructor() {
    }

    public send(interoProxy: InteroProxy): Promise<InitResponse> {
        const changePromptRequest = ':set prompt "\\4"';
        return interoProxy.sendRawRequest(changePromptRequest)
            .then((response: RawResponse) => {
                return Promise.resolve(new InitResponse(response.rawout, response.rawerr));
            });
            //{console.log("change prompt response >>" + s + "<<");});
    }

    // private onRawResponse(onInteroResponse: (r: InitResponse) => void): (rawout: string, rawerr: string) => void {
    //     return (rawout: string, rawerr: string) => {
    //         return onInteroResponse(new InitResponse(rawout, rawerr));
    //     };
    // }
}
