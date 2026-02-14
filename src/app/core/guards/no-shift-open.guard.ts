import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { ShiftReportsService } from '../services/shift-reports.service';
import { ShiftStatus } from '../models';


export const noShiftOpenGuard: CanActivateFn = (route, state) => {
  const shiftReportsService = inject(ShiftReportsService);
  const router = inject(Router);

  
    shiftReportsService.getCurrentShift().subscribe(shift => {
        if(shift && shift.status === ShiftStatus.OPEN) {
            //alert('le shift est ouvert');
            router.navigate([`/shift-reports/${shift.shiftReportId}`]);
        }
        return true; 

    });

    return false;
    
}
