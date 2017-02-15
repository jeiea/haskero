import * as vscode from 'vscode'
import * as vscli from 'vscode-languageclient'
import { EditorUtils } from '../utils/editorUtils'

/**
 * Command which inserts a line with the type signature of the function under the cursor
 * If the token under the cursor has no type, cancel the command
 */
export class InsertTypeAbove {

    constructor(private readonly client) {
    }

    public readonly id = "haskero.insertType";

    public handler = () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        let docId: vscli.TextDocumentIdentifier = {
            uri: editor.document.uri.toString()
        };
        let hoverParams: vscli.TextDocumentPositionParams = {
            textDocument: docId,
            position: editor.selection.start
        }
        //find type information at cursor position in the right document
        //use the langauge server with the standard protocol
        this.client.sendRequest(vscli.HoverRequest.type, hoverParams)
            .then((hover: vscli.Hover) => {
                //if the response contains a value field
                if (hover && this.isValued(hover.contents) && hover.contents.value !== "") {
                    let signature = hover.contents.value;
                    editor.edit(this.addSignatureEditBuilder(editor, this.normalizeSignature(signature)));
                }
            });
        //.then : commented, don't do anything if insertion has failed
    }


    private normalizeSignature(signature: string) {
        return signature.replace(/[\r\n]+/g, '').replace(/[ ]{2,}/g, ' ');
    }

    private addSignatureEditBuilder(editor: vscode.TextEditor, signature: string) {
        return (editBuilder: vscode.TextEditorEdit) => {
            //find the first char column to align the type signature with the function definition
            let startingColumn = EditorUtils.getFirstSymbolFromCurrentPosition(editor);
            //FIXME: handle 'tab based' documents
            let padding = " ".repeat(startingColumn);
            let signatureLine = padding + signature;
            let currentLine = EditorUtils.getCurrentLine(editor);
            let insertingPosition = new vscode.Position(currentLine.lineNumber, 0);
            //insert the type signature line where the function defintion is located
            editBuilder.insert(insertingPosition, padding + signature + '\n');
        }
    }

    //true is markedString contains a value field
    private isValued(markedString: { value: string } | string | vscode.MarkedString[]): markedString is { value: string } {
        return (<{ value: string }>markedString).value !== undefined;
    }

}