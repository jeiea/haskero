'use strict';

import { allMatchs } from "../../utils/regexpUtils";
import { InteroAgent } from '../interoAgent';
import { IInteroRequest, IInteroResponse } from "./abstract";

/**
 * show modules intero response
 */
export class ShowModulesResponse implements IInteroResponse {
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
export class ShowModulesRequest implements IInteroRequest<ShowModulesResponse> {

    public constructor() {
    }

    public async send(interoAgent: InteroAgent): Promise<ShowModulesResponse> {
        const req = ':show modules';
        let response = await interoAgent.evaluate(req)
        return new ShowModulesResponse(response.rawout, response.rawerr);
    }
}