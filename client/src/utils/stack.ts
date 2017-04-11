import * as cp from 'child_process';
import { workspace } from 'vscode';
import { HaskeroTargets } from './targets'

/**
 * Get targets defined in the project, if error then []
 */
export function getTargets(stackPath: string): Promise<HaskeroTargets> {
    return new Promise((resolve, reject) => {
        const cwd = process.cwd();
        process.chdir(workspace.rootPath);
        cp.exec(`${stackPath} ide targets`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }

            let targets;
            // For some reason stack ide targets writes to stderr
            if (stderr) {
                targets = parseTargets(stderr)
            }
            else {
                targets = [];
            }
            resolve(new HaskeroTargets(targets));
        });
        process.chdir(cwd);
    });
}

function allMatchs(text: string, regexp: RegExp): RegExpExecArray[] {
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray;

    while ((match = regexp.exec(text)) != null) {
        matches.push(match);
    }
    return matches;
}

function parseTargets(raw: string): string[] {
    const regTargets = /^.+[:].+$/mg;
    return allMatchs(raw, regTargets).map(regArr => regArr[0]);
}