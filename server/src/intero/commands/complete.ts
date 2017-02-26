'use strict';

import { InteroProxy } from '../interoProxy'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { LoadRequest, LoadResponse } from './load'
import { InteroUtils } from '../interoUtils'
import { InteroRange } from '../interoRange'
import { UriUtils } from '../uri'

/**
 * 'complete' intero response
 */
export class CompleteResponse implements InteroResponse {
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
        this._completions = InteroUtils
            .normalizeRawResponse(rawout)
            .split(/\r?\n/)
            .slice(1)
            .reduce(this.reducer, [])
    }

    //remove unwanted reponses
    //as we :load module before the :complete repl request, we can have artefacts from the previous :load answer in the stderr of :complete
    //it should be fixed with issue #15
    private reducer(accu: Array<string>, line: string): Array<string> {
        let res = line.match(/^"(.*)"$/);
        if (res !== null) {
            accu.push(res[1]);
            return accu;
        }
        return accu;
    }
}

/**
 * 'complete' intero request
 */
export class CompleteRequest implements InteroRequest {

    public constructor(private readonly uri: string, private readonly text: string) {
        this.text = text.replace(/[\r\n]/g, '');
    }

    public send(interoProxy: InteroProxy): Promise<CompleteResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        //send a load request first otherwise :complete is not executed on the right module (it's executed
        //on the current module)
        const loadRequest = new LoadRequest(this.uri, false);
        const req = `:complete repl "${this.text}"`;
        return loadRequest.send(interoProxy)
            .then((loadResponse) => {
                return interoProxy.sendRawRequest(req);
            })
            .then((response) => {
                return Promise.resolve(new CompleteResponse(response.rawout, response.rawerr));
            });
    }
}