import { describe, it, expect } from 'vitest';
import { sep } from 'path';
import { validatePath } from './pathSecurity';

describe('validatePath', () => {
    const workingDir = '/home/user/project';

    it('should allow paths within working directory', () => {
        expect(validatePath('/home/user/project/file.txt', workingDir).valid).toBe(true);
        expect(validatePath('file.txt', workingDir).valid).toBe(true);
        expect(validatePath('./src/file.txt', workingDir).valid).toBe(true);
    });

    it('should reject paths outside working directory', () => {
        const result = validatePath('/etc/passwd', workingDir);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('outside the working directory');
    });

    it('should prevent path traversal attacks', () => {
        const result = validatePath('../../.ssh/id_rsa', workingDir);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('outside the working directory');
    });

    it('should allow the working directory itself', () => {
        expect(validatePath('.', workingDir).valid).toBe(true);
        expect(validatePath(workingDir, workingDir).valid).toBe(true);
    });

    it('should allow relative filenames like CLAUDE.md (BUG-001 regression)', () => {
        expect(validatePath('CLAUDE.md', workingDir).valid).toBe(true);
        expect(validatePath('README.md', workingDir).valid).toBe(true);
        expect(validatePath('src/index.ts', workingDir).valid).toBe(true);
    });

    if (sep === '\\') {
        describe('Windows-specific paths', () => {
            const winWorkingDir = 'C:\\Users\\julien\\project';

            it('should allow files within working directory using native paths', () => {
                expect(validatePath('CLAUDE.md', winWorkingDir).valid).toBe(true);
                expect(validatePath('src\\index.ts', winWorkingDir).valid).toBe(true);
                expect(validatePath('C:\\Users\\julien\\project\\file.txt', winWorkingDir).valid).toBe(true);
            });

            it('should reject paths outside working directory', () => {
                const result = validatePath('C:\\Windows\\System32\\config', winWorkingDir);
                expect(result.valid).toBe(false);
                expect(result.error).toContain('outside the working directory');
            });

            it('should prevent path traversal with backslashes', () => {
                const result = validatePath('..\\..\\secret.txt', winWorkingDir);
                expect(result.valid).toBe(false);
                expect(result.error).toContain('outside the working directory');
            });

            it('should allow the working directory itself', () => {
                expect(validatePath('.', winWorkingDir).valid).toBe(true);
                expect(validatePath(winWorkingDir, winWorkingDir).valid).toBe(true);
            });
        });
    }
});
