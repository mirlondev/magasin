import { HttpParams } from "@angular/common/http";

// ==================== ENUMS ====================

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
  FAILED = 'FAILED'
}

export enum OrderType {
  POS_SALE = 'POS_SALE',
  CREDIT_SALE = 'CREDIT_SALE',
  PROFORMA = 'PROFORMA',
  ONLINE = 'ONLINE'
}

export enum DocumentType {
  TICKET = 'TICKET',
  INVOICE = 'INVOICE',
  PROFORMA = 'PROFORMA',
  RECEIPT = 'RECEIPT',
  QUOTE = 'QUOTE',
  DELIVERY_NOTE = 'DELIVERY_NOTE'
}

export enum StoreType {
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
  KIOSK = 'KIOSK'
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
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
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
  PARTIAL = 'PARTIAL',
  EXCHANGE = 'EXCHANGE'
}

export enum RefundMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  STORE_CREDIT = 'STORE_CREDIT',
  EXCHANGE = 'EXCHANGE'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  CONVERTED = 'CONVERTED'
}

export enum InvoiceType {
  CREDIT_SALE = 'CREDIT_SALE',
  PROFORMA = 'PROFORMA'
}

export enum ReceiptStatus {
  ACTIVE = 'ACTIVE',
  VOID = 'VOID',
  REPRINTED = 'REPRINTED'
}

export enum ReceiptType {
  SALE_RECEIPT = 'SALE_RECEIPT',
  REFUND_RECEIPT = 'REFUND_RECEIPT',
  EXCHANGE_RECEIPT = 'EXCHANGE_RECEIPT'
}

