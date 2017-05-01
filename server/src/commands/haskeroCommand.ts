import * as vsrv from 'vscode-languageserver';
import { HaskeroService } from "../haskeroService";

/**
 * There are a finite number of HaskeroCommand. (remove duplicate command, top level signature command, etc.)
 */

/**
 * Description of a command.
 */
export interface HaskeroCommand {
    title: string;
    command: string;
    instanciate(args?: any[]): HaskeroCommandInstance;
}

export interface HaskeroCommandInstance extends vsrv.Command {
    execute(workSpace: vsrv.RemoteWorkspace, documents: vsrv.TextDocuments, haskeroService: HaskeroService): void;
}