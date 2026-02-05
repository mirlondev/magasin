import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, PaginatedResponse, Product } from "../../core/models";

interface ProductFilters {
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sku?: string;
  barcode?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  products = signal<Product[]>([]);
  selectedProduct = signal<Product | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  inStockProducts = signal<Product[]>([]);
  outOfStockProducts = signal<Product[]>([]);

  // Load products with pagination and filters
  loadProducts(page: number = 1, pageSize: number = 10, filters?: ProductFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<Product>>>(
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
      this.products.set(data.items);
      this.total.set(data.total);
      this.page.set(data.page + 1);
      this.pageSize.set(data.size);
      
      // Update computed signals
      this.inStockProducts.set(data.items.filter(p => p.inStock));
      this.outOfStockProducts.set(data.items.filter(p => !p.inStock));
      
      this.loading.set(false);
    });
  }

  // Get product by ID
  getProductById(productId: string): Observable<Product> {
    this.loading.set(true);
    return this.http.get<ApiResponse<Product>>(
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

  // Create new product
  createProduct(productData: Partial<Product>): Observable<Product> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Product>>(
      this.apiConfig.getEndpoint('/products'),
      productData
    ).pipe(
      map(response => response.data),
      tap(newProduct => {
        this.products.update(products => [newProduct, ...products]);
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

  // Update product
  updateProduct(productId: string, productData: Partial<Product>): Observable<Product> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Product>>(
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

  // Delete product
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
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression du produit');
        throw error;
      })
    );
  }

  // Update stock
  updateStock(productId: string, quantity: number): Observable<Product> {
    return this.http.patch<ApiResponse<Product>>(
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

  // Get product statistics
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

  // Search products
  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(
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

  // Export products
  exportProducts(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint('/products/export'),
      { params: { format }, responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Export des produits');
        throw error;
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadProducts(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadProducts(1, newPageSize);
  }

  // Initialize
  initialize() {
    this.loadProducts();
  }
}