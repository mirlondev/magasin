import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, PaginatedResponse, Refund, RefundResponse, RefundStatus, RefundRequest } from "../../core/models";

interface RefundFilters {
  status?: RefundStatus;
  orderId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class RefundsService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  refunds = signal<RefundResponse[]>([]);
  selectedRefund = signal<RefundResponse | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  pendingRefunds = signal<RefundResponse[]>([]);
  approvedRefunds = signal<RefundResponse[]>([]);
  completedRefunds = signal<RefundResponse[]>([]);

  loadRefunds(page: number = 1, pageSize: number = 10, filters?: RefundFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<RefundResponse>>>(
      this.apiConfig.getEndpoint('/refunds'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des remboursements');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);

      this.refunds.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      this.pendingRefunds.set(items.filter(r => r.status === RefundStatus.PENDING));
      this.approvedRefunds.set(items.filter(r => r.status === RefundStatus.APPROVED));
      this.completedRefunds.set(items.filter(r => r.status === RefundStatus.COMPLETED));
      
      this.loading.set(false);
    });
  }

  getRefundById(refundId: string): Observable<RefundResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}`)
    ).pipe(
      map(response => response.data),
      tap(refund => {
        this.selectedRefund.set(refund);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement du remboursement');
        throw error;
      })
    );
  }

  createRefund(refundData: RefundRequest): Observable<RefundResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint('/refunds'),
      refundData
    ).pipe(
      map(response => response.data),
      tap(newRefund => {
        this.refunds.update(refunds => [newRefund, ...refunds]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création du remboursement');
        throw error;
      })
    );
  }

  updateRefund(refundId: string, refundData: Partial<RefundRequest>): Observable<RefundResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}`),
      refundData
    ).pipe(
      map(response => response.data),
      tap(updatedRefund => {
        this.refunds.update(refunds => 
          refunds.map(refund => refund.refundId === refundId ? updatedRefund : refund)
        );
        this.selectedRefund.set(updatedRefund);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour du remboursement');
        throw error;
      })
    );
  }

  updateRefundStatus(refundId: string, status: RefundStatus): Observable<RefundResponse> {
    return this.http.patch<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}/status`),
      { status }
    ).pipe(
      map(response => response.data),
      tap(updatedRefund => {
        this.refunds.update(refunds => 
          refunds.map(refund => refund.refundId === refundId ? updatedRefund : refund)
        );
        this.selectedRefund.set(updatedRefund);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  approveRefund(refundId: string): Observable<RefundResponse> {
    return this.http.post<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}/approve`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedRefund => {
        this.refunds.update(refunds => 
          refunds.map(refund => refund.refundId === refundId ? updatedRefund : refund)
        );
        this.selectedRefund.set(updatedRefund);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Approbation du remboursement');
        throw error;
      })
    );
  }

  rejectRefund(refundId: string, reason: string): Observable<RefundResponse> {
    return this.http.post<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}/reject`),
      { reason }
    ).pipe(
      map(response => response.data),
      tap(updatedRefund => {
        this.refunds.update(refunds => 
          refunds.map(refund => refund.refundId === refundId ? updatedRefund : refund)
        );
        this.selectedRefund.set(updatedRefund);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Rejet du remboursement');
        throw error;
      })
    );
  }

  processRefund(refundId: string): Observable<RefundResponse> {
    return this.http.post<ApiResponse<RefundResponse>>(
      this.apiConfig.getEndpoint(`/refunds/${refundId}/process`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedRefund => {
        this.refunds.update(refunds => 
          refunds.map(refund => refund.refundId === refundId ? updatedRefund : refund)
        );
        this.selectedRefund.set(updatedRefund);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Traitement du remboursement');
        throw error;
      })
    );
  }

  getRefundStatistics(period: 'today' | 'week' | 'month'): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/refunds/statistics/${period}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  searchRefunds(query: string): Observable<RefundResponse[]> {
    return this.http.get<ApiResponse<RefundResponse[]>>(
      this.apiConfig.getEndpoint('/refunds/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche de remboursements');
        return of([]);
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadRefunds(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadRefunds(1, newPageSize);
  }

  initialize() {
    this.loadRefunds();
  }
}