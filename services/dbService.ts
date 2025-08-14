import { openDB, IDBPDatabase } from 'idb';
import { BillettoEvent, ListResponse, Order, LedgerEntry, EventDetails, Campaign, TargetGroup, TargetGroupMember, Attendee, BookingQuestionsAnalysis } from '../types';

const DB_NAME = 'billetto-dashboard-cache';
const DB_VERSION = 5; // Bump version for schema change

const STORES = {
    KEYVAL: 'keyval',
    EVENTS: 'events',
    EVENT_DETAILS: 'eventDetails',
    ORDERS: 'orders',
    ORDER_DETAILS: 'orderDetails',
    LEDGER: 'ledger',
    CAMPAIGNS: 'campaigns',
    CAMPAIGN_ORDERS: 'campaignOrders',
    TARGET_GROUPS: 'targetGroups',
    TARGET_GROUP_MEMBERS: 'targetGroupMembers',
    ATTENDEES: 'attendees',
    ATTENDEE_DETAILS: 'attendeeDetails',
    BOOKING_QUESTIONS_ANALYSIS: 'bookingQuestionsAnalysis',
};

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
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
            if (!db.objectStoreNames.contains(STORES.CAMPAIGNS)) {
                db.createObjectStore(STORES.CAMPAIGNS);
            }
            if (!db.objectStoreNames.contains(STORES.TARGET_GROUPS)) {
                db.createObjectStore(STORES.TARGET_GROUPS);
            }
            if (!db.objectStoreNames.contains(STORES.TARGET_GROUP_MEMBERS)) {
                db.createObjectStore(STORES.TARGET_GROUP_MEMBERS);
            }
            if (oldVersion < 3) {
                 if (!db.objectStoreNames.contains(STORES.ATTENDEES)) {
                    db.createObjectStore(STORES.ATTENDEES);
                }
                if (!db.objectStoreNames.contains(STORES.ATTENDEE_DETAILS)) {
                    db.createObjectStore(STORES.ATTENDEE_DETAILS, { keyPath: 'id' });
                }
            }
             if (oldVersion < 4) {
                if (!db.objectStoreNames.contains(STORES.CAMPAIGN_ORDERS)) {
                    db.createObjectStore(STORES.CAMPAIGN_ORDERS);
                }
            }
            if (oldVersion < 5) {
                if (!db.objectStoreNames.contains(STORES.BOOKING_QUESTIONS_ANALYSIS)) {
                    db.createObjectStore(STORES.BOOKING_QUESTIONS_ANALYSIS);
                }
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

// --- Booking Questions Analysis ---
export const getBookingQuestionsAnalysisCache = async (eventId: string): Promise<BookingQuestionsAnalysis | undefined> => {
    const db = await initDB();
    return db.get(STORES.BOOKING_QUESTIONS_ANALYSIS, eventId);
};
export const setBookingQuestionsAnalysisCache = async (eventId: string, analysis: BookingQuestionsAnalysis) => {
    const db = await initDB();
    return db.put(STORES.BOOKING_QUESTIONS_ANALYSIS, analysis, eventId);
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

// --- Campaigns ---
export const getCampaignsCache = async (page: number): Promise<{ campaignsData?: ListResponse<Campaign>, lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        campaignsData: await db.get(STORES.CAMPAIGNS, `page-${page}`),
        lastUpdated: await getFromKeyval('campaigns_last_updated')
    };
};
export const setCampaignsCache = async (page: number, campaignsData: ListResponse<Campaign>) => {
    const db = await initDB();
    await db.put(STORES.CAMPAIGNS, campaignsData, `page-${page}`);
    await setInKeyval('campaigns_last_updated', new Date());
};

// --- Campaign Orders ---
export const getCampaignOrdersCache = async (campaignId: string, page: number): Promise<ListResponse<Order> | undefined> => {
    const db = await initDB();
    return db.get(STORES.CAMPAIGN_ORDERS, `${campaignId}-page-${page}`);
};
export const setCampaignOrdersCache = async (campaignId: string, page: number, ordersData: ListResponse<Order>) => {
    const db = await initDB();
    return db.put(STORES.CAMPAIGN_ORDERS, ordersData, `${campaignId}-page-${page}`);
};


// --- Target Groups ---
export const getTargetGroupsCache = async (page: number): Promise<{ groupsData?: ListResponse<TargetGroup>, lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        groupsData: await db.get(STORES.TARGET_GROUPS, `page-${page}`),
        lastUpdated: await getFromKeyval('target_groups_last_updated')
    };
};
export const setTargetGroupsCache = async (page: number, groupsData: ListResponse<TargetGroup>) => {
    const db = await initDB();
    await db.put(STORES.TARGET_GROUPS, groupsData, `page-${page}`);
    await setInKeyval('target_groups_last_updated', new Date());
};

// --- Target Group Members ---
export const getTargetGroupMembersCache = async (groupId: string, page: number): Promise<ListResponse<TargetGroupMember> | undefined> => {
    const db = await initDB();
    return db.get(STORES.TARGET_GROUP_MEMBERS, `${groupId}-page-${page}`);
};
export const setTargetGroupMembersCache = async (groupId: string, page: number, membersData: ListResponse<TargetGroupMember>) => {
    const db = await initDB();
    return db.put(STORES.TARGET_GROUP_MEMBERS, membersData, `${groupId}-page-${page}`);
};

// --- All Attendees ---
export const getAttendeesCache = async (page: number): Promise<{ attendeesData?: ListResponse<Attendee>, lastUpdated?: Date }> => {
    const db = await initDB();
    return {
        attendeesData: await db.get(STORES.ATTENDEES, `page-${page}`),
        lastUpdated: await getFromKeyval('attendees_last_updated')
    };
};
export const setAttendeesCache = async (page: number, attendeesData: ListResponse<Attendee>) => {
    const db = await initDB();
    await db.put(STORES.ATTENDEES, attendeesData, `page-${page}`);
    await setInKeyval('attendees_last_updated', new Date());
};

// --- Attendee Details ---
export const getAttendeeDetailsCache = async (attendeeId: string): Promise<Attendee | undefined> => {
    const db = await initDB();
    return db.get(STORES.ATTENDEE_DETAILS, attendeeId);
};
export const setAttendeeDetailsCache = async (details: Attendee) => {
    const db = await initDB();
    return db.put(STORES.ATTENDEE_DETAILS, details);
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