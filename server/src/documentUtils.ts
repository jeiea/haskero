'use strict';

import {TextDocument, Position, Range} from 'vscode-languageserver'
import {InteroRange} from './intero/interoRange'

/**
 * Word at a known position (Range) in the document
 */
export class WordSpot {
    word: string;
    range: Range;

    constructor(word: string, range: Range) {
        this.word = word;
        this.range = range;
    }

    public get isEmpty() : boolean { return this.range.start.character === this.range.end.character && this.range.start.line === this.range.end.line }
}

/**
 * Behaviour from cursor position when there is no matching char
 */
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

/**
 * Tools for document manipulations
 */
export class DocumentUtils {
    private static identifierSymbols = /[0-9a-zA-Z_']/g;

    private static isIdentifierSymbol(c: string): boolean {
        return c.search(DocumentUtils.identifierSymbols) !== -1;
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
            return i - 1;
        }
        else {
            return cursorOffset;
        }
    }

    /**
     * return text at position, where text is composed of identifier characters
     */
    public static getIdentifierAtPosition(document: TextDocument, position: Position, sticky: NoMatchAtCursorBehaviour): WordSpot {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);
        let startOffset = DocumentUtils.getStartingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let endOffset = DocumentUtils.getEndingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let word = text.slice(startOffset, endOffset + 1); //ending offset should be included

        return new WordSpot(word, Range.create(document.positionAt(startOffset), document.positionAt(endOffset + 1)));
    }

    /**
     * Returns True if the given position is included in the range
     */
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

    //vscode range are 0 based
    public static toVSCodeRange(interoRange : InteroRange) : Range {
        return Range.create(interoRange.startLine - 1, interoRange.startCol - 1, interoRange.endLine - 1,
                            interoRange.endCol - 1);
                            //the last char index is included in an intero range. The last char index is not included in VSCode range. So the last vscode char index is 1 higher
                            // + 1);
    }

    //intero range are 1 based
    public static toInteroRange(range : Range) : InteroRange {
        return new InteroRange(range.start.line + 1, range.start.character + 1, range.end.line + 1,
                               range.end.character + 1);
                               //the last char index is included in an intero range. The last char index is not included in VSCode range. So the last intero char index is 1 lower
                               //- 1);
    }
}