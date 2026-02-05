import { HttpParams } from "@angular/common/http";

// Enums
export enum EmployeeRole {
  ADMIN = 'ADMIN',
  STORE_ADMIN = 'STORE_ADMIN',
  CASHIER = 'CASHIER',
  DEPOT_MANAGER = 'DEPOT_MANAGER',
  EMPLOYEE = 'EMPLOYEE'
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
  MIXED = 'MIXED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
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
  email: string;
  phone?: string;
  address?: string;
  password?: string;
  userRole: EmployeeRole;
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedStore?: Store;
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
  quantity: number;
  imageUrl: string;
  inStock: boolean;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
  category: Category;
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
  product: Product;
  store: Store;
}

export interface OrderItem {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  totalPrice: number;
  notes: string;
  product: Product;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  status?: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  isTaxable: boolean;
  fullyRefunded: boolean;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  customer?: Customer;
  cashier: User;
  store: Store;
  items: OrderItem[];
}

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
  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  store: Store;
  cashier: User;
}

// Request Models
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  userRole: EmployeeRole;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}