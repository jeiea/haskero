'use strict';

import {
	Files
} from 'vscode-languageserver';

export class MyUri {
    private _uri : string;
    public get uri() : string {
        return this._uri;
    }

    public constructor(uri : string) {
        this._uri = uri;
    }

    public toFilePath() : string {
        return Files.uriToFilePath(this._uri);
    }

    public isFileProtocol() : boolean {
        return this.toFilePath() != null;
    }
}