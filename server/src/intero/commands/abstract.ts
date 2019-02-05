'use strict';

/** Represents intero process */
export interface IInteroRepl {
    evaluate(expr: string): Promise<IInteroResponse>;
}

/**
 * Represents an intero request
 * Indices start at 1 (line and column)
 */
export interface IInteroRequest<T extends IInteroResponse> {
    /**
     * Sends a request to the given proxy
     */
    send(intero: IInteroRepl): Promise<T>;
}

/** An intero evaluation result */
export interface IInteroResponse {
    /**
     * The response state
     */
    isOk: boolean;

    /**
     * Text recieved on stderr
     */
    readonly rawerr: string;

    /**
     * Text recieved on stdout
     */
    readonly rawout: string;
}

export enum InteroDiagnosticKind {
    warning,
    error
}

/**
 * An intero diagnostic : warning or error
 */
export class IInteroDiagnostic {
    public constructor(
        public filePath: string,
        public readonly line: number,
        public readonly col: number,
        public readonly message: string,
        public readonly kind: InteroDiagnosticKind
    ) {
        this.line = line - 1;
        this.col = col - 1;
    }
}
