import {awaitedForEach} from 'augment-vir';
import {existsSync} from 'fs';
import {readdir, readFile, unlink, writeFile} from 'fs/promises';
import {dirname, join, parse as parsePath} from 'path';
import {configFiles, getCopyToPath, runCli} from './cli';
import {testRepos} from './test-file-paths';

describe('config files', () => {
    it('should only contain existing config files', () => {
        Object.values(configFiles).forEach((configFile) => {
            try {
                expect(existsSync(configFile.alignmentPath)).toBe(true);
            } catch (error) {
                console.error(`Could not find ${configFile.alignmentPath}`);
                throw error;
            }
        });
    });
});

async function getFormatFileContents(): Promise<Record<string, string>> {
    const files = await readdir(testRepos.format);
    const contents: Record<string, string> = {};

    await awaitedForEach(files, async (fileName) => {
        if (fileName.startsWith('.')) {
            return;
        }

        const filePath = join(testRepos.format, fileName);
        contents[fileName] = (await readFile(filePath)).toString();
    });
    return contents;
}

async function compareFormatFiles(shouldBeFixed: boolean): Promise<Record<string, string>> {
    const formatFiles = await getFormatFileContents();

    Object.keys(formatFiles).forEach((formatFileName) => {
        if (parsePath(formatFileName).name.endsWith('broken')) {
            const fixedName = formatFileName.replace('broken', 'fixed');
            expect(formatFiles[formatFileName]).toBeTruthy();
            expect(formatFiles[fixedName]).toBeTruthy();
            if (shouldBeFixed) {
                expect(formatFiles[formatFileName]).toEqual(formatFiles[fixedName]);
            } else {
                expect(formatFiles[formatFileName]).not.toEqual(formatFiles[fixedName]);
            }
        }
    });

    return formatFiles;
}

describe(runCli.name, () => {
    it('should copy all files over', async () => {
        const copyPaths = Object.values(configFiles).map((configFile) => {
            return getCopyToPath(testRepos.blankRepo, configFile);
        });
        try {
            // verify that files didn't exist already before test started
            copyPaths.forEach((copyToPath) => {
                expect(existsSync(dirname(copyToPath))).toBe(true);
                try {
                    expect(existsSync(copyToPath)).toBe(false);
                } catch (error) {
                    console.error(`${copyToPath} already exists`);
                    throw error;
                }
            });

            await runCli(testRepos.blankRepo, '');

            // verify all files were written
            copyPaths.forEach((copyToPath) => {
                try {
                    expect(existsSync(copyToPath)).toBe(true);
                } catch (error) {
                    console.error(`${copyToPath} was not copied`);
                    throw error;
                }
            });
        } finally {
            // remove the files to clean up the test
            await awaitedForEach(copyPaths, async (copyToPath) => {
                if (existsSync(copyToPath)) {
                    await unlink(copyToPath);
                }

                expect(existsSync(copyToPath)).toBe(false);
            });
        }
    });

    it('should check files', async () => {
        const originalFiles = await compareFormatFiles(false);

        expect(async () => await runCli(testRepos.format, 'check')).rejects.toThrowError();

        const afterFiles = await compareFormatFiles(false);

        expect(originalFiles).toEqual(afterFiles);
    });

    it('should format files', async () => {
        const originalFiles = await compareFormatFiles(false);

        expect(async () => await runCli(testRepos.format, 'check')).rejects.toThrowError();

        await runCli(testRepos.format, 'format');

        await runCli(testRepos.format, 'check');

        const fixedFiles = await compareFormatFiles(true);

        expect(fixedFiles).not.toEqual(originalFiles);

        await awaitedForEach(Object.keys(originalFiles), async (originalFileName) => {
            const contents = originalFiles[originalFileName] ?? '';
            const filePath = join(testRepos.format, originalFileName);
            await writeFile(filePath, contents);
        });

        expect(async () => await runCli(testRepos.format, 'check')).rejects.toThrowError();

        const revertedFiles = await compareFormatFiles(false);

        expect(revertedFiles).toEqual(originalFiles);
    });
});
