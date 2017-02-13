'use strict';

export enum InteroDiagnosticKind {
    warning,
    error
}

/**
 * An intero diagnostic : warning or error
 */
export class InteroDiagnostic {
    public constructor(public filePath: string,
        public readonly line: number,
        public readonly col: number,
        public readonly message: string,
        public readonly kind: InteroDiagnosticKind) {
        this.line = line - 1;
        this.col = col - 1;
    }
}