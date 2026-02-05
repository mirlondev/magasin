import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Inventory, PaginatedResponse, StockStatus } from "../../core/models";

interface InventoryFilters {
  storeId?: string;
  productId?: string;
  stockStatus?: StockStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  inventoryItems = signal<Inventory[]>([]);
  selectedItem = signal<Inventory | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  lowStockItems = signal<Inventory[]>([]);
  outOfStockItems = signal<Inventory[]>([]);
  overStockItems = signal<Inventory[]>([]);

  // Load inventory with pagination and filters
  loadInventory(page: number = 1, pageSize: number = 10, filters?: InventoryFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<Inventory>>>(
      this.apiConfig.getEndpoint('/inventory'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement de l\'inventaire');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);
      console.log(data);

      this.inventoryItems.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      // Update computed signals
      this.lowStockItems.set(items.filter(item => item.lowStock));
      this.outOfStockItems.set(items.filter(item => item.outOfStock));
      this.overStockItems.set(items.filter(item => item.overStock));
      
      this.loading.set(false);
    });
  }

  // Get inventory item by ID
  getInventoryItemById(itemId: string): Observable<Inventory> {
    this.loading.set(true);
    return this.http.get<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}`)
    ).pipe(
      map(response => response.data),
      tap(item => {
        this.selectedItem.set(item);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de l\'article');
        throw error;
      })
    );
  }

  // Update inventory quantity
  updateQuantity(itemId: string, quantity: number, notes?: string): Observable<Inventory> {
    this.loading.set(true);
    return this.http.patch<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}/quantity`),
      { quantity, notes }
    ).pipe(
      map(response => response.data),
      tap(updatedItem => {
        this.inventoryItems.update(items => 
          items.map(item => item.inventoryId === itemId ? updatedItem : item)
        );
        this.selectedItem.set(updatedItem);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de la quantité');
        throw error;
      })
    );
  }

  // Restock inventory
  restock(itemId: string, quantity: number, unitCost: number, notes?: string): Observable<Inventory> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}/restock`),
      { quantity, unitCost, notes }
    ).pipe(
      map(response => response.data),
      tap(updatedItem => {
        this.inventoryItems.update(items => 
          items.map(item => item.inventoryId === itemId ? updatedItem : item)
        );
        this.selectedItem.set(updatedItem);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Réapprovisionnement');
        throw error;
      })
    );
  }

  // Update inventory settings
  updateSettings(itemId: string, settings: {
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    unitCost?: number;
    sellingPrice?: number;
  }): Observable<Inventory> {
    this.loading.set(true);
    return this.http.patch<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}/settings`),
      settings
    ).pipe(
      map(response => response.data),
      tap(updatedItem => {
        this.inventoryItems.update(items => 
          items.map(item => item.inventoryId === itemId ? updatedItem : item)
        );
        this.selectedItem.set(updatedItem);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour des paramètres');
        throw error;
      })
    );
  }

  // Transfer inventory between stores
  transfer(itemId: string, targetStoreId: string, quantity: number, notes?: string): Observable<any> {
    this.loading.set(true);
    return this.http.post<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}/transfer`),
      { targetStoreId, quantity, notes }
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.loading.set(false);
        // Reload inventory to reflect changes
        this.loadInventory(this.page(), this.pageSize());
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Transfert d\'inventaire');
        throw error;
      })
    );
  }

  // Get inventory history
  getHistory(itemId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}/history`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement de l\'historique');
        return of([]);
      })
    );
  }

  // Get inventory alerts
  getAlerts(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      this.apiConfig.getEndpoint('/inventory/alerts')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des alertes');
        return of([]);
      })
    );
  }

  // Generate inventory report
  generateReport(storeId?: string, format: 'pdf' | 'csv' | 'excel' = 'pdf'): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (storeId) {
      params = params.set('storeId', storeId);
    }

    return this.http.get(
      this.apiConfig.getEndpoint('/inventory/report'),
      { params, responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération du rapport');
        throw error;
      })
    );
  }

  // Get inventory statistics
  getStatistics(storeId?: string): Observable<any> {
    let params = new HttpParams();
    if (storeId) {
      params = params.set('storeId', storeId);
    }
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/inventory/statistics'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  // Search inventory
  searchInventory(query: string): Observable<Inventory[]> {
    return this.http.get<ApiResponse<Inventory[]>>(
      this.apiConfig.getEndpoint('/inventory/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche d\'inventaire');
        return of([]);
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadInventory(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadInventory(1, newPageSize);
  }
}