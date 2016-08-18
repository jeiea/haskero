"use strict";
let fs = require('fs');
let child_process = require('child_process');

// let test = child_process.execSync('ls', ['-al']);
// fs.writeSync(1, test.toString());

let intero = child_process.spawn('stack', ['ghci', '--with-ghc', 'intero']);
//let intero = child_process.spawn('stack');

//

intero.stdout.on('data', function (data) {
    let tchunk = data.toString();
    console.log(tchunk);
    if (tchunk.endsWith('Lib> ')) {
        console.log('to me !');
        intero.stdin.write(':loc-at C:\\Users\\VANNESJU\\Documents\\Langages\\vscode\\test\\teststack\\app\\Main.hs 8 31 8 36 ourAdd\r\n');
    }
});

intero.stderr.on('data', function (data) {
    console.log('We received an error: ' + data);
});


console.log('rené');

