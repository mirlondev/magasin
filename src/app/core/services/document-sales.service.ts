// ============================================================
// ENHANCED: document-sales.service.ts
// Fixed to align with backend API endpoints
// ============================================================

import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";
import { 
  ApiResponse, 
  InvoiceResponse, 
  InvoiceStatus, 
  OrderRequest, 
  OrderResponse, 
  OrderStatus, 
  OrderType, 
  PaginatedResponse,
  PaymentRequest,
  PaymentResponse
} from "../models";

export interface DocumentSaleFilters {
  orderType?: OrderType | string;
  status?: OrderStatus | InvoiceStatus | string;
  customerId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface DocumentStatistics {
  totalDocuments: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  overdueCount: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class DocumentSalesService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State Signals - Orders
  orders = signal<OrderResponse[]>([]);
  selectedOrder = signal<OrderResponse | null>(null);
  
  // State Signals - Invoices
  invoices = signal<InvoiceResponse[]>([]);
  selectedInvoice = signal<InvoiceResponse | null>(null);
  
  // Common State
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  statistics = signal<DocumentStatistics | null>(null);

  // Computed signals for filtering
  creditSales = signal<OrderResponse[]>([]);
  proformas = signal<OrderResponse[]>([]);
  quotes = signal<OrderResponse[]>([]);
  overdueInvoices = signal<InvoiceResponse[]>([]);

  // =========================================================================
  // ORDER METHODS (OrderController)
  // =========================================================================

  /**
   * Load orders with pagination and filters
   * GET /orders?page={page}&size={size}&orderType={type}&status={status}...
   */
  loadOrders(
    page: number = 1,
    pageSize: number = 10,
    filters?: DocumentSaleFilters
  ): Observable<PaginatedResponse<OrderResponse>> {
    this.loading.set(true);
    this.error.set(null);

    let params: any = {
      page: page - 1, // Backend uses 0-based indexing
      size: pageSize
    };

    // Add filters if provided
    if (filters) {
      if (filters.orderType) params.orderType = filters.orderType;
      if (filters.status) params.status = filters.status;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.storeId) params.storeId = filters.storeId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    }

    // Remove undefined/null values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });

    return this.http.get<ApiResponse<PaginatedResponse<OrderResponse>>>(
      this.apiConfig.getEndpoint('/orders'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const items = data?.items || [];
        this.orders.set(items);
        this.total.set(data?.total || 0);
        this.page.set((data?.page || 0) + 1); // Convert to 1-based for UI
        this.pageSize.set(data?.size || 10);

        // Filter by document type for computed signals
        this.creditSales.set(items.filter((d: any) => d.orderType === 'CREDIT_SALE'));
        this.proformas.set(items.filter((d: any) => d.orderType === 'PROFORMA'));
        this.quotes.set(items.filter((d: any) => d.orderType === 'ONLINE'));

        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des commandes');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  /**
   * Get order by ID
   * GET /orders/{orderId}
   */
  getOrderById(orderId: string): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`)
    ).pipe(
      map(response => response.data),
      tap(order => {
        this.selectedOrder.set(order);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la commande');
        throw error;
      })
    );
  }

  /**
   * Create order without payment
   * POST /orders
   */
  createOrder(request: OrderRequest): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint('/orders'),
      request
    ).pipe(
      map(response => response.data),
      tap(newOrder => {
        this.orders.update(orders => [newOrder, ...orders]);
        this.total.update(t => t + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la commande');
        throw error;
      })
    );
  }

  /**
   * Create order with payment
   * POST /orders/with-payment
   */
  createOrderWithPayment(request: { orderRequest: OrderRequest; paymentRequest?: PaymentRequest }): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint('/orders/with-payment'),
      request
    ).pipe(
      map(response => response.data),
      tap(newOrder => {
        this.orders.update(orders => [newOrder, ...orders]);
        this.total.update(t => t + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la commande avec paiement');
        throw error;
      })
    );
  }

  /**
   * Add payment to existing order
   * POST /orders/{orderId}/payments
   */
  addPaymentToOrder(orderId: string, paymentRequest: PaymentRequest): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/payments`),
      paymentRequest
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders =>
          orders.map(o => o.orderId === orderId ? updatedOrder : o)
        );
        this.selectedOrder.set(updatedOrder);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ajout du paiement');
        throw error;
      })
    );
  }

  /**
   * Update order
   * PUT /orders/{orderId}
   */
  updateOrder(orderId: string, request: Partial<OrderRequest>): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`),
      request
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.orders.update(orders =>
          orders.map(o => o.orderId === orderId ? updated : o)
        );
        this.selectedOrder.set(updated);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de la commande');
        throw error;
      })
    );
  }

  /**
   * Mark order as completed
   * PATCH /orders/{orderId}/complete
   */
  markOrderAsCompleted(orderId: string): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.patch<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/complete`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders =>
          orders.map(o => o.orderId === orderId ? updatedOrder : o)
        );
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Marquer comme terminé');
        throw error;
      })
    );
  }

  /**
   * Cancel order (DELETE maps to cancel in backend)
   * DELETE /orders/{orderId}
   */
  cancelOrder(orderId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.orders.update(orders =>
          orders.filter(o => o.orderId !== orderId)
        );
        this.total.update(t => t - 1);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Annulation de la commande');
        throw error;
      })
    );
  }

  /**
   * Get orders by customer
   * GET /orders/customer/{customerId}
   */
  getOrdersByCustomer(customerId: string): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint(`/orders/customer/${customerId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes du client');
        return of([]);
      })
    );
  }

  /**
   * Get orders by store
   * GET /orders/store/{storeId}
   */
  getOrdersByStore(storeId: string): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint(`/orders/store/${storeId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes du magasin');
        return of([]);
      })
    );
  }

  /**
   * Get orders by status
   * GET /orders/status/{status}
   */
  getOrdersByStatus(status: OrderStatus | string): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint(`/orders/status/${status}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes par statut');
        return of([]);
      })
    );
  }

  /**
   * Get orders by date range
   * GET /orders/date-range?startDate={start}&endDate={end}
   */
  getOrdersByDateRange(startDate: string, endDate: string): Observable<OrderResponse[]> {
    const params = { startDate, endDate };
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint('/orders/date-range'),
      { params }
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes par période');
        return of([]);
      })
    );
  }

  /**
   * Get recent orders
   * GET /orders/recent/{limit}
   */
  getRecentOrders(limit: number = 10): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint(`/orders/recent/${limit}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes récentes');
        return of([]);
      })
    );
  }

  /**
   * Get total sales by store
   * GET /orders/store/{storeId}/sales-total
   */
  getTotalSalesByStore(storeId: string, startDate?: string, endDate?: string): Observable<number> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/orders/store/${storeId}/sales-total`),
      { params }
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du total des ventes');
        return of(0);
      })
    );
  }

  // =========================================================================
  // INVOICE METHODS (InvoiceController)
  // =========================================================================

  /**
   * Get invoice by ID
   * GET /invoices/{invoiceId}
   */
  getInvoiceById(invoiceId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}`)
    ).pipe(
      map(response => response.data),
      tap(invoice => {
        this.selectedInvoice.set(invoice);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la facture');
        throw error;
      })
    );
  }

  /**
   * Get invoice by number
   * GET /invoices/number/{invoiceNumber}
   */
  getInvoiceByNumber(invoiceNumber: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/number/${invoiceNumber}`)
    ).pipe(
      map(response => response.data),
      tap(invoice => {
        this.selectedInvoice.set(invoice);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Recherche par numéro de facture');
        throw error;
      })
    );
  }

  /**
   * Get invoice by order ID
   * GET /invoices/order/{orderId}
   */
  getInvoiceByOrder(orderId: string): Observable<InvoiceResponse> {
    return this.http.get<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement de la facture de la commande');
        throw error;
      })
    );
  }

  /**
   * Generate invoice for order
   * POST /invoices/order/{orderId}
   */
  generateInvoice(orderId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}`),
      {}
    ).pipe(
      map(response => response.data),
      tap(invoice => {
        this.invoices.update(inv => [invoice, ...inv]);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Génération de la facture');
        throw error;
      })
    );
  }

  /**
   * Reprint invoice
   * POST /invoices/{invoiceId}/reprint
   */
  reprintInvoice(invoiceId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/reprint`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.invoices.update(inv =>
          inv.map(i => i.invoiceId === invoiceId ? updated : i)
        );
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Réimpression de la facture');
        throw error;
      })
    );
  }

  /**
   * Update invoice status
   * PUT /invoices/{invoiceId}/status?status={status}
   */
  updateInvoiceStatus(invoiceId: string, status: InvoiceStatus | string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/status`),
      {},
      { params: { status } }
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.invoices.update(inv =>
          inv.map(i => i.invoiceId === invoiceId ? updated : i)
        );
        this.selectedInvoice.set(updated);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour du statut');
        throw error;
      })
    );
  }

  /**
   * Mark invoice as paid
   * PUT /invoices/{invoiceId}/mark-paid?paymentMethod={method}
   */
  markInvoiceAsPaid(invoiceId: string, paymentMethod: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/mark-paid`),
      {},
      { params: { paymentMethod } }
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.invoices.update(inv =>
          inv.map(i => i.invoiceId === invoiceId ? updated : i)
        );
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Marquer comme payée');
        throw error;
      })
    );
  }

  /**
   * Cancel invoice
   * PUT /invoices/{invoiceId}/cancel
   */
  cancelInvoice(invoiceId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/cancel`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.invoices.update(inv =>
          inv.map(i => i.invoiceId === invoiceId ? updated : i)
        );
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Annulation de la facture');
        throw error;
      })
    );
  }

  /**
   * Convert proforma to sale
   * POST /invoices/{proformaId}/convert-to-sale
   */
  convertProformaToSale(proformaId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<InvoiceResponse>>(
      this.apiConfig.getEndpoint(`/invoices/${proformaId}/convert-to-sale`),
      {}
    ).pipe(
      map(response => response.data),
      tap(invoice => {
        this.invoices.update(inv => [invoice, ...inv]);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Conversion proforma en vente');
        throw error;
      })
    );
  }

  /**
   * Convert quote to sale (same endpoint as proforma)
   */
  convertQuoteToSale(quoteId: string): Observable<InvoiceResponse> {
    return this.convertProformaToSale(quoteId);
  }

  /**
   * Get invoices by customer
   * GET /invoices/customer/{customerId}
   */
  getInvoicesByCustomer(customerId: string): Observable<InvoiceResponse[]> {
    return this.http.get<ApiResponse<InvoiceResponse[]>>(
      this.apiConfig.getEndpoint(`/invoices/customer/${customerId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des factures du client');
        return of([]);
      })
    );
  }

  /**
   * Get invoices by store
   * GET /invoices/store/{storeId}
   */
  getInvoicesByStore(storeId: string): Observable<InvoiceResponse[]> {
    return this.http.get<ApiResponse<InvoiceResponse[]>>(
      this.apiConfig.getEndpoint(`/invoices/store/${storeId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des factures du magasin');
        return of([]);
      })
    );
  }

  /**
   * Get invoices by status
   * GET /invoices/status/{status}
   */
  getInvoicesByStatus(status: InvoiceStatus | string): Observable<InvoiceResponse[]> {
    return this.http.get<ApiResponse<InvoiceResponse[]>>(
      this.apiConfig.getEndpoint(`/invoices/status/${status}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des factures par statut');
        return of([]);
      })
    );
  }

  /**
   * Get invoices by date range
   * GET /invoices/date-range?startDate={start}&endDate={end}
   */
  getInvoicesByDateRange(startDate: string, endDate: string): Observable<InvoiceResponse[]> {
    return this.http.get<ApiResponse<InvoiceResponse[]>>(
      this.apiConfig.getEndpoint('/invoices/date-range'),
      { params: { startDate, endDate } }
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des factures par période');
        return of([]);
      })
    );
  }

  /**
   * Get overdue invoices
   * GET /invoices/overdue
   */
  getOverdueInvoices(): Observable<InvoiceResponse[]> {
    return this.http.get<ApiResponse<InvoiceResponse[]>>(
      this.apiConfig.getEndpoint('/invoices/overdue')
    ).pipe(
      map(response => {
        this.overdueInvoices.set(response.data || []);
        return response.data || [];
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des factures en retard');
        return of([]);
      })
    );
  }

  /**
   * Get total outstanding amount
   * GET /invoices/outstanding-amount
   */
  getTotalOutstandingAmount(): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint('/invoices/outstanding-amount')
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du montant des créances');
        return of(0);
      })
    );
  }

  /**
   * Send invoice by email
   * POST /invoices/{invoiceId}/send-email?email={email}
   */
  sendInvoiceByEmail(invoiceId: string, email: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/send-email`),
      {},
      { params: { email } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Envoi de la facture par email');
        throw error;
      })
    );
  }

  // =========================================================================
  // PDF METHODS (InvoiceController)
  // =========================================================================

  /**
   * Download invoice PDF
   * GET /invoices/order/{orderId}/pdf
   */
  downloadInvoicePdf(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Téléchargement du PDF');
        throw error;
      })
    );
  }

  /**
   * Download proforma PDF
   * GET /invoices/order/{orderId}/proforma/pdf
   */
  downloadProformaPdf(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}/proforma/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Téléchargement du PDF proforma');
        throw error;
      })
    );
  }

  /**
   * Download credit note PDF
   * GET /invoices/order/{orderId}/credit-note/pdf
   */
  downloadCreditNotePdf(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}/credit-note/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Téléchargement du PDF avoir');
        throw error;
      })
    );
  }

  /**
   * Download delivery note PDF
   * GET /invoices/order/{orderId}/delivery-note/pdf
   */
  downloadDeliveryNotePdf(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}/delivery-note/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Téléchargement du bon de livraison');
        throw error;
      })
    );
  }

  /**
   * Regenerate invoice PDF
   * POST /invoices/order/{orderId}/pdf/regenerate
   */
  regenerateInvoicePdf(orderId: string): Observable<Blob> {
    return this.http.post(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf/regenerate`),
      {},
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Régénération du PDF');
        throw error;
      })
    );
  }

  // =========================================================================
  // PAYMENT METHODS (PaymentController)
  // =========================================================================

  /**
   * Process payment for order
   * POST /payments/orders/{orderId}
   */
  processPayment(orderId: string, paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<ApiResponse<PaymentResponse>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}`),
      paymentRequest
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Traitement du paiement');
        throw error;
      })
    );
  }

  /**
   * Create credit payment
   * POST /payments/orders/{orderId}/credit
   */
  createCreditPayment(orderId: string, paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<ApiResponse<PaymentResponse>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}/credit`),
      paymentRequest
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Création du paiement à crédit');
        throw error;
      })
    );
  }

  /**
   * Get order payments
   * GET /payments/orders/{orderId}
   */
  getOrderPayments(orderId: string): Observable<PaymentResponse[]> {
    return this.http.get<ApiResponse<PaymentResponse[]>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des paiements');
        return of([]);
      })
    );
  }

  /**
   * Cancel payment
   * DELETE /payments/{paymentId}
   */
  cancelPayment(paymentId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/payments/${paymentId}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Annulation du paiement');
        throw error;
      })
    );
  }

  /**
   * Get total paid for order
   * GET /payments/orders/{orderId}/total-paid
   */
  getOrderTotalPaid(orderId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}/total-paid`)
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du total payé');
        return of(0);
      })
    );
  }

  /**
   * Get credit amount for order
   * GET /payments/orders/{orderId}/credit-amount
   */
  getOrderCreditAmount(orderId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}/credit-amount`)
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du montant crédit');
        return of(0);
      })
    );
  }

  /**
   * Get remaining amount for order
   * GET /payments/orders/{orderId}/remaining-amount
   */
  getOrderRemainingAmount(orderId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/payments/orders/${orderId}/remaining-amount`)
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du montant restant');
        return of(0);
      })
    );
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get document statistics
   * Note: This endpoint may need to be implemented in backend
   * For now, calculate from loaded data
   */
  getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month'): Observable<DocumentStatistics> {
    // Calculate from current data
    const currentOrders = this.orders();
    const totalAmount = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingAmount = currentOrders
      .filter(o => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIALLY_PAID')
      .reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
    
    const stats: DocumentStatistics = {
      totalDocuments: currentOrders.length,
      totalAmount,
      pendingAmount,
      paidAmount: totalAmount - pendingAmount,
      overdueCount: this.overdueInvoices().length,
      byType: {
        'CREDIT_SALE': this.creditSales().length,
        'PROFORMA': this.proformas().length,
        'ONLINE': this.quotes().length
      },
      byStatus: currentOrders.reduce((acc, o) => {
        const status = o.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    this.statistics.set(stats);
    return of(stats);
  }

  // =========================================================================
  // PAGINATION HELPERS
  // =========================================================================

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadOrders(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadOrders(1, newPageSize);
  }

  initialize() {
    this.loadOrders();
    this.getStatistics().subscribe();
    this.getOverdueInvoices().subscribe();
  }
}