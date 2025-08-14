import { openDB, IDBPDatabase } from 'idb';
import { BillettoEvent, ListResponse, Order, LedgerEntry, EventDetails } from '../types';

const DB_NAME = 'billetto-dashboard-cache';
const DB_VERSION = 1;

const STORES = {
    KEYVAL: 'keyval',
    EVENTS: 'events',
    EVENT_DETAILS: 'eventDetails',
    ORDERS: 'orders',
    ORDER_DETAILS: 'orderDetails',
    LEDGER: 'ledger',
};

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORES.KEYVAL)) {
                db.createObjectStore(STORES.KEYVAL);
            }
            if (!db.objectStoreNames.contains(STORES.EVENTS)) {
                db.createObjectStore(STORES.EVENTS);
            }
            if (!db.objectStoreNames.contains(STORES.EVENT_DETAILS)) {
                db.createObjectStore(STORES.EVENT_DETAILS, { keyPath: 'event.id' });
            }
            if (!db.objectStoreNames.contains(STORES.ORDERS)) {
                db.createObjectStore(STORES.ORDERS);
            }
            if (!db.objectStoreNames.contains(STORES.ORDER_DETAILS)) {
                db.createObjectStore(STORES.ORDER_DETAILS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.LEDGER)) {
                db.createObjectStore(STORES.LEDGER);
            }
        },
    });
    return dbPromise;
};

const getFromKeyval = async (key: IDBValidKey) => {
    const db = await initDB();
    return db.get(STORES.KEYVAL, key);
};
const setInKeyval = async (key: IDBValidKey, val: any) => {
    const db = await initDB();
    return db.put(STORES.KEYVAL, val, key);
};

// --- Events ---
export const getEventsCache = async (): Promise<{ events?: BillettoEvent[], lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        events: await db.get(STORES.EVENTS, 'all_events'),
        lastUpdated: await getFromKeyval('events_last_updated')
    };
};
export const setEventsCache = async (events: BillettoEvent[]) => {
    const db = await initDB();
    await db.put(STORES.EVENTS, events, 'all_events');
    await setInKeyval('events_last_updated', new Date());
};

// --- Event Details ---
export const getEventDetailsCache = async (eventId: string): Promise<EventDetails | undefined> => {
    const db = await initDB();
    return db.get(STORES.EVENT_DETAILS, eventId);
};
export const setEventDetailsCache = async (details: EventDetails) => {
    const db = await initDB();
    return db.put(STORES.EVENT_DETAILS, details);
};

// --- Orders ---
export const getOrdersCache = async (page: number): Promise<{ ordersData?: ListResponse<Order>, lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        ordersData: await db.get(STORES.ORDERS, `page-${page}`),
        lastUpdated: await getFromKeyval('orders_last_updated')
    };
};
export const setOrdersCache = async (page: number, ordersData: ListResponse<Order>) => {
    const db = await initDB();
    await db.put(STORES.ORDERS, ordersData, `page-${page}`);
    await setInKeyval('orders_last_updated', new Date());
};

// --- Order Details ---
export const getOrderDetailsCache = async (orderId: string): Promise<Order | undefined> => {
    const db = await initDB();
    return db.get(STORES.ORDER_DETAILS, orderId);
};
export const setOrderDetailsCache = async (details: Order) => {
    const db = await initDB();
    return db.put(STORES.ORDER_DETAILS, details);
};

// --- Ledger ---
export const getLedgerCache = async (page: number): Promise<{ ledgerData?: ListResponse<LedgerEntry>, lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        ledgerData: await db.get(STORES.LEDGER, `page-${page}`),
        lastUpdated: await getFromKeyval('ledger_last_updated')
    };
};
export const setLedgerCache = async (page: number, ledgerData: ListResponse<LedgerEntry>) => {
    const db = await initDB();
    await db.put(STORES.LEDGER, ledgerData, `page-${page}`);
    await setInKeyval('ledger_last_updated', new Date());
};

// --- Clear all data ---
export const clearAllCache = async () => {
    const db = await initDB();
    try {
        await Promise.all(Object.values(STORES).map(storeName => db.clear(storeName)));
        console.log('All cached data cleared.');
    } catch (error) {
        console.error("Failed to clear cache", error);
    }
};
