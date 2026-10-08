---
name: build-git-typescript
description: >-
  Step-by-step guide and reference for building a fully functional Git client from scratch in TypeScript/Bun/Node.js.
  Covers plumbing (init, hash-object, cat-file, write-tree, commit-tree, update-ref) and porcelain (add, commit,
  log, branch, checkout, status, diff, merge with 3-way conflict resolution), binary buffer manipulation, and DAG traversal.
---

# Building Git in TypeScript from Scratch

This skill guides an agent or engineer through building a complete, lightweight Git implementation in TypeScript (running on Bun or Node.js). It details Git's internal data structures, object serialization formats, SHA-1 content addressing, staging index management, working tree synchronization, commit DAG traversal, diff calculation, and 3-way merge resolution.

---

## 1. Architectural Overview & Object Model

Git is a content-addressable storage engine with a version control UI built on top.

```
Working Directory <---> Staging Area (.git/index) <---> Object Database (.git/objects)
                                                              ^
                                                              |
                                                      Refs & HEAD (.git/refs, .git/HEAD)
```

### Git Directory Structure (`.git`)
- `.git/HEAD`: Contains either a symbolic reference (e.g., `ref: refs/heads/main\n`) or a raw 40-character commit SHA (detached HEAD).
- `.git/refs/heads/<branch>`: Text file containing the 40-character hex SHA-1 of the branch's latest commit.
- `.git/objects/<2-char>/<38-char>`: Deflated (zlib) object files named after their SHA-1 hash.
- `.git/index`: Staging area mapping relative file paths to 40-char blob SHAs (in JSON format or Git index binary format).

### Git Object Storage Format
All Git objects follow this standard uncompressed binary structure:
```
[object-type] [size-in-bytes-as-ascii]\0[raw-payload]
```
The SHA-1 hash (40 hex characters) is computed over the entire formatted buffer (`header + null byte + payload`), and the buffer is then compressed using zlib `deflate` before saving to `.git/objects/xx/yyyy...`.

#### The 3 Core Object Types:
1. **Blob** (`blob <size>\0<raw file content>`): Stores raw file content without metadata (no filename, no permissions).
2. **Tree** (`tree <size>\0<entries>`): Represents a directory listing. Each entry is binary-encoded:
   ```
   <mode> <name>\0<20-byte-raw-sha>
   ```
   - Standard modes: `100644` (normal file), `100755` (executable file), `040000` (directory/subtree), `120000` (symlink).
   - *Crucial note*: The SHA in a tree entry is 20 raw bytes (`Buffer.from(hexSha, "hex")`), NOT 40 characters of hex text!
   - Entries must be sorted alphabetically by name (directories sorted with trailing slash conceptually).
3. **Commit** (`commit <size>\0<content>`): Represents a snapshot in time:
   ```
   tree <tree-40-hex-sha>
   parent <parent-40-hex-sha> (0, 1, or multiple for merge commits)
   author <Name> <<email>> <timestamp> <tz-offset>
   committer <Name> <<email>> <timestamp> <tz-offset>

   <commit message>
   ```

---

## 2. Project Setup & CLI Dispatcher

### `package.json`
```json
{
  "name": "git-ts",
  "type": "module",
  "scripts": {
    "dev": "bun run app/main.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

### CLI Entry Point (`app/main.ts`)
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { inflate, deflate } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const inflateAsync = promisify(inflate);
const deflateAsync = promisify(deflate);

const args = process.argv.slice(2);
const command = args[0];

function getHead(): string {
  return fs.readFileSync(".git/HEAD", "utf8").trim();
}

function isRef(head: string): boolean {
  return head.startsWith("ref: ");
}

function resolveHeadCommit(): { ref: string | null; sha: string | null } {
  const head = getHead();
  if (isRef(head)) {
    const ref = head.replace("ref: ", "").trim();
    const refPath = path.join(".git", ref);
    if (!fs.existsSync(refPath)) return { ref, sha: null };
    const sha = fs.readFileSync(refPath, "utf8").trim();
    return { ref, sha: sha.length === 40 ? sha : null };
  }
  return { ref: null, sha: head.length === 40 ? head : null };
}

switch (command) {
  case "init": /* ... */ break;
  case "hash-object": /* ... */ break;
  case "cat-file": /* ... */ break;
  case "write-tree": /* ... */ break;
  case "commit-tree": /* ... */ break;
  case "update-ref": /* ... */ break;
  case "add": /* ... */ break;
  case "commit": /* ... */ break;
  case "log": /* ... */ break;
  case "branch": /* ... */ break;
  case "checkout": /* ... */ break;
  case "status": /* ... */ break;
  case "diff": /* ... */ break;
  case "merge": /* ... */ break;
  default:
    throw new Error(`Unknown command ${command}`);
}
```

