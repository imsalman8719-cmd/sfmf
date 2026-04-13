import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear } from '../../../core/models';

@Component({
  selector: 'app-class-wise',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Class-wise Fee Summary</h1><p class="section-subtitle">Collection breakdown by class</p></div>
        <div class="flex-gap">
          <mat-form-field style="min-width:200px">
            <mat-label>Academic Year</mat-label>
            <mat-select [formControl]="yearCtrl">
              @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="exportCsv()"><mat-icon>download</mat-icon> Export</button>
        </div>
      </div>

      @if (data()) {
        <div class="table-container">
          <table mat-table [dataSource]="data()!.classes" style="min-width:700px">
            <ng-container matColumnDef="class"><th mat-header-cell *matHeaderCellDef>Class</th><td mat-cell *matCellDef="let r"><strong>{{ r.className || 'Unassigned' }}</strong></td></ng-container>
            <ng-container matColumnDef="grade"><th mat-header-cell *matHeaderCellDef>Grade</th><td mat-cell *matCellDef="let r">{{ r.grade }}</td></ng-container>
            <ng-container matColumnDef="students"><th mat-header-cell *matHeaderCellDef>Students</th><td mat-cell *matCellDef="let r">{{ r.totalStudents }}</td></ng-container>
            <ng-container matColumnDef="defaulters"><th mat-header-cell *matHeaderCellDef>Defaulters</th><td mat-cell *matCellDef="let r"><span class="badge badge-overdue">{{ r.defaulterCount }}</span></td></ng-container>
            <ng-container matColumnDef="billed"><th mat-header-cell *matHeaderCellDef>Total Billed</th><td mat-cell *matCellDef="let r">{{ r.totalBilled | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="collected"><th mat-header-cell *matHeaderCellDef>Collected</th><td mat-cell *matCellDef="let r" style="color:#16a34a;font-weight:600">{{ r.totalPaid | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="outstanding"><th mat-header-cell *matHeaderCellDef>Outstanding</th><td mat-cell *matCellDef="let r" style="color:#dc2626;font-weight:600">{{ r.totalDue | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="discount"><th mat-header-cell *matHeaderCellDef>Discounts</th><td mat-cell *matCellDef="let r">{{ r.totalDiscount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="rate">
              <th mat-header-cell *matHeaderCellDef>Collection Rate</th>
              <td mat-cell *matCellDef="let r">
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-progress-bar mode="determinate" [value]="pct(r.totalPaid, r.totalBilled)" style="width:70px" />
                  <span style="font-size:.8rem;font-weight:600">{{ r.collectionRate }}</span>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        </div>
      } @else if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      }
    </div>
  `
})
export class ClassWiseComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<any>(null);
  years = signal<AcademicYear[]>([]);
  loading = signal(false);
  yearCtrl = new FormControl('');
  cols = ['class','grade','students','defaulters','billed','collected','outstanding','discount','rate'];

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.yearCtrl.setValue(cur.id); this.load(cur.id); }
    });
    this.yearCtrl.valueChanges.subscribe(v => { if (v) this.load(v); });
  }

  load(yearId: string) {
    this.loading.set(true);
    this.api.get<any>('/reports/class-wise', { academicYearId: yearId })
      .subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  pct(paid: number, billed: number) { return billed ? Math.min(100, (+paid / +billed) * 100) : 0; }

  exportCsv() {
    const rows = this.data()?.classes || [];
    if (!rows.length) return;
    const headers = ['Class','Grade','Students','Defaulters','Billed','Collected','Outstanding','Discounts','Rate'];
    const csv = [headers.join(','), ...rows.map((r: any) =>
      [r.className, r.grade, r.totalStudents, r.defaulterCount, r.totalBilled, r.totalPaid, r.totalDue, r.totalDiscount, r.collectionRate].join(',')
    )].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `class_wise_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
