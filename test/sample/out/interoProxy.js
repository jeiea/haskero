"use strict";
var child_process = require('child_process');
var intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);
/**
 * Intero proxy
 */
var InteroProxy = (function () {
    function InteroProxy(interoProcess) {
        this.interoProcess = interoProcess;
        interoProcess.stdout.on('data', this.onData);
    }
    InteroProxy.prototype.init = function () {
        this.interoProcess.stdin.write(':set prompt "\\4"\n');
    };
    InteroProxy.prototype.sendRawRequest = function (rawRequest, onRawResponse) {
        var req = rawRequest + '\r\n';
        intero.stdin.write(req);
        console.log(req);
        this.onRawResponse = onRawResponse;
    };
    InteroProxy.endsWith = function (str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) != -1;
    };
    InteroProxy.prototype.onData = function (data) {
        var chunk = data.toString();
        console.log(chunk);
        this.rawResponse += chunk;
        if (InteroProxy.endsWith(chunk, '\u0004')) {
            if (this.onRawResponse != undefined) {
                this.onRawResponse(this.rawResponse);
            }
            console.log('End of response : ' + this.rawResponse);
            this.rawResponse = '';
        }
    };
    return InteroProxy;
}());
var LocAtResponse = (function () {
    function LocAtResponse(rawResponse) {
        this.rawResponse = rawResponse;
        this.isOk = true;
    }
    return LocAtResponse;
}());
var LocAtRequest = (function () {
    function LocAtRequest(filePath, start_l, start_c, end_l, end_c, identifier) {
        this.filePath = filePath;
        this.start_l = start_l;
        this.start_c = start_c;
        this.end_l = end_l;
        this.end_c = end_c;
        this.identifier = identifier;
    }
    LocAtRequest.prototype.send = function (interoProxy, onInteroResponse) {
        var req = ":loc-at " + this.filePath + " " + this.start_l + " " + this.start_c + " " + this.end_l + " " + this.end_c + " " + this.identifier;
        interoProxy.sendRawRequest(req, this.onRawResponse(onInteroResponse));
    };
    LocAtRequest.prototype.onRawResponse = function (onInteroResponse) {
        return function (rawResponse) { return onInteroResponse(new LocAtResponse(rawResponse)); };
    };
    return LocAtRequest;
}());
var InteroState;
(function (InteroState) {
    InteroState[InteroState["WaitingForRequest"] = 0] = "WaitingForRequest";
    InteroState[InteroState["WaitingForResponse"] = 1] = "WaitingForResponse";
})(InteroState || (InteroState = {}));
var interoProxy = new InteroProxy(intero);
interoProxy.init();
var req = new LocAtRequest('/home/vans/development/haskell/VSCode-haskell-intero/test/sample/app/Main.hs', 8, 31, 8, 36, 'ourAdd');
var response = req.send(interoProxy, function (resp) { return console.log(response); });
//# sourceMappingURL=interoProxy.js.map