import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import serverModule from "./server.js";

const {isAuthorizedWrite, publicAssetFile, routePath, safeResolve, sniffImage} = serverModule;
let temporaryDirectories = [];
function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "arkfates-studio-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories) fs.rmSync(directory, {recursive: true, force: true});
  temporaryDirectories = [];
});

describe("ARKFATES STUDIO local server guards", () => {
  it("requires the loopback host and same-origin write source", () => {
    expect(isAuthorizedWrite({headers: {host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001"}}, 3001)).toBe(true);
    expect(isAuthorizedWrite({headers: {host: "0.0.0.0:3001", origin: "http://127.0.0.1:3001"}}, 3001)).toBe(false);
    expect(isAuthorizedWrite({headers: {host: "127.0.0.1:3001", origin: "https://remote.example"}}, 3001)).toBe(false);
  });

  it("rejects traversal for both preview and media file resolution", () => {
    const root = temporaryDirectory();
    expect(safeResolve(root, "../outside.json")).toBe(null);
    expect(safeResolve(root, "sub\\outside.json")).toBe(null);
    expect(routePath("/%2e%2e/.env", root)).toBe(null);
    expect(routePath("/folder/page.html", root)).toBe(path.join(root, "folder", "page.html"));
    expect(publicAssetFile(root, "/img/../../outside.png")).toBe(null);
  });

  it("accepts only recognized image byte signatures", () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    expect(sniffImage(png, "image/png").extension).toBe(".png");
    expect(sniffImage(Buffer.from("not an image"), "image/png")).toBe(null);
    expect(sniffImage(png, "application/octet-stream")).toBe(null);
  });
});
