'use strict';

import { InteroAgent } from '../interoAgent'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { InteroUtils } from '../interoUtils'
import { InteroRange } from '../interoRange'
import { UriUtils } from '../../utils/uriUtils'

/**
 * 'complete-at' intero response
 */
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
export class CompleteAtRequest implements InteroRequest<CompleteAtResponse> {

    public constructor(private uri: string, private range: InteroRange, private text: string) {
    }

    public async send(interoAgent: InteroAgent): Promise<CompleteAtResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        const req = `:complete-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.text}`;
        let response = await interoAgent.evaluate(req)
        return new CompleteAtResponse(response.rawout, response.rawerr);
    }
}