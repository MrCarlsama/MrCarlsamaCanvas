import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import Database from "@tauri-apps/plugin-sql";
import { validateCanvasDocument } from "@mrcarlsama/canvas-core";
import type { StudioSnapshot } from "@mrcarlsama/studio";
import {
  deserializeStudioSnapshot,
  serializeStudioSnapshot,
} from "./snapshotCodec";

export {
  deserializeStudioSnapshot,
  serializeStudioSnapshot,
} from "./snapshotCodec";

let database: Database | null = null;

function assertValidSnapshot(snapshot: StudioSnapshot) {
  const validation = validateCanvasDocument(snapshot.document);
  if (validation.valid) return;

  const details = validation.issues
    .slice(0, 3)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ");
  throw new Error(`拒绝保存无效画布：${details}`);
}

export function isDesktopRuntime() {
  return "__TAURI_INTERNALS__" in globalThis;
}

export async function initializeDesktopPersistence() {
  if (!isDesktopRuntime()) return false;
  database = await Database.load("sqlite:mrcarlsama-canvas.db");
  await database.execute(`
    CREATE TABLE IF NOT EXISTS studio_documents (
      id TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return true;
}

export async function loadStudioSnapshot() {
  if (!database) return undefined;
  const rows = await database.select<Array<{ snapshot: string }>>(
    "SELECT snapshot FROM studio_documents WHERE id = $1 LIMIT 1",
    ["current"],
  );
  const serialized = rows[0]?.snapshot;
  return serialized ? deserializeStudioSnapshot(serialized) : undefined;
}

export async function saveStudioSnapshot(snapshot: StudioSnapshot) {
  if (!database) return false;
  assertValidSnapshot(snapshot);
  const serialized = serializeStudioSnapshot(snapshot);
  await database.execute(
    `
      INSERT INTO studio_documents (id, snapshot, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT(id) DO UPDATE SET
        snapshot = excluded.snapshot,
        updated_at = excluded.updated_at
    `,
    ["current", serialized, new Date().toISOString()],
  );
  return true;
}

export async function chooseAssetPath() {
  if (!isDesktopRuntime()) return null;
  const selected = await open({
    title: "导入素材",
    multiple: false,
    directory: false,
    filters: [
      {
        name: "图片与文档",
        extensions: ["jpg", "jpeg", "png", "webp", "gif", "pdf", "md", "txt"],
      },
    ],
  });
  if (!selected || Array.isArray(selected)) return null;
  return (await exists(selected)) ? selected : null;
}

export async function exportProjectFile(snapshot: StudioSnapshot) {
  if (!isDesktopRuntime()) return null;
  assertValidSnapshot(snapshot);
  const target = await save({
    title: "导出 MrCarlsama Canvas 项目文件",
    defaultPath: "noir-board.mrcanvas.json",
    filters: [{ name: "MrCarlsama Canvas", extensions: ["json"] }],
  });
  if (!target) return null;

  await writeTextFile(target, JSON.stringify(snapshot, null, 2));
  return target;
}

export async function openProjectHelp() {
  if (!isDesktopRuntime()) return false;
  await openUrl("https://github.com/MrCarlsama/MrCarlsamaCanvas");
  return true;
}