---

## 3. Plumbing Layer Implementation

### 3.1 `init`
Initializes directory structure and default `HEAD`:
```typescript
case "init": {
  fs.mkdirSync(".git/objects", { recursive: true });
  fs.mkdirSync(".git/refs/heads", { recursive: true });
  fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
  fs.writeFileSync(".git/refs/heads/main", "");
  process.stdout.write("Initialized git directory\n");
  break;
}
```

### 3.2 `hash-object`
Computes SHA-1 hash, writes zlib-compressed object file, and prints the 40-character hex SHA:
```typescript
case "hash-object": {
  // Usage: hash-object -w <file>
  const file = args[2] ?? args[1];
  const content = fs.readFileSync(file);
  const header = `blob ${content.length}\0`;
  const store = Buffer.concat([Buffer.from(header), content]);

  const sha = createHash("sha1").update(store).digest("hex");
  const compressed = await deflateAsync(store);

  const objectPath = path.join(".git/objects", sha.slice(0, 2), sha.slice(2));
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });
  fs.writeFileSync(objectPath, compressed);

  process.stdout.write(sha);
  break;
}
```

### 3.3 `cat-file`
Decompresses object, unpacks header (`<type> <size>\0`), and formats contents:
```typescript
case "cat-file": {
  // Usage: cat-file -p <sha>
  const sha = args[2];
  const filePath = path.join(".git/objects", sha.slice(0, 2), sha.slice(2));
  const compressed = fs.readFileSync(filePath);
  const original = await inflateAsync(compressed);

  const nullIndex = original.indexOf(0);
  const header = original.slice(0, nullIndex).toString();
  const type = header.split(" ")[0];
  const content = original.slice(nullIndex + 1);

  if (type === "blob" || type === "commit") {
    process.stdout.write(content.toString());
  } else if (type === "tree") {
    // Binary Tree parser: <mode> <name>\0<20-byte binary sha>
    let i = 0;
    while (i < content.length) {
      const spaceIndex = content.indexOf(32, i);
      const mode = content.slice(i, spaceIndex).toString();
      i = spaceIndex + 1;

      const nameNullIndex = content.indexOf(0, i);
      const name = content.slice(i, nameNullIndex).toString();
      i = nameNullIndex + 1;

      const shaBuf = content.slice(i, i + 20);
      const shaHex = shaBuf.toString("hex");
      i += 20;

      const entryType = mode === "040000" ? "tree" : "blob";
      process.stdout.write(`${mode} ${entryType} ${shaHex} ${name}\n`);
    }
  }
  break;
}
```

### 3.4 `write-tree` (From Working Directory or Index)
A tree object requires binary packing:
```
Buffer.concat([
  Buffer.from(`${mode} ${name}\0`),
  Buffer.from(hexSha, "hex") // 20 raw bytes
])
```

#### Writing Tree From Index (`app/helper/writeTreeFromIndex.ts`):
```typescript
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { deflateSync } from "zlib";

type BlobNode = { type: "blob"; sha: string };
type TreeMap = { [name: string]: BlobNode | TreeMap };

function isBlobNode(v: BlobNode | TreeMap): v is BlobNode {
  return typeof v === "object" && v !== null && "type" in v && (v as any).type === "blob";
}

function insertPath(tree: TreeMap, filePath: string, sha: string) {
  const parts = filePath.split("/");
  let current: TreeMap = tree;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      current[part] = { type: "blob", sha };
    } else {
      if (!current[part] || isBlobNode(current[part])) current[part] = {};
      current = current[part] as TreeMap;
    }
  }
}

function writeTreeRecursive(tree: TreeMap): string {
  const entries: Buffer[] = [];
  const names = Object.keys(tree).sort();

  for (const name of names) {
    const value = tree[name];
    if (isBlobNode(value)) {
      entries.push(
        Buffer.concat([
          Buffer.from(`100644 ${name}\0`),
          Buffer.from(value.sha, "hex"),
        ])
      );
    } else {
      const subtreeSha = writeTreeRecursive(value);
      entries.push(
        Buffer.concat([
          Buffer.from(`040000 ${name}\0`),
          Buffer.from(subtreeSha, "hex"),
        ])
      );
    }
  }

  const treeContent = Buffer.concat(entries);
  const final = Buffer.concat([
    Buffer.from(`tree ${treeContent.length}\0`),
    treeContent,
  ]);

  const sha = createHash("sha1").update(final).digest("hex");
  const objPath = path.join(".git", "objects", sha.slice(0, 2), sha.slice(2));
  fs.mkdirSync(path.dirname(objPath), { recursive: true });
  fs.writeFileSync(objPath, deflateSync(final));
  return sha;
}

export function writeTreeFromIndex(): string {
  const indexPath = path.join(".git", "index");
  if (!fs.existsSync(indexPath)) throw new Error("Index does not exist");
  const raw = fs.readFileSync(indexPath, "utf8").trim();
  if (!raw) throw new Error("Index is empty");

  const parsed: Record<string, string> = JSON.parse(raw);
  const root: TreeMap = {};
  for (const [filePath, sha] of Object.entries(parsed)) {
    insertPath(root, filePath, sha);
  }
  return writeTreeRecursive(root);
}
```

