import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../../core/api/api.config";
import { HttpErrorHandler } from "../../core/api/http-error.handler";
import { ApiResponse, EmployeeRole, EmployeeRequest, EmployeeUpdateRequest, PaginatedResponse, User, EmployeeResponse } from "../../core/models";

interface EmployeeFilters {
  search?: string;
  userRole?: EmployeeRole;
  active?: boolean;
  storeId?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  employees = signal<EmployeeResponse[]>([]);
  selectedEmployee = signal<EmployeeResponse | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  activeEmployees = signal<EmployeeResponse[]>([]);
  admins = signal<EmployeeResponse[]>([]);
  cashiers = signal<EmployeeResponse[]>([]);

  loadEmployees(page: number = 1, pageSize: number = 10, filters?: EmployeeFilters) {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { page: page - 1, size: pageSize, ...filters };

    this.http.get<ApiResponse<PaginatedResponse<EmployeeResponse>>>(
      this.apiConfig.getEndpoint('/employees'),
      { params }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des employés');
        this.error.set(errorMsg);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    ).subscribe(data => {
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = Array.isArray(data) ? data.length : (data?.total || 0);
      const page = Array.isArray(data) ? 1 : (data?.page || 0) + 1;
      const size = Array.isArray(data) ? items.length : (data?.size || 10);

      this.employees.set(items);
      this.total.set(total);
      this.page.set(page);
      this.pageSize.set(size);
      
      this.activeEmployees.set(items.filter(e => e.active));
      this.admins.set(items.filter(e => e.role === EmployeeRole.ADMIN));
      this.cashiers.set(items.filter(e => e.role === EmployeeRole.CASHIER));
      
      this.loading.set(false);
    });
  }

  getEmployeeById(employeeId: string): Observable<EmployeeResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}`)
    ).pipe(
      map(response => response.data),
      tap(employee => {
        this.selectedEmployee.set(employee);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de l\'employé');
        throw error;
      })
    );
  }

  createEmployee(employeeData: EmployeeRequest): Observable<EmployeeResponse> {
    this.loading.set(true);
    return this.http.post<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint('/employees'),
      employeeData
    ).pipe(
      map(response => response.data),
      tap(newEmployee => {
        this.employees.update(employees => [newEmployee, ...employees]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de l\'employé');
        throw error;
      })
    );
  }

  updateEmployee(employeeId: string, employeeData: EmployeeUpdateRequest): Observable<EmployeeResponse> {
    this.loading.set(true);
    return this.http.put<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}`),
      employeeData
    ).pipe(
      map(response => response.data),
      tap(updatedEmployee => {
        this.employees.update(employees => 
          employees.map(employee => employee.employeeId === employeeId ? updatedEmployee : employee)
        );
        this.selectedEmployee.set(updatedEmployee);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de l\'employé');
        throw error;
      })
    );
  }

  deleteEmployee(employeeId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.employees.update(employees => 
          employees.filter(employee => employee.employeeId !== employeeId)
        );
        this.total.update(total => total - 1);
        if (this.selectedEmployee()?.employeeId === employeeId) {
          this.selectedEmployee.set(null);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de l\'employé');
        throw error;
      })
    );
  }

  updateEmployeeRole(employeeId: string, newRole: EmployeeRole): Observable<EmployeeResponse> {
    return this.http.patch<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}/role/${newRole}`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedEmployee => {
        this.employees.update(employees => 
          employees.map(employee => employee.employeeId === employeeId ? updatedEmployee : employee)
        );
        this.selectedEmployee.set(updatedEmployee);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de rôle');
        throw error;
      })
    );
  }

  updateEmployeeStatus(employeeId: string, active: boolean): Observable<EmployeeResponse> {
    return this.http.patch<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}/status`),
      { active }
    ).pipe(
      map(response => response.data),
      tap(updatedEmployee => {
        this.employees.update(employees => 
          employees.map(employee => employee.employeeId === employeeId ? updatedEmployee : employee)
        );
        this.selectedEmployee.set(updatedEmployee);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Changement de statut');
        throw error;
      })
    );
  }

  assignStore(employeeId: string, storeId: string): Observable<EmployeeResponse> {
    return this.http.patch<ApiResponse<EmployeeResponse>>(
      this.apiConfig.getEndpoint(`/employees/${employeeId}/assign-store/${storeId}`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedEmployee => {
        this.employees.update(employees => 
          employees.map(employee => employee.employeeId === employeeId ? updatedEmployee : employee)
        );
        this.selectedEmployee.set(updatedEmployee);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Assignation de magasin');
        throw error;
      })
    );
  }

  getEmployeeStatistics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      this.apiConfig.getEndpoint('/employees/statistics')
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        throw error;
      })
    );
  }

  searchEmployees(query: string): Observable<EmployeeResponse[]> {
    return this.http.get<ApiResponse<EmployeeResponse[]>>(
      this.apiConfig.getEndpoint('/employees/search'),
      { params: { q: query } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.errorHandler.handleError(error, 'Recherche d\'employés');
        return of([]);
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadEmployees(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadEmployees(1, newPageSize);
  }

  initialize() {
    this.loadEmployees();
  }
}