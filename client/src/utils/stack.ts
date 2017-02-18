import * as cp from 'child_process';
import { workspace } from 'vscode';

/**
 * Get targets defined in the project, if error then []
 */
export function getTargets(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const cwd = process.cwd();
        process.chdir(workspace.rootPath);
        cp.exec('stack ide targets', (error, stdout, stderr) => {
            if (error) {
                reject(error + '\nstdout:\n' + stdout + '\nstderr\n' + stderr);
            }
            // For some reason stack ide targets writes to stderr
            if (stderr) resolve(stderr.split('\n').filter((s) => s.length > 0));
            else resolve([]);
        });
        process.chdir(cwd);
    });
}