'use strict';

import {InteroProxy} from './interoProxy'

/**
 * Utilities functions used by all intero commands
 */
export class InteroUtils {

    /**
     * Clean a raw response.
     */
    public static normalizeRawResponse(raw : string) : string {
        return raw.replace(InteroProxy.EOTUtf8, '').trim();
    }
}