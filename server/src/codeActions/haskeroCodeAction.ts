import * as vsrv from 'vscode-languageserver';

export interface HaskeroCodeAction {
    getCommand(textDocument: vsrv.TextDocumentIdentifier, diag: vsrv.Diagnostic): vsrv.Command;
}