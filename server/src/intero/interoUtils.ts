'use strict';

/**
 * Utilities functions used by all intero commands
 */
export class InteroUtils {

    /**
     * Escape backslash and surround wiht double quotes
     * Usefull on windows to handle paths with spaces
     */
    public static escapeFilePath(path: string): string {
        return `"${path.replace(/\\/g, '\\\\')}"`;
    }
}