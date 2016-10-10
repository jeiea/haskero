'use strict';

import {RawResponse, InteroProxy} from '../interoProxy'
import {InteroUtils} from '../interoUtils'
import {InteroRequest} from './interoRequest'
import {InteroResponse} from './interoResponse'
import {InteroDiagnostic, InteroDiagnosticKind} from './interoDiagnostic'
import {UriUtils} from '../uri'

export class TypeAtResponse implements InteroResponse {

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


    private _type : string;
    public get type() : string {
        return this._type;
    }

    public constructor(rawout: string, rawerr: string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        this._type = InteroUtils.normalizeRawResponse(rawout);
    }
}

export class TypeAtRequest implements InteroRequest {
    private filePath: string;
    private start_l: number;
    private start_c: number;
    private end_l: number;
    private end_c: number;
    private identifier: string;

    public constructor(filePath: string, start_l: number, start_c: number, end_l: number, end_c: number, identifier: string) {
        this.filePath = filePath;
        this.start_l = start_l;
        this.start_c = start_c;
        this.end_l = end_l;
        this.end_c = end_c;
        this.identifier = identifier;
    }

    public send(interoProxy: InteroProxy): Promise<TypeAtResponse> {
        const load = `:l ${this.filePath}`;
        const req = `:type-at ${this.filePath} ${this.start_l} ${this.start_c} ${this.end_l} ${this.end_c} ${this.identifier}`;
        return interoProxy.sendRawRequest(load)
            .then((response) => {
                return interoProxy.sendRawRequest(req);
            })
            .then((response) => {
                return Promise.resolve(new TypeAtResponse(response.rawout, response.rawerr));
            });
    }
}
