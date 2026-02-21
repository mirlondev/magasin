import { HttpParams } from "@angular/common/http";
// Ajouter ces interfaces à votre fichier models.ts existant

export interface CashRegister {
  cashRegisterId: string;
  registerNumber: string;  // ex: "Caisse-01"
  name: string;
  storeId: string;
  storeName?: string;
  isActive: boolean;
  location?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShiftReport {
  shiftReportId: string;
  shiftNumber: string;
  status: ShiftStatus;
  open: boolean;
  closed: boolean;
  totalTransactions: number;
  openingBalance: number;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  expectedBalance: number;
  actualBalance: number;
  closingBalance: number;
  discrepancy: number;
  notes: string;
  cashierId: string;
  cashierName: string;
  storeAddress?: string;
  storeId: string;
  storeName: string;

  // NOUVEAUX CHAMPS - Caisse
  cashRegisterId?: string;
  cashRegisterNumber?: string;
  cashRegisterName?: string;

  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  store: Store;
  cashier: User;
}

export interface ShiftReportRequest {
  storeId: string;
  cashRegisterId: string;  // AJOUTÉ - obligatoire
  openingBalance: number;
  notes?: string;
}

export interface CloseShiftRequest {
  actualBalance?: number;   // Optionnel - si null, utilise expectedBalance
  notes?: string;
}

export interface ShiftReportDetail extends ShiftReport {
  cashTotal: number;
  mobileTotal: number;
  cardTotal: number;
  creditTotal: number;
  otherPayments: Record<string, number>;
}

export interface CashRegisterRequest {
  registerNumber: string;
  name: string;
  storeId: string;
  location?: string;
}
// Enums
export enum EmployeeRole {
  ADMIN = 'ADMIN',
  STORE_ADMIN = 'STORE_ADMIN',
  CASHIER = 'CASHIER',
  DEPOT_MANAGER = 'DEPOT_MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CREDIT = 'CREDIT',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',

}


export interface Payment {
  paymentId: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  cashierId: string;
  shiftReportId?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
  isActive: boolean;
}
export enum OrderType {
  POS_SALE = 'POS_SALE',        // Vente en caisse → Ticket
  CREDIT_SALE = 'CREDIT_SALE',  // Vente à crédit → Facture
  PROFORMA = 'PROFORMA',        // Devis/Proforma → Proforma
  ONLINE = 'ONLINE'             // Vente en ligne → Facture
}

export enum DocumentType {
  TICKET = 'TICKET',
  INVOICE = 'INVOICE',
  PROFORMA = 'PROFORMA',
  RECEIPT = 'RECEIPT'
}
export interface Order {
  orderId: string;
  orderNumber: string;
  orderType?: OrderType;
  customerId?: string;
  cashierId: string;
  storeId: string;
  items: OrderItem[];
  payments: Payment[]; // NEW: Array of payments
  // Store
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLoyaltyPoints?: number;
  // Financial fields
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Deprecated but kept for compatibility
  amountPaid: number; // @Deprecated - Use getTotalPaid()
  changeAmount: number;
  paymentMethod: PaymentMethod; // @Deprecated - Use payments array

  // Status fields
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // Additional fields
  notes?: string;
  isTaxable: boolean;
  taxRate: number;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  // Computed fields (from backend)
  totalPaid?: number; // Sum of non-credit payments
  totalCredit?: number; // Sum of credit payments
  remainingAmount?: number; // Amount still owed
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  notes?: string;
}

export interface OrderRequest {
  storeId: string;
  customerId?: string;
  items: OrderItemRequest[];
  paymentMethod?: PaymentMethod; // Optional, for backward compatibility
  amountPaid?: number; // Optional, creates initial payment if provided
  discountAmount?: number;
  taxRate?: number;
  isTaxable?: boolean;
  notes?: string;
  orderType?: OrderType;
}
;
export interface OrderItemRequest {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  notes?: string;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}




export interface CartItem {
  product: Product;
  quantity: number;
}



export enum StoreType {
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE'
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING'
}
export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  CREDIT = 'CREDIT',
  MIXED = 'MIXED'
}



