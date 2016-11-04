'use strict';

import {InteroProxy} from '../interoProxy'
import {InteroRequest} from './interoRequest'
import {InteroResponse} from './interoResponse'

export class CompleteAtResponse implements InteroResponse {
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

    private _completions : string[];
    public get completions() : string[] {
        return this._completions;
    }

    public constructor(rawout: string, rawerr: string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        this._completions = rawout.split(/\r?\n/);
    }
}

export class CompleteAtRequest implements InteroRequest {
    private filePath: string;
    private start_l: number;
    private start_c: number;
    private end_l: number;
    private end_c: number;
    private text: string;

    public constructor(filePath: string, start_l: number, start_c: number, end_l: number, end_c: number, text: string) {
        this.filePath = filePath;
        this.start_l = start_l;
        this.start_c = start_c;
        this.end_l = end_l;
        this.end_c = end_c;
        this.text = text;
    }

    public send(interoProxy: InteroProxy): Promise<CompleteAtResponse> {
        //const load = `:l ${this.filePath}`;
        const req = `:complete-at ${this.filePath} ${this.start_l} ${this.start_c} ${this.end_l} ${this.end_c} ${this.text}`;
        return interoProxy.sendRawRequest(req).then((response) => {
                    return Promise.resolve(new CompleteAtResponse(response.rawout, response.rawerr));
        });
    }
}