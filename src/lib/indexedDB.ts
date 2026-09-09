import { openDB } from "idb";

export async function getDB() {
  return openDB("inventory-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("offline-orders")) {
        db.createObjectStore("offline-orders", { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function saveOfflineOrder(payload: any) {
  const db = await getDB();
  await db.add("offline-orders", {
    ...payload,
    createdAt: new Date().toISOString(),
  });
}

export async function getOfflineOrders() {
  const db = await getDB();
  return db.getAll("offline-orders");
}

export async function deleteOfflineOrder(id: number) {
  const db = await getDB();
  return db.delete("offline-orders", id);
}
