export const allTargets: string = 'All targets';

export function convertTargets(targets: string[], newTarget: string): string[] {
    return newTarget === allTargets ? targets : [newTarget]
}