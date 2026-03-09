import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSQueueDB extends DBSchema {
    transactions: {
        key: string;
        value: {
            id: string;
            data: any;
            status: 'pending' | 'success' | 'failed';
            createdAt: string;
        };
    };
}

let dbPromise: Promise<IDBPDatabase<POSQueueDB>> | null = null;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<POSQueueDB>('pos-queue', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('transactions')) {
                    db.createObjectStore('transactions', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

export const saveToOfflineQueue = async (transactionId: string, data: any) => {
    try {
        const db = await getDB();
        await db.put('transactions', {
            id: transactionId,
            data,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
        console.log(`Saved transaction ${transactionId} to offline queue`);
    } catch (error) {
        console.error('Failed to save to offline queue', error);
    }
};

export const getPendingTransactions = async () => {
    try {
        const db = await getDB();
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const all = await store.getAll();
        return all.filter((item) => item.status === 'pending');
    } catch (error) {
        console.error('Failed to get pending transactions', error);
        return [];
    }
};

export const markTransactionStatus = async (transactionId: string, status: 'success' | 'failed') => {
    try {
        const db = await getDB();
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        const item = await store.get(transactionId);
        if (item) {
            item.status = status;
            await store.put(item);
        }
    } catch (error) {
        console.error('Failed to update transaction status', error);
    }
};

export const syncOfflineQueue = async (syncFunction: (data: any) => Promise<void>) => {
    if (!navigator.onLine) return;

    const pending = await getPendingTransactions();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} offline transactions...`);

    for (const item of pending) {
        try {
            await syncFunction(item.data);
            await markTransactionStatus(item.id, 'success');
            console.log(`Successfully synced transaction ${item.id}`);
        } catch (error) {
            console.error(`Failed to sync transaction ${item.id}`, error);
            await markTransactionStatus(item.id, 'failed');
        }
    }
};

// Window online event hook
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        // A dispatcher or global state will handle the actual syncFunction injection
        console.log('Network back online. POS Offline queue ready to sync.');
        // To trigger an event that the app can listen to
        window.dispatchEvent(new CustomEvent('pos-online-sync'));
    });
}