### 3.5 `commit-tree`
Creates a commit object pointing to a root tree and parent commits:
```typescript
case "commit-tree": {
  // Usage: commit-tree <tree_sha> [-p <parent_sha>]
  const treeSha = args[1];
  const parentIndex = args.indexOf("-p");
  const parentSha = parentIndex !== -1 ? args[parentIndex + 1] : null;

  const content =
`tree ${treeSha}
${parentSha ? `parent ${parentSha}\n` : ""}author Developer <dev@example.com> 1715550000 +0000
committer Developer <dev@example.com> 1715550000 +0000

Commit message
`;

  const header = `commit ${Buffer.byteLength(content)}\0`;
  const store = Buffer.concat([Buffer.from(header), Buffer.from(content)]);
  const sha = createHash("sha1").update(store).digest("hex");
  const compressed = await deflateAsync(store);

  const objectPath = path.join(".git/objects", sha.slice(0, 2), sha.slice(2));
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });
  fs.writeFileSync(objectPath, compressed);

  process.stdout.write(sha);
  break;
}
```

### 3.6 `update-ref`
Updates branch pointer directly:
```typescript
case "update-ref": {
  // Usage: update-ref <ref> <sha>
  const ref = args[1];
  const sha = args[2];
  const refPath = path.join(".git", ref);
  fs.mkdirSync(path.dirname(refPath), { recursive: true });
  fs.writeFileSync(refPath, sha + "\n");
  break;
}
```

---

## 4. Porcelain Layer Implementation

### 4.1 `.gitignore` Handling (`app/helper/gitignore.ts`)
Reads rules and ignores specified files or directories:
```typescript
import fs from "node:fs";

export function readGitIgnore(): string[] {
  const p = ".gitignore";
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("#"));
}

export function isIgnored(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith("/")) {
      return filePath.startsWith(pattern);
    }
    return filePath === pattern;
  });
}
```

### 4.2 `add` & Staging Area (`app/helper/addToIndex.ts`)
Hashes file content, writes blob to `.git/objects`, and updates `.git/index`:
```typescript
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { deflateSync } from "zlib";
import { readGitIgnore, isIgnored } from "./gitignore";

export function addToIndex(filePath: string) {
  const ignorePatterns = readGitIgnore();
  if (isIgnored(filePath, ignorePatterns)) return;

  const content = fs.readFileSync(filePath);
  const header = `blob ${content.length}\0`;
  const store = Buffer.concat([Buffer.from(header), content]);
  const sha = createHash("sha1").update(store).digest("hex");

  const objectPath = path.join(".git", "objects", sha.slice(0, 2), sha.slice(2));
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });
  fs.writeFileSync(objectPath, deflateSync(store));

  const indexPath = path.join(".git", "index");
  let index: Record<string, string> = {};
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, "utf8").trim();
    if (raw) index = JSON.parse(raw);
  }

  index[filePath] = sha;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}
```

### 4.3 `commit`
Orchestrates creating tree from index, writing commit object, and updating HEAD ref:
```typescript
case "commit": {
  const msgIndex = args.indexOf("-m");
  if (msgIndex === -1) throw new Error("Missing -m commit message");
  const message = args[msgIndex + 1];

  const treeSha = writeTreeFromIndex();
  const { ref, sha: parentSha } = resolveHeadCommit();

  const content =
`tree ${treeSha}
${parentSha ? `parent ${parentSha}\n` : ""}author Developer <dev@example.com> 1715550000 +0000
committer Developer <dev@example.com> 1715550000 +0000

