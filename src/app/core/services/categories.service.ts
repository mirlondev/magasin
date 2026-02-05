import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Category, PaginatedResponse } from "../../core/models";

interface CategoryFilters {
  search?: string;
  isActive?: boolean;
  parentCategoryId?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  categories = signal<Category[]>([]);
  selectedCategory = signal<Category | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  activeCategories = signal<Category[]>([]);
  mainCategories = signal<Category[]>([]);

  // Load categories with pagination and filters
  loadCategories(page: number = 1, pageSize: number = 10, filters?: CategoryFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<Category>>>(
      this.apiConfig.getEndpoint('/categories'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des catégories');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);

      this.categories.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      // Update computed signals
      this.activeCategories.set(items.filter(c => c.isActive));
      this.mainCategories.set(items.filter(c => !c.parentCategory));
      
      this.loading.set(false);
    });
  }

  // Get category by ID
  getCategoryById(categoryId: string): Observable<Category> {
    this.loading.set(true);
    return this.http.get<ApiResponse<Category>>(
      this.apiConfig.getEndpoint(`/categories/${categoryId}`)
    ).pipe(
      map(response => response.data),
      tap(category => {
        this.selectedCategory.set(category);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la catégorie');
        throw error;
      })
    );
  }

  // Create new category
  createCategory(categoryData: Partial<Category>): Observable<Category> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Category>>(
      this.apiConfig.getEndpoint('/categories'),
      categoryData
    ).pipe(
      map(response => response.data),
      tap(newCategory => {
        this.categories.update(categories => [newCategory, ...categories]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la catégorie');
        throw error;
      })
    );
  }

  // Update category
  updateCategory(categoryId: string, categoryData: Partial<Category>): Observable<Category> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Category>>(
      this.apiConfig.getEndpoint(`/categories/${categoryId}`),
      categoryData
    ).pipe(
      map(response => response.data),
      tap(updatedCategory => {
        this.categories.update(categories => 
          categories.map(category => category.categoryId === categoryId ? updatedCategory : category)
        );
        this.selectedCategory.set(updatedCategory);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de la catégorie');
        throw error;
      })
    );
  }

  // Delete category
  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/categories/${categoryId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.categories.update(categories => 
          categories.filter(category => category.categoryId !== categoryId)
        );
        this.total.update(total => total - 1);
        if (this.selectedCategory()?.categoryId === categoryId) {
          this.selectedCategory.set(null);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de la catégorie');
        throw error;
      })
    );
  }

  // Activate/Deactivate category
  updateCategoryStatus(categoryId: string, isActive: boolean): Observable<Category> {
    return this.http.patch<ApiResponse<Category>>(
      this.apiConfig.getEndpoint(`/categories/${categoryId}/status`),
      { isActive }
    ).pipe(
      map(response => response.data),
      tap(updatedCategory => {
        this.categories.update(categories => 
          categories.map(category => category.categoryId === categoryId ? updatedCategory : category)
        );
        this.selectedCategory.set(updatedCategory);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  // Get category tree
  getCategoryTree(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(
      this.apiConfig.getEndpoint('/categories/tree')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement de l\'arbre des catégories');
        return of([]);
      })
    );
  }

  // Get category statistics
  getCategoryStatistics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/categories/statistics')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  // Search categories
  searchCategories(query: string): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(
      this.apiConfig.getEndpoint('/categories/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche de catégories');
        return of([]);
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadCategories(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadCategories(1, newPageSize);
  }

  // Initialize
  initialize() {
    this.loadCategories();
  }
}