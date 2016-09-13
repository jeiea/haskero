'use strict';

import {TextDocument, Position, Range} from 'vscode-languageserver'

export class LocalizedWord {
    word : string;
    range : Range;

    constructor(word : string, range : Range) {
        this.word = word;
        this.range = range;
    }
}

export class DocumentUtils {

    private static identifierSymbols = /[0-9a-zA-Z_']/g;

    private static isIdentifierSymbol(c : string) : boolean {
        return c.search(DocumentUtils.identifierSymbols) !== -1;
    }

    private static getStartingOffset(text : string, cursorOffset : number) : number {
        let i = cursorOffset;
        for (i; i >= 0 && DocumentUtils.isIdentifierSymbol(text.charAt(i)); i--) {
        }
        return i+1;
    }

    private static getEndingOffset(text : string, cursorOffset : number) : number {
        let i = cursorOffset;
        for (i; i < text.length && DocumentUtils.isIdentifierSymbol(text.charAt(i)); i++) {
        }
        return i;
    }

    public static getWordAtPosition(document : TextDocument, position: Position): LocalizedWord {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);
        let startOffset = DocumentUtils.getStartingOffset(text, cursorOffset);
        let endOffset = DocumentUtils.getEndingOffset(text, cursorOffset);
        let word = text.slice(startOffset, endOffset);

        return new LocalizedWord(word, Range.create(document.positionAt(startOffset), document.positionAt(endOffset)));
    }

    public static isPositionInRange(position: Position, range: Range): boolean {
        if (position === null  || range === null) {
            return false;
        }
        if (position.line < range.start.line || position.line > range.end.line ||
            position.character < range.start.character || position.character > range.end.character) {
            return false;
        }
        return true;
    }
}