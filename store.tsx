
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AppState, 
  AppContextType, 
  Cabin, 
  CabinStatus, 
  Customer, 
  Session, 
  Transaction,
  InventoryItem,
  ManualRecordData,
  RepairTicket,
  User,
  UserRole,
  AuditLog
} from './types';

// --- CONSTANTS ---
// UPDATED PORT TO 8012
const API_URL = (import.meta.env.VITE_API_URL || '').trim(); // Blank means local fictional demo
let liveCsrfToken = ''; 
const LS_KEY = 'speedy_cafe_offline_v2';

// Helper to generate past timestamps relative to now
const getPastDate = (daysAgo: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
};

// Default Cabins for Offline/Init Mode
const DEFAULT_CABINS: Cabin[] = [
    { id: 'cab-1', name: 'Cabin 1', status: CabinStatus.OCCUPIED, currentSessionId: 'sess-active-1', location: 'Section A - High Spec' },
    { id: 'cab-2', name: 'Cabin 2', status: CabinStatus.AVAILABLE, location: 'Section A - High Spec' },
    { id: 'cab-3', name: 'Cabin 3', status: CabinStatus.ON_HOLD, currentSessionId: 'sess-active-2', location: 'Section A - High Spec' },
    { id: 'cab-4', name: 'Cabin 4', status: CabinStatus.OUT_OF_SERVICE, statusReason: 'Broken monitor, replacement ordered', expectedFix: 'Tomorrow', location: 'Section B' },
    { id: 'cab-5', name: 'Cabin 5', status: CabinStatus.AVAILABLE, location: 'Section B' },
    { id: 'cab-6', name: 'Cabin 6', status: CabinStatus.AVAILABLE, location: 'Section B' },
    { id: 'cab-7', name: 'Cabin 7', status: CabinStatus.AVAILABLE, location: 'Section C - Console' },
    { id: 'cab-8', name: 'Cabin 8', status: CabinStatus.AVAILABLE, location: 'Section C - Console' },
    { id: 'cab-9', name: 'Cabin 9', status: CabinStatus.AVAILABLE, location: 'Section C - Console' },
    { id: 'cab-10', name: 'Cabin 10', status: CabinStatus.AVAILABLE, location: 'Section D' },
    { id: 'cab-11', name: 'Cabin 11', status: CabinStatus.AVAILABLE, location: 'Section D' },
    { id: 'cab-12', name: 'Cabin 12', status: CabinStatus.AVAILABLE, location: 'Section D' }
];

const DEFAULT_ADMIN: User = {
    id: 'u-admin',
    username: 'admin',
    passwordHash: '123',
    fullName: 'System Admin',
    role: UserRole.ADMIN,
    isActive: true,
    email: 'admin@speedycafe.com',
    phone: '+1 555-0100'
};

const DEFAULT_USERS: User[] = [
    DEFAULT_ADMIN,
    {
        id: 'u-operator',
        username: 'staff',
        passwordHash: '123',
        fullName: 'Speedy Operator',
        role: UserRole.USER,
        isActive: true,
        email: 'staff@speedycafe.com',
        phone: '+1 555-0101'
    }
];

const DEFAULT_CUSTOMERS: Customer[] = [
    { id: 'cust-1', name: 'John Doe', contact: '+1 555-0123', remarks: 'VIP Gamer, prefers Cabin 1', totalSpent: 450, outstandingBalance: 0 },
    { id: 'cust-2', name: 'Jane Smith', contact: 'jane.smith@email.com', remarks: 'Frequent remote worker', totalSpent: 310, outstandingBalance: 15 },
    { id: 'cust-3', name: 'Mike Johnson', contact: '+1 555-0188', remarks: 'Likes to play racing games', totalSpent: 120, outstandingBalance: 0 },
    { id: 'cust-4', name: 'Sarah Connor', contact: '+1 555-0199', remarks: 'Needs high-spec GPU cabins', totalSpent: 640, outstandingBalance: 0 },
    { id: 'cust-5', name: 'David Lee', contact: 'david.lee@web.com', remarks: 'Prefers quiet cabins', totalSpent: 55, outstandingBalance: 5 }
];

