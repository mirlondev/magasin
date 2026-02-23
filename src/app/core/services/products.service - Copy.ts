import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, PaginatedResponse, Product, ProductResponse, BulkOperationResponse, ProductRequest } from "../../core/models";

interface ProductFilters {
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sku?: string;
  barcode?: string;
  isActive?: boolean;
}

interface BulkOperation {
  productIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'update-category';
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  products = signal<ProductResponse[]>([]);
  selectedProduct = signal<ProductResponse | null>(null);
  loading = signal<boolean>(false);
  bulkLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(0);

  inStockProducts = computed(() => this.products().filter(p => p.inStock));
  outOfStockProducts = computed(() => this.products().filter(p => !p.inStock));
  selectedProducts = signal<ProductResponse[]>([]);

  loadProducts(page: number = 1, pageSize: number = 10, filters?: ProductFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<ProductResponse>>>(
      this.apiConfig.getEndpoint('/products'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des produits');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = data?.items || [];
      const total = data?.total || 0;
      const pageNum = (data?.page || 0) + 1;
      const size = data?.size || 10;
      const totalPages = data?.totalPages || Math.ceil(total / size);

      this.products.set(items);
      this.total.set(total);
      this.page.set(pageNum);
      this.pageSize.set(size);
      this.totalPages.set(totalPages);
      this.loading.set(false);
    });
  }

  getProductById(productId: string): Observable<ProductResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}`)
    ).pipe(
      map(response => response.data),
      tap(product => {
        this.selectedProduct.set(product);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement du produit');
        throw error;
      })
    );
  }

  createProduct(productData: ProductRequest): Observable<ProductResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint('/products'),
      productData
    ).pipe(
      map(response => response.data),
      tap(newProduct => {
        this.products.update(products => [newProduct, ...products.slice(0, this.pageSize() - 1)]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création du produit');
        throw error;
      })
    );
  }

  updateProduct(productId: string, productData: ProductRequest): Observable<ProductResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}`),
      productData
    ).pipe(
      map(response => response.data),
      tap(updatedProduct => {
        this.products.update(products => 
          products.map(product => product.productId === productId ? updatedProduct : product)
        );
        this.selectedProduct.set(updatedProduct);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour du produit');
        throw error;
      })
    );
  }

  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/products/${productId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.products.update(products => 
          products.filter(product => product.productId !== productId)
        );
        this.total.update(total => total - 1);
        if (this.selectedProduct()?.productId === productId) {
          this.selectedProduct.set(null);
        }
        this.selectedProducts.update(selected => 
          selected.filter(p => p.productId !== productId)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression du produit');
        throw error;
      })
    );
  }

  bulkOperation(operation: BulkOperation): Observable<BulkOperationResponse> {
    this.bulkLoading.set(true);
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/products/bulk'),
      operation
    ).pipe(
      map(response => response.data),
      tap(response => {
        if (response.success) {
          switch (operation.operation) {
            case 'delete':
              this.products.update(products => 
                products.filter(p => !operation.productIds.includes(p.productId))
              );
              this.total.update(total => total - operation.productIds.length);
              break;
            case 'activate':
            case 'deactivate':
              const isActive = operation.operation === 'activate';
              this.products.update(products => 
                products.map(p => 
                  operation.productIds.includes(p.productId) 
                    ? { ...p, isActive } 
                    : p
                )
              );
              break;
          }
          this.selectedProducts.set([]);
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

  updateStock(productId: string, quantity: number): Observable<ProductResponse> {
    return this.http.patch<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}/stock`),
      { quantity }
    ).pipe(
      map(response => response.data),
      tap(updatedProduct => {
        this.products.update(products => 
          products.map(product => product.productId === productId ? updatedProduct : product)
        );
        this.selectedProduct.set(updatedProduct);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour du stock');
        throw error;
      })
    );
  }

  updateProductImage(productId: string, image: File): Observable<ProductResponse> {
    const formData = new FormData();
    formData.append('image', image);
    
    return this.http.post<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}/image`),
      formData
    ).pipe(
      map(response => response.data),
      tap(updatedProduct => {
        this.products.update(products => 
          products.map(product => product.productId === productId ? updatedProduct : product)
        );
        this.selectedProduct.set(updatedProduct);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour de l\'image');
        throw error;
      })
    );
  }

  getProductHistory(productId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      this.apiConfig.getEndpoint(`/products/${productId}/history`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement de l\'historique');
        return of([]);
      })
    );
  }

  cloneProduct(productId: string): Observable<ProductResponse> {
    return this.http.post<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}/clone`),
      {}
    ).pipe(
      map(response => response.data),
      tap(clonedProduct => {
        this.products.update(products => [clonedProduct, ...products]);
        this.total.update(total => total + 1);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Clonage du produit');
        throw error;
      })
    );
  }

  restoreProduct(productId: string): Observable<ProductResponse> {
    return this.http.post<ApiResponse<ProductResponse>>(
      this.apiConfig.getEndpoint(`/products/${productId}/restore`),
      {}
    ).pipe(
      map(response => response.data),
      tap(restoredProduct => {
        this.products.update(products => [...products, restoredProduct]);
        this.total.update(total => total + 1);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Restauration du produit');
        throw error;
      })
    );
  }

  getDeletedProducts(): Observable<ProductResponse[]> {
    return this.http.get<ApiResponse<ProductResponse[]>>(
      this.apiConfig.getEndpoint('/products/deleted')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des produits supprimés');
        return of([]);
      })
    );
  }

  getProductStatistics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/products/statistics')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  searchProducts(query: string): Observable<ProductResponse[]> {
    return this.http.get<ApiResponse<ProductResponse[]>>(
      this.apiConfig.getEndpoint('/products/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche de produits');
        return of([]);
      })
    );
  }

  exportProducts(format: 'csv' | 'excel' | 'pdf' = 'csv', filters?: ProductFilters): Observable<Blob> {
    const params: any = { format, ...filters };
    
    return this.http.get(
      this.apiConfig.getEndpoint('/products/export'),
      { params, responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Export des produits');
        throw error;
      })
    );
  }

  importProducts(file: File, options?: any): Observable<BulkOperationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    return this.http.post<ApiResponse<BulkOperationResponse>>(
      this.apiConfig.getEndpoint('/products/import'),
      formData
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Import des produits');
        throw error;
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadProducts(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadProducts(1, newPageSize);
  }

  toggleProductSelection(product: ProductResponse) {
    this.selectedProducts.update(selected => {
      const index = selected.findIndex(p => p.productId === product.productId);
      if (index > -1) {
        return selected.filter(p => p.productId !== product.productId);
      } else {
        return [...selected, product];
      }
    });
  }

  selectAllProducts() {
    this.selectedProducts.set([...this.products()]);
  }

  clearSelection() {
    this.selectedProducts.set([]);
  }

  initialize() {
    this.loadProducts();
  }
}