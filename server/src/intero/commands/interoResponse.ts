'use strict';

export interface InteroResponse {
    /**
     * The response state
     */
    isOk : boolean;

    /**
     * Text recieved on stderr
     */
    rawerr: string;

    /**
     * Text recieved on stdout
     */
    rawout: string;
}
