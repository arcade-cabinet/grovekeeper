/**
 * Save file export/import.
 *
 * Export: sql.js Database → Uint8Array → Blob → download .sqlite
 * Import: File → Uint8Array → validate → write IndexedDB → reload
 */
import { getDb } from "./client";
import { saveDatabaseToIndexedDB } from "./persist";

/**
 * Export the current save as a downloadable .sqlite file.
 */
export function exportSaveFile(): void {
  const { sqlDb } = getDb();
  const data = sqlDb.export();
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `grovekeeper-save-${new Date().toISOString().slice(0, 10)}.sqlite`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a save file. Validates that it's a valid SQLite database,
 * writes it to IndexedDB, and reloads the page to reinitialize.
 */
export async function importSaveFile(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Basic validation: SQLite files start with "SQLite format 3\0"
  const header = new TextDecoder().decode(data.slice(0, 16));
  if (!header.startsWith("SQLite format 3")) {
    throw new Error("Invalid save file: not a SQLite database.");
  }

  // Write to IndexedDB and reload
  await saveDatabaseToIndexedDB(data);
  window.location.reload();
}
