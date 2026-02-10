// skeleton-loader.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-table-skeleton',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="space-y-3">
      @for (row of [].constructor(rows); track $index) {
        <div class="flex items-center space-x-4 p-4 border rounded-lg">
          @for (col of columns; track $index) {
            <div class="flex-1">
              <p-skeleton 
                [width]="col.width" 
                [height]="col.height || '1rem'"
                [styleClass]="col.class || ''">
              </p-skeleton>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class TableSkeletonComponent {
    @Input() rows: number = 5;
    @Input() columns: { width: string; height?: string; class?: string }[] = [];
}

@Component({
    selector: 'app-card-skeleton',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="surface-card p-4 shadow-2 rounded">
      <p-skeleton width="60%" height="1rem" class="mb-2"></p-skeleton>
      <p-skeleton width="40%" height="2rem" class="mb-4"></p-skeleton>
      <p-skeleton width="100%" height="0.5rem"></p-skeleton>
    </div>
  `
})
export class CardSkeletonComponent { }

@Component({
  selector: 'app-chart-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  template: `
    <div class="surface-card p-4 shadow-2 rounded">
      <p-skeleton width="60%" height="1rem" class="mb-2"></p-skeleton>
      <p-skeleton width="40%" height="2rem" class="mb-4"></p-skeleton>
      <p-skeleton width="100%" height="0.5rem"></p-skeleton>
    </div>
  `
})
export class ChartSkeletonComponent {
  getRandomHeight(): string {
    const heights = ['60%', '40%', '80%', '30%', '90%', '50%', '70%'];
    return heights[Math.floor(Math.random() * heights.length)];
  }
}