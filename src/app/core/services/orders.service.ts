import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Order, OrderRequest, OrderStatus, PaginatedResponse, PaymentMethod, PaymentStatus } from "../../core/models";
import { AuthService } from "./auth.service";

interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  storeId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser();

  // State signals
  orders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  pendingOrders = signal<Order[]>([]);
  processingOrders = signal<Order[]>([]);
  completedOrders = signal<Order[]>([]);
  cancelledOrders = signal<Order[]>([]);

  // Load orders with pagination and filters
  loadOrders(page: number = 1, pageSize: number = 10, filters?: OrderFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<Order>>>(
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
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);

      this.orders.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      // Update computed signals
      this.pendingOrders.set(items.filter(o => o.status === OrderStatus.PENDING));
      this.processingOrders.set(items.filter(o => o.status === OrderStatus.PROCESSING));
      this.completedOrders.set(items.filter(o => o.status === OrderStatus.COMPLETED));
      this.cancelledOrders.set(items.filter(o => o.status === OrderStatus.CANCELLED));
      
      this.loading.set(false);
    });
  }

  // Get order by ID
  getOrderById(orderId: string): Observable<Order> {
    this.loading.set(true);
    return this.http.get<ApiResponse<Order>>(
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

  // Create new order
  createOrder(orderData: OrderRequest): Observable<Order> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Order>>(
      this.apiConfig.getEndpoint('/orders'),
      orderData
    ).pipe(
      map(response => response.data),
      tap(newOrder => {
        this.orders.update(orders => [newOrder, ...orders]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la commande');
        throw error;
      })
    );
  }

  // Update order
  updateOrder(orderId: string, orderData: Partial<Order>): Observable<Order> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`),
      orderData
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de la commande');
        throw error;
      })
    );
  }

  // Delete order
  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.orders.update(orders => 
          orders.filter(order => order.orderId !== orderId)
        );
        this.total.update(total => total - 1);
        if (this.selectedOrder()?.orderId === orderId) {
          this.selectedOrder.set(null);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de la commande');
        throw error;
      })
    );
  }

  // Update order status
  updateOrderStatus(orderId: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/status`),
      { status }
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  // Update payment status
  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/payment`),
      { paymentStatus }
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour du paiement');
        throw error;
      })
    );
  }

  // Process payment
  processPayment(orderId: string, paymentData: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount?: number;
  }): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/process-payment`),
      paymentData
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Traitement du paiement');
        throw error;
      })
    );
  }

  // Complete order
  completeOrder(orderId: string): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/complete`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Finalisation de la commande');
        throw error;
      })
    );
  }

  // Cancel order
  cancelOrder(orderId: string, reason?: string): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/cancel`),
      { reason }
    ).pipe(
      map(response => response.data),
      tap(updatedOrder => {
        this.orders.update(orders => 
          orders.map(order => order.orderId === orderId ? updatedOrder : order)
        );
        this.selectedOrder.set(updatedOrder);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Annulation de la commande');
        throw error;
      })
    );
  }

  // Generate invoice
  generateInvoice(orderId: string): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/orders/${orderId}/invoice`),
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération de la facture');
        throw error;
      })
    );
  }

  // Get order statistics
  getOrderStatistics(period: 'today' | 'week' | 'month' | 'year') {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/orders/statistics/${period}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  // Search orders
  searchOrders(query: string): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(
      this.apiConfig.getEndpoint('/orders/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche de commandes');
        return of([]);
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadOrders(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadOrders(1, newPageSize);
  }
}