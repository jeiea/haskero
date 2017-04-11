export const allTargets: string = 'All targets';
export const noTargets: string = 'Default';

export class Target {
    constructor(public readonly name: string, public isSelected = false, public readonly isVirtual = false, public readonly isUnique = false) { }

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

        this._targets.set(allTargets, new Target(allTargets, false, true, true));
        this._targets.set(noTargets, new Target(noTargets, true, true, true));

        stackTargets.forEach(t => {
            this._targets.set(t, new Target(t));
        });
    }

    public setSelectedTarget(targetName: string, isSelected: boolean) {
        this._targets.get(targetName).isSelected = isSelected;
    }

    public toInteroTargets(): string[] {
        if (this._targets.get(allTargets).isSelected) return this.stackTargets;
        if (this._targets.get(noTargets).isSelected) return [];

        return [...this._targets.values()].filter(e => e.isSelected).map(t => t.name);
    }

    public toText(): string {
        return "Targets: [" + this.getSelectedTargets().map(t => t.name).join(" ") + "]";
    }

    public getSelectedTargets(): Target[] {
        return this.targetList.filter(t => t.isSelected);
    }
}
