'use strict';

import {InteroProxy} from '../interoProxy'
import {InteroResponse} from './interoResponse'

/**
 * Represents an intero request
 * Indices start at 1 (line and column)
 */
export interface InteroRequest {
    /**
     * Sends a request to the given proxy
     */
    send(interoProxy : InteroProxy) : Promise<InteroResponse>;
}
