'use strict';

import {TextDocument, Position, Range} from 'vscode-languageserver'

//
export class WordSpot {
    word: string;
    range: Range;

    constructor(word: string, range: Range) {
        this.word = word;
        this.range = range;
    }

    public get isEmpty() : boolean { return this.range.start.character === this.range.end.character && this.range.start.line === this.range.end.line }
}

//Behaviour from cursor position when there is no matching char
export enum NoMatchAtCursorBehaviour {
    //if char at cursor is not a match, stop
    Stop,
    //if char at cursor is not a match, looks for one char left
    LookLeft,
    //if char at cursor is not a match, looks for one char right
    LookRight,
    //if char at cursor is not a match, looks for one char both sides
    LookBoth
}

export class DocumentUtils {

    private static identifierSymbols = /[0-9a-zA-Z_']/g;
    private static nonSeparatorsSymbols = /[^\r\n\t\s]/g;

    private static isIdentifierSymbol(c: string): boolean {
        return c.search(DocumentUtils.identifierSymbols) !== -1;
    }

    private static isNonSeparatorSymbol(c: string): boolean {
        return c.search(DocumentUtils.nonSeparatorsSymbols) !== -1;
    }

    private static getStartingOffset(text: string, cursorOffset: number, isValidSymbol: (string) => boolean, sticky: NoMatchAtCursorBehaviour): number {

        if (isValidSymbol(text.charAt(cursorOffset)) || sticky === NoMatchAtCursorBehaviour.LookLeft || sticky === NoMatchAtCursorBehaviour.LookBoth) {
            let i = cursorOffset - 1;
            for (i; i >= 0 && isValidSymbol(text.charAt(i)); i--) {
            }
            return i + 1;
        }
        else {
            return cursorOffset;
        }


    }

    private static getEndingOffset(text: string, cursorOffset: number, isValidSymbol: (string) => boolean, sticky: NoMatchAtCursorBehaviour): number {
        if (isValidSymbol(text.charAt(cursorOffset)) || sticky === NoMatchAtCursorBehaviour.LookRight || sticky === NoMatchAtCursorBehaviour.LookBoth) {
            let i = Math.max(0, cursorOffset);
            for (i; i < text.length && isValidSymbol(text.charAt(i)); i++) {
            }
            return i;
        }
        else {
            return cursorOffset;
        }
    }

    //return text at position, where text is composed of identifier characters
    public static getIdentifierAtPosition(document: TextDocument, position: Position, sticky: NoMatchAtCursorBehaviour): WordSpot {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);
        let startOffset = DocumentUtils.getStartingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let endOffset = DocumentUtils.getEndingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let word = text.slice(startOffset, endOffset);

        return new WordSpot(word, Range.create(document.positionAt(startOffset + 1), document.positionAt(endOffset + 1)));
    }

    //return text at position, where text is composed of non separator characters
    public static getTextAtPosition(document: TextDocument, position: Position, sticky: NoMatchAtCursorBehaviour): WordSpot {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);
        let startOffset = DocumentUtils.getStartingOffset(text, cursorOffset, DocumentUtils.isNonSeparatorSymbol, sticky);
        let endOffset = DocumentUtils.getEndingOffset(text, cursorOffset, DocumentUtils.isNonSeparatorSymbol, sticky);
        let word = text.slice(startOffset, endOffset);

        return new WordSpot(word, Range.create(document.positionAt(startOffset + 1), document.positionAt(endOffset + 1)));
    }

    public static isPositionInRange(position: Position, range: Range): boolean {
        if (position === null || range === null) {
            return false;
        }
        if (position.line < range.start.line || position.line > range.end.line ||
            position.character < range.start.character || position.character > range.end.character) {
            return false;
        }
        return true;
    }
}