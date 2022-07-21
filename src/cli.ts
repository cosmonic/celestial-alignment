#!/usr/bin/env node

import {awaitedForEach, extractErrorMessage, getObjectTypedKeys} from 'augment-vir';
import {interpolationSafeWindowsPath, runShellCommand} from 'augment-vir/dist/cjs/node-only';
import {existsSync} from 'fs';
import {copyFile} from 'fs/promises';
import {join} from 'path';
import {celestialAlignmentDir} from './file-paths';

type ConfigFile = {
    alignmentPath: string;
    copyToPath: string;
};

export const configFiles = {
    prettierBase: {
        alignmentPath: join(celestialAlignmentDir, '.prettierrc-base.js'),
        copyToPath: '.prettierrc-base.js',
    },
    prettierDefault: {
        alignmentPath: join(celestialAlignmentDir, '.prettierrc.js'),
        copyToPath: '.prettierrc.js',
    },
    prettierYaml: {
        alignmentPath: join(celestialAlignmentDir, '.prettierrc-yaml.js'),
        copyToPath: '.prettierrc-yaml.js',
    },
    prettierIgnore: {
        alignmentPath: join(celestialAlignmentDir, '.prettierignore'),
        copyToPath: '.prettierignore',
    },
} as const;

export function getCopyToPath(cwd: string, configFile: ConfigFile): string {
    return join(cwd, configFile.copyToPath);
}

function getCommand(): string {
    const thisScriptIndex = process.argv.findIndex(
        (argv) => argv.endsWith('align') || argv.endsWith('cli.js') || argv.endsWith('cli.ts'),
    );
    return process.argv[thisScriptIndex + 1] ?? '';
}

const defaultExtensions = [
    'css',
    'html',
    'js',
    'json',
    'jsx',
    'md',
    'toml',
    'ts',
    'tsx',
];

const yamlExtensions = [
    'yaml',
    'yml',
];

function joinExtensions(extensions: string[]): string {
    return `\"./**/*.+(${extensions.join('|')})\"`;
}

export async function runCli(cwd: string, command: string, shouldLog: boolean = false) {
    const errors: Error[] = [];

    if (command === 'format' || command === 'check') {
        const defaultFiles = joinExtensions(defaultExtensions);
        const yamlFiles = joinExtensions(yamlExtensions);
        const operation = command === 'format' ? '--write' : '--check';

        // if we ever need to add more language special cases here (beyond yaml files), this should be generalized into an array
        const formatCommand = `prettier --color ${defaultFiles} ${operation} --config "${configFiles.prettierDefault.copyToPath}" && prettier --color ${yamlFiles} --config ${configFiles.prettierYaml.copyToPath} ${operation}`;
        const prettierResult = await runShellCommand(interpolationSafeWindowsPath(formatCommand), {
            cwd,
            hookUpToConsole: shouldLog,
        });
        if (prettierResult.exitCode !== 0) {
            if (shouldLog) {
                console.error(prettierResult.error);
                console.error(prettierResult.stderr);
            }
            throw new Error(`Prettier call failed.`);
        }
    } else {
        await awaitedForEach(getObjectTypedKeys(configFiles), async (configFileName) => {
            const configFile = configFiles[configFileName];
            try {
                const copyToPath = getCopyToPath(cwd, configFile);
                await copyFile(configFile.alignmentPath, copyToPath);
                if (!existsSync(copyToPath)) {
                    throw new Error(`Copied file "${copyToPath}" was not created for some reason.`);
                }
            } catch (error) {
                const copyError = new Error(
                    `Copying Celestial Alignment config file "${configFileName}" failed: ${extractErrorMessage(
                        error,
                    )}`,
                );
                console.error(copyError);
                errors.push(copyError);
            }
        });
    }

    if (errors.length) {
        throw new Error(`Failed to copy all config files from Celestial Alignment.`);
    }
}

if (require.main === module) {
    runCli(process.cwd(), getCommand(), true).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
