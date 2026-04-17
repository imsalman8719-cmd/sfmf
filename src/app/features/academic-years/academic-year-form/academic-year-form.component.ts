import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';

interface FeeLineBreakdown {
  feeName: string;
  category: string;
  frequency: string;
  monthlyRate: number;
  amountPerPeriod: number;
  periodsPerYear: number;
  annualTotal: number;
  isCustomAmount: boolean;
  billingMonths: string;
}

interface StudentBreakdown {
  studentId: string;
  name: string;
  registrationNumber: string;
  hasPlan: boolean;
  lines: FeeLineBreakdown[];
  studentAnnualTotal: number;
}

interface TargetBreakdown {
  academicYear: string;
  totalStudents: number;
  annualTarget: number;
  monthlyTargets: Record<string, number>;
  quarterlyTargets: Record<string, number>;
  students: StudentBreakdown[];
  grandTotal: number;
  explanation: string;
}

const FREQ_MULTIPLIER: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  one_time: 1,
  custom: 1,
};

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly (12 payments)',
  quarterly: 'Quarterly (4 payments)',
  semi_annual: 'Semi-Annual (2 payments)',
  annual: 'Annual (1 payment)',
  one_time: 'One-Time (1 payment)',
  custom: 'Custom (12 payments)',
};

const FREQ_MONTHS: Record<string, string> = {
  monthly: 'Jan–Dec (every month)',
  quarterly: 'Mar, Jun, Sep, Dec',
  semi_annual: 'Jun, Dec',
  annual: 'Dec only',
  one_time: 'Jan only',
  custom: 'Jan–Dec (every month)',
};

