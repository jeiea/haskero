'use strict';

import {InteroProxy} from '../interoProxy'
import {InteroResponse} from './interoResponse'

/**
 * Represents an intero request
 */
export interface InteroRequest {
    /**
     * Sends a request to the given proxy
     */
    send(interoProxy : InteroProxy) : Promise<InteroResponse>;
}
