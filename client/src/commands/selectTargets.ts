import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { allTargets } from '../utils/targets';
import CheckBoxList from '../utils/checkBoxList'
import CheckBox from '../utils/checkBox'
import { HaskeroTargets } from '../utils/targets'
import { HaskeroClient, HaskeroClientInitOptions } from '../utils/haskeroClient';

/**
 * Command which opens a quickpick selection menu to select the active Cabal target
 * in the Haskero service
 */
export class SelectTarget {
    public static readonly onTargetsSelected = new vscode.EventEmitter<HaskeroTargets>();
    public static readonly id: string = 'haskero.selectTarget';

    public readonly id: string = SelectTarget.id;

    constructor(private readonly haskeroClient: HaskeroClient) { }

    public handler = () => {
        this.haskeroClient.getTargets().then((haskeroTargets) => {
            const boxList = new CheckBoxList(haskeroTargets.targetList.map(t => new CheckBox(t.name, t.isSelected, t.isUnique)));

            boxList.show().then((checkBoxes) => {
                checkBoxes.forEach(cb => {
                    haskeroTargets.setSelectedTarget(cb.value, cb.isSelected);
                });

                let newTargets = haskeroTargets.toInteroTargets();

                //sendNotification need an array of parameters and here, the target array is ONE parameter
                return this.haskeroClient.client
                    .sendRequest('changeTargets', [newTargets])
                    .then(resp => {
                        this.haskeroClient.client.info("Change target done.", resp);
                        vscode.window.showInformationMessage("Change target done. " + resp);
                        SelectTarget.onTargetsSelected.fire(haskeroTargets);
                    }, reason => {
                        this.haskeroClient.client.error(`Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.
Hint : try running a build command to get missing dependencies (> stack build ${newTargets.join(' ')})
Error details:
`, reason);
                        vscode.window.showErrorMessage("Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.");
                    });
            },
                (reason) => {
                    console.log("cata : ");
                    console.dir(reason);
                });
        });
    }
}