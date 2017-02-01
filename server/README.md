# README

This is a haskell language server in TypeScript running on node

## Life cycle

- The user open an haskell file in its VSCode.
- VSCode starts a child process, the language server, and starts communicating with it using the langauge server protocol (https://code.visualstudio.com/blogs/2016/06/27/common-language-protocol).
The haskell language server is written in TypeScript and is running in node.
- It starts another child process (intero) and starts communicating with it using intero stdin/stdout/stderr.

Each IDE feature like code completion, goto definition, and so on, triggers requests from VSCode to the haskell language server.

## Language server architecture

`server.ts` recieves requests from VSCode and maps it to commands to the intero child process.

`commands` folder stores all implemented commands.

`interoProxy.ts` handles the communication protocol between the language server and intero. It provides an async interface to send command requests and recieve command responses.

## Technical notes

[Technical notes](Notes.md)

## License
[CeCILL](LICENSE)