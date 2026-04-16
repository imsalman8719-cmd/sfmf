import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYear, DashboardSummary, FeeInvoice, Payment } from '../../core/models';
import { StatusLabelPipe } from '../../shared/pipes/status-label.pipe';
import { KpiDetailDialogComponent } from './kpi-detail-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, RouterLink, ReactiveFormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatSelectModule,
    MatProgressBarModule, MatDividerModule, MatTableModule,
    MatDialogModule, MatProgressSpinnerModule, MatChipsModule, StatusLabelPipe,
    KpiDetailDialogComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  loading = signal(true);
  data = signal<DashboardSummary | null>(null);
  years = signal<AcademicYear[]>([]);
  yearCtrl = new FormControl('');
  classColumns = ['class', 'collected', 'outstanding'];

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe({
      next: r => {
        const list: AcademicYear[] = Array.isArray(r) ? r : (r.data || []);
        this.years.set(list);

        const current = list.find(y => y.isCurrent) || list[0];
        if (current) {
          this.yearCtrl.setValue(current.id);
          this.loadDashboard(current.id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  loadDashboard(academicYearId: string) {
    if (!academicYearId) return;
    this.loading.set(true);
    this.data.set(null);
    this.api.get<DashboardSummary>('/reports/dashboard', { academicYearId }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  collectionPercent(): number {
    const d = this.data()?.summary;
    if (!d?.totalInvoiced) return 0;
    return Math.min(100, (d.totalCollected / d.totalInvoiced) * 100);
  }

  classData() { return (this.data()?.charts.classWiseSummary || []).slice(0, 6); }

  barHeight(val: number): number {
    const max = Math.max(...(this.data()?.charts.monthlyTrend.map(m => m.collected) || [0]), 1);
    return max ? (val / max) * 100 : 0;
  }

  methodPercent(val: number): number {
    const total = this.data()?.charts.paymentMethodBreakdown.reduce((s, m) => s + +m.amount, 0) || 1;
    return (val / total) * 100;
  }

  methodIcon(m: string): string {
    const map: Record<string, string> = { 
      cash: 'money', 
      bank_transfer: 'account_balance', 
      cheque: 'article', 
      online: 'language', 
      pos: 'point_of_sale' 
    };
    return map[m] || 'payments';
  }

  fmt(n: number): string {
    if (!n) return '₨0';
    if (n >= 1_000_000) return `₨${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₨${(n / 1_000).toFixed(0)}K`;
    return `₨${n.toFixed(0)}`;
  }

  openInvoicedDetail() {
    const ay = this.yearCtrl.value;
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, { academicYearId: ay || undefined }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'All Invoices', subtitle: `${r.meta.total} invoices`, type: 'invoices', items: r.data },
      });
    });
  }

  openCollectedDetail() {
    this.api.getPaginated<Payment>('/payments', { limit: 50 }, { status: 'completed' }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Collected Payments', subtitle: `${r.meta.total} payments`, type: 'payments', items: r.data },
      });
    });
  }

  openOutstandingDetail() {
    const ay = this.yearCtrl.value;
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, { status: 'issued', academicYearId: ay || undefined }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Outstanding Invoices', subtitle: 'Unpaid invoices', type: 'invoices', items: r.data },
      });
    });
  }

  openOverdueDetail() {
    const ay = this.yearCtrl.value;
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, { status: 'overdue', academicYearId: ay || undefined }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Overdue Invoices', subtitle: 'Past due date', type: 'invoices', items: r.data },
      });
    });
  }

  openDefaultersDetail() {
    const ay = this.yearCtrl.value;
    this.api.get<any>('/reports/defaulters', ay ? { academicYearId: ay } : {}).subscribe(r => {
      const defaulters = r?.defaulters || [];
      this.dialog.open(KpiDetailDialogComponent, {
        width: '800px', maxHeight: '90vh',
        data: { title: 'Defaulters', subtitle: `${defaulters.length} students with outstanding dues`, type: 'defaulters', items: defaulters },
      });
    });
  }
}