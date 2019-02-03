'use strict';

import { InteroAgent } from '../interoAgent'
import { InteroResponse } from './interoResponse'

/**
 * Represents an intero request
 * Indices start at 1 (line and column)
 */
export interface InteroRequest<T extends InteroResponse> {
    /**
     * Sends a request to the given proxy
     */
    send(interoAgent: InteroAgent): Promise<T>;
}