${message}
`;

  const header = `commit ${Buffer.byteLength(content)}\0`;
  const store = Buffer.concat([Buffer.from(header), Buffer.from(content)]);
  const commitSha = createHash("sha1").update(store).digest("hex");
  const compressed = await deflateAsync(store);

  const objectPath = path.join(".git/objects", commitSha.slice(0, 2), commitSha.slice(2));
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });
  fs.writeFileSync(objectPath, compressed);

  if (ref) {
    fs.writeFileSync(path.join(".git", ref), commitSha + "\n");
  } else {
    fs.writeFileSync(".git/HEAD", commitSha + "\n");
  }

  process.stdout.write(commitSha + "\n");
  break;
}
```

### 4.4 `log` (DAG Traversal)
Walks commit lineage backwards via `parent <sha>` lines:
```typescript
case "log": {
  const first = resolveHeadCommit();
  let current = first.sha;

  while (current) {
    const objPath = path.join(".git/objects", current.slice(0, 2), current.slice(2));
    const compressed = fs.readFileSync(objPath);
    const raw = await inflateAsync(compressed);
    const content = raw.slice(raw.indexOf(0) + 1).toString();

    process.stdout.write(`commit ${current}\n`);
    process.stdout.write(content + "\n---\n");

    const match = content.match(/^parent (.+)$/m);
    current = match ? match[1].trim() : null;
  }
  break;
}
```

### 4.5 `branch`
Creates a branch pointer pointing to current HEAD commit:
```typescript
case "branch": {
  const name = args[1];
  const { sha } = resolveHeadCommit();
  if (!sha) throw new Error("No commit to branch from");

  const refPath = path.join(".git", "refs", "heads", name);
  fs.mkdirSync(path.dirname(refPath), { recursive: true });
  fs.writeFileSync(refPath, sha + "\n");
  break;
}
```

### 4.6 `checkout` & Working Tree Restoration (`restoreTree`)
Switches branch/commit and unpacks files from tree objects to disk:
```typescript
// app/helper/restoreTree.ts
import fs from "fs";
import path from "path";
import { inflateSync } from "zlib";

export function restoreTree(treeSha: string, dir: string) {
  const treePath = path.join(".git/objects", treeSha.slice(0, 2), treeSha.slice(2));
  const rawTree = inflateSync(fs.readFileSync(treePath));
  const content = rawTree.slice(rawTree.indexOf(0) + 1);

  let i = 0;
  while (i < content.length) {
    const spaceIndex = content.indexOf(32, i);
    const mode = content.slice(i, spaceIndex).toString();
    i = spaceIndex + 1;

    const nullIndex = content.indexOf(0, i);
    const filename = content.slice(i, nullIndex).toString();
    i = nullIndex + 1;

    const shaHex = content.slice(i, i + 20).toString("hex");
    i += 20;

    if (mode === "100644") {
      const blobPath = path.join(".git/objects", shaHex.slice(0, 2), shaHex.slice(2));
      const blobContent = inflateSync(fs.readFileSync(blobPath)).slice(
        inflateSync(fs.readFileSync(blobPath)).indexOf(0) + 1
      );
      fs.writeFileSync(path.join(dir, filename), blobContent);
    } else if (mode === "040000") {
      const subDir = path.join(dir, filename);
      fs.mkdirSync(subDir, { recursive: true });
      restoreTree(shaHex, subDir);
    }
  }
}
```

### 4.7 `status` (Three-Way Snapshot Comparison)
Compares HEAD tree, Staged Index, and Working Directory:
- **Staged**: `index[file] !== head[file]`
- **Modified (unstaged)**: `index[file] && index[file] !== working[file]`
- **Untracked**: `working[file] && !index[file]`

Flattening tree objects recursively:
```typescript
export function flattenTree(treeSha: string, prefix = ""): Record<string, string> {
  const objPath = path.join(".git/objects", treeSha.slice(0, 2), treeSha.slice(2));
  const raw = inflateSync(fs.readFileSync(objPath));
  const content = raw.slice(raw.indexOf(0) + 1);

  let i = 0;
  const result: Record<string, string> = {};
  while (i < content.length) {
    const spaceIndex = content.indexOf(32, i);
    const mode = content.slice(i, spaceIndex).toString();
    i = spaceIndex + 1;
    const nullIndex = content.indexOf(0, i);
    const name = content.slice(i, nullIndex).toString();
    i = nullIndex + 1;
    const sha = content.slice(i, i + 20).toString("hex");
    i += 20;

    const fullPath = prefix + name;
    if (mode === "040000") {
      Object.assign(result, flattenTree(sha, fullPath + "/"));
    } else {
      result[fullPath] = sha;
    }
  }
  return result;
}
```

