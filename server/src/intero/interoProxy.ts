'use strict';

/// <reference path="../../typings/node/node.d.ts"/>

import {InteroRequest} from './commands/interoRequest'
import {InteroResponse} from './commands/interoResponse'
import {InitRequest, InitResponse} from './commands/init'

import child_process = require('child_process');
import stream = require('stream');

export class RawResponse {
    public rawout : string;
    public rawerr : string;

    constructor(rawout : string, rawerr : string) {
        this.rawout = rawout;
        this.rawerr = rawerr;
    }
}

/**
 * Intero proxy
 */
export class InteroProxy {
    private interoProcess : child_process.ChildProcess;
    private rawout : string;
    private rawoutErr : string;
    private onRawResponseQueue : Array<{resolve:(response : RawResponse) => void, reject:any}>;

    public constructor(interoProcess : child_process.ChildProcess) {
        this.interoProcess = interoProcess;
        this.rawout = '';
        this.rawoutErr = '';
        this.onRawResponseQueue = [];
        this.interoProcess.stdout.on('data', this.onData);
        this.interoProcess.stderr.on('data', this.onDataErr);
    }

    public sendRawRequest(rawRequest : string) : Promise<RawResponse> {
        let executor = (resolve, reject) : void => {
            this.onRawResponseQueue.push( {resolve:resolve, reject:reject} );
            let req = rawRequest + '\n';
            this.interoProcess.stdin.write(req);
            console.log('>' + req);
        };
        return new Promise(executor);
    }

    private static endsWith(str : string, suffix : string) : boolean {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    }

    // create an instance function to force the 'this' capture
    private onData = (data : Buffer) => {
        let chunk = data.toString();
        this.rawout += chunk;
        console.log(chunk);
        if (InteroProxy.endsWith(chunk, '@')) {//'\u0004')) {
            console.log('>>><<<');
            let rawout = this.rawout;
            let rawerr = this.rawoutErr;
            this.rawout = '';
            this.rawoutErr = '';
            if (this.onRawResponseQueue.length > 0) {
                let resolver = this.onRawResponseQueue.shift();
                resolver.resolve(new RawResponse(rawout, rawerr));
            }
        }
    }

    private onDataErr = (data : Buffer) => {
        let chunk = data.toString();
        //console.log("\r\n    >>>>" + chunk + "<<<<");
        this.rawoutErr += chunk;
        console.log(chunk);
    }
}

// let interoProxy = new InteroProxy(intero);

// let initRequest = new InitRequest();
// initRequest.send(interoProxy, (resp : InitResponse) => {console.dir(resp); process.exit();});

//interoProxy.init((resp : LocAtResponse) => console.dir("init : " + resp));
// let req = new LocAtRequest('/home/vans/development/haskell/VSCode-haskell-intero/test/sample/app/Main.hs', 8, 31, 8, 36, 'ourAdd');
//let req = new LocAtRequest('E:\\haskell\\VSCode-haskell-intero\\test\\sample\\app\\Main.hs', 8, 31, 8, 36, 'ourAdd');
//let response = req.send(interoProxy, (resp : LocAtResponse) => console.dir(resp));
