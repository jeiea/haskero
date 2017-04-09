export interface HaskeroSettings {
    intero: InteroSettings,
    debugMode: boolean,
    maxAutoCompletionDetails: number
}

export interface InteroSettings {
    stackPath: string,
    ignoreDotGhci: boolean,
    ghciOptions: string[],
    startupParams: string[]
}