export enum UserStatus {
  ON_LEAVE = 'ON_LEAVE',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum UnitType {
  PIECE = 'PIECE',
  KILOGRAM = 'KILOGRAM',
  GRAM = 'GRAM',
  LITER = 'LITER',
  MILLILITER = 'MILLILITER',
  METER = 'METER',
  CENTIMETER = 'CENTIMETER',
  BOX = 'BOX',
  CARTON = 'CARTON',
  PACK = 'PACK',
  BOTTLE = 'BOTTLE',
  CAN = 'CAN'
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}

export enum TransactionType {
  SALE = 'SALE',
  REFUND = 'REFUND',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  ADJUSTMENT = 'ADJUSTMENT'
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface BulkOperationResponse {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

// ==================== AUTH ====================

export interface JwtPayload {
  sub: string;
  userId: string;
  username?: string;
  email: string;
  role: string;
  status?: string;
  iat: number;
  exp: number;
}

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
  storeId?: string;
  storeName?: string;
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
  isActive?: boolean;
}

// ==================== USER / EMPLOYEE ====================

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
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedStore?: Store;
  storeId?: string;
  storeName?: string;
  storeType?: string;
  role?: EmployeeRole;
}

export interface UserResponse {
  userId: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  userRole: EmployeeRole;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface EmployeeResponse {
  employeeId: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  role: EmployeeRole;
  storeId?: string;
  storeName?: string;
  storeType?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

// ==================== STORE ====================

export interface Store {
  storeId: string;
  name: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  storeType: StoreType;
  status: StoreStatus;
  phone?: string;
  email?: string;
  openingHours?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  storeAdminId?: string;
  storeAdmin?: User;
}

// ==================== CASH REGISTER ====================

export interface CashRegister {
  cashRegisterId: string;
  registerNumber: string;
  name: string;
  storeId: string;
  storeName?: string;
  isActive: boolean;
  location?: string;
  model?: string;
  serialNumber?: string;
  hasOpenShift?: boolean;
  createdAt: string;
  updatedAt: string;
  store?: Store;
}

export interface CashRegisterRequest {
  registerNumber: string;
  name: string;
  storeId: string;
  location?: string;
  model?: string;
  serialNumber?: string;
  isActive?: boolean;
}

export interface CashRegisterStatistics {
  totalRegisters: number;
  activeRegisters: number;
  inactiveRegisters: number;
  registersWithOpenShift: number;
}

// ==================== SHIFT REPORT ====================

export interface ShiftReport {
  shiftReportId: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  storeId: string;
  storeName: string;
  cashRegisterId: string;
  cashRegisterNumber?: string;
  cashRegisterName?: string;
  openingTime: string;
  closingTime?: string;
  openingBalance: number;
  closingBalance: number;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  totalTransactions: number;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
  mobileMoneySales: number;
  creditSales: number;
  cashSalesCount: number;
  cardSalesCount: number;
  mobileMoneySalesCount: number;
  creditSalesCount: number;
  totalCashIn: number;
  totalCashOut: number;
  totalCancellations: number;
  notes?: string;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
  cashier?: User;
  store?: Store;
}

export type ShiftReportDetail = ShiftReportDetailResponse;

export interface ShiftReportDetailResponse {
  shiftReportId: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  storeId: string;
  storeName: string;
  cashRegisterId: string;
  cashRegisterNumber: string;
  cashRegisterName: string;
  startTime: string;
  endTime?: string;
  openingBalance: number;
  closingBalance: number;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  totalTransactions: number;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  cashTotal: number;
  mobileTotal: number;
  cardTotal: number;
  creditTotal: number;
  otherPayments: Record<string, number>;
  notes?: string;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftReportRequest {
  storeId?: string;
  cashRegisterId: string;
  openingBalance: number;
  notes?: string;
}

export interface CloseShiftRequest {
  actualBalance?: number;
  notes?: string;
}

export interface CashMovementRequest {
  amount: number;
  reason: string;
}

export interface ShiftStatistics {
  totalShifts: number;
  openShifts: number;
  closedShifts: number;
  suspendedShifts: number;
  totalSales: number;
  totalRefunds: number;
  averageShiftDuration: number;
  totalDiscrepancy: number;
}

// ==================== RECEIPT ====================

export interface ReceiptData {
  receiptId: string;
  receiptNumber: string;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  orderId?: string;
  orderNumber?: string;
  shiftReportId?: string;
  cashierId: string;
  cashierName: string;
  storeId: string;
  storeName: string;
  receiptDate: string;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  pdfUrl?: string;
  thermalData?: string;
  printCount: number;
  lastPrintedAt?: string;
  createdAt: string;
  items?: ReceiptItemData[];
  payments?: ReceiptPaymentData[];
}

export interface ReceiptItemData {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  finalPrice: number;
}

export interface ReceiptPaymentData {
  method: PaymentMethod;
  amount: number;
  status: string;
}

// ==================== CATEGORY ====================

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  parentCategory?: Category;
  subCategories?: Category[];
  productCount?: number;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  parentCategoryId?: string;
}

// ==================== PRODUCT ====================

export interface Product {
  productId: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  basePrice?: number;
  taxRate?: number;
  taxAmount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  finalPrice?: number;
  categoryId?: string;
  categoryName?: string;
  costPrice?: number;
  quantity?: number;
  totalStock?: number;
  imageUrl?: string;
  imageFilename?: string;
  inStock?: boolean;
  isActive: boolean;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  unitType?: UnitType;
  unitQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
  category?: Category;
  storePrices?: StoreProductPrice[];
  inventories?: Inventory[]


}

export interface ProductResponse {
  productId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  imageFilename?: string;
  sku?: string;
  barcode?: string;
  inStock: boolean;
  costPrice?: number;
  taxRate?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  unitType?: UnitType;
  unitQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
  storeId?: string;
  isActive: boolean;
  storeName?: string;
  finalPrice?: number;
  discountPercentage?: number;
}

export interface ProductRequest {
  productId: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  imageUrl?: string;
  imageFilename?: string;
  costPrice?: number;
  taxRate?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  unitType?: UnitType;
  unitQuantity?: number;
  isActive: boolean;
  storeId?: string;
  storeName?: string;
}

export interface StoreProductPrice {
  priceId: string;
  productId: string;
  productName?: string;
  storeId: string;
  storeName?: string;
  basePrice: number;
  taxRate: number;
  taxAmount?: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice?: number;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  hasActiveDiscount?: boolean;
  description?: string;
  unitType?: UnitType;
  unitQuantity?: number;
  createdAt?: string;
  product?: Product;
  store?: Store;
}

export interface StoreProductPriceResponse {
  priceId: string;
  productId: string;
  productName?: string;
  storeId: string;
  storeName?: string;
  basePrice: number;
  taxRate: number;
  taxAmount?: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  hasActiveDiscount: boolean;
  createdAt?: string;
}

export interface SetProductPriceRequest {
  productId: string;
  storeId: string;
  basePrice: number;
  taxRate?: number;
  discountPercentage?: number;
  discountAmount?: number;
  effectiveDate: string;
  endDate?: string;
  description?: string;
  unitType?: UnitType;
  unitQuantity?: number;
}

// ==================== INVENTORY ====================

export interface Inventory {
  inventoryId: string;
  version?: number;
  quantity: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  unitCost?: number;
  sellingPrice?: number;
  totalValue?: number;
  stockStatus?: StockStatus;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  isOverStock?: boolean;
  isActive: boolean;
  notes?: string;
  lastRestocked?: string;
  nextRestockDate?: string;
  createdAt: string;
  updatedAt: string;
  productId: string;
  productName?: string;
  productSku?: string;
  productImageUrl?: string;
  storeId: string;
  storeName?: string;
  storeType?: string;
  product?: Product;
  store?: Store;
}

export interface InventoryRequest {
  productId: string;
  storeId: string;
  quantity: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  unitCost?: number;
  sellingPrice?: number;
  notes?: string;
}

export interface InventoryAlert {
  inventoryId: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderPoint: number;
  minStock: number;
  maxStock: number;
  unitCost?: number;
  alertLevel: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

export interface InventorySummary {
  storeId: string;
  storeName: string;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalQuantity: number;
  totalValue: number;
  generatedAt: string;
}

export interface InventorySummaryResponse {
  storeId: string;
  storeName: string;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalQuantity: number;
  totalValue: number;
  generatedAt: string;
}

export interface InventorySummaryProjection {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalQuantity: number;
  totalValue: number;
}

// ==================== CUSTOMER ====================
export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  loyaltyPoints: number;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  isActive: boolean;
  totalPurchases: number;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
  dateOfBirth?: string;
  lastPurchaseDate?: string;
}


export interface LoyaltySummary {
  totalPoints: number;
  tier: string;
  nextTierPoints: number;
}

export interface CustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
}

export interface LoyaltyTransaction {
  transactionId: string;
  customerId: string;
  pointsChange: number;
  newBalance: number;
  reason: string;
  orderId?: string;
  transactionDate: string;
  createdBy?: string;
}

export interface LoyaltyTransactionResponse {
  transactionId: string;
  pointsChange: number;
  newBalance: number;
  reason: string;
  orderId?: string;
  transactionDate: string;
}

export interface LoyaltySummary {
  customerId: string;
  customerName: string;
  currentPoints: number;
  currentTier: LoyaltyTier;
  tierDiscountRate: number;
  pointsToNextTier: number;
  totalPurchases: number;
  purchaseCount: number;
  availableDiscountValue: number;
}

// ==================== ORDER ====================

export interface Order {
  orderId: string;
  orderNumber: string;
  orderType?: OrderType;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName?: string;
  storeId: string;
  storeName?: string;
  items: OrderItem[];
  payments: Payment[];
  subtotal: number;
  taxAmount: number;
  globalDiscountAmount?: number;
  totalAmount: number;
  totalPaid?: number;
  totalCredit?: number;
  remainingAmount?: number;
  changeAmount?: number;
  amountPaid?: number;
  discountAmount?: number;
  paymentMethod?: PaymentMethod;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  isTaxable?: boolean;
  taxRate?: number;
  globalDiscountPercentage?: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  itemCount?: number;
  canBeRefunded?: boolean;
  fullyRefunded?: boolean;
  hasCredit?: boolean;
  customer?: Customer;
  cashier?: User;
  store?: Store;
}

export interface OrderResponse {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName?: string;
  storeId: string;
  storeName?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  globalDiscountAmount?: number;
  totalAmount: number;
  totalPaid: number;
  totalCredit: number;
  remainingAmount: number;
  changeAmount: number;
  payments: PaymentResponse[];
  status: OrderStatus;
  primaryPaymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  isTaxable?: boolean;
  taxRate?: number;
  orderType?: OrderType;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  itemCount?: number;
  canBeRefunded?: boolean;
  discountAmount?: number;
  amountPaid?: number;
  customerLoyaltyPoints?: number;
  paymentMethod?: PaymentMethod

}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  finalPrice: number;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
  unitType?: UnitType;
  unitQuantity?: number;
  baseQuantity?: number;
  originalPriceId?: string;
  product?: Product;
}

export interface OrderItemResponse {
  orderItemId: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  finalPrice: number;
  notes?: string;
}

export interface OrderRequest {
  storeId: string;
  customerId?: string;
  items: OrderItemRequest[];
  orderType?: OrderType;
  discountAmount?: number;
  taxRate?: number;
  isTaxable?: boolean;
  notes?: string;
  globalDiscountPercentage?: number;
  globalDiscountAmount?: number;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  notes?: string;
  unitType?: UnitType;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitType?: UnitType;
  discountPercentage?: number;
  notes?: string;
}

// ==================== PAYMENT ====================

export interface Payment {
  paymentId: string;
  orderId: string;
  orderNumber?: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  cashierId: string;
  cashierName?: string;
  shiftReportId?: string;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
  isActive: boolean;
  order?: Order;
  cashier?: User;
  shiftReport?: ShiftReport;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  orderNumber?: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  cashierId: string;
  cashierName?: string;
  shiftReportId?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

// ==================== INVOICE ====================

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  storeId?: string;
  storeName?: string;
  invoiceDate: string;
  paymentDueDate?: string;
  validityDays?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string;
  pdfUrl?: string;
  printCount: number;
  lastPrintedAt?: string;
  convertedToSale: boolean;
  convertedAt?: string;
  convertedOrderId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceResponse {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  storeId?: string;
  storeName?: string;
  invoiceDate: string;
  paymentDueDate?: string;
  validityDays?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string;
  pdfUrl?: string;
  printCount: number;
  lastPrintedAt?: string;
  convertedToSale: boolean;
  convertedAt?: string;
  convertedOrderId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRequest {
  orderId: string;
  invoiceType?: InvoiceType;
  paymentDueDate?: string;
  validityDays?: number;
  notes?: string;
}

// ==================== RECEIPT ====================

// Receipts are defined above in the consolidated section

// ==================== REFUND ====================

export interface Refund {
  refundId: string;
  refundNumber: string;
  orderId: string;
  orderNumber?: string;
  refundType: RefundType;
  status: RefundStatus;
  refundMethod?: string;
  refundAmount: number;
  totalRefundAmount?: number;
  restockingFee?: number;
  reason: string;
  notes?: string;
  cashierId: string;
  cashierName?: string;
  storeId: string;
  storeName?: string;
  shiftReportId?: string;
  items: RefundItem[];
  itemCount?: number;
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  createdAt: string;
  order?: Order;
  cashier?: User;
  store?: Store;
  shiftReport?: ShiftReport;
}

export interface RefundResponse {
  refundId: string;
  refundNumber: string;
  orderId: string;
  orderNumber?: string;
  refundType: RefundType;
  status: RefundStatus;
  refundMethod?: RefundMethod;
  refundAmount: number;
  totalRefundAmount?: number;
  restockingFee?: number;
  reason: string;
  notes?: string;
  cashierId: string;
  cashierName?: string;
  storeId: string;
  storeName?: string;
  shiftReportId?: string;
  items: RefundItemResponse[];
  itemCount?: number;
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface RefundItem {
  refundItemId: string;
  refundId: string;
  originalOrderItemId?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restockingFee?: number;
  netRefundAmount?: number;
  reason?: string;
  isReturned?: boolean;
  returnedAt?: string;
  isExchange?: boolean;
  exchangeProductId?: string;
  exchangeProductName?: string;
  exchangeQuantity?: number;
  originalOrderItem?: OrderItem;
  product?: Product;
  exchangeProduct?: Product;
}

export interface RefundItemResponse {
  refundItemId: string;
  originalOrderItemId?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restockingFee?: number;
  netRefundAmount?: number;
  reason?: string;
  isReturned?: boolean;
  returnedAt?: string;
  isExchange?: boolean;
  exchangeProductId?: string;
  exchangeProductName?: string;
  exchangeQuantity?: number;
}

export interface RefundRequest {
  orderId: string;
  refundType: RefundType;
  refundMethod?: string;
  reason: string;
  notes?: string;
  items: RefundItemRequest[];
}

export interface RefundItemRequest {
  originalOrderItemId: string;
  productId?: string;
  quantity: number;
  refundAmount?: number;
  restockingFee?: number;
  reason?: string;
  isExchange?: boolean;
  exchangeProductId?: string;
  exchangeQuantity?: number;
}

// ==================== TRANSACTION ====================

export interface Transaction {
  transactionId: string;
  transactionNumber: string;
  transactionType: TransactionType;
  amount: number;
  paymentMethod?: PaymentMethod;
  orderId?: string;
  paymentId?: string;
  refundId?: string;
  cashierId: string;
  storeId: string;
  shiftReportId?: string;
  cashRegisterId?: string;
  transactionDate: string;
  description?: string;
  reference?: string;
  isReconciled: boolean;
  reconciledAt?: string;
  isVoided: boolean;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== CART ====================

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage?: number;
  notes?: string;
}

// ==================== FILE UPLOAD ====================

export interface FileUploadResponse {
  filename: string;
  originalFilename: string;
  size: number;
  contentType: string;
  fileUrl: string;
}

// ==================== SALES & REPORTS ====================

export interface SalesChartData {
  period: string;
  startDate: string;
  endDate: string;
  salesData: Record<string, number>;
  previousPeriodSalesData?: Record<string, number>;
  growthRate?: number;
  labels: string[];
}

export interface TransactionSummary {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  totalCash: number;
  totalCard: number;
  totalMobile: number;
  totalCredit: number;
}

// ==================== TAX ====================

export interface TaxBreakdown {
  orderItemId: string;
  productName: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
}

export interface TaxBreakdownResponse {
  orderItemId: string;
  productName: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
}

export interface TaxCalculationRequest {
  baseAmount: number;
  taxRate: number;
  discountAmount?: number;
  isTaxInclusive?: boolean;
}

export interface TaxCalculationResult {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
  discountAmount: number;
  finalAmount: number;
}

// ==================== EMPLOYEE REQUESTS ====================

export interface EmployeeRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role: EmployeeRole;
  storeId?: string;
}

export interface EmployeeUpdateRequest {
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: EmployeeRole;
  storeId?: string;
  active?: boolean;
}

// ==================== STORE REQUESTS ====================

export interface StoreRequest {
  name: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  storeType: StoreType;
  status?: StoreStatus;
  phone?: string;
  email?: string;
  openingHours?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

// ==================== USER REQUESTS ====================

export interface UserRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  userRole: EmployeeRole;
}