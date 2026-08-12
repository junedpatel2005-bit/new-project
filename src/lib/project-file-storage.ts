import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageRoot = path.join(process.cwd(), ".project-work-files");

export const maxProjectFileSize = 15 * 1024 * 1024;
export const maxProjectFiles = 10;

const allowedTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".txt": ["text/plain", "application/octet-stream"],
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasExpectedSignature(extension: string, bytes: Uint8Array) {
  switch (extension) {
    case ".pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case ".png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case ".jpg":
    case ".jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case ".webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
      );
    case ".doc":
      return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case ".docx":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
    case ".txt":
      return !bytes.includes(0);
    default:
      return false;
  }
}

export function validateProjectFile(file: File, bytes: Uint8Array) {
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedTypes[extension]) return "Use a PDF, image, Word document, or text document.";
  if (file.size <= 0) return "Empty files cannot be uploaded.";
  if (file.size > maxProjectFileSize) return "Each file must be 15 MB or smaller.";
  if (file.type && !allowedTypes[extension].includes(file.type))
    return "The file type does not match its extension.";
  if (!hasExpectedSignature(extension, bytes))
    return "The file contents do not match the selected file type.";
  return null;
}

export function createProjectStorageKey(projectId: number, fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return `projects/${projectId}/${randomUUID()}${extension}`;
}

function filePath(storageKey: string) {
  const resolved = path.resolve(storageRoot, storageKey);
  if (!resolved.startsWith(`${path.resolve(storageRoot)}${path.sep}`))
    throw new Error("Invalid storage key.");
  return resolved;
}

export async function storeProjectFile(storageKey: string, bytes: Uint8Array) {
  const destination = filePath(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });
}

export async function readProjectFile(storageKey: string) {
  return readFile(filePath(storageKey));
}

export async function removeProjectFile(storageKey: string) {
  await unlink(filePath(storageKey)).catch(() => undefined);
}