### 4.8 `diff` (Line-by-Line Changes)
Calculates line changes between HEAD, Index, and Working Directory:
```typescript
function diffLines(a: string, b: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  let out = "";
  const max = Math.max(aLines.length, bLines.length);

  for (let i = 0; i < max; i++) {
    if (aLines[i] === bLines[i]) continue;
    if (aLines[i] !== undefined) out += `- ${aLines[i]}\n`;
    if (bLines[i] !== undefined) out += `+ ${bLines[i]}\n`;
  }
  return out;
}
```

---

## 5. Three-Way Merge Engine

### 5.1 Merge Base Detection (`findMergeBase`)
Finds the lowest common ancestor using Breadth-First Search (BFS) over parent pointers:
```typescript
function getParents(commitSha: string): string[] {
  const objPath = path.join(".git", "objects", commitSha.slice(0, 2), commitSha.slice(2));
  const raw = fs.readFileSync(objPath);
  const content = inflateSync(raw).slice(inflateSync(raw).indexOf(0) + 1).toString();
  const parents: string[] = [];
  for (const line of content.split("\n")) {
    if (line.startsWith("parent ")) {
      parents.push(line.replace("parent ", "").trim());
    }
  }
  return parents;
}

export function findMergeBase(a: string, b: string): string | null {
  const visited = new Set<string>();
  const queueA = [a];

  // 1. Traverse all ancestors of commit A
  while (queueA.length) {
    const cur = queueA.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const p of getParents(cur)) queueA.push(p);
  }

  // 2. Walk commit B ancestors until hitting a visited ancestor
  const queueB = [b];
  while (queueB.length) {
    const cur = queueB.shift()!;
    if (visited.has(cur)) return cur;
    for (const p of getParents(cur)) queueB.push(p);
  }
  return null;
}
```

### 5.2 Three-Way Text Merge & Conflict Marking (`mergeText`)
```typescript
export function mergeText(base: string, ours: string, theirs: string, branchName: string): string {
  const baseLines = base.split("\n");
  const ourLines = ours.split("\n");
  const theirLines = theirs.split("\n");
  const max = Math.max(baseLines.length, ourLines.length, theirLines.length);

  let output = "";
  for (let i = 0; i < max; i++) {
    const b = baseLines[i] ?? "";
    const o = ourLines[i] ?? "";
    const t = theirLines[i] ?? "";

    if (o === t) {
      output += o + "\n";
    } else if (b === o) {
      output += t + "\n";
    } else if (b === t) {
      output += o + "\n";
    } else {
      // Conflict
      output += `<<<<<<< HEAD\n${o}\n=======\n${t}\n>>>>>>> ${branchName}\n`;
    }
  }
  return output;
}
```

### 5.3 Creating the Merge Commit
A merge commit writes two `parent` headers:
```
tree <newTreeSha>
parent <currentCommitSha>
parent <targetCommitSha>
author ...
committer ...

Merge branch '<branch>'
```

---

## 6. Critical Implementation Rules & Gotchas

1. **20-Byte Raw Hashes in Trees**: When encoding tree objects, the SHA must be converted to raw bytes (`Buffer.from(shaHex, "hex")`). Reading tree objects requires slicing 20 bytes and converting back with `.toString("hex")`.
2. **Deterministic Tree Sorting**: Tree entries MUST be sorted by filename using standard byte comparison (`Object.keys(tree).sort()`).
3. **Null-Byte Terminators**: Headers (`blob 12\0`, `tree 54\0`, `100644 name\0`) use the ASCII null byte `\0` (byte value `0x00`), NOT an escaped string `"\\0"`.
4. **Byte Length vs String Length**: In headers (`blob <size>\0`), always use `Buffer.byteLength(content)` or `content.length` on Buffers to ensure multi-byte UTF-8 characters do not corrupt byte size calculations.
5. **No External Git Dependency**: All commands run purely in TypeScript using Node's `fs`, `node:crypto`, and `node:zlib`.
