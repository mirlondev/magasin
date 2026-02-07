import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'xaf',
  standalone: true,
})
export class XafPipe implements PipeTransform {

  transform(value: number | null | undefined): string {
    if (!value) return '0 XAF';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0
    }).format(value);
  }
}
