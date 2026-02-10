import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ShiftReportsService } from '../services/shift-reports.service';
import { ShiftStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ShiftOpenGuard implements CanActivate {
  constructor(
    private shiftReportsService: ShiftReportsService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const shift = this.shiftReportsService.selectedShiftReport();
    if (shift && shift.status === ShiftStatus.OPEN) {
      return true; 
    }

    alert('Impossible d’accéder au POS : la caisse n’est pas ouverte.');
    this.router.navigate(['/orders']);
    return false;
  }
}
