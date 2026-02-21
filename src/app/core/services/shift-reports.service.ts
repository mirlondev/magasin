import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, map, tap, of } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";
import { 
  ApiResponse, 
  PaginatedResponse, 
  ShiftReport, 
  ShiftStatus, 
  ShiftReportRequest,
  CloseShiftRequest,
  ShiftReportDetail
} from "../models";

interface ShiftReportFilters {
  status?: ShiftStatus;
  storeId?: string;
  cashierId?: string;
  cashRegisterId?: string;  // AJOUTÉ
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class ShiftReportsService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State signals
  shiftReports = signal<ShiftReport[]>([]);
  selectedShiftReport = signal<ShiftReport | null>(null);
  selectedShiftDetail = signal<ShiftReportDetail | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  openShifts = signal<ShiftReport[]>([]);
  closedShifts = signal<ShiftReport[]>([]);
  suspendedShifts = signal<ShiftReport[]>([]);

  // Load shift reports with pagination and filters
  loadShiftReports(page: number = 1, pageSize: number = 10, filters?: ShiftReportFilters): Observable<PaginatedResponse<ShiftReport>> {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    return this.http.get<ApiResponse<PaginatedResponse<ShiftReport>>>(
      this.apiConfig.getEndpoint('/shift-reports'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        const total = Array.isArray(data) ? data.length : (data?.total || 0);

        this.shiftReports.set(items);
        this.total.set(total);
        
        // Update computed signals
        this.openShifts.set(items.filter(s => s.status === ShiftStatus.OPEN));
        this.closedShifts.set(items.filter(s => s.status === ShiftStatus.CLOSED));
        this.suspendedShifts.set(items.filter(s => s.status === ShiftStatus.SUSPENDED));
        
        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des sessions de caisse');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  // Get shift report by ID
  getShiftReportById(shiftId: string): Observable<ShiftReport> {
    this.loading.set(true);
    return this.http.get<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}`)
    ).pipe(
      map(response => response.data),
      tap(shift => {
        this.selectedShiftReport.set(shift);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la session de caisse');
        throw error;
      })
    );
  }

  // Get detailed shift report with payment breakdown
  getShiftDetail(shiftId: string): Observable<ShiftReportDetail> {
    this.loading.set(true);
    return this.http.get<ApiResponse<ShiftReportDetail>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/details`)
    ).pipe(
      map(response => response.data),
      tap(detail => {
        this.selectedShiftDetail.set(detail);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement des détails de la session');
        throw error;
      })
    );
  }

  // Create new shift report (open shift) - MODIFIÉ avec cashRegisterId
  openShift(shiftData: ShiftReportRequest): Observable<ShiftReport> {
    this.loading.set(true);
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint('/shift-reports/open'),
      shiftData
    ).pipe(
      map(response => response.data),
      tap(newShift => {
        this.shiftReports.update(shifts => [newShift, ...shifts]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ouverture de la caisse');
        throw error;
      })
    );
  }

  // Close shift - MODIFIÉ avec nouvelle signature
  closeShift(shiftId: string, closingData: CloseShiftRequest): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/close`),
      null,
      { params: { 
        actualBalance: closingData.actualBalance || 0,
        notes: closingData.notes || ''
      }}
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Fermeture de la caisse');
        throw error;
      })
    );
  }

  // Suspend shift
  suspendShift(shiftId: string, reason?: string): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/suspend`),
      null,
      { params: { reason: reason || '' }}
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suspension de la caisse');
        throw error;
      })
    );
  }

  // Resume suspended shift
  resumeShift(shiftId: string): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/resume`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Reprise de la caisse');
        throw error;
      })
    );
  }

  // Get shifts by cash register
  getShiftsByCashRegister(cashRegisterId: string): Observable<ShiftReport[]> {
    return this.http.get<ApiResponse<ShiftReport[]>>(
      this.apiConfig.getEndpoint(`/shift-reports/cash-register/${cashRegisterId}`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des sessions par caisse');
        return of([]);
      })
    );
  }

  // Get open shifts by cash register
  getOpenShiftsByCashRegister(cashRegisterId: string): Observable<ShiftReport[]> {
    return this.http.get<ApiResponse<ShiftReport[]>>(
      this.apiConfig.getEndpoint(`/shift-reports/cash-register/${cashRegisterId}/open`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des caisses ouvertes');
        return of([]);
      })
    );
  }

  // Get current shift for logged in cashier
  getCurrentShift(): Observable<ShiftReport | null> {
    return this.http.get<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint('/shift-reports/cashier/open')
    ).pipe(
      map(response => response.data),
      catchError(() => of(null))
    );
  }

  // Get payment totals
  getCashTotal(shiftId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/totals/cash`)
    ).pipe(map(r => r.data || 0));
  }

  getMobileTotal(shiftId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/totals/mobile`)
    ).pipe(map(r => r.data || 0));
  }

  getCardTotal(shiftId: string): Observable<number> {
    return this.http.get<ApiResponse<number>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/totals/card`)
    ).pipe(map(r => r.data || 0));
  }

  // Set pagination
  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadShiftReports(newPage, this.pageSize()).subscribe();
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadShiftReports(1, newPageSize).subscribe();
  }

  // Initialize
  initialize() {
    this.loadShiftReports().subscribe();
  }
}