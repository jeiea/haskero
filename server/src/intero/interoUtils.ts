// stores utilities functions used by all intero commands

import {InteroProxy} from './interoProxy'

export class InteroUtils {
    public static normalizeRawResponse(raw : string) : string {
        return raw.replace(InteroProxy.EOTUtf8, '').trim();
    }
}