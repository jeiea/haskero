'use strict';

import { InteroAgent } from '../interoAgent'
import { InteroRequest } from './interoRequest'
import { InteroResponse } from './interoResponse'
import { allMatchs } from "../../utils/regexpUtils";

/**
 * show modules intero response
 */
export class ShowModulesResponse implements InteroResponse {
    public readonly isOk: boolean = true;
    public readonly modules: string[];

    public constructor(public readonly rawout: string, public readonly rawerr: string) {
        let pattern = /.*\((.*),.*\)/gi;
        let matches = allMatchs(rawout, pattern)
        this.modules = matches.map(match => match[1].trim());
    }
}

/**
 * show modules intero request
 */
export class ShowModulesRequest implements InteroRequest<ShowModulesResponse> {

    public constructor() {
    }

    public async send(interoAgent: InteroAgent): Promise<ShowModulesResponse> {
        const req = ':show modules';
        let response = await interoAgent.evaluate(req)
        return new ShowModulesResponse(response.rawout, response.rawerr);
    }
}