'use strict';

export enum InteroDiagnosticKind {
    warning,
    error
}

/**
 * An intero diagnostic : warning or error
 */
export class InteroDiagnostic {

    private _filePath : string;
    public get filePath() : string {
        return this._filePath;
    }
    public set filePath(v : string) {
        this._filePath = v;
    }

    private _line : number;
    public get line() : number {
        return this._line;
    }

    private _col : number;
    public get col() : number {
        return this._col;
    }

    private _message : string;
    public get message() : string {
        return this._message;
    }

    private _kind : InteroDiagnosticKind;
    public get kind() : InteroDiagnosticKind {
        return this._kind;
    }

    public constructor(filePath : string, line : number, col : number, message : string, kind : InteroDiagnosticKind) {
        this._filePath = filePath;
        this._line = line - 1;
        this._col = col - 1;
        this._message = message;
        this._kind = kind;
    }
}