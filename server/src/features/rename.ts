import * as tmp from 'tmp'
import * as fs from 'fs'
import * as vsrv from 'vscode-languageserver';
import { HaskeroService } from "../haskeroService";
import { DocumentUtils, NoMatchAtCursorBehaviour } from "../utils/documentUtils";
import { LoadRequest, LoadResponse } from "../intero/commands/load";
import { UriUtils } from "../utils/uriUtils";
import { LocAtRequest } from "../intero/commands/locAt";
import { InteroRange } from "../intero/interoRange";
import { InteroDiagnostic } from "../intero/commands/interoDiagnostic";
import { ShowModulesRequest } from "../intero/commands/showModules";

export default function (documents: vsrv.TextDocuments, haskeroService: HaskeroService) {
    return async (params: vsrv.RenameParams): Promise<vsrv.WorkspaceEdit> => {
        let loadedModulesPaths = (await haskeroService.executeInteroRequest(new ShowModulesRequest())).modules;
        let modulesPathToFix = [...loadedModulesPaths];

        console.log("modulesToFix:"); console.dir(modulesPathToFix);

        //1 - get definition site information

        let definitionDocument: vsrv.TextDocument;
        let definitionPosition: vsrv.Position;
        {
            let document = documents.get(params.textDocument.uri);
            let location = await haskeroService.getDefinitionLocation(document, params.position);
            //if we are at the defintion site
            if (location.uri === params.textDocument.uri && DocumentUtils.isPositionInRange(params.position, location.range)) {
                //intero loc-at function returns a wrong range for defintion site, the range includes the identifier and the corps of the definition
                //so we jsut take the params position instead
                definitionDocument = document;
                definitionPosition = params.position;
            }
            else {
                //load from disk because location.uri is not necessarily opened in the editor (just opened documents are available in the TextDocuments object)
                definitionDocument = await DocumentUtils.loadUriFromDisk(location.uri);
                definitionPosition = location.range.start;
            }
        }
        let { word: oldName, range: definitionRange } = DocumentUtils.getIdentifierAtPosition(definitionDocument, definitionPosition, NoMatchAtCursorBehaviour.LookBoth); //getTextAtRange(locationDocument, location.range);

        //2 - rename definition site oldName to newName

        let newText = renameIdentifier(definitionDocument, definitionDocument.getText(), definitionRange, params.newName);
        let tmpDefinitionFilePath = await createTmpFile(newText);
        await fixModuleFile(UriUtils.toUri(tmpDefinitionFilePath), null, oldName, params.newName); //the definition site for the definition is null

        // remove the definition site module from the modules to fix list
        modulesPathToFix.splice(modulesPathToFix.indexOf(UriUtils.toFilePath(definitionDocument.uri)), 1);

        //3 - fix all previously opened modules

        await Promise.all(modulesPathToFix.map(async modulePath => {
            let moduleDocument = await DocumentUtils.loadUriFromDisk(UriUtils.toUri(modulePath));
            let tmpFilePath = await createTmpFile(moduleDocument.getText());
            await fixModuleFile(UriUtils.toUri(tmpFilePath), UriUtils.toUri(tmpDefinitionFilePath), oldName, params.newName);
        }));

        //4 - unload all modules and reload previously loaded modules
        await haskeroService.executeInteroRequest(new LoadRequest([], false));
        await haskeroService.executeInteroRequest(new LoadRequest(loadedModulesPaths.map(UriUtils.toUri), false));
        return null;
    }



    async function fixModuleFile(uri: string, uriDefinitionModule: string, oldName: string, newName: string): Promise<void> {
        let filePath = UriUtils.toFilePath(uri);
        let document = await DocumentUtils.loadUriFromDisk(uri);
        let newText = document.getText();
        let uris = uriDefinitionModule ? [document.uri, uriDefinitionModule] : [document.uri];
        let loadResponse = await haskeroService.executeInteroRequest(new LoadRequest(uris, true));
        let oldNameErrors = loadResponse.errors.filter(e => e.filePath === filePath && e.message.indexOf(oldName) > -1);

        if (oldNameErrors.length > 0) {
            oldNameErrors
                .reverse() //starting from the end, its a trick to rename identifier from the end in order avoid shifts when renaming with a new identifier with different length
                .forEach(e => {
                    let range = errorToRange(document, e);
                    newText = renameIdentifier(document, newText, range, newName);
                });

            await saveNewTextForDocument(document, newText);
            await fixModuleFile(uri, uriDefinitionModule, oldName, newName);
        }
        else {
            console.log("------------");
            console.log(newText);
        }
    }

    async function saveNewTextForDocument(document: vsrv.TextDocument, newText: string): Promise<{}> {
        let path = UriUtils.toFilePath(document.uri);

        return new Promise((resolve, reject) => {
            let stream = fs.createWriteStream(path);
            stream.on('finish', () => {
                resolve();
            });
            stream.on('error', reason => reject(reason));
            stream.write(newText);
            stream.end();
            stream.close();
        });
    }

    function errorToRange(document: vsrv.TextDocument, error: InteroDiagnostic): vsrv.Range {
        //position in error message are 1 based. Position are 0 based, but there is a issue somewhere because we it works without (-1) :-(
        let identifier = DocumentUtils.getIdentifierAtPosition(document, vsrv.Position.create(error.line, error.col), NoMatchAtCursorBehaviour.LookBoth);
        return identifier.range;
    }

    function renameIdentifier(document: vsrv.TextDocument, text: string, range: vsrv.Range, newName: string): string {
        let startingOffset = document.offsetAt(range.start);
        let endingOffset = document.offsetAt(range.end);
        //Array(wordSpot.word.length + 1).join("-")

        return text.substr(0, startingOffset) + newName + text.substr(endingOffset, text.length - endingOffset);
    }

    function createTmpFile(content: string): Promise<string> {
        return new Promise((resolve, reject) => {
            tmp.file({ prefix: 'haskero-', postfix: '.hs' }, (err, path, fd, cleanUpFct) => {
                console.log(path);
                let tmpStream = fs.createWriteStream(path);
                tmpStream.on('finish', () => {
                    resolve(path);
                });
                tmpStream.on('error', reason => reject(reason));
                tmpStream.write(content);
                tmpStream.end();
            });
        });
    }
}