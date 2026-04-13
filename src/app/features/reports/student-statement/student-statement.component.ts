import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/services/api.service';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-student-statement',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDividerModule, MatProgressBarModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      @if (data()) {
        <div class="flex-between mb-6 no-print">
          <div><h1 class="section-title">Student Fee Statement</h1></div>
          <div class="flex-gap">
            <button mat-stroked-button onclick="window.print()"><mat-icon>print</mat-icon> Print</button>
            <a mat-stroked-button [routerLink]="['/students', data()!.student.id]"><mat-icon>person</mat-icon> View Profile</a>
          </div>
        </div>

        <!-- Print Header -->
        <div class="print-header">
          <h1>School Fee Statement</h1>
          <p>Academic Year: {{ data()!.student.academicYear }}</p>
          <p>Generated: {{ today | date:'fullDate' }}</p>
        </div>

        <!-- Student Card -->
        <mat-card class="mb-6">
          <mat-card-content>
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px">
              <div style="display:flex;align-items:center;gap:16px">
                <div class="big-avatar">{{ data()!.student.name[0] }}</div>
                <div>
                  <h2 style="font-size:1.25rem;font-weight:700">{{ data()!.student.name }}</h2>
                  <p class="text-mono" style="color:#64748b">{{ data()!.student.registrationNumber }}</p>
                  <p style="font-size:.875rem;color:#64748b">{{ data()!.student.class }} · Grade {{ data()!.student.grade }}</p>
                </div>
              </div>
              <div style="text-align:right">
                <p style="font-size:.8rem;color:#64748b">Father: {{ data()!.student.fatherName || '—' }}</p>
                <p style="font-size:.8rem;color:#64748b">Phone: {{ data()!.student.fatherPhone || '—' }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Summary -->
        <div class="kpi-grid mb-6" style="grid-template-columns:repeat(5,1fr)">
          <div class="kpi-card kpi-purple"><div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div><span class="kpi-label">Total Billed</span><span class="kpi-value" style="font-size:1.2rem">{{ fmt(data()!.summary.totalBilled) }}</span></div>
          <div class="kpi-card kpi-blue"><div class="kpi-icon"><mat-icon>discount</mat-icon></div><span class="kpi-label">Discounts</span><span class="kpi-value" style="font-size:1.2rem">{{ fmt(data()!.summary.totalDiscount) }}</span></div>
          <div class="kpi-card kpi-green"><div class="kpi-icon"><mat-icon>check_circle</mat-icon></div><span class="kpi-label">Paid</span><span class="kpi-value" style="font-size:1.2rem">{{ fmt(data()!.summary.totalPaid) }}</span></div>
          <div class="kpi-card kpi-cyan"><div class="kpi-icon"><mat-icon>shield</mat-icon></div><span class="kpi-label">Waived</span><span class="kpi-value" style="font-size:1.2rem">{{ fmt(data()!.summary.totalWaived) }}</span></div>
          <div class="kpi-card" [class]="data()!.summary.totalDue > 0 ? 'kpi-red' : 'kpi-green'">
            <div class="kpi-icon"><mat-icon>account_balance_wallet</mat-icon></div>
            <span class="kpi-label">Balance Due</span>
            <span class="kpi-value" style="font-size:1.2rem">{{ fmt(data()!.summary.totalDue) }}</span>
          </div>
        </div>

        <!-- Invoices Table -->
        <mat-card class="mb-6">
          <mat-card-header><mat-card-title>Invoice History</mat-card-title></mat-card-header>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="data()!.invoices">
              <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice #</th><td mat-cell *matCellDef="let i"><span class="text-mono">{{ i.invoiceNumber }}</span></td></ng-container>
              <ng-container matColumnDef="period"><th mat-header-cell *matHeaderCellDef>Period</th><td mat-cell *matCellDef="let i">{{ i.billingLabel || '—' }}</td></ng-container>
              <ng-container matColumnDef="issue"><th mat-header-cell *matHeaderCellDef>Issue Date</th><td mat-cell *matCellDef="let i">{{ i.issueDate | date:'mediumDate' }}</td></ng-container>
              <ng-container matColumnDef="due"><th mat-header-cell *matHeaderCellDef>Due Date</th><td mat-cell *matCellDef="let i">{{ i.dueDate | date:'mediumDate' }}</td></ng-container>
              <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let i" style="font-weight:600">{{ i.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="paid"><th mat-header-cell *matHeaderCellDef>Paid</th><td mat-cell *matCellDef="let i" style="color:#16a34a">{{ i.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let i" [style.color]="i.balanceAmount > 0 ? '#dc2626' : '#16a34a'" style="font-weight:600">{{ i.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i"><span class="badge" [class]="'badge-' + i.status">{{ i.status | statusLabel }}</span></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="iCols"></tr>
              <tr mat-row *matRowDef="let row; columns: iCols;"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Payments Table -->
        <mat-card>
          <mat-card-header><mat-card-title>Payment History</mat-card-title></mat-card-header>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="data()!.payments">
              <ng-container matColumnDef="receipt"><th mat-header-cell *matHeaderCellDef>Receipt #</th><td mat-cell *matCellDef="let p"><span class="text-mono">{{ p.receiptNumber }}</span></td></ng-container>
              <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let p">{{ p.paymentDate | date:'mediumDate' }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let p" style="font-weight:700;color:#16a34a">{{ p.amount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="method"><th mat-header-cell *matHeaderCellDef>Method</th><td mat-cell *matCellDef="let p" style="text-transform:capitalize">{{ p.method | statusLabel }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let p"><span class="badge" [class]="'badge-' + p.status">{{ p.status | statusLabel }}</span></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="pCols"></tr>
              <tr mat-row *matRowDef="let row; columns: pCols;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      } @else if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      }
    </div>
  `,
  styles: [`
    .big-avatar{width:56px;height:56px;border-radius:50%;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;flex-shrink:0}
    .print-header{display:none}
    @media print{.print-header{display:block;text-align:center;margin-bottom:24px}.no-print{display:none!important}}
  `]
})
export class StudentStatementComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  data = signal<any>(null);
  loading = signal(true);
  today = new Date();
  iCols = ['invoice','period','issue','due','total','paid','balance','status'];
  pCols = ['receipt','date','amount','method','status'];

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.api.get<any>(`/reports/student-statement/${id}`)
      .subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  fmt(n: number) { if (n >= 1_000_000) return `₨${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `₨${(n/1_000).toFixed(0)}K`; return `₨${(n||0).toFixed(0)}`; }
}
