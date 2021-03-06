import * as vsrv from 'vscode-languageserver';
import { HaskeroService } from "../haskeroService";
import { TypeInfoKind } from "../intero/commands/typeAt";
import { HaskeroCommand, HaskeroCommandInstance } from "./haskeroCommand";

export class TopLevelTypeSignature implements HaskeroCommand {
    public readonly title = "Add top level signature";
    public readonly command = "TopLevelTypeSignatureCmd";

    instanciate(args: any[]): HaskeroCommandInstance {
        return new TopLevelTypeSignatureInstance(args[0], args[1], args[2], args[3]);
    }
}

export class TopLevelTypeSignatureInstance extends TopLevelTypeSignature implements HaskeroCommandInstance {
    public arguments?: any[];

    constructor(public readonly textDocument: vsrv.TextDocumentIdentifier, public readonly line: number, public readonly col: number, public readonly type: string) {
        super();
        this.arguments = new Array();
        this.arguments.push(textDocument, line, col, type);
    }

    execute(workSpace: vsrv.RemoteWorkspace, documents: vsrv.TextDocuments, haskeroService: HaskeroService): void {
        let textDocument = documents.get(this.textDocument.uri);
        //we dont use the type info extracted from the warning because it uses 'forall' syntaxe to describe the signature
        //so we use haskero service to get a better type info
        haskeroService.getHoverInformation(textDocument, vsrv.Position.create(this.line, this.col), TypeInfoKind.Generic)
            .then((hover: vsrv.Hover) => {
                let myHover = <{ language: string; value: string; }>hover.contents;
                let edit = vsrv.TextEdit.insert(vsrv.Position.create(this.line, this.col), myHover.value + '\n');

                let wse: vsrv.WorkspaceEdit = {
                    changes: {
                        [this.textDocument.uri]: [edit]
                    }
                };
                return workSpace.applyEdit(wse).then(resp => Promise.resolve(resp), reason => Promise.reject(reason));
            })
            .then(response => {
            })
            .catch(reason => {
                console.log("Cannot apply insert top-level signature command: ");
                console.dir(reason);
            });
    }
}