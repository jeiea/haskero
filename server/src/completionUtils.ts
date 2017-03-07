import * as vsrv from 'vscode-languageserver';
import { InteroProxy } from './intero/interoProxy';
import { DocumentUtils, WordSpot, NoMatchAtCursorBehaviour } from './documentUtils'
import { CompleteAtRequest, CompleteAtResponse } from './intero/commands/completeAt'
import { InfoRequest, InfoResponse } from './intero/commands/info'
import { CompleteRequest, CompleteResponse } from './intero/commands/complete'
import { IdentifierKind } from './intero/identifierKind'
import { zipWith } from './functionalUtils'

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

    public static getDefaultCompletionItems(interoProxy: InteroProxy, textDocument: vsrv.TextDocument, position: vsrv.Position): Promise<vsrv.CompletionItem[]> {
        let { word, range } = DocumentUtils.getIdentifierAtPosition(textDocument, position, NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new CompleteAtRequest(textDocument.uri, DocumentUtils.toInteroRange(range), word);

        console.log("ici");
        return completeAtRequest
            .send(interoProxy)
            .then((response: CompleteAtResponse) => {
                let completions = response.completions;
                if (completions.length < 1) {
                    console.log("lenght < 1");
                    const completeRequest = new CompleteRequest(textDocument.uri, word);
                    return completeRequest
                        .send(interoProxy)
                        .then((response: CompleteResponse) => {
                            return Promise.resolve(response.completions);
                        });
                }
                else {
                    console.log("=== length0 " + completions.length);
                    return Promise.resolve(completions);
                }
            })
            .then(completions => {
                console.log("=== length " + completions.length);
                console.trace("!!!");
                return Promise.all(
                    completions.map((completion): Promise<vsrv.CompletionItem> => {
                        let infoReq = new InfoRequest(completion);
                        console.log("=== une question ===");
                        return infoReq
                            .send(interoProxy)
                            .then((infoResponse): Promise<vsrv.CompletionItem> => {
                                console.log("=== une réponse ===");
                                var identifier = CompletionUtils.truncResp(word, completion);
                                return Promise.resolve({
                                    label: identifier,
                                    kind: CompletionUtils.toCompletionType(infoResponse.kind),
                                    detail: infoResponse.detail,
                                    documentation: infoResponse.documentation,
                                    data: completion
                                });
                            });
                    })
                );
                // return completions.map(completion => {
                //     var identifier = CompletionUtils.truncResp(word, completion);
                //     return Promise.resolve({
                //         label: identifier,
                //         kind: vsrv.CompletionItemKind.Variable,
                //         data: completion
                //     });
                // });
            }).catch(oops => console.log("=== oops ==="));
    }

    public static getResolveInfos(interoProxy: InteroProxy, item: vsrv.CompletionItem): Promise<vsrv.CompletionItem> {
        const infoRequest = new InfoRequest(item.data);
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
}