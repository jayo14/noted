import type { Collection, CollectionId, UserId } from "@/types";
import { getStorageAdapter } from "@/lib/storage";
import { generateUUID, nowISO } from "@/lib/utils";
import { authService } from "./authService";

export class CollectionService {
  private static instance: CollectionService;

  public static getInstance(): CollectionService {
    if (!CollectionService.instance) {
      CollectionService.instance = new CollectionService();
    }
    return CollectionService.instance;
  }

  public async getCollections(): Promise<Collection[]> {
    const storage = await getStorageAdapter();
    return await storage.getCollections();
  }

  public async createCollection(name: string): Promise<Collection> {
    const storage = await getStorageAdapter();
    const now = nowISO();
    const collection: Collection = {
      id: generateUUID(),
      user_id: authService.getCurrentUserId(),
      name: name.trim() || "New Collection",
      created_at: now,
      updated_at: now,
    };

    await storage.saveCollection(collection);
    await storage.enqueueSync({
      entity_type: "collection",
      entity_id: collection.id,
      operation: "insert",
      payload: collection as unknown as Record<string, unknown>,
    });

    return collection;
  }

  public async renameCollection(id: CollectionId, newName: string): Promise<Collection | null> {
    const storage = await getStorageAdapter();
    const collections = await storage.getCollections();
    const existing = collections.find((c) => c.id === id);
    if (!existing) return null;

    const updated: Collection = {
      ...existing,
      name: newName.trim() || existing.name,
      updated_at: nowISO(),
    };

    await storage.saveCollection(updated);
    await storage.enqueueSync({
      entity_type: "collection",
      entity_id: id,
      operation: "update",
      payload: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async deleteCollection(id: CollectionId): Promise<void> {
    const storage = await getStorageAdapter();
    await storage.deleteCollection(id);
    await storage.enqueueSync({
      entity_type: "collection",
      entity_id: id,
      operation: "delete",
      payload: { id },
    });
  }
}

export const collectionService = CollectionService.getInstance();
