import {awaitedForEach} from 'augment-vir';
import {existsSync} from 'fs';
import {unlink} from 'fs/promises';
import {dirname} from 'path';
import {configFiles, getCopyToPath, runCli} from './cli';
import {testRepos} from './test-file-paths';

describe('config files', () => {
    it('should only contain existing config files', () => {
        configFiles.forEach((configFile) => {
            try {
                expect(existsSync(configFile.alignmentPath)).toBe(true);
            } catch (error) {
                console.error(`Could not find ${configFile.alignmentPath}`);
                throw error;
            }
        });
    });
});

describe(runCli.name, () => {
    it('should copy all files over', async () => {
        const copyPaths = configFiles.map((configFile) => {
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

            await runCli(testRepos.blankRepo);

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
});
