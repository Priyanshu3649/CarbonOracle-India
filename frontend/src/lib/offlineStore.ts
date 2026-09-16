import { openDB } from 'idb';

const DB_NAME = 'carbonoracle-offline';
const STORE_NAME = 'sync-queue';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const queueRequest = async (url: string, method: string, body: any) => {
  const db = await initDB();
  await db.add(STORE_NAME, {
    url,
    method,
    body,
    timestamp: Date.now()
  });
};

export const getQueuedRequests = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const clearQueue = async () => {
  const db = await initDB();
  await db.clear(STORE_NAME);
};

export const removeRequest = async (id: number) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};
