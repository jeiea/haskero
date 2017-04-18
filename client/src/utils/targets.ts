export const allTargets: string = 'All targets';
export const noTargets: string = 'Default';

/**
 * An Haskero target.
 * It is like a cabal target + virtual targets.
 * A virtual target is a target unknown by cabal but that haskero car map to cabal targets (ie: 'default target' is mapped to the empty string target)
 */
export class Target {
    /**
     * Constructor
     * @param name Target cabal name
     * @param isSelected true if the target is activated (selected)
     * @param isVirtual a virtual target is not a cabal cabal target by itself. It can be mapped to cabal target. For instance:
     * 'all target' or 'default target'
     * @param isUnique a unique target is activated (selected) alone
     */
    constructor(public readonly name: string, public isSelected = false, public readonly isVirtual = false, public readonly isUnique = false) { }

    /**
     * User friendly target text
     */
    public toText(): string {
        switch (this.name) {
            case allTargets:
                return allTargets;
            case noTargets:
                return "Default targets";
            default:
                return this.name.split(':').splice(1).join(':')
        }
    }
}

/**
 * Haskero targets.
 * Handles the current cabal targets which are selected by the user
 */
export class HaskeroTargets {

    private _targets: Map<string, Target>;

    public get targetList(): Target[] {
        return [... this._targets.values()];
    }

    /**
     * Creates a HaskeroTargets
     * @param stackTargets cabal targets
     */
    constructor(private stackTargets: string[]) {

        this._targets = new Map<string, Target>();

        //adds 2 virtual targets
        this._targets.set(allTargets, new Target(allTargets, false, true, true));
        this._targets.set(noTargets, new Target(noTargets, true, true, true));

        stackTargets.forEach(t => {
            this._targets.set(t, new Target(t));
        });
    }

    public setSelectedTarget(targetName: string, isSelected: boolean) {
        this._targets.get(targetName).isSelected = isSelected;
    }

    /**
     * Map targets to targets known by cabal
     */
    public toInteroTargets(): string[] {
        if (this._targets.get(allTargets).isSelected) return this.stackTargets;
        if (this._targets.get(noTargets).isSelected) return [];

        return [...this._targets.values()].filter(e => e.isSelected).map(t => t.name);
    }

    /**
     * User friendly targets text
     */
    public toText(): string {
        return "Targets: " + this.getSelectedTargets().map(t => t.name).join(" ");
    }

    public getSelectedTargets(): Target[] {
        return this.targetList.filter(t => t.isSelected);
    }
}
