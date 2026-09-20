const DATABASE = 'wasm-lua-workbench';
const STORE = 'documents';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDocument(key, fallback) {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result ?? fallback);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return fallback;
  }
}

export async function saveDocument(key, value) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
}
