'use strict';

export interface InteroResponse {
    /**
     * The response state
     */
    isOk: boolean;

    /**
     * Text recieved on stderr
     */
    readonly rawerr: string;

    /**
     * Text recieved on stdout
     */
    readonly rawout: string;
}
