import {TextDocument, Position, Range} from 'vscode-languageserver'

class LocalizedWord {
    word : string;
    range : Range;
}

export class DocumentUtils {
    public static getWordAtPosition(document : TextDocument, position: Position): LocalizedWord {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);

        text.lastIndexOf(' ')

        let line = text.split('\n')[position.line];
        if (line) {
            let startPosition = line.lastIndexOf(' ', position.character) + 1;
            let endPosition = line.indexOf(' ', position.character);
            if (endPosition < 0) {
                endPosition = line.length;
            }
            let ret = line.slice(startPosition, endPosition).replace(/[(),]/, '');
            return ret;
        }
        return null;
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

    public static getWord(document : TextDocument, pos : Position) : {word : string, range : Range} {
        let w = DocumentUtils.getWordAtPosition(document.getText(), pos); //text.slice(offset, text.indexOf(" ", offset));
        let endPos = Position.create(pos.line, pos.character + w.length);
        return {word : w, range : Range.create(pos, endPos) };
    }
}