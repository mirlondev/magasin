import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { computed, effect, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { Observable, catchError, map, of, switchMap, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, PaginatedResponse, Store, StoreStatus, StoreType } from "../../core/models";

interface StoreState {
  items: Store[];
  selected: Store | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class StoresService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  private state = signal<StoreState>({
    items: [],
    selected: null,
    loading: false,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10
  });

  // Public signals
  items = computed(() => this.state().items);
  selected = computed(() => this.state().selected);
  loading = computed(() => this.state().loading);
  error = computed(() => this.state().error);
  total = computed(() => this.state().total);
  page = computed(() => this.state().page);
  pageSize = computed(() => this.state().pageSize);

  // Computed values
  activeStores = computed(() => 
    this.items().filter(store => store.status === StoreStatus.ACTIVE)
  );

  shops = computed(() => 
    this.items().filter(store => store.storeType === StoreType.SHOP)
  );

  warehouses = computed(() => 
    this.items().filter(store => store.storeType === StoreType.WAREHOUSE)
  );

  // Private methods
  private setLoading(loading: boolean) {
    this.state.update(s => ({ ...s, loading, error: loading ? null : s.error }));
  }

  private setError(error: string | null) {
    this.state.update(s => ({ ...s, error }));
  }

  private setSelected(store: Store | null) {
    this.state.update(s => ({ ...s, selected: store }));
  }

  // API Methods
  loadStores(page: number = 1, pageSize: number = 10, filters?: any): Observable<PaginatedResponse<Store>> {
    this.setLoading(true);
    
    const params: any = { page: page - 1, size: pageSize, ...filters };
    
    return this.http.get<ApiResponse<PaginatedResponse<Store>>>(
      this.apiConfig.getEndpoint('/stores'),
      { params }
    ).pipe(
      map(response => response.data

      ),
      tap(data => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        const total = Array.isArray(data) ? data.length : (data?.total || 0);
        const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
        const size = Array.isArray(data) ? items.length : (data?.size || 10);
        this.state.update(s => ({
          ...s,
          items,
          total,
          page,
          pageSize: size,
          loading: false
        }));
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des magasins');
        this.setError(errorMsg);
        this.setLoading(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  getStoreById(storeId: string): Observable<Store> {
    return this.http.get<ApiResponse<Store>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du magasin');
        throw error;
      })
    );
  }

  loadStoreById(storeId: string) {
    this.setLoading(true);
    this.getStoreById(storeId).subscribe({
      next: (store) => {
        this.setSelected(store);
        this.setLoading(false);
      },
      error: () => this.setLoading(false)
    });
  }

  createStore(storeData: Partial<Store>): Observable<Store> {
    return this.http.post<ApiResponse<Store>>(
      this.apiConfig.getEndpoint('/stores'),
      storeData
    ).pipe(
      map(response => response.data),
      tap(newStore => {
        this.state.update(s => ({
          ...s,
          items: [...s.items, newStore],
          total: s.total + 1
        }));
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Création du magasin');
        throw error;
      })
    );
  }

  updateStore(storeId: string, storeData: Partial<Store>): Observable<Store> {
    return this.http.put<ApiResponse<Store>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}`),
      storeData
    ).pipe(
      map(response => response.data),
      tap(updatedStore => {
        this.state.update(s => ({
          ...s,
          items: s.items.map(store => 
            store.storeId === storeId ? updatedStore : store
          ),
          selected: s.selected?.storeId === storeId ? updatedStore : s.selected
        }));
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour du magasin');
        throw error;
      })
    );
  }

  deleteStore(storeId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.state.update(s => ({
          ...s,
          items: s.items.filter(store => store.storeId !== storeId),
          total: s.total - 1,
          selected: s.selected?.storeId === storeId ? null : s.selected
        }));
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression du magasin');
        throw error;
      })
    );
  }

  updateStoreStatus(storeId: string, status: StoreStatus): Observable<Store> {
    return this.http.patch<ApiResponse<Store>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/status`),
      { status }
    ).pipe(
      map(response => response.data),
      tap(updatedStore => {
        this.state.update(s => ({
          ...s,
          items: s.items.map(store => 
            store.storeId === storeId ? updatedStore : store
          ),
          selected: s.selected?.storeId === storeId ? updatedStore : s.selected
        }));
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  // Business methods
  activateStore(storeId: string) {
    return this.updateStoreStatus(storeId, StoreStatus.ACTIVE);
  }

  closeStore(storeId: string) {
    return this.updateStoreStatus(storeId, StoreStatus.CLOSED);
  }

  // Pagination
  setPage(page: number) {
    this.state.update(s => ({ ...s, page }));
    //this.loadStores(page, this.pageSize);
  }

  setPageSize(pageSize: number) {
    this.state.update(s => ({ ...s, pageSize, page: 1 }));
    this.loadStores(1, pageSize).subscribe();
  }

  // Initialize
  initialize() {
    this.loadStores().subscribe();
  }
}