import child_process = require('child_process');

export class InteroProxy {
    private interoProcess : child_process.ChildProcess;
    private rawResponse : string;
    private onRawResponseQueue : Array<(string) => void>;

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