export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  OVER_STOCK = 'OVER_STOCK',
  DISCONTINUED = 'DISCONTINUED'
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL'
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}
export interface JwtPayload {
  sub: string;           // Username (JWT standard claim)
  userId: string;
  username?: string;     // Optional - might not be in token
  email: string;
  role: string;
  status?: string;       // Optional - might not be in token
  iat: number;          // Issued at
  exp: number;          // Expiration
}
// Entity Models
export interface User {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  password?: string;
  userRole: EmployeeRole;
  storeId?: string;
  storeName?: string;
  storeType?: string;
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  //assignedStore?: Store;
}

export interface Store {
  storeId: string;
  name: string;
  storeType: StoreType;
  status: StoreStatus;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  openingHours: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  storeAdmin: User;
}

export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isActive: boolean;
  loyaltyPoints: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentCategory?: Category;
  subCategories: Category[];
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice?: number;
  taxRate?: number;
  categoryId: string;
  quantity: number;
  imageUrl: string;
  categoryName: string;
  inStock: boolean;
  minStock: number;
  maxStock?: number;
  isActive: boolean;
  totalStock: number;
  createdAt: string;

  updatedAt: string;
}

export interface Inventory {
  inventoryId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  totalValue: number;
  stockStatus: StockStatus;
  lowStock: boolean;
  outOfStock: boolean;
  overStock: boolean;
  isActive: boolean;
  notes: string;
  lastRestocked: string;
  nextRestockDate: string;
  createdAt: string;
  updatedAt: string;
  // product: Product;
  store: Store;
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  storeId: string;
  storeName: string;
  storeType: StoreType;

}


// export interface Order {
//   orderId: string;
//   orderNumber: string;
//   status?: OrderStatus;
//   paymentStatus: PaymentStatus;
//   paymentMethod: PaymentMethod;
//   isTaxable: boolean;
//   fullyRefunded: boolean;
//   subtotal: number;
//   discountAmount: number;
//   taxRate: number;
//   taxAmount: number;
//   totalAmount: number;
//   amountPaid: number;
//   changeAmount: number;
//   notes: string;
//   createdAt: string;
//   updatedAt: string;
//   completedAt?: string;
//   cancelledAt?: string;
//   customer?: Customer;
//   cashier: User;
//   store: Store;
//   items: OrderItem[];
// }

export interface Refund {
  refundId: string;
  refundNumber: string;
  refundType: RefundType;
  status: RefundStatus;
  refundAmount: number;
  reason: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  order: Order;
  shiftReport?: ShiftReport;
  store: Store;
  cashier: User;
}

// export interface ShiftReport {
//   shiftReportId: string;
//   shiftNumber: string;
//   status: ShiftStatus;
//   open: boolean;
//   closed: boolean;
//   totalTransactions: number;
//   openingBalance: number;
//   totalSales: number;
//   totalRefunds: number;
//   netSales: number;
//   expectedBalance: number;
//   actualBalance: number;
//   closingBalance: number;
//   discrepancy: number;
//   notes: string;
//   cashierId: string;
//   cashierName: string;
//   storeAddress?: string;
//   storeId: string;
//   storeName: string;
//   startTime: string;
//   endTime?: string;
//   createdAt: string;
//   updatedAt: string;
//   store: Store;
//   cashier: User;
// }




export enum UserStatus {
  ON_LEAVE = 'ON_LEAVE',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}
export interface EmployeeRoleResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  userRole: EmployeeRole;
  storeId?: string;
  storeName?: string;
  storeType?: string;
  status?: UserStatus;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface BulkOperationResponse {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

// export interface ShiftReportRequest {
//   storeId: string;
//   openingBalance: number;
//   notes?: string;
// }

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  userRole: EmployeeRole;
  message?: string;
  storeId?: string;
  storeName?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}