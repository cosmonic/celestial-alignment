import {join} from 'path';
import {celestialAlignmentDir} from './file-paths';

const testFilesDir = join(celestialAlignmentDir, 'test-files');
export const testRepos = {
    blankRepo: join(testFilesDir, 'blank-repo'),
} as const;
