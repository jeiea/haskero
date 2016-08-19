import child_process = require('child_process');

const intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);



/**
 * Intero proxy
 */
class InteroProxy {

    private interoProcess : child_process.ChildProcess;

    private lastRawResponse : string;
    private rawResponse : string;

    public constructor(interoProcess : child_process.ChildProcess) {
        this.interoProcess = interoProcess;


        interoProcess.stdout.on('data', this.onData);
    }

    public init() : void {
        this.interoProcess.stdin.write(':set prompt "\\4"\n');
    }

    public sendRawRequest(rawRequest : string, ) : string {
        let req = rawRequest + '\r\n';
        intero.stdin.write(req);
        console.log(req);

        let eof = false;
        let rawResponse = '';

        while (!eof) {
            let chunk = this.interoProcess.stdout.read();
            if (chunk != null) {
                console.log('chunk: ' + chunk);
                if (chunk.endsWith('\u0004')) {
                    eof = true;
                }
                rawResponse += chunk;
            }
        }
        return rawResponse;
    }

    private onData(data : Buffer) {
        let tchunk = data.toString();
        console.log(tchunk);
        this.rawResponse += tchunk;
        if (tchunk.endsWith('\u0004')) {
            this.lastRawResponse = this.rawResponse;
            this.rawResponse = '';
            console.log('End of response : ' + this.lastRawResponse);
        }
    }
}


interface InteroRequest {
    send(interoProxy : InteroProxy) : InteroResponse;
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

    public send(interoProxy : InteroProxy) : InteroResponse {
        const req = `:loc-at ${this.filePath} ${this.start_l} ${this.start_c} ${this.end_l} ${this.end_c} ${this.identifier}`;
        const rawResponse = interoProxy.sendRawRequest(req);
        return new LocAtResponse(rawResponse);
    }
}

enum InteroState {
    WaitingForRequest,
    WaitingForResponse
}

let interoProxy = new InteroProxy(intero);
interoProxy.init();

let req = new LocAtRequest('C:\\Users\\VANNESJU\\Documents\\Langages\\vscode\\test\\teststack\\app\\Main.hs', 8, 31, 8, 36, 'ourAdd');
let response = req.send(interoProxy);

console.log(response);