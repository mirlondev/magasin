import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, PaginatedResponse, ShiftReport, ShiftStatus } from "../../core/models";

interface ShiftReportFilters {
  status?: ShiftStatus;
  storeId?: string;
  cashierId?: string;
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
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed values
  openShifts = signal<ShiftReport[]>([]);
  closedShifts = signal<ShiftReport[]>([]);
  suspendedShifts = signal<ShiftReport[]>([]);
  underReviewShifts = signal<ShiftReport[]>([]);

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
        const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
        const size = Array.isArray(data) ? items.length : (data?.size || 10);

        this.shiftReports.set(items);
        this.total.set(total);
        this.page.set(page);
        this.pageSize.set(size);
        
        // Update computed signals
        this.openShifts.set(items.filter(s => s.status === ShiftStatus.OPEN));
        this.closedShifts.set(items.filter(s => s.status === ShiftStatus.CLOSED));
        this.suspendedShifts.set(items.filter(s => s.status === ShiftStatus.SUSPENDED));
        this.underReviewShifts.set(items.filter(s => s.status === ShiftStatus.UNDER_REVIEW));
        
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

  // Create new shift report (open shift)
  openShift(shiftData: {
    storeId: string;
    openingBalance: number;
    notes?: string;
  }): Observable<ShiftReport> {
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

  // Close shift
  closeShift(shiftId: string, closingData: {
    closingBalance: number;
    notes?: string;
  }): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/close`),
      closingData
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
  suspendShift(shiftId: string, notes?: string): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/suspend`),
      { notes }
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
    return this.http.post<ApiResponse<ShiftReport>>(
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

  // Add cash to shift
  addCash(shiftId: string, amount: number, notes?: string): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/add-cash`),
      { amount, notes }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Ajout de caisse');
        throw error;
      })
    );
  }

  // Remove cash from shift
  removeCash(shiftId: string, amount: number, notes?: string): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/remove-cash`),
      { amount, notes }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Retrait de caisse');
        throw error;
      })
    );
  }

  // Update shift notes
  updateNotes(shiftId: string, notes: string): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/notes`),
      { notes }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts => 
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour des notes');
        throw error;
      })
    );
  }

  // Get shift summary
  getShiftSummary(shiftId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/summary`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement du résumé');
        throw error;
      })
    );
  }

  // Get today's shift for current user
  getCurrentShift(): Observable<ShiftReport | null> {
    return this.http.get<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint('/shift-reports/cashier/open')
    ).pipe(
      map(response => response.data),
      catchError(() => of(null)) // Return null if no current shift
    );
  }

  // Get shift statistics
  getStatistics(period: 'today' | 'week' | 'month'): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint(`/shift-reports/statistics/${period}`)
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
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