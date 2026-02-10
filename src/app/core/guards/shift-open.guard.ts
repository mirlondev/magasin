import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { ShiftReportsService } from '../services/shift-reports.service';
import { ShiftStatus } from '../models';


export const ShiftOpenGuard: CanActivateFn = (route, state) => {
  const shiftReportsService = inject(ShiftReportsService);
  const router = inject(Router);

  
    const shift = shiftReportsService.selectedShiftReport();
    if (shift && shift.status === ShiftStatus.OPEN) {
      return false; 
    }

    alert('Impossible d’accéder au POS : la caisse n’est pas ouverte.');
    router.navigate(['/shift-reports/new']);
    return true;
    
}
