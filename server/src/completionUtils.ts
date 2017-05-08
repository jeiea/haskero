import * as vsrv from 'vscode-languageserver';
import { InteroProxy } from './intero/interoProxy';
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './utils/documentUtils'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { InfoRequest, InfoResponse } from './intero/commands/info'
import { CompleteRequest, CompleteResponse } from './intero/commands/complete'
import { IdentifierKind } from './intero/identifierKind'
import { zipWith } from './utils/functionalUtils'

/**
 * Handle completion special cases (import, dot notation, etc.)
 */
export class CompletionUtils {

    private static toCompletionType(kind: IdentifierKind) {
        switch (kind) {
            case IdentifierKind.Class:
                return vsrv.CompletionItemKind.Class;
            case IdentifierKind.Data:
                return vsrv.CompletionItemKind.Enum;
            case IdentifierKind.Function:
                return vsrv.CompletionItemKind.Function;
            case IdentifierKind.Type:
                return vsrv.CompletionItemKind.Interface;
        }
    }

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
        //if the cursor is after a " as " text, it means that we are in the 'name' area of an import, so we disable module autocompletion
        if (!DocumentUtils.leftLineContains(textDocument, position, " as ")) {
            let { word, range } = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
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

    public static getDefaultCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position, maxInfoRequests: number): Promise<vsrv.CompletionItem[]> {
        let { word, range } = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new CompleteAtRequest(textDocument.uri, DocumentUtils.toInteroRange(range), word);

        //First, get all completion texts
        return completeAtRequest
            .send(interoProxy)
            .then((response: CompleteAtResponse) => {
                let completions = response.completions;
                if (completions.length < 1) {
                    const completeRequest = new CompleteRequest(textDocument.uri, word);
                    return completeRequest
                        .send(interoProxy)
                        .then((response: CompleteResponse) => {
                            return Promise.resolve(response.completions);
                        });
                }
                else {
                    return Promise.resolve(completions);
                }
            })
            //Then for each text, get its type informations
            .then(completions => {
                return Promise.all(
                    completions.map((completion, idx): Promise<vsrv.CompletionItem> => {
                        if (idx < maxInfoRequests) {
                            let infoReq = new InfoRequest(completion);
                            return infoReq
                                .send(interoProxy)
                                .then((infoResponse): Promise<vsrv.CompletionItem> => {
                                    var identifier = CompletionUtils.truncResp(word, completion);
                                    return Promise.resolve({
                                        label: identifier,
                                        kind: CompletionUtils.toCompletionType(infoResponse.kind),
                                        detail: infoResponse.detail,
                                        documentation: infoResponse.documentation,
                                        data: completion
                                    });
                                });
                        }
                        else {
                            return Promise.resolve({
                                label: completion,
                                kind: vsrv.CompletionItemKind.Function,
                                data: null
                            });
                        }
                    })
                );
            });
    }

    public static getResolveInfos(interoProxy: InteroProxy, item: vsrv.CompletionItem): Promise<vsrv.CompletionItem> {
        //When the global getCompletionItems didn't get details (because it reachs the maxAutoCompletionDetails limit)
        //it returns data = null and label = completion text
        //in this particular case only, we still try to get the details for the completion item
        if (!item.data && item.label) {
            const infoRequest = new InfoRequest(item.label);
            return infoRequest
                .send(interoProxy)
                .then((infoResponse: InfoResponse) => {
                    return {
                        label: item.label,
                        kind: CompletionUtils.toCompletionType(infoResponse.kind),
                        detail: infoResponse.detail,
                        documentation: infoResponse.documentation
                    };
                });
        }
        else {
            return null;
        }
    }
}