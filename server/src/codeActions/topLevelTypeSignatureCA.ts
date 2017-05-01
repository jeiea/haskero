import * as vsrv from 'vscode-languageserver';
import { HaskeroCodeAction } from "./haskeroCodeAction";
import { TopLevelTypeSignatureInstance } from "../commands/topLevelTypeSignature";
import { firstGroupOfFirstMatch } from "../utils/regexp";

export class TopLevelTypeSignatureCA implements HaskeroCodeAction {

    public getCommand(textDocument: vsrv.TextDocumentIdentifier, diag: vsrv.Diagnostic): TopLevelTypeSignatureInstance {
        let pattern = /Top-level binding with no type signature:[\s\r\n]*(.*)/;
        let type = firstGroupOfFirstMatch(diag.message, pattern);
        //message: '    Top-level binding with no type signature: t :: c -> c',
        if (type !== null) {
            return new TopLevelTypeSignatureInstance(textDocument, diag.range.start.line, 0, type);
        }
        return null;
    }
}