const DEFAULT_SESSIONS: Session[] = [
    // Active Sessions
    {
        id: 'sess-active-1',
        cabinId: 'cab-1',
        customerId: 'cust-1',
        inTime: Date.now() - 45 * 60 * 1000,
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 45,
        amountDue: 8,
        amountPaid: 0,
        status: 'OPEN',
        createdBy: 'admin'
    },
    {
        id: 'sess-active-2',
        cabinId: 'cab-3',
        customerId: 'cust-2',
        inTime: Date.now() - 150 * 60 * 1000,
        holds: [
            { id: 'h-1', start: Date.now() - 20 * 60 * 1000, durationMinutes: 0 }
        ],
        ratePerHour: 12,
        totalHoldMinutes: 20,
        effectiveMinutes: 130,
        amountDue: 26,
        amountPaid: 0,
        status: 'OPEN',
        createdBy: 'staff'
    },
    // Historical Sessions (Today and past days)
    {
        id: 'sess-hist-1',
        cabinId: 'cab-1',
        customerId: 'cust-3',
        inTime: getPastDate(0, 9), // Today 9:00 AM
        outTime: getPastDate(0, 11), // Today 11:00 AM
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 120,
        amountDue: 20,
        amountPaid: 20,
        status: 'CLOSED',
        createdBy: 'staff'
    },
    {
        id: 'sess-hist-2',
        cabinId: 'cab-2',
        customerId: 'cust-4',
        inTime: getPastDate(1, 14), // Yesterday 2:00 PM
        outTime: getPastDate(1, 17), // Yesterday 5:00 PM
        holds: [{ id: 'h-prev-1', start: getPastDate(1, 15), end: getPastDate(1, 15) + 30 * 60 * 1000, durationMinutes: 30 }],
        ratePerHour: 10,
        totalHoldMinutes: 30,
        effectiveMinutes: 150,
        amountDue: 25,
        amountPaid: 25,
        status: 'CLOSED',
        createdBy: 'admin'
    },
    {
        id: 'sess-hist-3',
        cabinId: 'cab-5',
        customerId: 'cust-5',
        inTime: getPastDate(2, 18), // 2 days ago 6:00 PM
        outTime: getPastDate(2, 20), // 2 days ago 8:00 PM
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 120,
        amountDue: 20,
        amountPaid: 15, // David Lee has $5 outstanding balance
        status: 'CLOSED',
        createdBy: 'staff'
    },
    {
        id: 'sess-hist-4',
        cabinId: 'cab-6',
        customerId: 'cust-2',
        inTime: getPastDate(3, 11), // 3 days ago 11:00 AM
        outTime: getPastDate(3, 14), // 3 days ago 2:00 PM
        holds: [],
        ratePerHour: 12,
        totalHoldMinutes: 0,
        effectiveMinutes: 180,
        amountDue: 36,
        amountPaid: 21, // Jane Smith has $15 outstanding balance
        status: 'CLOSED',
        createdBy: 'staff'
    },
    {
        id: 'sess-hist-5',
        cabinId: 'cab-1',
        customerId: 'cust-4',
        inTime: getPastDate(5, 10),
        outTime: getPastDate(5, 15),
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 300,
        amountDue: 50,
        amountPaid: 50,
        status: 'CLOSED',
        createdBy: 'admin'
    },
    {
        id: 'sess-hist-6',
        cabinId: 'cab-2',
        customerId: 'cust-1',
        inTime: getPastDate(7, 13),
        outTime: getPastDate(7, 18),
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 300,
        amountDue: 50,
        amountPaid: 50,
        status: 'CLOSED',
        createdBy: 'staff'
    },
    {
        id: 'sess-hist-7',
        cabinId: 'cab-3',
        customerId: 'cust-3',
        inTime: getPastDate(10, 15),
        outTime: getPastDate(10, 19),
        holds: [],
        ratePerHour: 12,
        totalHoldMinutes: 0,
        effectiveMinutes: 240,
        amountDue: 48,
        amountPaid: 48,
        status: 'CLOSED',
        createdBy: 'admin'
    },
    {
        id: 'sess-hist-8',
        cabinId: 'cab-4',
        customerId: 'cust-4',
        inTime: getPastDate(12, 12),
        outTime: getPastDate(12, 17),
        holds: [],
        ratePerHour: 10,
        totalHoldMinutes: 0,
        effectiveMinutes: 300,
        amountDue: 50,
        amountPaid: 50,
        status: 'CLOSED',
        createdBy: 'staff'
    }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
    // Payments for closed sessions
    {
        id: 'tx-hist-1',
        type: 'PAYMENT',
        amount: 20,
        date: getPastDate(0, 11),
        description: 'Payment for Cabin 1 Session',
        relatedId: 'sess-hist-1',
        customerId: 'cust-3'
    },
    {
        id: 'tx-hist-2',
        type: 'PAYMENT',
        amount: 25,
        date: getPastDate(1, 17),
        description: 'Payment for Cabin 2 Session',
        relatedId: 'sess-hist-2',
        customerId: 'cust-4'
    },
    {
        id: 'tx-hist-3',
        type: 'PAYMENT',
        amount: 15,
        date: getPastDate(2, 20),
        description: 'Payment for Cabin 5 Session',
        relatedId: 'sess-hist-3',
        customerId: 'cust-5'
    },
    {
        id: 'tx-hist-4',
        type: 'PAYMENT',
        amount: 21,
        date: getPastDate(3, 14),
        description: 'Payment for Cabin 6 Session',
        relatedId: 'sess-hist-4',
        customerId: 'cust-2'
    },
    {
        id: 'tx-hist-5',
        type: 'PAYMENT',
        amount: 50,
        date: getPastDate(5, 15),
        description: 'Payment for Cabin 1 Session',
        relatedId: 'sess-hist-5',
        customerId: 'cust-4'
    },
    {
        id: 'tx-hist-6',
        type: 'PAYMENT',
        amount: 50,
        date: getPastDate(7, 18),
        description: 'Payment for Cabin 2 Session',
        relatedId: 'sess-hist-6',
        customerId: 'cust-1'
    },
    {
        id: 'tx-hist-7',
        type: 'PAYMENT',
        amount: 48,
        date: getPastDate(10, 19),
        description: 'Payment for Cabin 3 Session',
        relatedId: 'sess-hist-7',
        customerId: 'cust-3'
    },
    {
        id: 'tx-hist-8',
        type: 'PAYMENT',
        amount: 50,
        date: getPastDate(12, 17),
        description: 'Payment for Cabin 4 Session',
        relatedId: 'sess-hist-8',
        customerId: 'cust-4'
    },
    
    // Some snack/beverage sales
    {
        id: 'tx-sale-1',
        type: 'PAYMENT',
        amount: 12,
        date: getPastDate(0, 15),
        description: 'Snack and drink sale (Monster Energy, Chips)',
        customerId: 'cust-1'
    },
    {
        id: 'tx-sale-2',
        type: 'PAYMENT',
        amount: 8.5,
        date: getPastDate(1, 16),
        description: 'Beverage sale (Coffee, Muffin)',
        customerId: 'cust-2'
    },
    {
        id: 'tx-sale-3',
        type: 'PAYMENT',
        amount: 15,
        date: getPastDate(4, 14),
        description: 'Snack bar purchase',
        customerId: 'cust-3'
    },

    // Expenses (important for cash flow charts/profit metrics!)
    {
        id: 'tx-exp-1',
        type: 'EXPENSE',
        amount: 120,
        date: getPastDate(10, 10),
        description: 'Monthly high-speed internet subscription',
        category: 'Utility'
    },
    {
        id: 'tx-exp-2',
        type: 'EXPENSE',
        amount: 85,
        date: getPastDate(5, 9),
        description: 'Stock purchase: Snacks and Beverages',
        category: 'Stock / Inventory'
    },
    {
        id: 'tx-exp-3',
        type: 'EXPENSE',
        amount: 45,
        date: getPastDate(2, 11),
        description: 'Cleaning supplies',
        category: 'Maintenance'
    },
    {
        id: 'tx-exp-4',
        type: 'EXPENSE',
        amount: 150,
        date: getPastDate(12, 14),
        description: 'New mechanical keyboards (x3)',
        category: 'Equipment'
    }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
    { id: 'inv-1', name: 'Logitech G502 Gaming Mouse', category: 'Peripherals', quantity: 8, status: 'In Use', purchaseDate: getPastDate(30, 12), cost: 50, notes: 'Standard gaming mice for Section A & B' },
    { id: 'inv-2', name: 'Redragon K552 Mechanical Keyboard', category: 'Peripherals', quantity: 6, status: 'In Use', purchaseDate: getPastDate(30, 12), cost: 40, notes: 'Tactile blue switches' },
    { id: 'inv-3', name: 'Asus TUF 27" 165Hz Monitor', category: 'Displays', quantity: 12, status: 'In Use', purchaseDate: getPastDate(60, 12), cost: 180, notes: 'Main display screens for all cabins' },
    { id: 'inv-4', name: 'Monster Energy Ultra (Case of 24)', category: 'Snacks / Drinks', quantity: 4, status: 'In Stock', purchaseDate: getPastDate(2, 10), cost: 35, notes: 'Best selling beverage' },
    { id: 'inv-5', name: 'RTX 4060 Ti Graphics Card', category: 'PC Components', quantity: 2, status: 'Spare', purchaseDate: getPastDate(15, 12), cost: 400, notes: 'Spares kept for quick repairs' }
];

