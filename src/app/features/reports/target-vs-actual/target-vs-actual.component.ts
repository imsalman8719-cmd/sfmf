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
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, TargetVsActual } from '../../../core/models';

@Component({
  selector: 'app-target-vs-actual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, MatDividerModule, MatTabsModule, MatChipsModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Target vs Actual Collection</h1>
          <p class="section-subtitle">Track fee collection performance against targets</p>
        </div>
        <mat-form-field style="min-width:200px">
          <mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      @if (data()) {
        <!-- Annual KPIs -->
        <div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi-card kpi-purple">
            <div class="kpi-icon"><mat-icon>flag</mat-icon></div>
            <span class="kpi-label">Annual Target</span>
            <span class="kpi-value">{{ fmt(data()!.annual.target) }}</span>
          </div>
          <div class="kpi-card kpi-green">
            <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
            <span class="kpi-label">Collected</span>
            <span class="kpi-value">{{ fmt(data()!.annual.collected) }}</span>
            <span class="kpi-sub">{{ data()!.annual.achievementRate }}</span>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><mat-icon>trending_down</mat-icon></div>
            <span class="kpi-label">Shortfall</span>
            <span class="kpi-value">{{ fmt(data()!.annual.shortfall) }}</span>
          </div>
          <div class="kpi-card" [class]="achievementClass()">
            <div class="kpi-icon"><mat-icon>percent</mat-icon></div>
            <span class="kpi-label">Achievement Rate</span>
            <span class="kpi-value" style="font-size:1.5rem">{{ data()!.annual.achievementRate }}</span>
          </div>
        </div>

        <!-- Annual Progress Bar -->
        <mat-card class="mb-6">
          <mat-card-content>
            <div class="flex-between mb-4">
              <h3 style="font-weight:600">Annual Collection Progress</h3>
              <span style="font-weight:700;font-size:1.1rem" [style.color]="achievementColor()">{{ data()!.annual.achievementRate }}</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="annualPct()" [color]="annualPct() >= 100 ? 'accent' : 'primary'" style="height:12px;border-radius:6px" />
            <div class="flex-between mt-4" style="font-size:.8rem;color:#64748b">
              <span>Collected: <strong style="color:#0f172a">{{ data()!.annual.collected | currency:'PKR ':'symbol':'1.0-0' }}</strong></span>
              <span>Target: <strong style="color:#0f172a">{{ data()!.annual.target | currency:'PKR ':'symbol':'1.0-0' }}</strong></span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-tab-group>

          <!-- Quarterly Tab -->
          <mat-tab label="Quarterly">
            <div class="form-grid-2 mt-6" style="gap:16px">
              @for (q of data()!.quarterly; track q.quarter) {
                <mat-card [class.current-quarter]="isCurrentQuarter(q.quarter)">
                  @if (isCurrentQuarter(q.quarter)) {
                    <div class="current-quarter-label">
                      <mat-icon style="font-size:13px;height:13px;width:13px">schedule</mat-icon> Current Quarter
                    </div>
                  }
                  <mat-card-content style="margin-top: 12px;">
                    <div class="flex-between mb-3">
                      <div>
                        <h3 style="font-weight:700;font-size:1rem">{{ q.quarter }}</h3>
                        <p style="font-size:.75rem;color:#64748b">{{ q.months }}</p>
                      </div>
                      <span class="badge" [class]="rateClass(q.achievementRate)">{{ q.achievementRate }}</span>
                    </div>
                    <mat-progress-bar mode="determinate" [value]="pct(q.collected, q.target)" color="primary" style="margin-bottom:12px" />
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.8rem">
                      <div><span style="color:#64748b">Target</span><br><strong>{{ q.target | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                      <div><span style="color:#64748b">Collected</span><br><strong style="color:#16a34a">{{ q.collected | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                      <div><span style="color:#64748b">Invoiced</span><br><strong>{{ q.invoiced | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                      <div><span style="color:#64748b">Shortfall</span><br><strong style="color:#dc2626">{{ q.shortfall | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>

          <!-- Monthly Tab -->
          <mat-tab label="Monthly Breakdown">
            <div class="table-container mt-6">
              <table mat-table [dataSource]="data()!.monthly">
                <ng-container matColumnDef="month"><th mat-header-cell *matHeaderCellDef>Month</th><td mat-cell *matCellDef="let m" style="font-weight:600">{{ m.monthName }}</td></ng-container>
                <ng-container matColumnDef="target"><th mat-header-cell *matHeaderCellDef>Target</th><td mat-cell *matCellDef="let m">{{ m.target | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="invoiced"><th mat-header-cell *matHeaderCellDef>Invoiced</th><td mat-cell *matCellDef="let m">{{ m.invoiced | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="collected"><th mat-header-cell *matHeaderCellDef>Collected</th><td mat-cell *matCellDef="let m" style="color:#16a34a;font-weight:600">{{ m.collected | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="shortfall"><th mat-header-cell *matHeaderCellDef>Shortfall</th><td mat-cell *matCellDef="let m" [style.color]="m.shortfall > 0 ? '#dc2626' : '#16a34a'">{{ m.shortfall > 0 ? (m.shortfall | currency:'PKR ':'symbol':'1.0-0') : '—' }}</td></ng-container>
                <ng-container matColumnDef="rate">
                  <th mat-header-cell *matHeaderCellDef>Achievement</th>
                  <td mat-cell *matCellDef="let m">
                    <div style="display:flex;align-items:center;gap:8px">
                      <mat-progress-bar mode="determinate" [value]="pct(m.collected, m.target)" style="width:80px" />
                      <span style="font-size:.8rem;font-weight:600">{{ m.achievementRate }}</span>
                    </div>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="mCols"></tr>
                <tr mat-row *matRowDef="let row; columns: mCols;" [class.current-month-row]="isCurrentMonth(row)"></tr>
              </table>
            </div>
          </mat-tab>

        </mat-tab-group>
      } @else if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      }
    </div>
  `,
  styles: [`
    .current-quarter {
      border: 2px solid #2563eb !important;
      box-shadow: 0 0 0 4px rgba(37,99,235,.1);
      position: relative;
    }
    .current-quarter-label {
      display: flex;
      align-items: center;
      gap: 4px;
      position: absolute;
      top: 0;
      right: 12px;
      background: #2563eb;
      color: #fff;
      font-size: .68rem;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 0 0 8px 8px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .current-month-row { background: #eff6ff !important; }
    .current-month-row td { font-weight: 700 !important; color: #1d4ed8 !important; }
  `]
})
export class TargetVsActualComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<TargetVsActual | null>(null);
  years = signal<AcademicYear[]>([]);
  loading = signal(false);
  yearCtrl = new FormControl('');
  mCols = ['month','target','invoiced','collected','shortfall','rate'];

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
    this.api.get<TargetVsActual>('/reports/target-vs-actual', { academicYearId: yearId })
      .subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  fmt(n: number) { if (n >= 1_000_000) return `₨${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `₨${(n/1_000).toFixed(0)}K`; return `₨${(n||0).toFixed(0)}`; }
  annualPct() { const d = this.data()?.annual; return d?.target ? Math.min(100, (d.collected / d.target) * 100) : 0; }
  pct(c: number, t: number) { return t ? Math.min(100, (c / t) * 100) : 0; }
  achievementClass() { const p = this.annualPct(); return p >= 90 ? 'kpi-green' : p >= 70 ? 'kpi-blue' : 'kpi-red'; }
  achievementColor() { const p = this.annualPct(); return p >= 90 ? '#16a34a' : p >= 70 ? '#2563eb' : '#dc2626'; }
  rateClass(r: string) { const n = parseFloat(r); return n >= 90 ? 'badge-paid' : n >= 70 ? 'badge-pending' : 'badge-overdue'; }

  isCurrentQuarter(quarter: string): boolean {
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    return quarter === `Q${q}`;
  }

  isCurrentMonth(m: { month: number; year: number }): boolean {
    const n = new Date();
    return m.month === n.getMonth() + 1 && m.year === n.getFullYear();
  }
}
