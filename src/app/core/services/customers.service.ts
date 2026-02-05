import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Customer, PaginatedResponse } from "../../core/models";

interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
  country?: string;
  minLoyaltyPoints?: number;
  maxLoyaltyPoints?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  customers = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  activeCustomers = signal<Customer[]>([]);
  topCustomers = signal<Customer[]>([]);

  // Load customers with pagination and filters
  loadCustomers(page: number = 1, pageSize: number = 10, filters?: CustomerFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<Customer>>>(
      this.apiConfig.getEndpoint('/customers'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des clients');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);

      this.customers.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      // Update computed signals
      this.activeCustomers.set(items.filter(c => c.isActive));
      this.topCustomers.set([...items]
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 10));
      
      this.loading.set(false);
    });
  }

  // Get customer by ID
  getCustomerById(customerId: string): Observable<Customer> {
    this.loading.set(true);
    return this.http.get<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}`)
    ).pipe(
      map(response => response.data),
      tap(customer => {
        this.selectedCustomer.set(customer);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement du client');
        throw error;
      })
    );
  }

  // Create new customer
  createCustomer(customerData: Partial<Customer>): Observable<Customer> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint('/customers'),
      customerData
    ).pipe(
      map(response => response.data),
      tap(newCustomer => {
        this.customers.update(customers => [newCustomer, ...customers]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création du client');
        throw error;
      })
    );
  }

  // Update customer
  updateCustomer(customerId: string, customerData: Partial<Customer>): Observable<Customer> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}`),
      customerData
    ).pipe(
      map(response => response.data),
      tap(updatedCustomer => {
        this.customers.update(customers => 
          customers.map(customer => customer.customerId === customerId ? updatedCustomer : customer)
        );
        this.selectedCustomer.set(updatedCustomer);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour du client');
        throw error;
      })
    );
  }

  // Delete customer
  deleteCustomer(customerId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.customers.update(customers => 
          customers.filter(customer => customer.customerId !== customerId)
        );
        this.total.update(total => total - 1);
        if (this.selectedCustomer()?.customerId === customerId) {
          this.selectedCustomer.set(null);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression du client');
        throw error;
      })
    );
  }

  // Activate/Deactivate customer
  updateCustomerStatus(customerId: string, isActive: boolean): Observable<Customer> {
    return this.http.patch<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/status`),
      { isActive }
    ).pipe(
      map(response => response.data),
      tap(updatedCustomer => {
        this.customers.update(customers => 
          customers.map(customer => customer.customerId === customerId ? updatedCustomer : customer)
        );
        this.selectedCustomer.set(updatedCustomer);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  // Add loyalty points
  addLoyaltyPoints(customerId: string, points: number): Observable<Customer> {
    return this.http.patch<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/add/${points}`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedCustomer => {
        this.customers.update(customers => 
          customers.map(customer => customer.customerId === customerId ? updatedCustomer : customer)
        );
        this.selectedCustomer.set(updatedCustomer);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Ajout de points de fidélité');
        throw error;
      })
    );
  }

  // Get customer statistics
  getCustomerStatistics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/customers/statistics')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  // Search customers
  searchCustomers(query: string): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(
      this.apiConfig.getEndpoint('/customers/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche de clients');
        return of([]);
      })
    );
  }

  // Export customers
  exportCustomers(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint('/customers/export'),
      { params: { format }, responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Export des clients');
        throw error;
      })
    );
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadCustomers(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadCustomers(1, newPageSize);
  }

  // Initialize
  initialize() {
    this.loadCustomers();
  }
}