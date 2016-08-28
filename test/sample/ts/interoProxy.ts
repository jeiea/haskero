import child_process = require('child_process');

const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);



/**
 * Intero proxy
 */
class InteroProxy {
    private interoProcess : child_process.ChildProcess;
    private rawResponse : string;
    private onRawResponseQueue : Array<(string) => void>;
    private test : string;

    public constructor(interoProcess : child_process.ChildProcess) {
        this.interoProcess = interoProcess;
        this.rawResponse = '';
        this.onRawResponseQueue = [];
        this.interoProcess.stdout.on('data', InteroProxy.onData(this));
    }

    public init() : void {
        this.sendRawRequest(':set prompt "\\4"\r\n', (s : string) => {} );
    }

    public sendRawRequest(rawRequest : string, onRawResponse : (string) => void) : void {
        this.onRawResponseQueue.push(onRawResponse);
        let req = rawRequest + '\r\n';
        this.interoProcess.stdin.write(req);
        console.log('Request: ' + req);
    }

    private static endsWith(str : string, suffix : string) : boolean {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    }

    private static onData(that : InteroProxy) : (Buffer) => void {
        return (data : Buffer) => {
            let chunk = data.toString();
            that.rawResponse += chunk;
            if (InteroProxy.endsWith(chunk, '\u0004')) {
                if (that.onRawResponseQueue.length > 0) {
                    let callback = that.onRawResponseQueue.shift();
                    callback(that.rawResponse);
                }
                console.log('Reponse: ' + that.rawResponse);
                that.rawResponse = '';
            }
        }
    }
}

interface InteroRequest {
    send(interoProxy : InteroProxy, onInteroResponse : (InteroResponse) => void) : void;
}

interface InteroResponse {
    isOk : boolean;
    rawResponse: string;
}

class LocAtResponse implements InteroResponse {

    private static get pattern() : RegExp { return new RegExp('(.*):\\((\\d+),(\\d+)\\)-\\((\\d+),(\\d+)\\)'); }

    private _filePath : string;
    private _start_l : number;
    private _start_c : number;
    private _end_l : number;
    private _end_c : number;

    private _isOk : boolean;
    private _rawResponse : string;

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

    public get rawResponse() : string {
        return this._rawResponse;
    }

    public constructor(rawResponse : string) {
        this._rawResponse = rawResponse;
        let match = LocAtResponse.pattern.exec(rawResponse)
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

    private onRawResponse(onInteroResponse : (LocAtResponse) => void) : (rawResponse : string) => void {
        return (rawResponse : string) => {
            return onInteroResponse(new LocAtResponse(rawResponse));
        };
    }
}

enum InteroState {
    WaitingForRequest,
    WaitingForResponse
}

let interoProxy = new InteroProxy(intero);
interoProxy.init();

// let req = new LocAtRequest('/home/vans/development/haskell/VSCode-haskell-intero/test/sample/app/Main.hs', 8, 31, 8, 36, 'ourAdd');
let req = new LocAtRequest('E:\\haskell\\VSCode-haskell-intero\\test\\sample\\app\\Main.hs', 8, 31, 8, 36, 'ourAdd');
let response = req.send(interoProxy, (resp : LocAtResponse) => console.dir(resp));
