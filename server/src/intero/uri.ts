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
        let prefix = '';
        if (process.platform === 'win32') {
            prefix = 'file:///';
        }
        else {
            prefix = 'file://';
        }
        return prefix + UriUtils.normalizeFilePath(filePath).split('/').map(encodeURIComponent).join('/');
    }

     public static isFileProtocol(uri : string) : boolean {
        return UriUtils.toFilePath(uri) != null;
    }
}