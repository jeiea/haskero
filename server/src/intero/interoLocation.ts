import { InteroRange } from './interoRange'

export class InteroLocation {
    constructor(public readonly file: string, public readonly range: InteroRange) { }
}