const DEFAULT_REPAIRS: RepairTicket[] = [
    {
        id: 'rep-1',
        cabinId: 'cab-4',
        reason: 'Broken monitor, replacement ordered',
        reportedBy: 'staff',
        startTime: getPastDate(1, 10),
        expectedFix: 'Tomorrow',
        status: 'OPEN'
    },
    {
        id: 'rep-2',
        cabinId: 'cab-2',
        reason: 'Loose headphone jack',
        reportedBy: 'admin',
        startTime: getPastDate(5, 14),
        status: 'CLOSED',
        closedAt: getPastDate(5, 16)
    }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
    { id: 'log-1', userId: 'u-admin', username: 'admin', action: 'SYSTEM_INIT', details: 'Speedy Cafe system initialized with default configurations', timestamp: getPastDate(15, 8) },
    { id: 'log-2', userId: 'u-admin', username: 'admin', action: 'USER_CREATE', details: 'Created user account: staff', timestamp: getPastDate(14, 10) },
    { id: 'log-3', userId: 'u-operator', username: 'staff', action: 'LOGIN', details: 'Staff user logged in from operator station', timestamp: getPastDate(0, 9) }
];

// --- HELPER FOR OFFLINE STORAGE ---
const saveToLocal = (key: keyof AppState, data: any) => {
    if (API_URL) return; // Never persist live records in browser storage
    try {
        const current = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        current[key] = data;
        localStorage.setItem(LS_KEY, JSON.stringify(current));
    } catch(e) { console.error("LS Error", e); }
};

