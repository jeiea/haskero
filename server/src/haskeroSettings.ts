export interface HaskeroSettings {
    intero: InteroSettings,
    debugMode: boolean,
    maxAutoCompletionDetails: number
}

export interface InteroSettings {
    ignoreDotGhci: boolean,
    startupParams: string[]
}