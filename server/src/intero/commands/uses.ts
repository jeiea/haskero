'use strict';

import { allMatchs } from "../../utils/regexpUtils";
import { UriUtils } from '../../utils/uriUtils';
import { InteroLocation } from '../interoLocation';
import { InteroRange } from '../interoRange';
import { InteroUtils } from '../interoUtils';
import { IInteroRepl, IInteroRequest, IInteroResponse } from "./abstract";

/**
 * uses intero response
 */
export class UsesResponse implements IInteroResponse {

    private _isOk: boolean;
    public get isOk(): boolean {
        return this._isOk;
    }

    private _locations: InteroLocation[];
    public get locations(): InteroLocation[] {
        return this._locations;
    }

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        const toInteroLoc = (match: RegExpExecArray): InteroLocation => {
            return new InteroLocation(match[1], new InteroRange(+match[2], +match[3], +match[4], +match[5]));
        };

        const pattern = /(.*):\((\d+),(\d+)\)-\((\d+),(\d+)\)/gi;
        let matches = allMatchs(rawout, pattern);

        if (matches.length > 1) {
            this._locations = matches.map(toInteroLoc)
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
}

/**
 * uses intero request
 */
export class UsesRequest implements IInteroRequest<UsesResponse> {

    public constructor(private uri: string, private range: InteroRange, private identifier: string) {
    }

    public async send(interoAgent: IInteroRepl): Promise<UsesResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        const uses = `:uses ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.identifier}`;
        const usesResp = await interoAgent.evaluate(uses);
        return new UsesResponse(usesResp.rawout, usesResp.rawerr);
    }
}