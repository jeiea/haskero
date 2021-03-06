'use strict';

import { UriUtils } from '../../utils/uriUtils';
import { InteroRange } from '../interoRange';
import { InteroUtils } from '../interoUtils';
import { IInteroRepl, IInteroRequest, IInteroResponse } from "./abstract";

/**
 * type-at intero response
 */
export class TypeAtResponse implements IInteroResponse {

    public readonly isOk: boolean = true;
    public readonly type: string;

    public constructor(public readonly rawout: string, public readonly rawerr: string, private infoKind: TypeInfoKind, private id?: string) {
        this.type = rawout;
        if (this.type && this.type.length > 0) {
            //if the instanciated info kind is used, intero doesn't responds the identifier name, so we add it
            if (infoKind === TypeInfoKind.Instanciated) {
                this.type = id + ' ' + this.type;
            }
        }
    }
}

/**
 * type-at intero request
 */
export class TypeAtRequest implements IInteroRequest<TypeAtResponse> {
    public constructor(private uri: string, private range: InteroRange, private identifier: string, private infoKind: TypeInfoKind) {
    }

    public async send(interoAgent: IInteroRepl): Promise<TypeAtResponse> {
        const filePath = UriUtils.toFilePath(this.uri);
        const escapedFilePath = InteroUtils.escapeFilePath(filePath);
        //if we add the identifier to the resquest, intero reponds the more genereic type signature possible
        //if we dont add the identifier to the request, interao responds the more specific type signature, as used in the specific text span
        const id = this.infoKind === TypeInfoKind.Generic ? ' ' + this.identifier : '';
        const req = `:type-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol}${id}`;
        let response = await interoAgent.evaluate(req);
        return new TypeAtResponse(response.rawout, response.rawerr, this.infoKind, this.identifier);
    }
}


/**
 * Kinf of type info, the generic or the instanciated on
 */
export enum TypeInfoKind {
    /**
     * Specialized type info, for a specific usage with closed/instanciated types (used in type hover for instance)
     */
    Instanciated,
    /**
     * Generic type signature (used in type insert for instance)
     */
    Generic
}
