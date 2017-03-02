'use strict';

import { RawResponse, InteroProxy } from '../interoProxy'
import { InteroUtils } from '../interoUtils'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { InteroRange } from '../interoRange'
import { InteroDiagnostic, InteroDiagnosticKind } from './interoDiagnostic'
import { IdentifierKind } from '../identifierKind'
import { UriUtils } from '../uri'

/**
 * type-at intero response
 */
export class InfoResponse implements InteroResponse {

    public readonly isOk: boolean = true;
    public readonly type: string;
    public readonly kind: IdentifierKind

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        this.type = InteroUtils.normalizeRawResponse(rawout);
        if (this.type.startsWith("data ")) {
            this.kind = IdentifierKind.Data;
        }
        else if (this.type.startsWith("class ")) {
            this.kind = IdentifierKind.Class;
        }
        else if (this.type.startsWith("type ")) {
            this.kind = IdentifierKind.Type;
        }
        else {
            this.kind = IdentifierKind.Function;
        }
    }
}

/**
 * type-at intero request
 */
export class InfoRequest implements InteroRequest {

    public constructor(private identifier: string) {
    }

    public send(interoProxy: InteroProxy): Promise<InfoResponse> {
        const req = `:info ${this.identifier}`;
        return interoProxy.sendRawRequest(req)
            .then((response) => {
                return Promise.resolve(new InfoResponse(response.rawout, response.rawerr));
            });
    }
}
