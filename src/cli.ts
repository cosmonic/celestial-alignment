#!/usr/bin/env node

import {awaitedForEach, extractErrorMessage} from 'augment-vir';
import {existsSync} from 'fs';
import {copyFile} from 'fs/promises';
import {join} from 'path';
import {celestialAlignmentDir} from './file-paths';

type ConfigFile = {
    name: string;
    alignmentPath: string;
    copyToPath: string;
};

export const configFiles: ConfigFile[] = [
    {
        name: 'prettier config',
        alignmentPath: join(celestialAlignmentDir, '.prettierrc.js'),
        copyToPath: '.prettierrc.js',
    },
    {
        name: 'prettier config',
        alignmentPath: join(celestialAlignmentDir, '.prettierignore'),
        copyToPath: '.prettierignore',
    },
];

export function getCopyToPath(cwd: string, configFile: ConfigFile): string {
    return join(cwd, configFile.copyToPath);
}

export async function runCli(cwd: string) {
    const errors: Error[] = [];
    await awaitedForEach(configFiles, async (configFile) => {
        try {
            const copyToPath = getCopyToPath(cwd, configFile);
            await copyFile(configFile.alignmentPath, copyToPath);
            if (!existsSync(copyToPath)) {
                throw new Error(`Copied file "${copyToPath}" was not created for some reason.`);
            }
        } catch (error) {
            const copyError = new Error(
                `Copying Celestial Alignment config file "${
                    configFile.name
                }" failed: ${extractErrorMessage(error)}`,
            );
            console.error(copyError);
            errors.push(copyError);
        }
    });

    if (errors.length) {
        throw new Error(`Failed to copy all config files from Celestial Alignment.`);
    }
}

if (require.main === module) {
    runCli(process.cwd()).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
