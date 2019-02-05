'use strict';

import { InteroAgent } from '../interoAgent';
import { IInteroRequest, IInteroResponse } from "./abstract";

/**
 * type intero response
 */
export class TypeResponse implements IInteroResponse {

    public readonly isOk: boolean = true;
    public readonly type: string;
    public readonly identifierExists: boolean;

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        if (rawerr.indexOf("ot in scope") > -1) {
            this.identifierExists = false;
            this.type = null;
        }
        else {
            this.identifierExists = true;
            this.type = rawout;
        }
    }
}

/**
 * type intero request
 */
export class TypeRequest implements IInteroRequest<TypeResponse> {

    public constructor(private identifier: string) {
    }

    public async send(interoAgent: InteroAgent): Promise<TypeResponse> {
        const req = `:type ${this.identifier}`;
        let response = await interoAgent.evaluate(req);
        return new TypeResponse(response.rawout, response.rawerr);
    }
}
