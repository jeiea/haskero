import * as vscode from 'vscode';
import { getTargets } from '../utils/stack';

/**
 * Command which opens a quickpick selection menu to select the active Cabal target
 * in the Haskero service
 */
export class SelectTarget {
    public static readonly onTargetsSelected = new vscode.EventEmitter<string>();
    public static readonly allTargets = 'All targets';
    public static readonly id = 'haskero.selectTarget';

    public readonly id = SelectTarget.id;

    constructor(private readonly client) { }

    public handler = () => {
        getTargets().then((targets) => {
            const ts = [SelectTarget.allTargets].concat(targets);
            vscode.window.showQuickPick(ts).then((newTarget) => {
                if (!newTarget) return;
                this.client.sendNotification('setTargets',
                    newTarget === SelectTarget.allTargets ? [targets] : [[newTarget]]);
                SelectTarget.onTargetsSelected.fire(newTarget);
            });
        });
    }
}