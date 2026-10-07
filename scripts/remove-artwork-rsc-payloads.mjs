import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const artworkRoot = path.resolve('out/artwork');
let removedFiles = 0;
let removedBytes = 0;

async function removeRouterPayloads(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeRouterPayloads(filePath);
      return;
    }
    if (entry.isFile() && (entry.name === 'index.txt' || entry.name.endsWith('.rsc'))) {
      const fileInfo = await stat(filePath);
      await unlink(filePath);
      removedFiles += 1;
      removedBytes += fileInfo.size;
    }
  }));
}

await removeRouterPayloads(artworkRoot);
console.log(`Removed ${removedFiles} unused artwork route payloads (${(removedBytes / 1024 / 1024).toFixed(1)} MB); prerendered HTML and shared client assets remain.`);
