'use strict';

import { UriUtils } from '../../utils/uriUtils';
import { InteroRange } from '../interoRange';
import { InteroUtils } from '../interoUtils';
import { IInteroRepl, IInteroRequest, IInteroResponse } from './abstract';

/**
 * 'complete-at' intero response
 */
export class CompleteAtResponse implements IInteroResponse {
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

    private _completions: string[];
    public get completions(): string[] {
        return this._completions;
    }

    public constructor(rawout: string, rawerr: string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        this._completions = rawout.split(/\r?\n/).filter(s => s !== '');
    }
}

/**
 * 'complete-at' intero request
 */
export class CompleteAtRequest implements IInteroRequest<CompleteAtResponse> {

    public constructor(private uri: string, private range: InteroRange, private text: string) {
    }

    public async send(interoAgent: IInteroRepl): Promise<CompleteAtResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        const req = `:complete-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.text}`;
        let response = await interoAgent.evaluate(req)
        return new CompleteAtResponse(response.rawout, response.rawerr);
    }
}