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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, FeeInvoice, InvoiceStatus } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-outstanding',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, MatInputModule, MatPaginatorModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Outstanding Fees Report</h1><p class="section-subtitle">All unpaid and partially paid invoices</p></div>
        <button mat-stroked-button (click)="exportCsv()"><mat-icon>download</mat-icon> Export</button>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <mat-form-field style="min-width:200px"><mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field style="min-width:160px"><mat-label>Status</mat-label>
          <mat-select [formControl]="statusCtrl">
            <mat-option value="">All</mat-option>
            <mat-option value="issued">Issued</mat-option>
            <mat-option value="overdue">Overdue</mat-option>
            <mat-option value="partially_paid">Partially Paid</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (data()) {
        <div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi-card kpi-orange"><div class="kpi-icon"><mat-icon>pending_actions</mat-icon></div><span class="kpi-label">Total Outstanding</span><span class="kpi-value">{{ fmt(data()!.summary.totalOutstanding) }}</span></div>
          <div class="kpi-card kpi-red"><div class="kpi-icon"><mat-icon>warning</mat-icon></div><span class="kpi-label">Overdue Amount</span><span class="kpi-value">{{ fmt(data()!.summary.overdueAmount) }}</span></div>
          <div class="kpi-card kpi-blue"><div class="kpi-icon"><mat-icon>description</mat-icon></div><span class="kpi-label">Total Invoices</span><span class="kpi-value">{{ data()!.summary.totalInvoices }}</span></div>
          <div class="kpi-card kpi-purple"><div class="kpi-icon"><mat-icon>error</mat-icon></div><span class="kpi-label">Overdue Count</span><span class="kpi-value">{{ data()!.summary.overdueCount }}</span></div>
        </div>
        <div class="table-container">
          <table mat-table [dataSource]="data()!.invoices.slice(page*pageSize - pageSize, page*pageSize)">
            <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice #</th><td mat-cell *matCellDef="let i"><a [routerLink]="['/invoices', i.id]" style="color:#2563eb;font-weight:600;text-decoration:none" class="text-mono">{{ i.invoiceNumber }}</a></td></ng-container>
            <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let i"><div style="font-weight:600;font-size:.875rem">{{ i.student?.user?.firstName }} {{ i.student?.user?.lastName }}</div><div style="font-size:.75rem;color:#64748b">{{ i.student?.class?.name }}</div></td></ng-container>
            <ng-container matColumnDef="period"><th mat-header-cell *matHeaderCellDef>Period</th><td mat-cell *matCellDef="let i">{{ i.billingLabel || '—' }}</td></ng-container>
            <ng-container matColumnDef="dueDate"><th mat-header-cell *matHeaderCellDef>Due Date</th><td mat-cell *matCellDef="let i" [style.color]="isPast(i.dueDate) ? '#dc2626' : '#0f172a'" style="font-weight:600">{{ i.dueDate | date:'mediumDate' }}</td></ng-container>
            <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let i">{{ i.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="paid"><th mat-header-cell *matHeaderCellDef>Paid</th><td mat-cell *matCellDef="let i" style="color:#16a34a">{{ i.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let i" style="color:#dc2626;font-weight:700">{{ i.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i"><span class="badge" [class]="'badge-' + i.status">{{ i.status | statusLabel }}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let i"><a mat-icon-button [routerLink]="['/invoices', i.id]"><mat-icon>visibility</mat-icon></a></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
          <mat-paginator [length]="data()!.invoices.length" [pageSize]="pageSize" [pageSizeOptions]="[20,50,100]" (page)="onPage($event)" showFirstLastButtons />
        </div>
      } @else if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      }
    </div>
  `
})
export class OutstandingComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<any>(null);
  years = signal<AcademicYear[]>([]);
  loading = signal(false);
  yearCtrl = new FormControl('');
  statusCtrl = new FormControl('');
  cols = ['invoice','student','period','dueDate','total','paid','balance','status','actions'];
  page = 1; pageSize = 20;

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.yearCtrl.setValue(cur.id); this.load(); }
    });
    [this.yearCtrl, this.statusCtrl].forEach(c => c.valueChanges.subscribe(() => this.load()));
  }

  load() {
    if (!this.yearCtrl.value) return;
    this.loading.set(true);
    this.api.get<any>('/reports/outstanding', { academicYearId: this.yearCtrl.value, status: this.statusCtrl.value || undefined })
      .subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; }
  isPast(d: string) { return new Date(d) < new Date(); }
  fmt(n: number) { if (n >= 1_000_000) return `₨${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `₨${(n/1_000).toFixed(0)}K`; return `₨${(n||0).toFixed(0)}`; }

  exportCsv() {
    const rows: FeeInvoice[] = this.data()?.invoices || [];
    if (!rows.length) return;
    const headers = ['Invoice #','Student','Class','Period','Due Date','Total','Paid','Balance','Status'];
    const csv = [headers.join(','), ...rows.map((i: any) => [i.invoiceNumber, `${i.student?.user?.firstName} ${i.student?.user?.lastName}`, i.student?.class?.name, i.billingLabel, i.dueDate, i.totalAmount, i.paidAmount, i.balanceAmount, i.status].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `outstanding_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
