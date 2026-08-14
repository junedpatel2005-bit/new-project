import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { maxProjectFileSize, validateProjectFile } = await import("./project-file-storage");

function projectFile(name: string, type: string, bytes: number[]) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("project file validation", () => {
  it("accepts a PDF that has the expected signature", () => {
    const file = projectFile("agreement.pdf", "application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]);

    expect(validateProjectFile(file, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBeNull();
  });

  it("rejects a file whose bytes do not match its extension", () => {
    const file = projectFile("agreement.pdf", "application/pdf", [1, 2, 3]);

    expect(validateProjectFile(file, new Uint8Array([1, 2, 3]))).toBe(
      "The file contents do not match the selected file type.",
    );
  });

  it("rejects unsupported file extensions", () => {
    const file = projectFile("script.exe", "application/octet-stream", [77, 90]);

    expect(validateProjectFile(file, new Uint8Array([77, 90]))).toBe(
      "Use a PDF, image, Word document, or text document.",
    );
  });

  it("defines a practical project-file size limit", () => {
    expect(maxProjectFileSize).toBe(15 * 1024 * 1024);
  });
});