// --- PROVIDER ---

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  
  // Auth State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Global ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- API WRAPPER WITH OFFLINE FALLBACK ---
  const safeApiCall = async (method: 'GET' | 'POST', action: string, payload?: any): Promise<any> => {
       if (!API_URL) return null;
       try {
           const opts: RequestInit = {
               method,
               credentials: 'same-origin',
               headers: method === 'POST'
                 ? { 'Content-Type': 'application/json', 'X-CSRF-Token': liveCsrfToken }
                 : {}
           };
           if (method === 'POST') opts.body = JSON.stringify(payload || {});
           const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, opts);
           const body = await res.json();
           if (!res.ok) { console.error('Server request rejected', action, res.status); return null; }
           if (body.csrf) liveCsrfToken = body.csrf;
           return body;
       } catch (error) {
           console.error('Server unavailable:', action, error);
           return null; // No unsafe fallback to demo after authentication fails
       }
   };

   // --- INITIAL DATA LOAD ---
  useEffect(() => {
      const loadData = async () => {
          if (API_URL) {
               const session = await safeApiCall('GET', 'auth_status');
               if (!session?.user) {
                   setIsOffline(false);
                   setLoading(false);
                   return;
               }
               setCurrentUser({ ...session.user, passwordHash: '' });
           }
           const data = await safeApiCall('GET', 'init');
          
          if (data && !data.error) {
              // Online Mode
              setCabins(data.cabins && data.cabins.length ? data.cabins : DEFAULT_CABINS);
              setCustomers(data.customers || []);
              
              const parsedSessions = (data.sessions || []).map((s: any) => ({
                  ...s,
                  inTime: Number(s.inTime),
                  outTime: s.outTime ? Number(s.outTime) : undefined,
                  ratePerHour: Number(s.ratePerHour),
                  effectiveMinutes: Number(s.effectiveMinutes),
                  amountDue: Number(s.amountDue),
                  amountPaid: Number(s.amountPaid),
              }));
              setSessions(parsedSessions);
              setTransactions(data.transactions || []);
              setInventory(data.inventory || []);
              setRepairs(data.repairs || []);
              setUsers(data.users || [DEFAULT_ADMIN]);
              setAuditLogs(data.auditLogs || []);
              setIsOffline(false); // Connection Successful
          } else if (API_URL) {
               setIsOffline(false);
           } else {
               // Isolated fictional demo storage only
              console.log("Loading from Offline Storage");
              try {
                  const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
                  const hasSavedData = Object.keys(saved).length > 0;
                  
                  if (!hasSavedData) {
                      const initialStorage = {
                          cabins: DEFAULT_CABINS,
                          customers: DEFAULT_CUSTOMERS,
                          sessions: DEFAULT_SESSIONS,
                          transactions: DEFAULT_TRANSACTIONS,
                          inventory: DEFAULT_INVENTORY,
                          repairs: DEFAULT_REPAIRS,
                          users: DEFAULT_USERS,
                          auditLogs: DEFAULT_AUDIT_LOGS
                      };
                      localStorage.setItem(LS_KEY, JSON.stringify(initialStorage));
                      
                      setCabins(DEFAULT_CABINS);
                      setCustomers(DEFAULT_CUSTOMERS);
                      setSessions(DEFAULT_SESSIONS);
                      setTransactions(DEFAULT_TRANSACTIONS);
                      setInventory(DEFAULT_INVENTORY);
                      setRepairs(DEFAULT_REPAIRS);
                      setUsers(DEFAULT_USERS);
                      setAuditLogs(DEFAULT_AUDIT_LOGS);
                  } else {
                      setCabins(saved.cabins || DEFAULT_CABINS);
                      setCustomers(saved.customers || DEFAULT_CUSTOMERS);
                      setSessions(saved.sessions || DEFAULT_SESSIONS);
                      setTransactions(saved.transactions || DEFAULT_TRANSACTIONS);
                      setInventory(saved.inventory || DEFAULT_INVENTORY);
                      setRepairs(saved.repairs || DEFAULT_REPAIRS);
                      setUsers(saved.users || DEFAULT_USERS);
                      setAuditLogs(saved.auditLogs || DEFAULT_AUDIT_LOGS);
                  }
              } catch (e) {
                  console.error("Failed to load local storage", e);
                  setCabins(DEFAULT_CABINS);
                  setCustomers(DEFAULT_CUSTOMERS);
                  setSessions(DEFAULT_SESSIONS);
                  setTransactions(DEFAULT_TRANSACTIONS);
                  setInventory(DEFAULT_INVENTORY);
                  setRepairs(DEFAULT_REPAIRS);
                  setUsers(DEFAULT_USERS);
                  setAuditLogs(DEFAULT_AUDIT_LOGS);
              }
              setIsOffline(true);
          }
          setLoading(false);
      };
      loadData();
  }, []);

  // --- SYNC HELPER ---
  const sync = (action: string, key: keyof AppState, data: any) => {
      if (Array.isArray(data)) {
         saveToLocal(key, data);
      }
      if (API_URL && !isOffline) {
           void safeApiCall('POST', action, data);
       }
  };

  // --- LOGGING HELPER ---
  const logAction = (action: string, details: string) => {
      const newLog: AuditLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          userId: currentUser?.id || 'system',
          username: currentUser?.username || 'system',
          action,
          details,
          timestamp: Date.now(),
          ipAddress: 'Unknown'
      };
      const newLogs = [newLog, ...auditLogs].slice(0, 100);
      setAuditLogs(newLogs);
      saveToLocal('auditLogs', newLogs);
      sync('log_audit', 'auditLogs', newLog);
  };

  // --- AUTH METHODS ---

  const login = async (username: string, password: string): Promise<boolean> => {
       if (API_URL) {
           const result = await safeApiCall('POST', 'login', { username, password });
           if (!result?.user) return false;
           setCurrentUser({ ...result.user, passwordHash: '' });
           window.location.reload(); // Load authorized records using the new server session
           return true;
       }
      const user = users.find(u => u.username === username && u.passwordHash === password);
      
      if (user) {
          if (!user.isActive) return false;
          
          const updatedUser = { ...user, lastLoginAt: Date.now() };
          setCurrentUser(updatedUser);
          
          const newUsers = users.map(u => u.id === user.id ? updatedUser : u);
          setUsers(newUsers);
          saveToLocal('users', newUsers);
          sync('sync_user', 'users', updatedUser);
          
          logAction('LOGIN', `User ${username} logged in`);
          return true;
      }
      return false;
  };

  const logout = () => {
       if (API_URL) {
           void safeApiCall('POST', 'logout').then(() => { liveCsrfToken = ''; window.location.reload(); });
           setCurrentUser(null);
           return;
       }
       if (currentUser) {
        logAction('LOGOUT', 'User logged out');
      }
      setCurrentUser(null);
  };

  const changePassword = async (oldPw: string, newPw: string): Promise<{success: boolean, message: string}> => {
       if (API_URL) {
           const result = await safeApiCall('POST', 'change_password', { oldPassword: oldPw, newPassword: newPw });
           return { success: !!result, message: result ? 'Password changed successfully' : 'Incorrect current password or new password too short (minimum 12 characters)' };
       }
       if (!currentUser) return { success: false, message: 'Not logged in' };
      if (currentUser.passwordHash !== oldPw) return { success: false, message: 'Incorrect old password' };

      const updatedUser = { ...currentUser, passwordHash: newPw };
      const newUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      
      setUsers(newUsers);
      setCurrentUser(updatedUser);
      saveToLocal('users', newUsers);
      sync('sync_user', 'users', updatedUser);

      logAction('PASSWORD_CHANGE', 'User changed their own password');
      return { success: true, message: 'Password changed successfully' };
  };

  const updateProfile = (data: Partial<User>) => {
       if (!currentUser) return;
       if (API_URL) void safeApiCall('POST', 'update_profile', { fullName: data.fullName || currentUser.fullName, email: data.email ?? currentUser.email, phone: data.phone ?? currentUser.phone });
      const updated = { ...currentUser, ...data };
      const newUsers = users.map(u => u.id === currentUser.id ? updated : u);
      
      setUsers(newUsers);
      setCurrentUser(updated);
      saveToLocal('users', newUsers);
      sync('sync_user', 'users', updated);

      logAction('PROFILE_UPDATE', 'User updated profile details');
  };

  // --- ADMIN USER MANAGEMENT ---

  const addUser = (userData: Omit<User, 'id' | 'lastLoginAt'>) => {
       if (API_URL && userData.passwordHash.length < 12) return;
      const newUser: User = { ...userData, id: `u-${Date.now()}`, isActive: true };
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      saveToLocal('users', newUsers);
      sync('sync_user', 'users', newUser);
      logAction('USER_CREATE', `Created user: ${newUser.username}`);
  };

  const updateUser = (id: string, data: Partial<User>) => {
      const user = users.find(u => u.id === id);
      if(!user) return;
      const updated = { ...user, ...data };
      const newUsers = users.map(u => u.id === id ? updated : u);
      setUsers(newUsers);
      saveToLocal('users', newUsers);
      sync('sync_user', 'users', updated);
      logAction('USER_UPDATE', `Updated user ID: ${id}`);
  };

  const deleteUser = (id: string) => {
      const newUsers = users.filter(u => u.id !== id);
      setUsers(newUsers);
      saveToLocal('users', newUsers);
      sync('delete_user', 'users', { id });
      logAction('USER_DELETE', `Deleted user ID: ${id}`);
  };

  const adminResetPassword = (userId: string, newPw: string) => {
       if (API_URL) {
           void safeApiCall('POST', 'admin_reset_password', { id: userId, newPassword: newPw });
           return;
       }
       const user = users.find(u => u.id === userId);
      if(!user) return;
      const updated = { ...user, passwordHash: newPw };
      const newUsers = users.map(u => u.id === userId ? updated : u);
      setUsers(newUsers);
      saveToLocal('users', newUsers);
      sync('sync_user', 'users', updated);
      logAction('ADMIN_PW_RESET', `Admin reset password for user: ${user.username}`);
  };

  // --- OPERATIONAL METHODS ---

  const checkIn = (cabinId: string, customerId: string, rate: number) => {
    const newSession: Session = {
      id: `sess-${Date.now()}`,
      cabinId,
      customerId,
      inTime: Date.now(),
      holds: [],
      ratePerHour: rate,
      totalHoldMinutes: 0,
      effectiveMinutes: 0,
      amountDue: 0,
      amountPaid: 0,
      status: 'OPEN',
      createdBy: currentUser?.username || 'Unknown'
    };
    
    // Update Local State
    const newSessions = [...sessions, newSession];
    setSessions(newSessions);
    saveToLocal('sessions', newSessions);

    const newCabins = cabins.map(c => {
      if (c.id === cabinId) {
          const updated = { ...c, status: CabinStatus.OCCUPIED, currentSessionId: newSession.id };
          sync('sync_cabin', 'cabins', updated);
          return updated;
      }
      return c;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);

    sync('sync_session', 'sessions', newSession);
  };

  const toggleHold = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    let updatedSession = { ...session };
    const isOnHold = session.holds.length > 0 && !session.holds[session.holds.length - 1].end;
    
    let newHolds = [...session.holds];
    let newCabinStatus = CabinStatus.OCCUPIED;

    if (isOnHold) {
      const lastHold = { ...newHolds[newHolds.length - 1] };
      lastHold.end = Date.now();
      lastHold.durationMinutes = (lastHold.end - lastHold.start) / 60000;
      newHolds[newHolds.length - 1] = lastHold;
    } else {
      newHolds.push({ id: `h-${Date.now()}`, start: Date.now(), durationMinutes: 0 });
      newCabinStatus = CabinStatus.ON_HOLD;
    }
    updatedSession.holds = newHolds;

    const newSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
    setSessions(newSessions);
    saveToLocal('sessions', newSessions);
    sync('sync_session', 'sessions', updatedSession);

    const newCabins = cabins.map(c => {
        if (c.id === session.cabinId) {
            const updated = { ...c, status: newCabinStatus };
            sync('sync_cabin', 'cabins', updated);
            return updated;
        }
        return c;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);
  };

  const checkOut = (sessionId: string, paymentAmount: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const outTime = Date.now();
    let totalHoldMs = 0;
    session.holds.forEach(h => { totalHoldMs += (h.end || outTime) - h.start; });
    const totalDurationMs = outTime - session.inTime;
    const effectiveMs = totalDurationMs - totalHoldMs;
    const effectiveMinutes = Math.ceil(effectiveMs / 60000); 
    const hours = effectiveMinutes / 60;
    const amountDue = Math.ceil(hours * session.ratePerHour);

    const updatedSession: Session = {
      ...session,
      outTime,
      totalHoldMinutes: totalHoldMs / 60000,
      effectiveMinutes,
      amountDue,
      amountPaid: paymentAmount,
      status: 'CLOSED'
    };

    const newSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
    setSessions(newSessions);
    saveToLocal('sessions', newSessions);
    sync('sync_session', 'sessions', updatedSession);

    const newCabins = cabins.map(c => {
        if(c.id === session.cabinId) {
            const updated = { ...c, status: CabinStatus.AVAILABLE, currentSessionId: undefined };
            sync('sync_cabin', 'cabins', updated);
            return updated;
        }
        return c;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);

    const balance = amountDue - paymentAmount;
    const customer = customers.find(c => c.id === session.customerId);
    if(customer) {
        const updatedCust = { 
            ...customer, 
            totalSpent: customer.totalSpent + amountDue, 
            outstandingBalance: customer.outstandingBalance + balance 
        };
        const newCustomers = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
        setCustomers(newCustomers);
        saveToLocal('customers', newCustomers);
        sync('sync_customer', 'customers', updatedCust);
    }

    if (paymentAmount > 0) {
      const newTx: Transaction = {
        id: `tx-pay-${Date.now()}`,
        type: 'PAYMENT',
        amount: paymentAmount,
        description: `Payment for Session ${sessionId}`,
        relatedId: sessionId,
        customerId: session.customerId,
        date: Date.now()
      };
      const newTransactions = [...transactions, newTx];
      setTransactions(newTransactions);
      saveToLocal('transactions', newTransactions);
      sync('sync_transaction', 'transactions', newTx);
    }
  };

  const moveSession = (sessionId: string, targetCabinId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const oldCabinId = session.cabinId;
    
    const updatedSession = { ...session, cabinId: targetCabinId };
    const newSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
    setSessions(newSessions);
    saveToLocal('sessions', newSessions);
    sync('sync_session', 'sessions', updatedSession);

    const newCabins = cabins.map(c => {
      let updated = c;
      if (c.id === oldCabinId) updated = { ...c, status: CabinStatus.AVAILABLE, currentSessionId: undefined };
      if (c.id === targetCabinId) updated = { ...c, status: CabinStatus.OCCUPIED, currentSessionId: sessionId };
      if (updated !== c) sync('sync_cabin', 'cabins', updated);
      return updated;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);
  };

  const markMaintenance = (cabinId: string, reason: string, expectedFix?: string) => {
    const newTicket: RepairTicket = {
      id: `rep-${Date.now()}`,
      cabinId,
      reason,
      reportedBy: currentUser?.username || 'Staff',
      startTime: Date.now(),
      expectedFix,
      status: 'OPEN'
    };
    
    const newRepairs = [...repairs, newTicket];
    setRepairs(newRepairs);
    saveToLocal('repairs', newRepairs);
    sync('sync_repair', 'repairs', newTicket);

    const newCabins = cabins.map(c => {
        if(c.id === cabinId) {
            const updated = { ...c, status: CabinStatus.OUT_OF_SERVICE, statusReason: reason, expectedFix };
            sync('sync_cabin', 'cabins', updated);
            return updated;
        }
        return c;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);
  };

  const resolveMaintenance = (cabinId: string) => {
    const newCabins = cabins.map(c => {
        if(c.id === cabinId) {
            const updated = { ...c, status: CabinStatus.AVAILABLE, statusReason: undefined, expectedFix: undefined };
            sync('sync_cabin', 'cabins', updated);
            return updated;
        }
        return c;
    });
    setCabins(newCabins);
    saveToLocal('cabins', newCabins);

    const newRepairs = repairs.map(t => {
        if (t.cabinId === cabinId && t.status === 'OPEN') {
            const updated = { ...t, status: 'CLOSED' as const, closedAt: Date.now() };
            sync('sync_repair', 'repairs', updated);
            return updated;
        }
        return t;
    });
    setRepairs(newRepairs);
    saveToLocal('repairs', newRepairs);
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'totalSpent' | 'outstandingBalance'>) => {
    const id = `cust-${Date.now()}`;
    const newCustomer: Customer = { ...customer, id, totalSpent: 0, outstandingBalance: 0 };
    
    const newCustomers = [...customers, newCustomer];
    setCustomers(newCustomers);
    saveToLocal('customers', newCustomers);
    sync('sync_customer', 'customers', newCustomer);
    return id;
  };

  const updateCustomer = (updated: Customer) => {
    const newCustomers = customers.map(c => c.id === updated.id ? updated : c);
    setCustomers(newCustomers);
    saveToLocal('customers', newCustomers);
    sync('sync_customer', 'customers', updated);
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'date'> & { date?: number }) => {
    const newT: Transaction = { ...t, id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`, date: t.date || Date.now() };
    
    const newTransactions = [...transactions, newT];
    setTransactions(newTransactions);
    saveToLocal('transactions', newTransactions);
    sync('sync_transaction', 'transactions', newT);
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: `inv-${Date.now()}` };
    
    const newInventory = [...inventory, newItem];
    setInventory(newInventory);
    saveToLocal('inventory', newInventory);
    sync('sync_inventory', 'inventory', newItem);
  };

  const updateInventoryItem = (item: InventoryItem) => {
    const newInventory = inventory.map(i => i.id === item.id ? item : i);
    setInventory(newInventory);
    saveToLocal('inventory', newInventory);
    sync('sync_inventory', 'inventory', item);
  };

  const deleteInventoryItem = (id: string) => {
    const newInventory = inventory.filter(i => i.id !== id);
    setInventory(newInventory);
    saveToLocal('inventory', newInventory);
    sync('delete_inventory', 'inventory', { id });
  };

  const addManualRecord = (data: ManualRecordData) => {
    let finalCustomerId = data.customerId;
    if (!finalCustomerId && data.newCustomer) {
      finalCustomerId = addCustomer({ name: data.newCustomer.name, contact: data.newCustomer.contact });
    }
    if (!finalCustomerId) return;
    
    const outTime = data.startTime + (data.durationMinutes * 60000);
    const paidAmount = data.paidAmount !== undefined ? data.paidAmount : data.amount;
    const balance = data.amount - paidAmount;
    
    const newSession: Session = {
      id: `sess-manual-${Date.now()}`,
      cabinId: data.cabinId,
      customerId: finalCustomerId,
      inTime: data.startTime,
      outTime: outTime,
      holds: [],
      ratePerHour: 0,
      totalHoldMinutes: 0,
      effectiveMinutes: data.durationMinutes,
      amountDue: data.amount,
      amountPaid: paidAmount,
      status: 'CLOSED',
      createdBy: `${currentUser?.username} (Manual)`,
      isManual: true,
      manualReason: data.reason
    };

    const newSessions = [...sessions, newSession];
    setSessions(newSessions);
    saveToLocal('sessions', newSessions);
    sync('sync_session', 'sessions', newSession);

    const customer = customers.find(c => c.id === finalCustomerId);
    if(customer) {
        const updatedCust = { 
            ...customer, 
            totalSpent: customer.totalSpent + data.amount, 
            outstandingBalance: customer.outstandingBalance + balance 
        };
        const newCustomers = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
        setCustomers(newCustomers);
        saveToLocal('customers', newCustomers);
        sync('sync_customer', 'customers', updatedCust);
    }

    if (paidAmount > 0) {
      const newTx: Transaction = {
          id: `tx-man-${Date.now()}`,
          type: 'PAYMENT',
          amount: paidAmount,
          description: `Offline Entry: ${data.reason}`,
          relatedId: newSession.id,
          date: data.startTime,
          isManual: true,
          customerId: finalCustomerId
      };
      const newTransactions = [...transactions, newTx];
      setTransactions(newTransactions);
      saveToLocal('transactions', newTransactions);
      sync('sync_transaction', 'transactions', newTx);
    }
  };

  if(loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <div className="text-xl font-bold text-slate-600 mb-2">Starting Speedy Cafe...</div>
            <div className="text-sm text-slate-400">Connecting to database</div>
        </div>
      );
  }

  return (
    <AppContext.Provider value={{
      cabins, customers, sessions, transactions, repairs, inventory,
      users, currentUser, auditLogs,
      now, isOffline,
      checkIn, checkOut, toggleHold, moveSession, markMaintenance, resolveMaintenance,
      addCustomer, updateCustomer, addTransaction, addInventoryItem, updateInventoryItem, deleteInventoryItem, addManualRecord,
      login, logout, changePassword, updateProfile,
      addUser, updateUser, deleteUser, adminResetPassword
    }}>
      {isOffline && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-xs py-1 px-4 text-center z-[100] shadow-md">
              <strong>LOCAL DEMO MODE:</strong> Fictional data in this browser, not connected to a production server.
          </div>
      )}
      {children}
    </AppContext.Provider>
  );
};
