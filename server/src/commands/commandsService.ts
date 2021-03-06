import * as vsrv from 'vscode-languageserver';
import { HaskeroCommand, HaskeroCommandInstance } from "./haskeroCommand";
import { TopLevelTypeSignature } from "./topLevelTypeSignature";

export class CommandsService {
    public static readonly Commands: HaskeroCommand[] = [
        new TopLevelTypeSignature()
    ]

    public static toFeaturesCommands = () => CommandsService.Commands.map(cmd => cmd.command);


    /**
     * Get a command instance, ready to execute
     * @param params command parameters
     */
    public static getCommandInstance(params: vsrv.ExecuteCommandParams): HaskeroCommandInstance {
        let cmd = CommandsService.Commands.find(c => c.command === params.command);
        if (cmd) {
            return cmd.instanciate(params.arguments);
        }
        else {
            return null;
        }
    }
}