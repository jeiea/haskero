'use strict';

import { RawResponse, InteroProxy } from '../interoProxy'
import { InteroUtils } from '../interoUtils'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { InteroRange } from '../interoRange'
import { InteroDiagnostic, InteroDiagnosticKind } from './interoDiagnostic'
import { UriUtils } from '../uri'

/**
 * type-at intero response
 */
export class TypeAtResponse implements InteroResponse {

    public readonly isOk: boolean = true;
    public readonly type: string;

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        this.type = InteroUtils.normalizeRawResponse(rawout);
    }
}

/**
 * type-at intero request
 */
export class TypeAtRequest implements InteroRequest {

    public constructor(private uri: string, private range: InteroRange, private identifier: string) {
    }

    public send(interoProxy: InteroProxy): Promise<TypeAtResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        //loads the file first otherwise it won't match the last version on disk
        const load = `:l ${escapedFilePath}`;
        const req = `:type-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.identifier}`;
        return interoProxy.sendRawRequest(load)
            .then((response) => {
                return interoProxy.sendRawRequest(req);
            })
            .then((response) => {
                return Promise.resolve(new TypeAtResponse(response.rawout, response.rawerr));
            });
    }
}
