import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, of } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { 
  ApiResponse, 
  TaxBreakdownResponse,
  TaxCalculationRequest,
  TaxCalculationResult
} from "../../core/models";

@Injectable({ providedIn: 'root' })
export class TaxService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  calculateTax(request: TaxCalculationRequest): Observable<TaxCalculationResult> {
    return this.http.post<ApiResponse<TaxCalculationResult>>(
      this.apiConfig.getEndpoint('/tax/calculate'),
      request
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Calcul de taxe');
        throw error;
      })
    );
  }

  getOrderTaxBreakdown(orderId: string): Observable<TaxBreakdownResponse[]> {
    return this.http.get<ApiResponse<TaxBreakdownResponse[]>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/tax-breakdown`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du détail des taxes');
        return of([]);
      })
    );
  }

  getOrderTaxSummary(orderId: string): Observable<{
    subtotal: number;
    totalTax: number;
    totalWithTax: number;
    taxBreakdown: TaxBreakdownResponse[];
  }> {
    return this.http.get<ApiResponse<{
      subtotal: number;
      totalTax: number;
      totalWithTax: number;
      taxBreakdown: TaxBreakdownResponse[];
    }>>(
      this.apiConfig.getEndpoint(`/orders/${orderId}/tax-summary`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du résumé des taxes');
        throw error;
      })
    );
  }

  validateTaxRate(taxRate: number, country?: string): Observable<boolean> {
    let params = new HttpParams().set('taxRate', taxRate.toString());
    if (country) params = params.set('country', country);

    return this.http.get<ApiResponse<boolean>>(
      this.apiConfig.getEndpoint('/tax/validate-rate'),
      { params }
    ).pipe(
      map(response => response.data ?? false),
      catchError(() => of(false))
    );
  }

  getDefaultTaxRate(storeId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/default-tax-rate`)
    ).pipe(
      map(response => response.data ?? 19.25),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du taux de taxe par défaut');
        return of(19.25);
      })
    );
  }

  getApplicableTaxRates(storeId: string): Observable<Array<{rate: number, name: string, description?: string}>> {
    return this.http.get<ApiResponse<Array<{rate: number, name: string, description?: string}>>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/tax-rates`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des taux de taxe');
        return of([{ rate: 19.25, name: 'TVA', description: 'Taxe sur la Valeur Ajoutée' }]);
      })
    );
  }

  calculateTaxBatch(items: Array<{
    productId: string;
    baseAmount: number;
    taxRate: number;
    quantity: number;
    discountPercentage?: number;
  }>): Observable<TaxBreakdownResponse[]> {
    return this.http.post<ApiResponse<TaxBreakdownResponse[]>>(
      this.apiConfig.getEndpoint('/tax/calculate-batch'),
      { items }
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Calcul des taxes en lot');
        return of([]);
      })
    );
  }

  getTaxReport(startDate: string, endDate: string, storeId?: string): Observable<{
    totalTaxCollected: number;
    totalTaxableSales: number;
    taxBreakdownByRate: Record<number, { amount: number; tax: number }>;
    orders: string[];
  }> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    if (storeId) params = params.set('storeId', storeId);

    return this.http.get<ApiResponse<{
      totalTaxCollected: number;
      totalTaxableSales: number;
      taxBreakdownByRate: Record<number, { amount: number; tax: number }>;
      orders: string[];
    }>>(
      this.apiConfig.getEndpoint('/tax/report'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Génération du rapport de taxes');
        throw error;
      })
    );
  }
}