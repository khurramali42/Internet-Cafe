

export enum CabinStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  ON_HOLD = 'ON_HOLD',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  remarks?: string;
  totalSpent: number;
  outstandingBalance: number;
}

export interface Hold {
  id: string;
  start: number; // Timestamp
  end?: number; // Timestamp
  durationMinutes: number;
}

export interface Session {
  id: string;
  cabinId: string;
  customerId: string;
  inTime: number; // Timestamp
  outTime?: number; // Timestamp
  holds: Hold[];
  ratePerHour: number;
  totalHoldMinutes: number;
  effectiveMinutes: number;
  amountDue: number;
  amountPaid: number;
  status: 'OPEN' | 'CLOSED';
  createdBy: string;
  isManual?: boolean;
  manualReason?: string;
}

export interface RepairTicket {
  id: string;
  cabinId: string;
  reason: string;
  reportedBy: string;
  startTime: number;
  expectedFix?: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: number;
}

export interface Cabin {
  id: string;
  name: string;
  status: CabinStatus;
  currentSessionId?: string;
  location?: string;
  statusReason?: string;
  expectedFix?: string;
}

export interface Transaction {
  id: string;
  type: 'PAYMENT' | 'SALE' | 'EXPENSE';
  amount: number;
  date: number;
  description: string;
  category?: string; // Added for expense categorization
  relatedId?: string; // SessionID or SaleID
  customerId?: string; // Linked to customer for ledger
  isManual?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; 
  quantity: number;
  status: string; 
  purchaseDate: number;
  cost: number;
  notes?: string;
  remarks?: string; 
}

// --- AUTH & USER TYPES ---

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // In real app, this is hashed. Here simple string for mock.
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: number;
  ipAddress?: string; // Mocked
}

export interface AppState {
  cabins: Cabin[];
  customers: Customer[];
  sessions: Session[];
  transactions: Transaction[];
  repairs: RepairTicket[];
  inventory: InventoryItem[];
  // Auth State
  users: User[];
  currentUser: User | null;
  auditLogs: AuditLog[];
}

export interface ManualRecordData {
  customerId?: string; 
  newCustomer?: { name: string, contact: string }; 
  cabinId: string;
  startTime: number;
  durationMinutes: number;
  amount: number; 
  paidAmount?: number; 
  reason: string;
}

export interface AppContextType extends AppState {
  isOffline: boolean; // Added to track connection status
  
  // Operational Methods
  checkIn: (cabinId: string, customerId: string, rate: number, newCustomer?: { name: string; contact: string }, requestId?: string) => Promise<boolean>;
  checkOut: (sessionId: string, paymentAmount: number, discount?: number) => Promise<boolean>;
  toggleHold: (sessionId: string) => void;
  moveSession: (sessionId: string, targetCabinId: string) => void;
  markMaintenance: (cabinId: string, reason: string, expectedFix?: string) => void;
  resolveMaintenance: (cabinId: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'outstandingBalance'>) => string; 
  updateCustomer: (customer: Customer) => void;
  addTransaction: (t: Omit<Transaction, 'id' | 'date'> & { date?: number }, requestId?: string) => Promise<boolean>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  addManualRecord: (data: ManualRecordData, requestId?: string) => Promise<boolean>;
  settleBalance: (customerId: string, paymentAmount: number, requestId: string) => Promise<boolean>;
  
  // Auth Methods
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPw: string, newPw: string) => Promise<{success: boolean, message: string}>;
  updateProfile: (data: Partial<User>) => void;
  
  // Admin User Management
  addUser: (user: Omit<User, 'id' | 'lastLoginAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  adminResetPassword: (userId: string, newPw: string) => void;
  
  now: number; 
}