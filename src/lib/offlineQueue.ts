import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDB extends DBSchema {
    sales_queue: {
        key: string;
        value: {
            id: string; // uuid
            payload: any; // The payload sent to process_sale rpc
            timestamp: number;
            status: 'pending' | 'failed';
            error?: string;
            transaction_id?: string;
        };
    };
    products_cache: {
        key: string;
        value: any;
    };
    categories_cache: {
        key: string;
        value: any;
    };
    portal_catalog: {
        key: string; // tenant_id
        value: {
            id: string;
            items: any[];
            timestamp: number;
        };
    };
    portal_history: {
        key: string; // user_id
        value: {
            id: string;
            items: any[];
            timestamp: number;
        };
    };
}

const DB_NAME = 'marte_pos_db';
const DB_VERSION = 2;

class OfflineQueue {
    private dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

    private async getDB() {
        if (!this.dbPromise) {
            if (typeof window === 'undefined') return null;
            this.dbPromise = openDB<POSDB>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('sales_queue')) {
                        db.createObjectStore('sales_queue', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('products_cache')) {
                        db.createObjectStore('products_cache', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('categories_cache')) {
                        db.createObjectStore('categories_cache', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('portal_catalog')) {
                        db.createObjectStore('portal_catalog', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('portal_history')) {
                        db.createObjectStore('portal_history', { keyPath: 'id' });
                    }
                },
            });
        }
        return this.dbPromise;
    }

    async enqueueSale(payload: any): Promise<string> {
        const db = await this.getDB();
        if (!db) return '';

        const id = crypto.randomUUID();
        await db.put('sales_queue', {
            id,
            payload,
            timestamp: Date.now(),
            status: 'pending'
        });

        return id;
    }

    async getQueuedSales() {
        const db = await this.getDB();
        if (!db) return [];
        return await db.getAll('sales_queue');
    }

    async getQueueCount() {
        const db = await this.getDB();
        if (!db) return 0;
        return await db.count('sales_queue');
    }

    async markAsFailed(id: string, error: string) {
        const db = await this.getDB();
        if (!db) return;

        const item = await db.get('sales_queue', id);
        if (item) {
            item.status = 'failed';
            item.error = error;
            await db.put('sales_queue', item);
        }
    }

    async updateTransactionId(id: string, transactionId: string) {
        const db = await this.getDB();
        if (!db) return;

        const item = await db.get('sales_queue', id);
        if (item) {
            item.transaction_id = transactionId;
            await db.put('sales_queue', item);
        }
    }

    async removeFromQueue(id: string) {
        const db = await this.getDB();
        if (!db) return;
        await db.delete('sales_queue', id);
    }

    // Cache Sync Methods
    async cacheProducts(products: any[]) {
        const db = await this.getDB();
        if (!db) return;
        const tx = db.transaction('products_cache', 'readwrite');
        await tx.store.clear();
        for (const p of products) {
            await tx.store.put(p);
        }
        await tx.done;
    }

    async getCachedProducts() {
        const db = await this.getDB();
        if (!db) return [];
        return await db.getAll('products_cache');
    }

    async cacheCategories(categories: any[]) {
        const db = await this.getDB();
        if (!db) return;
        const tx = db.transaction('categories_cache', 'readwrite');
        await tx.store.clear();
        for (const c of categories) {
            await tx.store.put(c);
        }
        await tx.done;
    }

    async getCachedCategories() {
        const db = await this.getDB();
        if (!db) return [];
        return await db.getAll('categories_cache');
    }

    // Portal Cache
    async cachePortalCatalog(tenantId: string, items: any[]) {
        const db = await this.getDB();
        if (!db) return;
        await db.put('portal_catalog', { id: tenantId, items, timestamp: Date.now() });
    }

    async getCachedPortalCatalog(tenantId: string) {
        const db = await this.getDB();
        if (!db) return null;
        return await db.get('portal_catalog', tenantId);
    }

    async cachePortalHistory(userId: string, items: any[]) {
        const db = await this.getDB();
        if (!db) return;
        await db.put('portal_history', { id: userId, items, timestamp: Date.now() });
    }

    async getCachedPortalHistory(userId: string) {
        const db = await this.getDB();
        if (!db) return null;
        return await db.get('portal_history', userId);
    }
}

export const offlineQueue = new OfflineQueue();
