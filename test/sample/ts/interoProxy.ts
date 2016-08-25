import child_process = require('child_process');

const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);



/**
 * Intero proxy
 */
class InteroProxy {
    private interoProcess : child_process.ChildProcess;
    private rawResponse : string;
    private onRawResponse : (string) => void;

    public constructor(interoProcess : child_process.ChildProcess) {
        this.interoProcess = interoProcess;
        interoProcess.stdout.on('data', this.onData);
    }

    public init() : void {
        this.interoProcess.stdin.write(':set prompt "\\4"\r\n');
    }

    public sendRawRequest(rawRequest : string, onRawResponse : (string) => void) : void {
        this.onRawResponse = onRawResponse;
        let req = rawRequest + '\r\n';
        intero.stdin.write(req);
        console.log(req);
    }

    private static endsWith(str : string, suffix : string) : boolean {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    }

    private onData(data : Buffer) {
        let chunk = data.toString();
        console.log(chunk);
        this.rawResponse += chunk;
        if (InteroProxy.endsWith(chunk, '\u0004')) {
            if (this.onRawResponse != undefined) {
                this.onRawResponse(this.rawResponse);
            }
            console.log('End of response : ' + this.rawResponse);
            this.rawResponse = '';
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

    public isOk : boolean;
    public rawResponse : string;

    public constructor(rawResponse : string) {
        this.rawResponse = rawResponse;
        this.isOk = true;
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
        return (rawResponse : string) => onInteroResponse(new LocAtResponse(rawResponse));
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
let response = req.send(interoProxy, (resp : LocAtResponse) => console.log(response));
