export const allTargets: string = 'All targets';
export const noTargets: string = 'Default';

/**
 * Convert the newTarget name to a parameter for the an initRequest or changeTargetzsRequest
 */
export function convertTargets(targets: string[], newTarget: string): string[] {
    switch (newTarget) {
        case allTargets:
            return targets;
        case noTargets:
            return [];
        default:
            return [newTarget];
    }
}

/**
 * Map a target to its label in the status bar
*/
export function targetToStatusBarText(target: string): string {
    switch (target) {
        case allTargets:
            return allTargets;
        case noTargets:
            return "Default targets";
        default:
            return target.split(':').splice(1).join(':')
    }
}

/**
 * Return all targets to show in the dialog box
 */
export function dialogTargets(targets: string[]) {
    return [noTargets, allTargets].concat(targets);
}