export interface HaskeroSettings {
    intero: InteroSettings,
    maxAutoCompletionDetails: number
}

export interface InteroSettings {
    ignoreDotGhci: boolean,
    startupParams: [string]
}