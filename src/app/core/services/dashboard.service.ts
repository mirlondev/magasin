import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Order, Product } from "../../core/models";

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
  lowStockProducts = signal<Product[]>([]);
  salesChartData = signal<any>(null);
  loading = signal<boolean>(false);

  loadDashboardData() {
    this.loading.set(true);

    // Charger les statistiques
    this.http.get<ApiResponse<DashboardStats>>(
      this.apiConfig.getEndpoint('/dashboard/stats')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        return of(this.stats());
      })
    ).subscribe(stats => {
      this.stats.set(stats);
    });

    // Charger les commandes récentes
    this.http.get<ApiResponse<Order[]>>(
      this.apiConfig.getEndpoint('/orders/recent')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des commandes');
        return of([]);
      })
    ).subscribe(orders => {
      this.recentOrders.set(orders);
    });

    // Charger les produits en rupture
    this.http.get<ApiResponse<Product[]>>(
      this.apiConfig.getEndpoint('/products/low-stock')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des produits');
        return of([]);
      })
    ).subscribe(products => {
      this.lowStockProducts.set(products);
    });

    // Charger les données du graphique
    this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/dashboard/sales-chart')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du graphique');
        return of(this.getEmptyChartData());
      }),
      tap(() => this.loading.set(false))
    ).subscribe(chartData => {
      this.salesChartData.set(chartData);
    });
  }

  private getEmptyChartData() {
    return {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [
        {
          label: 'Ventes',
          data: [0, 0, 0, 0, 0, 0, 0],
          fill: false,
          borderColor: '#42A5F5',
          tension: 0.4
        }
      ]
    };
  }

  // Méthode pour actualiser les données
  refresh() {
    this.loadDashboardData();
  }
}