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
        //#FIX should replace all match, not just the first one
        return raw.replace(InteroProxy.EOTUtf8, '').trim();
    }

    /**
     * Escape backslash and surround wiht double quotes
     * Usefull on windows to handle paths with spaces
     */
    public static escapeFilePath(path: string): string {
        return `"${path.replace(/\\/g, '\\\\')}"`;
    }


    public static allMatchs(text: string, regexp: RegExp): RegExpExecArray[] {
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray;

        while ((match = regexp.exec(text)) != null) {
            matches.push(match);
        }
        return matches;
    }
}