@Component({
  selector: 'app-academic-year-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule, MatExpansionModule, MatChipsModule
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">{{ isEdit ? 'Edit Academic Year' : 'New Academic Year' }}</h1></div>
        <button mat-stroked-button routerLink="/academic-years"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 480px;gap:20px;align-items:start">

        <!-- Left: Form -->
        <mat-card>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
              <div class="form-grid-2">
                <mat-form-field><mat-label>Year Name *</mat-label><input matInput formControlName="name" placeholder="2024-2025"></mat-form-field>
                <mat-form-field style="grid-column:1/-1"><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
                <mat-form-field><mat-label>Start Date *</mat-label><input matInput [matDatepicker]="sd" formControlName="startDate"><mat-datepicker-toggle matIconSuffix [for]="sd" /><mat-datepicker #sd /></mat-form-field>
                <mat-form-field><mat-label>End Date *</mat-label><input matInput [matDatepicker]="ed" formControlName="endDate"><mat-datepicker-toggle matIconSuffix [for]="ed" /><mat-datepicker #ed /></mat-form-field>
              </div>
              <mat-checkbox formControlName="isCurrent">Set as current academic year</mat-checkbox>
              <div class="flex-end mt-4">
                <button mat-stroked-button type="button" routerLink="/academic-years">Cancel</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
                  Save
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Right: Auto-target panel -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-icon style="color:#2563eb">auto_graph</mat-icon>
                  Fee Targets
                </div>
              </mat-card-title>
              <mat-card-subtitle>Auto-calculated — no discount, just different payment schedules</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (!isEdit) {
                <div class="info-box mt-4">
                  <mat-icon>info</mat-icon>
                  <span>Save the year first, then calculate targets from enrolled students and fee plans.</span>
                </div>
              } @else {
                <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">

                  <button mat-flat-button color="accent" (click)="recalculate()" [disabled]="recalculating()">
                    @if (recalculating()) { <mat-spinner diameter="18" /> } @else { <mat-icon>calculate</mat-icon> }
                    {{ bd() ? 'Recalculate' : 'Calculate Targets' }}
                  </button>

                  @if (bd(); as data) {
                    <!-- Summary row -->
                    <div class="target-summary">
                      <div class="ts-item kpi-purple">
                        <span class="ts-label">Annual Target</span>
                        <span class="ts-value">{{ data.annualTarget | currency:'PKR ':'symbol':'1.0-0' }}</span>
                      </div>
                      <div class="ts-item kpi-blue">
                        <span class="ts-label">Students</span>
                        <span class="ts-value">{{ data.totalStudents }}</span>
                      </div>
                    </div>

                    <!-- Monthly targets grid -->
                    <div>
                      <div style="font-size:.8rem;font-weight:600;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
                        Monthly Expected Collections
                      </div>
                      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
                        @for (m of monthList; track m.key) {
                          <div class="month-chip" [class.month-high]="isHighMonth(m.key)">
                            <span style="font-size:.72rem;color:#64748b">{{ m.l }}</span>
                            <span style="font-size:.8rem;font-weight:700">{{ (data.monthlyTargets[m.key] || 0) | currency:'PKR ':'symbol':'1.0-0' }}</span>
                          </div>
                        }
                      </div>
                      <div class="check-total mt-3">
                        <mat-icon style="font-size:16px;color:#16a34a">check_circle</mat-icon>
                        <span>Monthly sum = {{ monthlySum() | currency:'PKR ':'symbol':'1.0-0' }} = Annual target</span>
                      </div>
                    </div>

                    <mat-divider />

                    <!-- Quarterly -->
                    <div>
                      <div style="font-size:.8rem;font-weight:600;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Quarterly Targets</div>
                      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
                        @for (q of ['Q1','Q2','Q3','Q4']; track q) {
                          <div class="month-chip">
                            <span style="font-size:.72rem;color:#64748b">{{ q }} ({{ qMonths(q) }})</span>
                            <span style="font-size:.8rem;font-weight:700">{{ (data.quarterlyTargets[q] || 0) | currency:'PKR ':'symbol':'1.0-0' }}</span>
                          </div>
                        }
                      </div>
                    </div>

                    <mat-divider />

                    <!-- Per-student breakdown -->
                    <div>
                      <div style="font-size:.8rem;font-weight:600;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
                        How It's Calculated — Per Student
                      </div>
                      <mat-accordion>
                        @for (student of data.students; track student.studentId) {
                          <mat-expansion-panel>
                            <mat-expansion-panel-header>
                              <mat-panel-title>
                                <div style="display:flex;align-items:center;gap:8px;min-width:0">
                                  <div class="s-avatar">{{ (student.name && student.name[0]) || '?' }}</div>
                                  <div style="min-width:0">
                                    <div style="font-size:.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ student.name || 'Unknown' }}</div>
                                    <div style="font-size:.72rem;color:#64748b">{{ student.registrationNumber || 'N/A' }}</div>
                                  </div>
                                </div>
                              </mat-panel-title>
                              <mat-panel-description>
                                <span style="margin-left:auto;font-weight:700;color:#2563eb">{{ student.studentAnnualTotal | currency:'PKR ':'symbol':'1.0-0' }}/yr</span>
                              </mat-panel-description>
                            </mat-expansion-panel-header>

                            <div style="padding:4px 0">
                              <div style="margin-bottom:8px">
                                <span class="badge badge-pending" style="font-size:.72rem">
                                  Class fees + selected services
                                </span>
                              </div>

                              @for (line of student.lines; track line.feeName) {
                                <div class="fee-line-row">
                                  <div style="flex:1;min-width:0">
                                    <div style="font-size:.8rem;font-weight:600">{{ line.feeName }}</div>
                                    <div style="font-size:.72rem;color:#64748b;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                                      <span style="text-transform:capitalize;background:#f1f5f9;padding:1px 6px;border-radius:10px">{{ line.category }}</span>
                                      <span style="color:#2563eb">{{ FREQ_LABEL[line.frequency] }}</span>
                                      @if (line.isCustomAmount) { <span style="color:#f59e0b">(custom amount)</span> }
                                    </div>
                                    <div style="font-size:.72rem;color:#94a3b8;margin-top:2px">
                                      Billed in: {{ line.billingMonths }}
                                    </div>
                                    <div style="font-size:.65rem;color:#64748b;margin-top:2px;font-family:monospace">
                                      {{ line.monthlyRate | currency:'PKR ':'symbol':'1.0-0' }}/month × {{ getMultiplier(line.frequency) }} = {{ line.amountPerPeriod | currency:'PKR ':'symbol':'1.0-0' }}/period
                                    </div>
                                  </div>
                                  <div style="text-align:right;flex-shrink:0">
                                    <div style="font-size:.875rem;font-weight:700">{{ line.amountPerPeriod | currency:'PKR ':'symbol':'1.0-0' }}</div>
                                    <div style="font-size:.72rem;color:#64748b">× {{ line.periodsPerYear }} payment{{ line.periodsPerYear > 1 ? 's' : '' }}</div>
                                    <div style="font-size:.8rem;font-weight:700;color:#2563eb">= {{ line.annualTotal | currency:'PKR ':'symbol':'1.0-0' }}/yr</div>
                                  </div>
                                </div>
                              }

                              <div style="display:flex;justify-content:space-between;border-top:2px solid #e2e8f0;padding-top:8px;margin-top:8px">
                                <span style="font-size:.8rem;font-weight:600;color:#475569">{{ student.name }}'s Annual Total</span>
                                <span style="font-weight:700;color:#0f172a">{{ student.studentAnnualTotal | currency:'PKR ':'symbol':'1.0-0' }}</span>
                              </div>
                            </div>
                          </mat-expansion-panel>
                        }
                      </mat-accordion>

                      <!-- Grand total verification -->
                      <div class="grand-total mt-4">
                        <div style="font-size:.8rem;color:#475569">Grand Total (all students)</div>
                        @for (student of data.students; track student.studentId) {
                          <div style="font-size:.75rem;color:#64748b;display:flex;justify-content:space-between;margin-top:2px">
                            <span>{{ student.name }}</span>
                            <span>{{ student.studentAnnualTotal | currency:'PKR ':'symbol':'1.0-0' }}</span>
                          </div>
                        }
                        <mat-divider class="mt-2 mb-2" />
                        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.9rem">
                          <span>= Annual Target</span>
                          <span style="color:#2563eb">{{ data.annualTarget | currency:'PKR ':'symbol':'1.0-0' }}</span>
                        </div>
                        <div style="font-size:.7rem;color:#64748b;margin-top:8px;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px">
                          💡 No discounts applied — all payment schedules result in the same annual total (monthly rate × 12)
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .info-box { display:flex; align-items:flex-start; gap:8px; padding:12px; background:#eff6ff; border-radius:8px; font-size:.8rem; color:#1e40af; mat-icon { font-size:18px; flex-shrink:0; } }
    .target-summary { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .ts-item { padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:4px; }
    .ts-label { font-size:.75rem; color:#64748b; }
    .ts-value { font-size:1.1rem; font-weight:800; color:#0f172a; }
    .month-chip { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; display:flex; flex-direction:column; gap:2px; }
    .month-high { background:#eff6ff; border-color:#bfdbfe; }
    .check-total { display:flex; align-items:center; gap:6px; font-size:.75rem; color:#16a34a; mat-icon { flex-shrink:0; } }
    .s-avatar { width:28px; height:28px; border-radius:50%; background:#dbeafe; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; flex-shrink:0; }
    .fee-line-row { display:flex; align-items:flex-start; gap:12px; padding:8px 0; border-bottom:1px solid #f1f5f9; }
    .grand-total { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
  `]
})
export class AcademicYearFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  isEdit = false;
  yearId = '';
  saving = signal(false);
  recalculating = signal(false);
  bd = signal<TargetBreakdown | null>(null);

  FREQ_LABEL = FREQ_LABEL;
  FREQ_MONTHS = FREQ_MONTHS;
  FREQ_MULTIPLIER = FREQ_MULTIPLIER;

  // monthList is built dynamically from the breakdown's monthlyTargets keys (format 'YYYY-M')
  get monthList(): Array<{key: string; l: string}> {
    const data = this.bd();
    if (!data?.monthlyTargets) return [];
    return Object.keys(data.monthlyTargets)
      .sort((a, b) => {
        const [ay, am] = a.split('-').map(Number);
        const [by, bm] = b.split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      })
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        const label = new Date(year, month - 1, 1).toLocaleString('en', { month: 'short' }) + ' ' + year;
        return { key, l: label };
      });
  }

  form = this.fb.group({
    name: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    isCurrent: [false],
    description: [''],
  });

  ngOnInit() {
    this.yearId = this.route.snapshot.params['id'];
    this.isEdit = !!this.yearId;
    if (this.isEdit) {
      this.api.get<any>(`/academic-years/${this.yearId}`).subscribe(y => {
        this.form.patchValue(y);
      });
      this.loadBreakdown();
    }
  }

  loadBreakdown() {
    console.log('Loading breakdown for year:', this.yearId);
    this.api.get<TargetBreakdown>(`/academic-years/${this.yearId}/target-breakdown`).subscribe({
      next: (b) => {
        console.log('Breakdown received:', b);
        this.bd.set(b);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading breakdown:', err);
      }
    });
  }

  getMultiplier(frequency: string): number {
    const multipliers: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semi_annual: 6,
      annual: 12,
      one_time: 1,
      custom: 1
    };
    return multipliers[frequency] || 1;
  }

  recalculate() {
    if (!this.yearId) return;
    this.recalculating.set(true);
    this.api.post<any>(`/academic-years/${this.yearId}/recalculate-targets`, {}).subscribe({
      next: () => {
        this.snackBar.open('Targets recalculated!', 'OK');
        this.loadBreakdown();
        this.recalculating.set(false);
      },
      error: e => {
        this.snackBar.open(e.message || 'Error', 'Close');
        this.recalculating.set(false);
      }
    });
  }

  monthlySum(): number {
    const data = this.bd();
    if (!data) return 0;
    return Object.values(data.monthlyTargets).reduce((s, v) => s + v, 0);
  }

  isHighMonth(key: string): boolean {
    const data = this.bd();
    if (!data) return false;
    const val = data.monthlyTargets[key] || 0;
    const total = Object.keys(data.monthlyTargets).length || 1;
    const avg = this.monthlySum() / total;
    return val > avg;
  }

  qMonths(q: string): string {
    return { Q1: 'Jan–Mar', Q2: 'Apr–Jun', Q3: 'Jul–Sep', Q4: 'Oct–Dec' }[q] || '';
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value as any;
    const payload = {
      ...v,
      startDate: v.startDate ? new Date(v.startDate).toISOString().split('T')[0] : '',
      endDate: v.endDate ? new Date(v.endDate).toISOString().split('T')[0] : '',
    };
    const req = this.isEdit
      ? this.api.put(`/academic-years/${this.yearId}`, payload)
      : this.api.post('/academic-years', payload);
    req.subscribe({
      next: (year: any) => {
        this.snackBar.open('Saved', 'OK');
        if (!this.isEdit && year?.id) {
          this.router.navigate(['/academic-years', year.id, 'edit']);
        } else {
          this.saving.set(false);
          this.loadBreakdown();
        }
      },
      error: e => {
        this.snackBar.open(e.message || 'Error', 'Close');
        this.saving.set(false);
      }
    });
  }
}