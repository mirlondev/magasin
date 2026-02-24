import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, Customer, CustomerRequest, PaginatedResponse } from "../../core/models";

interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
  minLoyaltyPoints?: number;
  maxLoyaltyPoints?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State Signals
  customers = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);

  loadCustomers(page: number = 1, pageSize: number = 10, filters?: CustomerFilters) {
    this.loading.set(true);
    this.error.set(null);

    // Backend expects 0-based index for page usually, adjusting here
    const params: any = { page: page - 1, size: pageSize, ...filters };

      this.http.get<ApiResponse<PaginatedResponse<Customer>>>(
      this.apiConfig.getEndpoint('/customers'),
      { params }
              
    ).pipe(
      map(response => response.data),
      tap(data => {
        const items = data?.items || [];
        console.log('Fetched customers:', items);
        this.customers.set(items);
        this.total.set(data?.total || 0);
        this.page.set(data?.page + 1); // Convert 0-based back to 1-based for UI
        this.pageSize.set(data?.size || 10);
        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des clients');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
    console.log('Loading customers with params:', params);
    console.log('Current customers before load:',    this.apiConfig.getEndpoint('/customers'), this.customers()); // Debug log to check current state before loading new data
  }


  

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

  createCustomer(customerData: CustomerRequest): Observable<Customer> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint('/customers'),
      customerData
    ).pipe(
      map(response => response.data),
      tap(newCustomer => {
        this.customers.update(list => [newCustomer, ...list]);
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

  updateCustomer(customerId: string, customerData: CustomerRequest): Observable<Customer> {
    this.loading.set(true);
    return this.http.put<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}`),
      customerData
    ).pipe(
      map(response => response.data),
      tap(updatedCustomer => {
        this.customers.update(list =>
          list.map(c => c.customerId === customerId ? updatedCustomer : c)
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

  deleteCustomer(customerId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.customers.update(list => list.filter(c => c.customerId !== customerId));
        this.total.update(total => total - 1);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression du client');
        throw error;
      })
    );
  }

  updateCustomerStatus(customerId: string, isActive: boolean): Observable<Customer> {
    return this.http.patch<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/status`),
      { isActive }
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.customers.update(list =>
          list.map(c => c.customerId === customerId ? updated : c)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  // Loyalty specific
  addLoyaltyPoints(customerId: string, points: number, reason: string): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/add-points`),
      null,
      { params: { points: points.toString(), reason } }
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.customers.update(list =>
          list.map(c => c.customerId === customerId ? updated : c)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Ajout de points');
        throw error;
      })
    );
  }

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
}