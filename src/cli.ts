#!/usr/bin/env node

import {awaitedForEach, extractErrorMessage, getObjectTypedKeys, isEnumValue} from 'augment-vir';
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

export enum CliCommand {
    Format = 'format',
    Check = 'check',
    Align = 'align',
}

function getCommands(): {command: CliCommand; args: string[]} {
    const thisScriptIndex = process.argv.findIndex(
        (argv) => argv.endsWith('align') || argv.endsWith('cli.js') || argv.endsWith('cli.ts'),
    );

    if (thisScriptIndex === -1) {
        throw new Error(`Could not find proper cli args location in "${process.argv.join(' ')}"`);
    }

    const firstArgIndex = thisScriptIndex + 1;
    const firstArg = process.argv[firstArgIndex];
    const isCliCommand = isEnumValue(firstArg, CliCommand);

    const command: CliCommand = isCliCommand ? (firstArg as CliCommand) : CliCommand.Align;
    const sliceIndex = isCliCommand ? firstArgIndex + 1 : firstArgIndex;
    const args = process.argv.slice(sliceIndex);

    return {
        args,
        command,
    };
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

export async function runCli(
    cwd: string,
    command: CliCommand,
    extraPrettierArgs: string[],
    shouldLog: boolean = false,
) {
    if (command === CliCommand.Format || command === CliCommand.Check) {
        if (shouldLog) {
            console.info(`Running alignment ${command}...`);
        }
        const defaultFiles = joinExtensions(defaultExtensions);
        const yamlFiles = joinExtensions(yamlExtensions);
        const operation = command === CliCommand.Format ? '--write' : '--check';

        const hasExtraArgs: boolean = !!extraPrettierArgs.length;
        const listDifferentArg = command === CliCommand.Check ? '' : '--list-different';
        const logLevelArg = command === CliCommand.Check ? '--loglevel warn' : '';
        const prettierArgs = hasExtraArgs
            ? extraPrettierArgs.join(' ')
            : `--color ${listDifferentArg} ${logLevelArg}`;

        const prettierFlags = `${operation} ${prettierArgs}`;

        // if we ever need to add more language special cases here (beyond yaml files), this should be generalized into an array
        const formatCommand = `prettier ${defaultFiles} --config "${configFiles.prettierDefault.copyToPath}" ${prettierFlags} && prettier ${yamlFiles} --config "${configFiles.prettierYaml.copyToPath}" ${prettierFlags}`;
        await runShellCommand(interpolationSafeWindowsPath(formatCommand), {
            cwd,
            hookUpToConsole: shouldLog,
        });
    } else {
        const errors: Error[] = [];
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

        if (errors.length) {
            throw new Error(`Failed to copy all config files from Celestial Alignment.`);
        }
    }
}

if (require.main === module) {
    const {command, args} = getCommands();

    runCli(process.cwd(), command, args, true).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
