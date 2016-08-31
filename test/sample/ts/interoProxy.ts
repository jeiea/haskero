import child_process = require('child_process');

const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);



/**
 * Intero proxy
 */
class InteroProxy {
    private interoProcess : child_process.ChildProcess;
    private rawout : string;
    private rawoutErr : string;
    private onRawResponseQueue : Array<(rawout : string, rawerr : string) => void>;



    public constructor(interoProcess : child_process.ChildProcess) {
        this.interoProcess = interoProcess;
        this.rawout = '';
        this.rawoutErr = '';
        this.onRawResponseQueue = [];
        this.interoProcess.stdout.on('data', this.onData);
        this.interoProcess.stderr.on('data', this.onDataErr);
    }

    public sendRawRequest(rawRequest : string, onRawResponse : (rawout : string, rawerr : string) => void) : void {
        this.onRawResponseQueue.push(onRawResponse);
        let req = rawRequest + '\n';
        this.interoProcess.stdin.write(req);
    }

    private static endsWith(str : string, suffix : string) : boolean {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    }

    // create an instance function to force the 'this' capture
    private onData = (data : Buffer) => {
        let chunk = data.toString();
        this.rawout += chunk;
        if (InteroProxy.endsWith(chunk, '\u0004')) {
            if (this.onRawResponseQueue.length > 0) {
                let callback = this.onRawResponseQueue.shift();
                callback(this.rawout, this.rawoutErr);
            }
            this.rawout = '';
            this.rawoutErr = '';
        }
    }

    private onDataErr = (data : Buffer) => {
        let chunk = data.toString();
        //console.log("\r\n    >>>>" + chunk + "<<<<");
        this.rawoutErr += chunk;
    }
}

interface InteroRequest {
    send(interoProxy : InteroProxy, onInteroResponse : (InteroResponse) => void) : void;
}

interface InteroResponse {
    isOk : boolean;
    rawerr: string;
    rawout: string;
}

class LocAtResponse implements InteroResponse {

    private static get pattern() : RegExp { return new RegExp('(.*):\\((\\d+),(\\d+)\\)-\\((\\d+),(\\d+)\\)'); }

    private _filePath : string;
    private _start_l : number;
    private _start_c : number;
    private _end_l : number;
    private _end_c : number;

    private _isOk : boolean;
    private _rawout : string;
    private _rawerr : string;

    public get filePath() : string {
        return this._filePath;
    }

    public get start_l() : number {
        return this._start_l;
    }

    public get start_c() : number {
        return this._start_c;
    }

    public get end_l() : number {
        return this._end_l;
    }

    public get end_c() : number {
        return this._end_c;
    }

    public get isOk() : boolean {
        return this._isOk;
    }

    public get rawout() : string {
        return this._rawout;
    }

    public get rawerr() : string {
        return this._rawerr;
    }

    public constructor(rawout : string, rawerr : string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        let match = LocAtResponse.pattern.exec(rawout)
        if (match != null) {
            this._filePath = match[1];
            this._start_l = +match[2];
            this._start_c = +match[3];
            this._end_l = +match[4];
            this._end_c = +match[5];
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
}

class LocAtRequest implements InteroRequest {
    private filePath : string;
    private start_l : number;
    private start_c : number;
    private end_l : number;
    private end_c : number;
    private identifier : string;

    public constructor(filePath : string, start_l : number, start_c : number, end_l : number, end_c : number, identifier : string) {
        this.filePath = filePath;
        this.start_l = start_l;
        this.start_c = start_c;
        this.end_l = end_l;
        this.end_c = end_c;
        this.identifier = identifier;
    }

    public send(interoProxy : InteroProxy, onInteroResponse : (LocAtResponse) => void) : void {
        const req = `:loc-at ${this.filePath} ${this.start_l} ${this.start_c} ${this.end_l} ${this.end_c} ${this.identifier}`;
        interoProxy.sendRawRequest(req, this.onRawResponse(onInteroResponse));
    }

    private onRawResponse(onInteroResponse : (LocAtResponse) => void) : (rawout : string, rawerr : string) => void {
        return (rawout : string, rawerr : string) => {
            return onInteroResponse(new LocAtResponse(rawout, rawerr));
        };
    }
}

enum InteroDiagnosticKind {
    warning,
    error
}

class InteroDiagnostic {

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
        this._line = line;
        this._col = col;
        this._message = message;
        this._kind = kind;
    }
}

class InitResponse implements InteroResponse {

    //private static get warningsPattern() : RegExp { return /([^:]+):(\d+):(\d+): Warning:\n?([\s\S]+?)(?:\n\n|\n[\S]+)/g;  }
    private static get errorsPattern() : RegExp { return new RegExp('(.*):(\\d+):(\\d+):((?:\\n\\s{4,}.*)+)', 'g'); }

    private _filePath : string;
    private _isOk : boolean;
    private _rawout : string;
    private _rawerr : string;

    public get isOk() : boolean {
        return this._isOk;
    }

    public get rawout() : string {
        return this._rawout;
    }

     public get rawerr() : string {
        return this._rawerr;
    }


    private _diagnostics : InteroDiagnostic[];
    public get diagnostics() : InteroDiagnostic[] {
        return this._diagnostics;
    }


    public constructor(rawout : string, rawerr : string) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        console.log(">>>" + rawerr + "<<<");
        //let matchErrors = this.allMatchs(rawout, InitResponse.errorsPattern);
        let matchWarnings = this.allMatchs(rawerr);
        this._diagnostics = matchWarnings.map(this.matchToWarning);
    }

    private matchToWarning(match : RegExpExecArray) : InteroDiagnostic {
        return new InteroDiagnostic(match[1], +match[2], +match[3], match[4], InteroDiagnosticKind.warning);
    }

    private allMatchs(text : string) : RegExpExecArray[] {
        const matches : RegExpExecArray[] = [];
        let match : RegExpExecArray;
        const reg = /([^:]+):(\d+):(\d+): Warning:\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/g;
        while ((match = reg.exec(text)) != null) {
            matches.push(match);
        }
        return matches;
    }
}

class InitRequest implements InteroRequest {

    public constructor() {
    }

    public send(interoProxy : InteroProxy, onInteroResponse : (r : InitResponse) => void) : void {
        const changePromptRequest = ':set prompt "\\4"';
        const reloadRequest = ':r';
        interoProxy.sendRawRequest(changePromptRequest, (s) => {}); //{console.log("change prompt response >>" + s + "<<");});
        interoProxy.sendRawRequest(reloadRequest, this.onRawResponse(onInteroResponse));
    }

    private onRawResponse(onInteroResponse : (r : InitResponse) => void) : (rawout : string, rawerr : string) => void {
        return (rawout : string, rawerr : string) => {
            return onInteroResponse(new InitResponse(rawout, rawerr));
        };
    }
}

enum InteroState {
    WaitingForRequest,
    WaitingForResponse
}

let interoProxy = new InteroProxy(intero);

let initRequest = new InitRequest();
initRequest.send(interoProxy, (resp : InitResponse) => console.dir(resp));

//interoProxy.init((resp : LocAtResponse) => console.dir("init : " + resp));
// let req = new LocAtRequest('/home/vans/development/haskell/VSCode-haskell-intero/test/sample/app/Main.hs', 8, 31, 8, 36, 'ourAdd');
//let req = new LocAtRequest('E:\\haskell\\VSCode-haskell-intero\\test\\sample\\app\\Main.hs', 8, 31, 8, 36, 'ourAdd');
//let response = req.send(interoProxy, (resp : LocAtResponse) => console.dir(resp));
