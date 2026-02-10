import { Pipe, PipeTransform } from '@angular/core';

// @Pipe({
//   name: 'xaf',
//   standalone: true,
// })
// export class XafPipe implements PipeTransform {

//   transform(value: number | null | undefined): string {
//     if (!value) return '0 XAF';
//     return new Intl.NumberFormat('fr-FR', {
//       style: 'currency',
//       currency: 'XAF',
//       maximumFractionDigits: 0
//     }).format(value);
//   }
// }
// xaf-currency-pipe.ts - XAF Currency Pipe

@Pipe({
  name: 'xaf',
  standalone: true
})
export class XafPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '0 FCFA';
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return '0 FCFA';
    }
    
    // Format with thousands separator and 2 decimal places
    const formatted = numValue.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    return `${formatted} FCFA`;
  }
}