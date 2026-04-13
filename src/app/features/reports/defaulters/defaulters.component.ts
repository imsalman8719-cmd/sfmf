import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass, Defaulter } from '../../../core/models';

@Component({
  selector: 'app-defaulters',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, MatInputModule, MatTooltipModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Defaulters List</h1>
          <p class="section-subtitle">Students with outstanding fee dues</p>
        </div>
        <button mat-stroked-button (click)="exportCsv()"><mat-icon>download</mat-icon> Export CSV</button>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <mat-form-field style="min-width:200px">
          <mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field style="min-width:180px">
          <mat-label>Class</mat-label>
          <mat-select [formControl]="classCtrl">
            <mat-option value="">All Classes</mat-option>
            @for (c of classes(); track c.id) { <mat-option [value]="c.id">{{ c.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="load()" [disabled]="!yearCtrl.value || loading()">
          <mat-icon>refresh</mat-icon> Load Report
        </button>
      </div>

      @if (data()) {
        <!-- Summary Cards -->
        <div class="kpi-grid mb-6" style="grid-template-columns:repeat(3,1fr)">
          <div class="kpi-card kpi-red">
            <div class="kpi-icon"><mat-icon>group_off</mat-icon></div>
            <span class="kpi-label">Total Defaulters</span>
            <span class="kpi-value">{{ data()!.summary.defaulterCount }}</span>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><mat-icon>account_balance_wallet</mat-icon></div>
            <span class="kpi-label">Total Outstanding</span>
            <span class="kpi-value">{{ fmt(data()!.summary.totalOutstanding) }}</span>
          </div>
          <div class="kpi-card kpi-blue">
            <div class="kpi-icon"><mat-icon>calculate</mat-icon></div>
            <span class="kpi-label">Avg. Per Student</span>
            <span class="kpi-value">{{ fmt(data()!.summary.totalOutstanding / (data()!.summary.defaulterCount || 1)) }}</span>
          </div>
        </div>

        <div class="table-container">
          <div class="table-header">
            <h3>{{ data()!.defaulters.length }} Defaulters</h3>
            <mat-form-field style="min-width:220px">
              <mat-label>Search</mat-label>
              <input matInput [formControl]="searchCtrl" placeholder="Name, reg. no…">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="rank"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let d; let i = index" style="color:#64748b;font-size:.8rem">{{ i + 1 }}</td></ng-container>
            <ng-container matColumnDef="student">
              <th mat-header-cell *matHeaderCellDef>Student</th>
              <td mat-cell *matCellDef="let d">
                <div style="font-weight:600;font-size:.875rem">{{ d.firstName }} {{ d.lastName }}</div>
                <div style="font-size:.75rem;color:#64748b">{{ d.registrationNumber }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="class"><th mat-header-cell *matHeaderCellDef>Class</th><td mat-cell *matCellDef="let d">{{ d.className || '—' }}</td></ng-container>
            <ng-container matColumnDef="guardian">
              <th mat-header-cell *matHeaderCellDef>Father / Guardian</th>
              <td mat-cell *matCellDef="let d">
                <div style="font-size:.8rem">{{ d.fatherName || '—' }}</div>
                <div style="font-size:.75rem;color:#64748b">{{ d.fatherPhone || '' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="billed"><th mat-header-cell *matHeaderCellDef>Total Billed</th><td mat-cell *matCellDef="let d">{{ d.totalBilled | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="paid"><th mat-header-cell *matHeaderCellDef>Paid</th><td mat-cell *matCellDef="let d" style="color:#16a34a">{{ d.totalPaid | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="due"><th mat-header-cell *matHeaderCellDef>Outstanding</th><td mat-cell *matCellDef="let d" style="color:#dc2626;font-weight:700">{{ d.totalDue | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="invoices"><th mat-header-cell *matHeaderCellDef>Pending Invoices</th><td mat-cell *matCellDef="let d"><span class="badge badge-overdue">{{ d.pendingInvoices }}</span></td></ng-container>
            <ng-container matColumnDef="oldest"><th mat-header-cell *matHeaderCellDef>Oldest Due</th><td mat-cell *matCellDef="let d" style="color:#dc2626">{{ d.oldestDueDate | date:'mediumDate' }}</td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let d">
                <a mat-icon-button [routerLink]="['/students', d.studentId]" matTooltip="View Student"><mat-icon>person</mat-icon></a>
                <a mat-icon-button [routerLink]="['/invoices']" [queryParams]="{studentId: d.studentId}" matTooltip="View Invoices"><mat-icon>description</mat-icon></a>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;" style="cursor:pointer"></tr>
          </table>
        </div>
      } @else if (!loading()) {
        <div style="text-align:center;padding:60px;color:#94a3b8">
          <mat-icon style="font-size:48px;height:48px;width:48px;margin-bottom:12px">info</mat-icon>
          <p>Select an academic year and click "Load Report"</p>
        </div>
      }
      @if (loading()) { <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div> }
    </div>
  `
})
export class DefaultersComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<any>(null);
  years = signal<AcademicYear[]>([]);
  classes = signal<SchoolClass[]>([]);
  loading = signal(false);
  yearCtrl = new FormControl('');
  classCtrl = new FormControl('');
  searchCtrl = new FormControl('');
  cols = ['rank','student','class','guardian','billed','paid','due','invoices','oldest','actions'];

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.yearCtrl.setValue(cur.id); this.loadClasses(cur.id); }
    });
    this.yearCtrl.valueChanges.subscribe(v => { if (v) this.loadClasses(v); });
  }

  loadClasses(yearId: string) {
    this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId }).subscribe(r => this.classes.set(r.data));
  }

  load() {
    if (!this.yearCtrl.value) return;
    this.loading.set(true);
    this.api.get<any>('/reports/defaulters', { academicYearId: this.yearCtrl.value, classId: this.classCtrl.value || undefined })
      .subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  filtered(): Defaulter[] {
    const q = this.searchCtrl.value?.toLowerCase() || '';
    return (this.data()?.defaulters || []).filter((d: Defaulter) =>
      !q || d.firstName.toLowerCase().includes(q) || d.lastName.toLowerCase().includes(q) || d.registrationNumber.toLowerCase().includes(q)
    );
  }

  fmt(n: number) { if (n >= 1_000_000) return `₨${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `₨${(n/1_000).toFixed(0)}K`; return `₨${(n||0).toFixed(0)}`; }

  exportCsv() {
    const rows = this.filtered();
    if (!rows.length) return;
    const headers = ['Name','Registration','Class','Father','Father Phone','Billed','Paid','Outstanding','Pending Invoices','Oldest Due'];
    const csv = [headers.join(','), ...rows.map(d =>
      [`${d.firstName} ${d.lastName}`, d.registrationNumber, d.className, d.fatherName || '', d.fatherPhone || '',
       d.totalBilled, d.totalPaid, d.totalDue, d.pendingInvoices, d.oldestDueDate].join(',')
    )].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `defaulters_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
