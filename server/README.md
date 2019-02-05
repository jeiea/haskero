# README

This is a haskell language server in TypeScript running on node

## Life cycle

- The user open an haskell file in its VSCode.
- VSCode starts a child process, the language server, and starts communicating with it using the langauge server protocol (https://code.visualstudio.com/blogs/2016/06/27/common-language-protocol).
The haskell language server is written in TypeScript and is running in node.
- It starts another child process (intero) and starts communicating with it using intero stdin/stdout/stderr.

Each IDE feature like code completion, goto definition, and so on, triggers requests from VSCode to the haskell language server.

## Language server architecture

- `codeActions` folder stores all implemented language server code action, ie the little bulb next to a line in VSCode (like topLevelSignature**CA** which add a signature to a top level function)
- `commands` folder stores all implemented language server commands (like topLevelSignature which add a signature to a top level function)
- `debug` folder stores all debug utilities
- `features` folder stores all implemented language server features, like renaming, goto deifinition, etc.
- `intero` folder stores all intero related source code
- `intero/commands` folder stores all implemented intero commands (like :type-at, :loc-at, etc.)
- `intero/interoProxy.ts` handles the communication protocol between the language server and intero. It provides an async interface to send command requests and recieve command responses.
- `utils` folder stores all utilities like conversions between uri and path, regexp, etc.
- `haskeroService.ts` glues together all implemented features
- `server.ts` recieves requests from VSCode and maps it to commands to the intero child process.

## Technical notes

[Technical notes](Notes.md)

## License
[CeCILL](LICENSE)