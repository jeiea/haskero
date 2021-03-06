'use strict';

import { UriUtils } from '../../utils/uriUtils';
import { InteroRange } from '../interoRange';
import { InteroUtils } from '../interoUtils';
import { IInteroRepl, IInteroRequest, IInteroResponse } from "./abstract";

/**
 * loc-at intero response
 */
export class LocAtResponse implements IInteroResponse {

    private static get pattern(): RegExp { return new RegExp('(.*):\\((\\d+),(\\d+)\\)-\\((\\d+),(\\d+)\\)'); }

    private _filePath: string;
    private _range: InteroRange;

    private _isOk: boolean;
    private _rawout: string;
    private _rawerr: string;

    public get filePath(): string {
        return this._filePath;
    }

    public get range(): InteroRange {
        return this._range;
    }

    public get isOk(): boolean {
        return this._isOk;
    }

    public get rawout(): string {
        return this._rawout;
    }

    public get rawerr(): string {
        return this._rawerr;
    }

    public constructor(rawout: string, rawerr: string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        let match = LocAtResponse.pattern.exec(rawout)
        if (match != null) {
            this._filePath = match[1];
            this._range = new InteroRange(+match[2], +match[3], +match[4], +match[5]);
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
}

/**
 * loc-at intero request
 */
export class LocAtRequest implements IInteroRequest<IInteroResponse> {

    public constructor(private uri: string, private range: InteroRange, private identifier: string) {
    }

    public async send(interoAgent: IInteroRepl): Promise<LocAtResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        const locat = `:loc-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.identifier}`;
        let locAtResp = await interoAgent.evaluate(locat);
        return new LocAtResponse(locAtResp.rawout, locAtResp.rawerr);
    }
}