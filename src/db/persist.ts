/**
 * IndexedDB persistence for the sql.js database.
 *
 * We store the raw SQLite binary in IndexedDB (not localStorage)
 * because IndexedDB handles large binary blobs efficiently and
 * doesn't have the ~5MB limit of localStorage.
 */

const DB_NAME = "grovekeeper-db";
const STORE_NAME = "saves";
const SAVE_KEY = "current";

/**
 * Open the IndexedDB database, creating the object store if needed.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save the raw SQLite database bytes to IndexedDB.
 */
export async function saveDatabaseToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, SAVE_KEY);
    tx.oncomplete = () => {
      idb.close();
      resolve();
    };
    tx.onerror = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

/**
 * Load the raw SQLite database bytes from IndexedDB.
 * Returns null if no save exists.
 */
export async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(SAVE_KEY);
    request.onsuccess = () => {
      idb.close();
      const result = request.result;
      if (result instanceof Uint8Array) {
        resolve(result);
      } else if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      idb.close();
      reject(request.error);
    };
  });
}

/**
 * Clear the saved database from IndexedDB.
 */
export async function clearDatabaseFromIndexedDB(): Promise<void> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(SAVE_KEY);
    tx.oncomplete = () => {
      idb.close();
      resolve();
    };
    tx.onerror = () => {
      idb.close();
      reject(tx.error);
    };
  });
}
