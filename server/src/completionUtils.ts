import * as vsrv from 'vscode-languageserver';
import { InteroProxy } from './intero/interoProxy';
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './documentUtils'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { CompleteRequest, CompleteResponse } from './intero/commands/complete'

export class CompletionUtils {
    public static getImportCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position, line: string): Promise<vsrv.CompletionItem[]> {
        let {word, range} = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeRequest = new CompleteRequest(textDocument.uri, line);

        return completeRequest
            .send(interoProxy)
            .then((response: CompleteResponse) => {
                return response.completions.map(c => { return { label: c, kind: vsrv.CompletionItemKind.Variable }; });
            });
    }

    public static getDefaultCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position) {
        let {word, range} = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new CompleteAtRequest(textDocument.uri, DocumentUtils.toInteroRange(range), word);
        //const completeAtRequest = new CompleteRequest(textDocument.uri, word);

        return completeAtRequest
            .send(interoProxy)
            .then((response: CompleteAtResponse) => {
                return response.completions.map(c => { return { label: c, kind: vsrv.CompletionItemKind.Variable }; });
            });

    }
}