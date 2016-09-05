import {InteroProxy} from '../interoProxy.ts'
import {InteroRequest} from './interoRequest.ts'
import {InteroResponse} from './interoResponse.ts'

export class LocAtResponse implements InteroResponse {

    private static get pattern() : RegExp { return new RegExp('(.*):\\((\\d+),(\\d+)\\)-\\((\\d+),(\\d+)\\)'); }

    private _filePath : string;
    private _start_l : number;
    private _start_c : number;
    private _end_l : number;
    private _end_c : number;

    private _isOk : boolean;
    private _rawout : string;
    private _rawerr : string;

    public get filePath() : string {
        return this._filePath;
    }

    public get start_l() : number {
        return this._start_l;
    }

    public get start_c() : number {
        return this._start_c;
    }

    public get end_l() : number {
        return this._end_l;
    }

    public get end_c() : number {
        return this._end_c;
    }

    public get isOk() : boolean {
        return this._isOk;
    }

    public get rawout() : string {
        return this._rawout;
    }

    public get rawerr() : string {
        return this._rawerr;
    }

    public constructor(rawout : string, rawerr : string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        let match = LocAtResponse.pattern.exec(rawout)
        if (match != null) {
            this._filePath = match[1];
            this._start_l = +match[2];
            this._start_c = +match[3];
            this._end_l = +match[4];
            this._end_c = +match[5];
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
}

export class LocAtRequest implements InteroRequest {
    private filePath : string;
    private start_l : number;
    private start_c : number;
    private end_l : number;
    private end_c : number;
    private identifier : string;

    public constructor(filePath : string, start_l : number, start_c : number, end_l : number, end_c : number, identifier : string) {
        this.filePath = filePath;
        this.start_l = start_l;
        this.start_c = start_c;
        this.end_l = end_l;
        this.end_c = end_c;
        this.identifier = identifier;
    }

    public send(interoProxy : InteroProxy, onInteroResponse : (LocAtResponse) => void) : void {
        const req = `:loc-at ${this.filePath} ${this.start_l} ${this.start_c} ${this.end_l} ${this.end_c} ${this.identifier}`;
        interoProxy.sendRawRequest(req, this.onRawResponse(onInteroResponse));
    }

    private onRawResponse(onInteroResponse : (LocAtResponse) => void) : (rawout : string, rawerr : string) => void {
        return (rawout : string, rawerr : string) => {
            return onInteroResponse(new LocAtResponse(rawout, rawerr));
        };
    }
}