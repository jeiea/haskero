import {InteroProxy} from '../interoProxy'
import {InteroRequest} from './interoRequest'
import {InteroResponse} from './interoResponse'
import {Uri} from '../uri'
import {InteroDiagnostic, InteroDiagnosticKind} from './interoDiagnostic'

export class ReloadResponse implements InteroResponse {

    //private static get warningsPattern() : RegExp { return /([^:]+):(\d+):(\d+): Warning:\n?([\s\S]+?)(?:\n\n|\n[\S]+)/g;  }
    private static get errorsPattern() : RegExp { return new RegExp('(.*):(\\d+):(\\d+):((?:\\n\\s{4,}.*)+)', 'g'); }

    private _filePath : string;
    private _isOk : boolean;
    private _rawout : string;
    private _rawerr : string;

    public get isOk() : boolean {
        return this._isOk;
    }

    public get rawout() : string {
        return this._rawout;
    }

     public get rawerr() : string {
        return this._rawerr;
    }

    private _diagnostics : InteroDiagnostic[];
    public get diagnostics() : InteroDiagnostic[] {
        return this._diagnostics;
    }

    public constructor(rawout : string, rawerr : string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        console.log(">>>" + rawerr + "<<<");
        let matchWarnings = this.allMatchs(rawerr);
        this._diagnostics = matchWarnings.map(this.matchToWarning);
    }

    private matchToWarning(match : RegExpExecArray) : InteroDiagnostic {
        return new InteroDiagnostic(match[1], +match[2], +match[3], match[4], InteroDiagnosticKind.warning);
    }

    private allMatchs(text : string) : RegExpExecArray[] {
        const matches : RegExpExecArray[] = [];
        let match : RegExpExecArray;
        const reg = /([^\r\n]+):(\d+):(\d+): Warning:\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/g;
        while ((match = reg.exec(text)) != null) {
            matches.push(match);
        }
        return matches;
    }
}

export class ReloadRequest implements InteroRequest {

    private _filePath : string;
    public get filePath() : string {
        return this._filePath;
    }

    public constructor(fileUri : Uri) {
        this._filePath = fileUri.toFilePath();
    }

    public send(interoProxy : InteroProxy, onInteroResponse : (r : ReloadResponse) => void) : void {
        // const reloadRequest = ':l ' + this._filePath;
        const reloadRequest = ':r';
        interoProxy.sendRawRequest(reloadRequest, this.onRawResponse(onInteroResponse));
    }

    private onRawResponse(onInteroResponse : (r : ReloadResponse) => void) : (rawout : string, rawerr : string) => void {
        return (rawout : string, rawerr : string) => {
            return onInteroResponse(new ReloadResponse(rawout, rawerr));
        };
    }
}
