import * as vsrv from 'vscode-languageserver';
import { InteroProxy } from './intero/interoProxy';
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './documentUtils'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { CompleteRequest, CompleteResponse } from './intero/commands/complete'
import { zipWith } from './functionalUtils'

/**
 * Handle completion special cases (import, dot notation, etc.)
 */
export class CompletionUtils {

    private static truncResp(word: string, completion: string) {
        // the completion response sent back from intero is too wide
        // if | is the cursor when the completion request is triggered:
        // import Control.Concurr|
        // complete request responds completion of the form:
        // Control.Concurrent.Chan
        // if we send back Control.Concurrent.Chan to vscode, it will complete the line of code as :
        // import Control.Control.Concurrent.Chan
        // vscode replaces the current word (unfortunately here . is a word delimiter) with the completionItem

        let i = word.length - 1;
        let leftDotIdx = -1;
        while (leftDotIdx < 0 && i >= 0) {
            if (completion[i] == '.') {
                leftDotIdx = i;
            }
            else {
                i--;
            }
        }

        if (leftDotIdx < 0) {
            return completion;
        }
        else {
            return completion.substr(leftDotIdx + 1);
        }
    }

    public static getImportCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position, line: string): Promise<vsrv.CompletionItem[]> {
        if (!DocumentUtils.leftLineContains(textDocument, position, " as ")) {
            let {word, range} = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
            const lineToComplete = line.substring(0, position.character);
            const completeRequest = new CompleteRequest(textDocument.uri, lineToComplete);

            return completeRequest
                .send(interoProxy)
                .then((response: CompleteResponse) => {
                    return response.completions.map(completion => {
                        return {
                            label: CompletionUtils.truncResp(word, completion),
                            kind: vsrv.CompletionItemKind.Module
                        };
                    });
                });
        }
        else {
            return Promise.resolve([]);
        }

    }

    public static getDefaultCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position) {
        let {word, range} = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new CompleteAtRequest(textDocument.uri, DocumentUtils.toInteroRange(range), word);

        return completeAtRequest
            .send(interoProxy)
            .then((response: CompleteAtResponse) => {
                return response.completions.map(completion => {
                    return {
                        label: CompletionUtils.truncResp(word, completion),
                        kind: vsrv.CompletionItemKind.Variable
                    };
                });
            });
    }
}