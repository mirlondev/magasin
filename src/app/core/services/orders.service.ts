import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Order, OrderRequest, PaymentRequest, Payment, ApiResponse, PaymentMethod, PaginatedResponse, OrderStatus, PaymentStatus, OrderResponse, OrderItemRequest } from '../models';
import { ApiConfig } from '../api/api.config';
import { HttpErrorHandler } from '../api/http-error.handler';
import { AuthService } from './auth.service';

interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  storeId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface CreateOrderWithPaymentRequest {
  orderRequest: OrderRequest;
  paymentRequest?: PaymentRequest;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private authService = inject(AuthService);

  orders = signal<OrderResponse[]>([]);
  selectedOrder = signal<OrderResponse | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  pendingOrders = signal<OrderResponse[]>([]);
  processingOrders = signal<OrderResponse[]>([]);
  completedOrders = signal<OrderResponse[]>([]);

  loadOrders(page: number = 1, pageSize: number = 10, filters?: OrderFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { 
      page: page - 1, 
      size: pageSize, 
      ...filters 
    };

    this.http.get<ApiResponse<PaginatedResponse<OrderResponse>>>(
      this.apiConfig.getEndpoint('/orders'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des commandes');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = data.items || [];
      this.orders.set(items);
      this.total.set(data.total || 0);
      this.page.set((data.page || 0) + 1);
      this.pageSize.set(data.size || 10);
      
      this.updateComputedSignals(items);
      this.loading.set(false);
    });
  }

  private updateComputedSignals(items: OrderResponse[] = this.orders()) {
    this.pendingOrders.set(items.filter(o => o.status === OrderStatus.PENDING));
    this.processingOrders.set(items.filter(o => o.status === OrderStatus.PROCESSING));
    this.completedOrders.set(items.filter(o => o.status === OrderStatus.COMPLETED));
  }

  processPayment(orderId: string, paymentData: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount?: number;
  }): Observable<OrderResponse> {
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/process-payment`),
      paymentData
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => this.updateLocalOrder(updatedOrder)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Traitement du paiement');
        throw error;
      })
    );
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<OrderResponse> {
    return this.http.patch<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/status`),
      { status }
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => this.updateLocalOrder(updatedOrder)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour du statut');
        throw error;
      })
    );
  }

  markAsCompleted(orderId: string): Observable<OrderResponse> {
    return this.completeOrder(orderId);
  }

  generateReceipt(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération du ticket');
        throw error;
      })
    );
  }

  generateThermalReceipt(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/thermal`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération du ticket thermique');
        throw error;
      })
    );
  }

  getReceiptText(orderId: string): Observable<string> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/text`),
      { responseType: 'text' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Récupération du ticket');
        throw error;
      })
    );
  }

  generateInvoice(orderId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}`),
      {}
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération de la facture');
        throw error;
      })
    );
  }

  downloadInvoicePdf(invoiceId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/invoices/${invoiceId}/pdf`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Téléchargement de la facture');
        throw error;
      })
    );
  }

  getInvoiceByOrder(orderId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/invoices/order/${orderId}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Récupération de la facture');
        throw error;
      })
    );
  }

  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.orders.update(orders => orders.filter(o => o.orderId !== orderId));
        this.total.update(t => t - 1);
        if (this.selectedOrder()?.orderId === orderId) {
          this.selectedOrder.set(null);
        }
        this.updateComputedSignals();
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de la commande');
        throw error;
      })
    );
  }

  getOrderStatistics(period: 'today' | 'week' | 'month' | 'year'): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/orders/statistics/${period}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Statistiques');
        throw error;
      })
    );
  }

  searchOrders(query: string): Observable<OrderResponse[]> {
    return this.http.get<ApiResponse<OrderResponse[]>>(
      this.apiConfig.getEndpoint('/orders/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche');
        return of([]);
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadOrders(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadOrders(1, newPageSize);
  }

  createOrder(request: OrderRequest): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint('/orders'),
      request
    ).pipe(
      map(response => response.data),
      tap(order => {
        this.orders.update(orders => [order, ...orders]);
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

  createOrderWithPayment(
    orderRequest: OrderRequest, 
    paymentRequest?: PaymentRequest
  ): Observable<OrderResponse> {
    this.loading.set(true);
    
    const request: CreateOrderWithPaymentRequest = {
      orderRequest,
      paymentRequest
    };

    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint('/orders/with-payment'),
      request
    ).pipe(
      map(response => response.data),
      tap(order => {
        this.orders.update(orders => [order, ...orders]);
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

  addPayment(orderId: string, payment: PaymentRequest): Observable<OrderResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/payments`),
      payment
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.updateLocalOrder(updatedOrder);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ajout du paiement');
        throw error;
      })
    );
  }

  completeOrder(orderId: string): Observable<OrderResponse> {
    return this.http.patch<ApiResponse<OrderResponse>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/complete`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => this.updateLocalOrder(updatedOrder)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Finalisation de la commande');
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
        this.orders.update(orders => orders.filter(o => o.orderId !== orderId));
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Annulation de la commande');
        throw error;
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

  private updateLocalOrder(updatedOrder: OrderResponse) {
    this.orders.update(orders => 
      orders.map(order => order.orderId === updatedOrder.orderId ? updatedOrder : order)
    );
    if (this.selectedOrder()?.orderId === updatedOrder.orderId) {
      this.selectedOrder.set(updatedOrder);
    }
  }
}