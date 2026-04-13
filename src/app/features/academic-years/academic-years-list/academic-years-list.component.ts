import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear } from '../../../core/models';

@Component({
  selector: 'app-academic-years-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, MatProgressBarModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Academic Years</h1><p class="section-subtitle">Manage academic years and fee targets</p></div>
        <button mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> New Academic Year</button>
      </div>
      <div class="table-container">
        <table mat-table [dataSource]="years()">
          <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Year</th><td mat-cell *matCellDef="let y"><strong>{{ y.name }}</strong> @if (y.isCurrent) { <span class="badge badge-active" style="margin-left:8px">Current</span> }</td></ng-container>
          <ng-container matColumnDef="period"><th mat-header-cell *matHeaderCellDef>Period</th><td mat-cell *matCellDef="let y">{{ y.startDate | date:'mediumDate' }} — {{ y.endDate | date:'mediumDate' }}</td></ng-container>
          <ng-container matColumnDef="target"><th mat-header-cell *matHeaderCellDef>Fee Target</th><td mat-cell *matCellDef="let y" style="font-weight:600">{{ y.feeTarget | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let y">
              <a mat-icon-button [routerLink]="[y.id, 'edit']" matTooltip="Edit"><mat-icon>edit</mat-icon></a>
              @if (!y.isCurrent) {
                <button mat-icon-button (click)="setCurrent(y)" matTooltip="Set as Current"><mat-icon>check_circle</mat-icon></button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </div>
    </div>
  `
})
export class AcademicYearsListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  years = signal<AcademicYear[]>([]);
  cols = ['name','period','target','actions'];

  ngOnInit() { this.load(); }
  load() { this.api.get<AcademicYear[]>('/academic-years').subscribe(r => this.years.set(Array.isArray(r) ? r : (r as any).data || [])); }
  setCurrent(y: AcademicYear) { this.api.patch(`/academic-years/${y.id}/set-current`).subscribe({ next: () => { this.snackBar.open(`${y.name} set as current`, 'OK'); this.load(); } }); }
}
