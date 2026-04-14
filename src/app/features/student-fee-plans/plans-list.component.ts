import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';
import { AcademicYear } from '../../core/models';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule, MatCardModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Student Fee Plans</h1>
          <p class="section-subtitle">Manage per-student billing frequencies — monthly, quarterly, or annual</p>
        </div>
        <button mat-flat-button color="primary" routerLink="assign">
          <mat-icon>add</mat-icon> Assign Fee Plan
        </button>
      </div>

      <!-- Info Cards -->
      <div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi-card kpi-green">
          <div class="kpi-icon"><mat-icon>event_repeat</mat-icon></div>
          <span class="kpi-label">Monthly Plans</span>
          <span class="kpi-value">{{ counts().monthly }}</span>
        </div>
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon"><mat-icon>date_range</mat-icon></div>
          <span class="kpi-label">Quarterly Plans</span>
          <span class="kpi-value">{{ counts().quarterly }}</span>
        </div>
        <div class="kpi-card kpi-purple">
          <div class="kpi-icon"><mat-icon>calendar_today</mat-icon></div>
          <span class="kpi-label">Annual Plans</span>
          <span class="kpi-value">{{ counts().annual }}</span>
        </div>
        <div class="kpi-card kpi-orange">
          <div class="kpi-icon"><mat-icon>people</mat-icon></div>
          <span class="kpi-label">Students with Plans</span>
          <span class="kpi-value">{{ uniqueStudents() }}</span>
        </div>
      </div>

      <!-- Filters + Table -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap">
        <mat-form-field>
          <mat-label>Search student</mat-label>
          <input matInput [formControl]="searchCtrl" placeholder="Name, reg. no…">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field style="min-width:200px">
          <mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            <mat-option value="">All Years</mat-option>
            @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field style="min-width:160px">
          <mat-label>Frequency</mat-label>
          <mat-select [formControl]="freqCtrl">
            <mat-option value="">All</mat-option>
            <mat-option value="monthly">Monthly</mat-option>
            <mat-option value="quarterly">Quarterly</mat-option>
            <mat-option value="semi_annual">Semi-Annual</mat-option>
            <mat-option value="annual">Annual</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="filtered()">
          <ng-container matColumnDef="student">
            <th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let p">
              <div style="font-weight:600;font-size:.875rem">{{ p.student?.user?.firstName }} {{ p.student?.user?.lastName }}</div>
              <div style="font-size:.75rem;color:#64748b">{{ p.student?.registrationNumber }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="feeStructure">
            <th mat-header-cell *matHeaderCellDef>Fee Structure</th>
            <td mat-cell *matCellDef="let p">
              <div style="font-size:.875rem">{{ p.feeStructure?.name }}</div>
              <div style="font-size:.75rem;color:#64748b;text-transform:capitalize">{{ p.feeStructure?.category }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="frequency">
            <th mat-header-cell *matHeaderCellDef>Frequency</th>
            <td mat-cell *matCellDef="let p">
              <span class="badge" [class]="freqBadge(p.billingFrequency)">{{ p.billingFrequency | titlecase }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Billed Amount</th>
            <td mat-cell *matCellDef="let p" style="font-weight:700;color:#2563eb">
              {{ calcAmount(p) | currency:'PKR ':'symbol':'1.0-0' }}
              @if (p.customAmount) { <span style="font-size:.7rem;color:#94a3b8">(custom)</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="year">
            <th mat-header-cell *matHeaderCellDef>Year</th>
            <td mat-cell *matCellDef="let p">{{ p.academicYear?.name }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let p">
              <span class="badge" [class]="p.isActive ? 'badge-active' : 'badge-inactive'">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <a mat-icon-button [routerLink]="['assign']" [queryParams]="{studentId: p.studentId}" matTooltip="Edit Plan"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button (click)="toggle(p)" [matTooltip]="p.isActive ? 'Deactivate' : 'Activate'">
                <mat-icon>{{ p.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              </button>
              <button mat-icon-button (click)="remove(p)" style="color:#dc2626" matTooltip="Remove">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
        @if (!plans().length && !loading()) {
          <div style="text-align:center;padding:48px;color:#94a3b8">
            <mat-icon style="font-size:40px;height:40px;width:40px">assignment</mat-icon>
            <p style="margin-top:8px">No fee plans yet. <a routerLink="assign" style="color:#2563eb">Assign one →</a></p>
          </div>
        }
      </div>
    </div>
  `
})
export class PlansListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  cols = ['student','feeStructure','frequency','amount','year','status','actions'];
  plans = signal<any[]>([]);
  years = signal<AcademicYear[]>([]);
  loading = signal(false);
  searchCtrl = new FormControl('');
  yearCtrl = new FormControl('');
  freqCtrl = new FormControl('');

  counts() {
    const p = this.plans();
    return {
      monthly: p.filter(x => x.billingFrequency === 'monthly').length,
      quarterly: p.filter(x => x.billingFrequency === 'quarterly').length,
      annual: p.filter(x => x.billingFrequency === 'annual').length,
    };
  }

  uniqueStudents() { return new Set(this.plans().map(p => p.studentId)).size; }

  filtered() {
    const q = this.searchCtrl.value?.toLowerCase() || '';
    const y = this.yearCtrl.value || '';
    const f = this.freqCtrl.value || '';
    return this.plans().filter(p =>
      (!q || `${p.student?.user?.firstName} ${p.student?.user?.lastName} ${p.student?.registrationNumber}`.toLowerCase().includes(q)) &&
      (!y || p.academicYearId === y) &&
      (!f || p.billingFrequency === f)
    );
  }

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => this.years.set(Array.isArray(r) ? r : r.data || []));
    this.load();
    [this.searchCtrl, this.yearCtrl, this.freqCtrl].forEach(c => c.valueChanges.subscribe(() => {}));
  }

  load() {
    this.loading.set(true);
    // Fetch all plans — there's no paginated endpoint so we get all
    this.api.get<any[]>('/student-fee-plans/student/all').subscribe({
      next: p => { this.plans.set(Array.isArray(p) ? p : (p as any).data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  freqBadge(f: string) {
    const map: Record<string, string> = { monthly: 'badge-active', quarterly: 'badge-paid', semi_annual: 'badge-pending', annual: 'badge-waived', one_time: 'badge-inactive' };
    return map[f] || 'badge-inactive';
  }

  calcAmount(p: any): number {
    if (p.customAmount) return +p.customAmount;
    const base = Number(p.feeStructure?.amount || 0);
    const mult: Record<string, number> = { one_time: 1, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12, custom: 1 };
    return base * (mult[p.billingFrequency] || 1);
  }

  toggle(p: any) {
    this.api.patch(`/student-fee-plans/${p.id}/toggle`).subscribe({ next: () => { this.snackBar.open('Updated', 'OK'); this.load(); } });
  }

  remove(p: any) {
    this.api.delete(`/student-fee-plans/${p.id}`).subscribe({ next: () => { this.snackBar.open('Removed', 'OK'); this.load(); } });
  }
}