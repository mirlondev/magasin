import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { 
  ApiResponse, 
  LoyaltyTransactionResponse,
  LoyaltySummary,
  Customer,
  PaginatedResponse,
  LoyaltyTier
} from "../../core/models";

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  transactions = signal<LoyaltyTransactionResponse[]>([]);
  customerSummary = signal<LoyaltySummary | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getCustomerTransactions(customerId: string, page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<LoyaltyTransactionResponse>> {
    this.loading.set(true);
    
    const params = new HttpParams()
      .set('page', (page - 1).toString())
      .set('size', pageSize.toString());

    return this.http.get<ApiResponse<PaginatedResponse<LoyaltyTransactionResponse>>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/transactions`),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        this.transactions.set(data?.items || []);
        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des transactions de fidélité');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  getCustomerSummary(customerId: string): Observable<LoyaltySummary> {
    this.loading.set(true);
    return this.http.get<ApiResponse<LoyaltySummary>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/summary`)
    ).pipe(
      map(response => response.data),
      tap(summary => {
        this.customerSummary.set(summary);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement du résumé de fidélité');
        throw error;
      })
    );
  }

  addPoints(customerId: string, points: number, reason: string, orderId?: string): Observable<Customer> {
    this.loading.set(true);
    
    let params = new HttpParams()
      .set('points', points.toString())
      .set('reason', reason);
    
    if (orderId) params = params.set('orderId', orderId);

    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/add-points`),
      null,
      { params }
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.getCustomerSummary(customerId).subscribe();
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ajout de points de fidélité');
        throw error;
      })
    );
  }

  usePoints(customerId: string, points: number, reason: string, orderId?: string): Observable<Customer> {
    this.loading.set(true);
    
    let params = new HttpParams()
      .set('points', points.toString())
      .set('reason', reason);
    
    if (orderId) params = params.set('orderId', orderId);

    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/use-points`),
      null,
      { params }
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.getCustomerSummary(customerId).subscribe();
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Utilisation des points de fidélité');
        throw error;
      })
    );
  }

  convertPointsToDiscount(points: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint('/loyalty/convert-points'),
      { params: { points: points.toString() } }
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Conversion des points');
        return of(0);
      })
    );
  }

  getTierBenefits(tier: LoyaltyTier): Observable<{discountRate: number, minPoints: number, benefits: string[]}> {
    return this.http.get<ApiResponse<{discountRate: number, minPoints: number, benefits: string[]}>>(
      this.apiConfig.getEndpoint(`/loyalty/tiers/${tier}/benefits`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des avantages du niveau');
        return of({ discountRate: 0, minPoints: 0, benefits: [] });
      })
    );
  }

  getAllTiers(): Observable<Array<{tier: string, minPoints: number, discountRate: number, color: string}>> {
    return this.http.get<ApiResponse<Array<{tier: string, minPoints: number, discountRate: number, color: string}>>>(
      this.apiConfig.getEndpoint('/loyalty/tiers')
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des niveaux de fidélité');
        return of([]);
      })
    );
  }

  adjustPoints(customerId: string, points: number, reason: string): Observable<Customer> {
    this.loading.set(true);
    return this.http.post<ApiResponse<Customer>>(
      this.apiConfig.getEndpoint(`/customers/${customerId}/loyalty/adjust`),
      { points, reason }
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.getCustomerSummary(customerId).subscribe();
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ajustement des points');
        throw error;
      })
    );
  }

  getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month'): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/loyalty/statistics'),
      { params: { period } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques de fidélité');
        throw error;
      })
    );
  }

  searchByPointsRange(minPoints: number, maxPoints?: number): Observable<Customer[]> {
    let params = new HttpParams().set('minPoints', minPoints.toString());
    if (maxPoints !== undefined) params = params.set('maxPoints', maxPoints.toString());

    return this.http.get<ApiResponse<Customer[]>>(
      this.apiConfig.getEndpoint('/customers/loyalty/search'),
      { params }
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche par points');
        return of([]);
      })
    );
  }

  calculatePointsForPurchase(amount: number, tier?: LoyaltyTier): Observable<number> {
    let params = new HttpParams().set('amount', amount.toString());
    if (tier) params = params.set('tier', tier);

    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint('/loyalty/calculate-points'),
      { params }
    ).pipe(
      map(response => response.data || 0),
      catchError(error => {
        this.errorHandler.handleError(error, 'Calcul des points');
        return of(0);
      })
    );
  }
}