import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  writeGitObject,
  readGitObject,
  parseTreeEntries,
} from '@vitra/core';

export interface HashObjectOptions {
  write?: boolean;
  dir?: string;
}

export async function hashObjectCommand(
  targetPath: string,
  options: HashObjectOptions = {}
): Promise<string> {
  const filePath = path.resolve(process.cwd(), targetPath);
  const content = await fs.readFile(filePath);

  if (options.write) {
    const dir = options.dir ? path.resolve(process.cwd(), options.dir) : process.cwd();
    return writeGitObject(dir, 'blob', content);
  } else {
    const crypto = await import('node:crypto');
    const header = `blob ${content.length}\0`;
    const store = Buffer.concat([Buffer.from(header, 'ascii'), content]);
    return crypto.createHash('sha1').update(store).digest('hex');
  }
}

export async function catFileCommand(
  targetDir: string,
  sha: string
): Promise<string> {
  const dirPath = path.resolve(process.cwd(), targetDir);
  const obj = await readGitObject(dirPath, sha);

  if (obj.type === 'blob' || obj.type === 'commit') {
    return obj.content.toString('utf-8');
  }

  if (obj.type === 'tree') {
    const entries = parseTreeEntries(obj.content);
    return entries
      .map((e) => {
        const entryType = e.mode === '040000' ? 'tree' : 'blob';
        return `${e.mode} ${entryType} ${e.sha}\t${e.name}`;
      })
      .join('\n');
  }

  return obj.content.toString('utf-8');
}
