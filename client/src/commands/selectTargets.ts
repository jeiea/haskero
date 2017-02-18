import * as vscode from 'vscode';
import * as vscli from 'vscode-languageclient';
import { getTargets } from '../utils/stack';
import { allTargets, convertTargets } from '../utils/targets';
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

        //this.client.stop();

        getTargets().then((targets) => {
            const ts = [allTargets].concat(targets)
            vscode.window.showQuickPick(ts).then((newTarget) => {
                if (!newTarget) return;

                if (!this.haskeroClient.isStarted) {
                    let initOptions: HaskeroClientInitOptions = {
                        targets: convertTargets(targets, newTarget)
                    };
                    this.haskeroClient.start(initOptions);
                }
                else {
                    //this.haskeroClient.client.onReady().then(() => {
                        //sendNotification need an array of parameters and here, the target array is ONE parameter
                        this.haskeroClient.client
                            .sendRequest('changeTargets', [convertTargets(targets, newTarget)])
                            .then(resp => {
                                this.haskeroClient.client.info("Change target done.", resp);
                            }, reason => {
                                this.haskeroClient.client.error("Change targets failed", reason);
                                this.haskeroClient.stop();
                            });
                    //});
                }
                SelectTarget.onTargetsSelected.fire(newTarget);
            });
        });
    }
}