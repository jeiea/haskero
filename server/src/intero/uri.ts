'use strict';

import {
	Files
} from 'vscode-languageserver';


export class UriUtils {

    public static normalizeFilePath(filePath : string) : string {
        return filePath.replace(/\\/g,'/');
    }

    public static toFilePath(uri : string) : string {
        return Files.uriToFilePath(uri);
    }

    public static toUri(filePath : string) : string {
        return 'file:///' + UriUtils.normalizeFilePath(filePath).split('/').map(encodeURI).join('/');
    }

     public static isFileProtocol(uri : string) : boolean {
        return UriUtils.toFilePath(uri) != null;
    }
}