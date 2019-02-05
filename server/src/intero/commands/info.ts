'use strict';

import { IdentifierKind } from '../identifierKind';
import { IInteroRepl, IInteroRequest, IInteroResponse } from './abstract';

/**
 * type-at intero response
 */
export class InfoResponse implements IInteroResponse {

    public readonly isOk: boolean = true;
    public readonly documentation: string;
    public readonly kind: IdentifierKind;
    public readonly detail: string;

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        this.documentation = rawout;
        this.detail = this.getFirstLine(this.documentation);
        if (this.documentation.startsWith("data ")) {
            this.kind = IdentifierKind.Data;
        }
        else if (this.documentation.startsWith("class ")) {
            this.kind = IdentifierKind.Class;
        }
        else if (this.documentation.startsWith("type ") || this.documentation.startsWith("newtype ")) {
            this.kind = IdentifierKind.Type;
        }
        else {
            this.kind = IdentifierKind.Function;
        }
    }

    private getFirstLine(text: string) {
        return text.split('\n')[0];
    }
}

/**
 * type-at intero request
 */
export class InfoRequest implements IInteroRequest<InfoResponse> {

    public constructor(private identifier: string) {
    }

    public async send(interoAgent: IInteroRepl): Promise<InfoResponse> {
        const req = `:info ${this.identifier}`;
        let response = await interoAgent.evaluate(req)
        return new InfoResponse(response.rawout, response.rawerr);
    }
}
