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
  PaymentRequest
} from "../models";

export interface DocumentSaleFilters {
  documentType?: 'ORDER' | 'INVOICE' | 'PROFORMA';
  status?: OrderStatus | InvoiceStatus;
  customerId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  orderType?: OrderType | string;
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
  overdueInvoices = signal<InvoiceResponse[]>([]);

  // =========================================================================
  // ORDER METHODS (Based on OrderController)
  // =========================================================================

  loadOrders(
    page: number = 1,
    pageSize: number = 10,
    filters?: DocumentSaleFilters
  ): Observable<PaginatedResponse<OrderResponse>> {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      page: page - 1,
      size: pageSize,
      ...filters
    };

    // Remove undefined params
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
        this.page.set((data?.page || 0) + 1);
        this.pageSize.set(data?.size || 10);

        // Filter by document type
        this.creditSales.set(items.filter(d => d.orderType === 'CREDIT_SALE'));
        this.proformas.set(items.filter(d => d.orderType === 'PROFORMA'));

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

  createOrderWithPayment(request: any): Observable<OrderResponse> {
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

  getOrdersByStatus(status: OrderStatus): Observable<OrderResponse[]> {
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

  getOrdersByDateRange(startDate: string, endDate: string): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint('/orders/date-range'),
      { params: { startDate, endDate } }
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes par période');
        return of([]);
      })
    );
  }

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
  // INVOICE METHODS (Based on InvoiceController)
  // =========================================================================

  loadInvoices(
    page: number = 1,
    pageSize: number = 10,
    filters?: { 
      status?: InvoiceStatus; 
      customerId?: string; 
      storeId?: string;
      startDate?: string; 
      endDate?: string;
      search?: string;
    }
  ): Observable<PaginatedResponse<InvoiceResponse>> {
    this.loading.set(true);
    const params: any = { 
      page: page - 1, 
      size: pageSize, 
      ...filters 
    };

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });

    return this.http.get<ApiResponse<PaginatedResponse<InvoiceResponse>>>(
      this.apiConfig.getEndpoint('/invoices'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        this.invoices.set(data?.items || []);
        this.total.set(data?.total || 0);
        this.page.set((data?.page || 0) + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.error.set(this.errorHandler.handleError(error, 'Chargement des factures'));
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

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

  updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Observable<InvoiceResponse> {
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
   convertQuoteToSale(proformaId: string): Observable<InvoiceResponse> {
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

  getInvoicesByStatus(status: InvoiceStatus): Observable<InvoiceResponse[]> {
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
  // PDF METHODS
  // =========================================================================

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
  // STATISTICS
  // =========================================================================

  getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month'): Observable<DocumentStatistics> {
    return this.http.get<ApiResponse<DocumentStatistics>>(
      this.apiConfig.getEndpoint('/documents/statistics'),
      { params: { period } }
    ).pipe(
      map(response => response.data),
      tap(stats => this.statistics.set(stats)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        return of({
          totalDocuments: 0,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          overdueCount: 0,
          byType: {},
          byStatus: {}
        });
      })
    );
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