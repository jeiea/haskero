'use strict';

import { IConnection } from 'vscode-languageserver';

/**
 * Tools for debugging logs
 */
export class DebugUtils {
    private static _instance: DebugUtils

    /**
     * Get the singleton
     */
    public static get instance(): DebugUtils {
        return DebugUtils._instance;
    }

    /**
     * Initializes the debug environment
     */
    public static init(isDebugOn: boolean, connection: IConnection) {
        if (DebugUtils._instance == null) {
            DebugUtils._instance = new DebugUtils(isDebugOn, connection);
        }
    }

    public isDebugOn: boolean;
    private connection: IConnection;

    private constructor(isDebugOn: boolean, connection: IConnection) {
        this.isDebugOn = isDebugOn;
        this.connection = connection;
    }

    /**
     * Does a connection.console.log call if debug mode is activated
     */
    public connectionLog(text: string) {
        if (this.isDebugOn) {
            this.connection.console.log(text);
        }
    }

    /**
     * Does a console.log call if debug mode is activated
     */
    public log(text: string) {
        if (this.isDebugOn) {
            console.log(text);
        }
    }
}