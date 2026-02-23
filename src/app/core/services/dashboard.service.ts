// dashboard.service.ts
import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Order, Product, EmployeeRole } from "../../core/models";
import { AuthService } from "./auth.service";

// Backend DTO Interfaces
interface DashboardOverviewResponse {
  userRole: EmployeeRole;
  storeName: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  activeEmployees: number;
  salesGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  dailySales: Record<string, number>;
  weeklySales: Record<string, number>;
  monthlySales: Record<string, number>;
  lowStockItems: InventoryAlertResponse[];
  pendingOrders: OrderAlertResponse[];
  recentActivities: ActivityLogResponse[];
  roleSpecificData: any;
}

interface InventoryAlertResponse {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  minQuantity: number;
  alertLevel: 'LOW' | 'OUT_OF_STOCK' | 'OVER_STOCK';
  storeName: string;
  quantity: number;
  minStock: number;
  maxStock: number

}

interface OrderAlertResponse {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  
}

interface ActivityLogResponse {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  userName: string;
}

interface SalesChartResponse {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    fill?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    tension?: number;
  }[];
}

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  lowStockCount: number;
  openShifts: number;
  salesGrowth: number;
  orderGrowth: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private authService = inject(AuthService);

  // State signals
  stats = signal<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    lowStockCount: 0,
    openShifts: 0,
    salesGrowth: 0,
    orderGrowth: 0
  });

  recentOrders = signal<Order[]>([]);
  lowStockProducts = signal<Product[] | undefined >([]);
  salesChartData = signal<any>(null);
  loading = signal<boolean>(false);
  currentStoreId = signal<string | null>(null);

  loadDashboardData() {
    this.loading.set(true);
    
    const user = this.authService.currentUser();
    const storeId = user?.storeId || null;
    this.currentStoreId.set(storeId);

    // Build date range params
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    // Call the ONLY endpoint that exists: /dashboard/overview
    this.http.get<ApiResponse<DashboardOverviewResponse>>(
      this.apiConfig.getEndpoint('/dashboard/overview'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du tableau de bord');
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        // Map to frontend stats
        this.stats.set({
          totalSales: data.totalSales || 0,
          totalOrders: data.totalOrders || 0,
          lowStockCount: data.lowStockItems?.length || 0,
          openShifts: 0, // Not in overview, calculate from role data or separate call
          salesGrowth: data.salesGrowth || 0,
          orderGrowth: data.orderGrowth || 0
        });

        // Map low stock items to Product model
        this.lowStockProducts.set(this.mapInventoryAlertsToProducts(data.lowStockItems));

        // Transform daily sales for chart
        this.salesChartData.set(this.transformSalesData(data.dailySales));

        // Use pendingOrders from overview as recent orders (convert format)
        this.recentOrders.set(this.mapOrderAlertsToOrders(data.pendingOrders));
      }
      this.loading.set(false);
    });
  }

  private mapInventoryAlertsToProducts(alerts: InventoryAlertResponse[] | undefined): Product[] {
    if (!alerts) return [];
    
    return alerts.map(alert => ({
      productId: alert.productId,
      name: alert.productName,
      sku: alert.sku,
      quantity: alert.currentQuantity,
      minStock: alert.minQuantity,
      price: 0,
      categoryId: '',
      categoryName: '',
      barcode: '',
      description: '',
      imageUrl: '',
      inStock: alert.currentQuantity > 0,
      isActive: true,
      totalStock: alert.currentQuantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  private mapOrderAlertsToOrders(alerts: OrderAlertResponse[] | undefined): Order[] {
    if (!alerts) return [];
    
    return alerts.map(alert => ({
      orderId: alert.orderId,
      orderNumber: alert.orderNumber,
      customerName: alert.customerName,
      totalAmount: alert.totalAmount,
      status: alert.status as any,
      createdAt: alert.createdAt,
      // Required fields with defaults
      cashierId: '',
      storeId: '',
      items: [],
      payments: [],
      subtotal: alert.totalAmount,
      taxAmount: 0,
      discountAmount: 0,
      amountPaid: 0,
      changeAmount: 0,
      paymentMethod: 'CASH' as any,
      paymentStatus: 'UNPAID' as any,
      isTaxable: false,
      taxRate: 0
    }));
  }

  private transformSalesData(dailySales: Record<string, number> | undefined): any {
    if (!dailySales || Object.keys(dailySales).length === 0) {
      return this.getEmptyChartData();
    }

    const entries = Object.entries(dailySales).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    const labels = entries.map(([date]) => {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    });
    
    const data = entries.map(([, value]) => value);

    return {
      labels,
      datasets: [{
        label: 'Ventes (€)',
        data,
        fill: true,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.2)',
        tension: 0.4
      }]
    };
  }

  private getEmptyChartData() {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return {
      labels: days,
      datasets: [{
        label: 'Ventes (€)',
        data: [0, 0, 0, 0, 0, 0, 0],
        fill: true,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.2)',
        tension: 0.4
      }]
    };
  }

  // Load sales chart with storeId (required by backend)
  loadSalesChartData(storeId: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY') {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('period', period);

    return this.http.get<ApiResponse<SalesChartResponse>>(
      this.apiConfig.getEndpoint(`/dashboard/sales-chart/${storeId}`),
      { params }
    ).pipe(
      map(response => {
        if (response.data) {
          this.salesChartData.set(response.data);
        }
        return response.data;
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du graphique');
        return of(null);
      })
    );
  }

  // Load recent orders from dedicated endpoint with proper URL to avoid conflict with /orders/{id}
  // IMPORTANT: Your backend needs to ensure /orders/recent is mapped BEFORE /orders/{orderId}
  loadRecentOrders(storeId?: string, limit: number = 5) {
    let params = new HttpParams().set('limit', limit.toString());
    if (storeId) {
      params = params.set('storeId', storeId);
    }

    // If your backend has route ordering issues, use a different endpoint like /orders/recent-orders
    // or query param approach: /orders?recent=true&limit=5
    return this.http.get<ApiResponse<Order[]>>(
      this.apiConfig.getEndpoint('/orders/recent'),
      { params }
    ).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    ).subscribe(orders => {
      this.recentOrders.set(orders);
    });
  }

  // Alternative: Load orders with status filter as "recent"
  loadRecentOrdersAlternative(storeId?: string) {
    let params = new HttpParams()
      .set('page', '0')
      .set('size', '5')
      .set('sort', 'createdAt,desc');
    
    if (storeId) {
      params = params.set('storeId', storeId);
    }

    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/orders'),
      { params }
    ).pipe(
      map(response => response.data?.items || response.data || []),
      catchError(() => of([]))
    ).subscribe(orders => {
      this.recentOrders.set(orders);
    });
  }

  refresh() {
    this.loadDashboardData();
  }
}