import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(toolsDirectory, '..');
const outputFile = resolve(tmpdir(), `jetti-business-process-tests-${process.pid}.mjs`);

try {
  await build({
    absWorkingDir: projectDirectory,
    entryPoints: ['tools/business-process-sync.tests.ts'],
    outfile: outputFile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: 'inline',
    logLevel: 'warning'
  });
  await import(pathToFileURL(outputFile).href + `?run=${Date.now()}`);
} finally {
  if (existsSync(outputFile)) await rm(outputFile);
}
