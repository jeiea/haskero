import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { allTargets, convertTargets, dialogTargets } from '../utils/targets';
import { HaskeroClient, HaskeroClientInitOptions } from '../utils/haskeroClient';

/**
 * Command which opens a quickpick selection menu to select the active Cabal target
 * in the Haskero service
 */
export class SelectTarget {
    public static readonly onTargetsSelected = new vscode.EventEmitter<string>();
    public static readonly id: string = 'haskero.selectTarget';

    public readonly id: string = SelectTarget.id;

    constructor(private readonly haskeroClient: HaskeroClient) { }

    public handler = () => {
        this.haskeroClient.getTargets().then((targets) => {
            const ts = dialogTargets(targets);
            vscode.window.showQuickPick(ts).then((newTarget) => {
                if (!newTarget) return;

                let newTargets = convertTargets(targets, newTarget);

                //sendNotification need an array of parameters and here, the target array is ONE parameter
                this.haskeroClient.client
                    .sendRequest('changeTargets', [newTargets])
                    .then(resp => {
                        this.haskeroClient.client.info("Change target done.", resp);
                        vscode.window.showInformationMessage("Change target done. " + resp);
                    }, reason => {
                        this.haskeroClient.client.error(`Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.
Hint : try running a build command to get missing dependencies (> stack build ${newTargets.join(' ')})
Error details:
`, reason);
                        vscode.window.showErrorMessage("Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.");
                    });
                SelectTarget.onTargetsSelected.fire(newTarget);
            });
        });
    }
}