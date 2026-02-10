// inventory.service.ts - Enhanced with missing CRUD methods
import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal, computed } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Inventory, PaginatedResponse, StockStatus, BulkOperationResponse } from "../../core/models";

interface InventoryFilters {
  storeId?: string;
  productId?: string;
  stockStatus?: StockStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  overStock?: boolean;
  search?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minValue?: number;
  maxValue?: number;
}

interface BulkOperation {
  inventoryIds: string[];
  operation: 'restock' | 'update-settings' | 'delete' | 'transfer' | 'update-status';
  data?: any;
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
  bulkLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(0);
  currentFilters = signal<InventoryFilters>({});

  // Computed values
  lowStockItems = computed(() => this.inventoryItems().filter(item => item.lowStock));
  outOfStockItems = computed(() => this.inventoryItems().filter(item => item.outOfStock));
  overStockItems = computed(() => this.inventoryItems().filter(item => item.overStock));
  selectedItems = signal<Inventory[]>([]);
  totalValue = computed(() => 
    this.inventoryItems().reduce((sum, item) => sum + (item.totalValue || 0), 0)
  );

  // Load inventory with pagination and filters
  loadInventory(page: number = 1, pageSize: number = 10, filters?: InventoryFilters) {
    this.loading.set(true);
    this.error.set(null);

    if (filters) {
      this.currentFilters.set(filters);
    }

    const params: any = { 
      page: page - 1, 
      size: pageSize, 
      ...this.currentFilters() 
    };

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
      const items = data?.items || [];
      const total = data?.total || 0;
      const pageNum = (data?.page || 0) + 1;
      const size = data?.size || 10;
      const totalPages = data?.totalPages || Math.ceil(total / size);

      this.inventoryItems.set(items);
      this.total.set(total);
      this.page.set(pageNum);
      this.pageSize.set(size);
      this.totalPages.set(totalPages);
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

  // Create new inventory item
  createInventoryItem(inventoryData: Partial<Inventory>): Observable<Inventory> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint('/inventory'),
      inventoryData
    ).pipe(
      map(response => response.data),
      tap(newItem => {
        this.inventoryItems.update(items => [newItem, ...items.slice(0, this.pageSize() - 1)]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de l\'article d\'inventaire');
        throw error;
      })
    );
  }

  // Update inventory item
  updateInventoryItem(itemId: string, inventoryData: Partial<Inventory>): Observable<Inventory> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Inventory>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}`),
      inventoryData
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
        this.errorHandler.handleError(error, 'Mise à jour de l\'article');
        throw error;
      })
    );
  }

  // Delete inventory item
  deleteInventoryItem(itemId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/inventory/${itemId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.inventoryItems.update(items => 
          items.filter(item => item.inventoryId !== itemId)
        );
        this.total.update(total => total - 1);
        if (this.selectedItem()?.inventoryId === itemId) {
          this.selectedItem.set(null);
        }
        this.selectedItems.update(selected => 
          selected.filter(item => item.inventoryId !== itemId)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de l\'article');
        throw error;
      })
    );
  }

  // Bulk operations
  bulkOperation(operation: BulkOperation): Observable<BulkOperationResponse> {
    this.bulkLoading.set(true);
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/inventory/bulk'),
      operation
    ).pipe(
      map(response => response.data),
      tap(response => {
        if (response.success) {
          switch (operation.operation) {
            case 'delete':
              this.inventoryItems.update(items => 
                items.filter(item => !operation.inventoryIds.includes(item.inventoryId))
              );
              this.total.update(total => total - operation.inventoryIds.length);
              break;
            case 'restock':
              // Reload inventory to reflect changes
              this.loadInventory(this.page(), this.pageSize());
              break;
          }
          this.selectedItems.set([]);
        }
        this.bulkLoading.set(false);
      }),
      catchError(error => {
        this.bulkLoading.set(false);
        this.errorHandler.handleError(error, 'Opération en masse');
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

  // Bulk restock
  bulkRestock(inventoryIds: string[], quantity: number, unitCost: number, notes?: string): Observable<BulkOperationResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/inventory/bulk/restock'),
      { inventoryIds, quantity, unitCost, notes }
    ).pipe(
      map(response => response.data),
      tap(response => {
        if (response.success) {
          this.loadInventory(this.page(), this.pageSize());
        }
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Réapprovisionnement en masse');
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
        this.loadInventory(this.page(), this.pageSize());
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Transfert d\'inventaire');
        throw error;
      })
    );
  }

  // Bulk transfer
  bulkTransfer(inventoryIds: string[], targetStoreId: string, notes?: string): Observable<BulkOperationResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/inventory/bulk/transfer'),
      { inventoryIds, targetStoreId, notes }
    ).pipe(
      map(response => response.data),
      tap(response => {
        if (response.success) {
          this.loadInventory(this.page(), this.pageSize());
        }
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Transfert en masse');
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
  generateReport(storeId?: string, format: 'pdf' | 'csv' | 'excel' = 'pdf', filters?: InventoryFilters): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (storeId) {
      params = params.set('storeId', storeId);
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof InventoryFilters] !== undefined) {
          params = params.set(key, filters[key as keyof InventoryFilters] as string);
        }
      });
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

  // Import inventory from file
  importInventory(file: File, options?: any): Observable<BulkOperationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/inventory/import'),
      formData
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Import de l\'inventaire');
        throw error;
      })
    );
  }

  // Export inventory to file
  exportInventory(format: 'csv' | 'excel' = 'csv', filters?: InventoryFilters): Observable<Blob> {
    const params: any = { format, ...filters };
    
    return this.http.get(
      this.apiConfig.getEndpoint('/inventory/export'),
      { params, responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Export de l\'inventaire');
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

  // Get low stock predictions
  getLowStockPredictions(days: number = 30): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      this.apiConfig.getEndpoint('/inventory/predictions'),
      { params: { days } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Prédictions de stock faible');
        return of([]);
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    if (this.page() === newPage) return;
    this.page.set(newPage);
    this.loadInventory(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    if (this.pageSize() === newPageSize) return;
    this.pageSize.set(newPageSize);
    this.page.set(1);
    this.loadInventory(1, newPageSize);
  }

  setFilters(filters: InventoryFilters) {
    this.currentFilters.set(filters);
    this.page.set(1);
    this.loadInventory(1, this.pageSize());
  }

  // Selection management
  toggleItemSelection(item: Inventory) {
    this.selectedItems.update(selected => {
      const index = selected.findIndex(i => i.inventoryId === item.inventoryId);
      if (index > -1) {
        return selected.filter(i => i.inventoryId !== item.inventoryId);
      } else {
        return [...selected, item];
      }
    });
  }

  selectAllItems() {
    this.selectedItems.set([...this.inventoryItems()]);
  }

  clearSelection() {
    this.selectedItems.set([]);
  }

  getInventoryByProductAndStore(productId: string, storeId: string): Observable<Inventory> {
  return this.http.get<ApiResponse<Inventory>>(
    this.apiConfig.getEndpoint(`/inventory/product/${productId}/store/${storeId}`)
  ).pipe(
    map(response => response.data),
    catchError(error => {
      this.errorHandler.handleError(error, 'Chargement de l\'inventaire');
      throw error;
    })
  );
}

// Get low stock inventory
getLowStockInventory(threshold: number = 10, page: number = 1, pageSize: number = 25): Observable<PaginatedResponse<Inventory>> {
  const params = new HttpParams()
    .set('threshold', threshold.toString())
    .set('page', (page - 1).toString())
    .set('size', pageSize.toString());

  return this.http.get<ApiResponse<PaginatedResponse<Inventory>>>(
    this.apiConfig.getEndpoint('/inventory/low-stock'),
    { params }
  ).pipe(
    map(response => response.data),
    catchError(error => {
      this.errorHandler.handleError(error, 'Chargement des stocks faibles');
      return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
    })
  );
}

// Get inventory by status
getInventoryByStatus(status: string, page: number = 1, pageSize: number = 25): Observable<PaginatedResponse<Inventory>> {
  const params = new HttpParams()
    .set('page', (page - 1).toString())
    .set('size', pageSize.toString());

  return this.http.get<ApiResponse<PaginatedResponse<Inventory>>>(
    this.apiConfig.getEndpoint(`/inventory/status/${status}`),
    { params }
  ).pipe(
    map(response => response.data),
    catchError(error => {
      this.errorHandler.handleError(error, 'Chargement de l\'inventaire');
      return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
    })
  );
}

// Update stock with operation type (set, add, subtract)
updateStock(inventoryId: string, quantity: number, operation: 'set' | 'add' | 'subtract' = 'set', notes?: string): Observable<Inventory> {
  let params = new HttpParams()
    .set('quantity', quantity.toString())
    .set('operation', operation);
  
  if (notes) {
    params = params.set('notes', notes);
  }

  return this.http.patch<ApiResponse<Inventory>>(
    this.apiConfig.getEndpoint(`/inventory/${inventoryId}/stock`),
    {},
    { params }
  ).pipe(
    map(response => response.data),
    tap(updatedItem => {
      this.inventoryItems.update(items => 
        items.map(item => item.inventoryId === inventoryId ? updatedItem : item)
      );
    }),
    catchError(error => {
      this.errorHandler.handleError(error, 'Mise à jour du stock');
      throw error;
    })
  );
}

// Get inventory summary for a store
getInventorySummary(storeId: string): Observable<any> {
  return this.http.get<ApiResponse<any>>(
    this.apiConfig.getEndpoint(`/inventory/store/${storeId}/summary`)
  ).pipe(
    map(response => response.data),
    catchError(error => {
      this.errorHandler.handleError(error, 'Chargement du résumé');
      throw error;
    })
  );
}

// Get total stock value for a store
getTotalStockValue(storeId: string): Observable<number> {
  return this.http.get<ApiResponse<number>>(
    this.apiConfig.getEndpoint(`/inventory/store/${storeId}/value`)
  ).pipe(
    map(response => response.data),
    catchError(error => {
      this.errorHandler.handleError(error, 'Chargement de la valeur');
      return of(0);
    })
  );
}

  // Initialize
  initialize() {
    this.loadInventory();
  }
}