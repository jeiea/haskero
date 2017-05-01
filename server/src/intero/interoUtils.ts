'use strict';

import { InteroProxy } from './interoProxy'

/**
 * Utilities functions used by all intero commands
 */
export class InteroUtils {

    /**
     * Clean a raw response.
     */
    public static normalizeRawResponse(raw: string): string {
        let r = new RegExp(InteroProxy.EOTUtf8, 'g');
        return raw.replace(r, '').trim();
    }

    /**
     * Escape backslash and surround wiht double quotes
     * Usefull on windows to handle paths with spaces
     */
    public static escapeFilePath(path: string): string {
        return `"${path.replace(/\\/g, '\\\\')}"`;
    }
}