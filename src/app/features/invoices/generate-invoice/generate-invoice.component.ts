import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, Student, FeeStructure, FeePlanPreview } from '../../../core/models';

@Component({
  selector: 'app-generate-invoice',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Generate Invoice</h1>
          <p class="section-subtitle">Create a fee invoice for a specific student</p>
        </div>
        <button mat-stroked-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">

        <!-- MAIN FORM -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Step 1: Student lookup -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="step-badge">1</div> Find Student
                </div>
              </mat-card-title>
              <mat-card-subtitle>Type registration number — instantly fetches student info</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div style="display:flex;gap:12px;margin-top:14px;align-items:flex-end">
                <mat-form-field style="flex:1">
                  <mat-label>Registration Number</mat-label>
                  <input matInput [formControl]="regNoCtrl"
                         placeholder="STU-2024-XXXXXX"
                         (keyup.enter)="lookupStudent()"
                         autocomplete="off">
                  <mat-icon matSuffix>badge</mat-icon>
                  <mat-hint>Press Enter or click Search</mat-hint>
                </mat-form-field>
                <button mat-flat-button color="primary"
                        (click)="lookupStudent()"
                        [disabled]="searching() || !regNoCtrl.value"
                        style="margin-bottom:21px">
                  @if (searching()) { <mat-spinner diameter="18" /> }
                  @else { <mat-icon>search</mat-icon> }
                  Search
                </button>
              </div>

              @if (student()) {
                <div class="student-found-card">
                  <div class="s-avatar">
                    {{ (student()!.user?.firstName || 'U')[0] }}{{ (student()!.user?.lastName || 'U')[0] }}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:1rem">
                      {{ student()!.user?.firstName }} {{ student()!.user?.lastName }}
                    </div>
                    <div style="font-size:.8rem;color:#64748b">
                      <span class="text-mono">{{ student()!.registrationNumber }}</span>
                      @if (student()!.class?.name) { · {{ student()!.class?.name }} }
                      @if (student()!.rollNumber) { · Roll #{{ student()!.rollNumber }} }
                    </div>
                    @if (student()!.fatherName) {
                      <div style="font-size:.75rem;color:#94a3b8">Father: {{ student()!.fatherName }} {{ student()!.fatherPhone ? '(' + student()!.fatherPhone + ')' : '' }}</div>
                    }
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <span class="badge" [class]="student()!.isActive ? 'badge-active' : 'badge-overdue'">
                      {{ student()!.isActive ? 'Active' : 'Inactive' }}
                    </span>
                    <button mat-icon-button (click)="clearStudent()" matTooltip="Clear">
                      <mat-icon style="font-size:16px;color:#94a3b8">close</mat-icon>
                    </button>
                  </div>
                </div>
              }

              @if (notFound()) {
                <div class="msg-box msg-error" style="margin-top:12px">
                  <mat-icon>search_off</mat-icon>
                  <span>No student found for <strong>{{ lastSearched }}</strong>.
                    <a routerLink="/students/new" style="color:#b91c1c;margin-left:4px;font-weight:600">Enroll new →</a>
                  </span>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Step 2: Invoice details (shown after student found) -->
          @if (student()) {
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="step-badge">2</div> Invoice Period & Dates
                  </div>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
                  <div class="form-grid-2">
                    <mat-form-field>
                      <mat-label>Academic Year *</mat-label>
                      <mat-select formControlName="academicYearId" (selectionChange)="onYearChange($event.value)">
                        @for (y of years(); track y.id) {
                          <mat-option [value]="y.id">{{ y.name }}{{ y.isCurrent ? ' (Current)' : '' }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Billing Label</mat-label>
                      <input matInput formControlName="billingLabel" placeholder="e.g. January 2025 Fee">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Billing Month</mat-label>
                      <mat-select formControlName="billingMonth">
                        <mat-option value="">— None —</mat-option>
                        @for (m of months; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Billing Year</mat-label>
                      <input matInput type="number" formControlName="billingYear">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Issue Date *</mat-label>
                      <input matInput [matDatepicker]="idate" formControlName="issueDate">
                      <mat-datepicker-toggle matIconSuffix [for]="idate" />
                      <mat-datepicker #idate />
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Due Date *</mat-label>
                      <input matInput [matDatepicker]="ddate" formControlName="dueDate">
                      <mat-datepicker-toggle matIconSuffix [for]="ddate" />
                      <mat-datepicker #ddate />
                    </mat-form-field>
                  </div>

                  <mat-form-field>
                    <mat-label>Notes (optional)</mat-label>
                    <textarea matInput formControlName="notes" rows="2"></textarea>
                  </mat-form-field>

                  <div class="flex-end mt-4">
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                      @if (saving()) { <mat-spinner diameter="18" /> }
                      @else { <mat-icon>receipt</mat-icon> }
                      Generate Invoice
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- SIDEBAR: Fee Preview -->
        <div style="display:flex;flex-direction:column;gap:16px">
          @if (student() && form.get('academicYearId')?.value) {
            <mat-card>
              <mat-card-header>
                <mat-card-title>Fee Preview</mat-card-title>
                <mat-card-subtitle>
                  @if (loadingPreview()) { Loading… }
                  @else if (preview()?.hasPlan) { ✓ Custom fee plan }
                  @else { Class default fees }
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (loadingPreview()) {
                  <div style="text-align:center;padding:24px"><mat-spinner diameter="28" /></div>

                } @else if (preview()?.hasPlan) {
                  <div class="msg-box msg-success" style="margin-bottom:12px">
                    <mat-icon>verified</mat-icon>
                    <span>Custom fee plan — amounts are frequency-adjusted.</span>
                  </div>
                  @for (p of preview()!.plans; track p.feeStructureName) {
                    <div class="fee-line">
                      <div>
                        <div style="font-size:.875rem;font-weight:600">{{ p.feeStructureName }}</div>
                        <div style="font-size:.72rem;color:#64748b;text-transform:capitalize">
                          {{ p.billingFrequency.replace('_',' ') }}
                          (₨{{ p.baseAmount | number:'1.0-0' }} × {{ p.multiplier }})
                        </div>
                      </div>
                      <strong>{{ p.billedAmount | currency:'PKR ':'symbol':'1.0-0' }}</strong>
                    </div>
                  }
                  <mat-divider class="mt-3 mb-3" />
                  <div class="fee-line" style="font-size:1rem;font-weight:700">
                    <span>Invoice Total</span>
                    <span style="color:#2563eb">{{ preview()!.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</span>
                  </div>
                  <a mat-stroked-button style="width:100%;margin-top:12px;font-size:.8rem"
                     [routerLink]="['/student-fee-plans/assign']"
                     [queryParams]="{studentId: student()!.id}">
                    <mat-icon>edit</mat-icon> Edit Fee Plan
                  </a>

                } @else {
                  <div class="msg-box msg-info" style="margin-bottom:12px">
                    <mat-icon>info</mat-icon>
                    <span>No custom plan — all active class fee structures will be included.</span>
                  </div>
                  @for (fs of classFeeSummary(); track fs.id) {
                    <div class="fee-line">
                      <div>
                        <div style="font-size:.875rem;font-weight:600">{{ fs.name }}</div>
                        <div style="font-size:.72rem;color:#64748b;text-transform:capitalize">
                          {{ fs.category }} · {{ fs.frequency.replace('_',' ') }}
                        </div>
                      </div>
                      <strong>{{ fs.amount | currency:'PKR ':'symbol':'1.0-0' }}</strong>
                    </div>
                  }
                  @if (!classFeeSummary().length) {
                    <p style="color:#94a3b8;font-size:.8rem;text-align:center;padding:12px">
                      No active fee structures for this class.
                    </p>
                  }
                  @if (classFeeSummary().length) {
                    <mat-divider class="mt-3 mb-3" />
                    <div class="fee-line" style="font-size:1rem;font-weight:700">
                      <span>Estimated Total</span>
                      <span style="color:#2563eb">{{ classFeeTotal() | currency:'PKR ':'symbol':'1.0-0' }}</span>
                    </div>
                  }
                  <a mat-flat-button color="accent" style="width:100%;margin-top:12px;font-size:.8rem"
                     [routerLink]="['/student-fee-plans/assign']"
                     [queryParams]="{studentId: student()!.id}">
                    <mat-icon>add</mat-icon> Assign Custom Fee Plan
                  </a>
                }
              </mat-card-content>
            </mat-card>
          } @else {
            <mat-card>
              <mat-card-content style="text-align:center;padding:32px;color:#94a3b8">
                <mat-icon style="font-size:48px;height:48px;width:48px;margin-bottom:12px">manage_search</mat-icon>
                <p>Search for a student to see fee preview.</p>
              </mat-card-content>
            </mat-card>
          }

          <mat-card>
            <mat-card-header><mat-card-title>Quick Tips</mat-card-title></mat-card-header>
            <mat-card-content>
              <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
                @for (t of tips; track t.icon) {
                  <div style="display:flex;gap:10px;align-items:flex-start;font-size:.8rem;color:#475569">
                    <mat-icon style="font-size:18px;color:#2563eb;flex-shrink:0;margin-top:1px">{{ t.icon }}</mat-icon>
                    <span>{{ t.text }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .step-badge {
      width:28px; height:28px; background:#2563eb; color:#fff; border-radius:50%;
      display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700; flex-shrink:0;
    }
    .student-found-card {
      display:flex; align-items:flex-start; gap:12px; padding:14px;
      background:#f0fdf4; border:1px solid #86efac; border-radius:10px; margin-top:12px;
    }
    .s-avatar {
      width:44px; height:44px; border-radius:50%; background:#dbeafe; color:#2563eb;
      display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; flex-shrink:0;
    }
    .msg-box {
      display:flex; align-items:flex-start; gap:8px; padding:10px 14px;
      border-radius:8px; font-size:.8rem;
      mat-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
    }
    .msg-error   { background:#fee2e2; color:#b91c1c; }
    .msg-success { background:#dcfce7; color:#15803d; }
    .msg-info    { background:#eff6ff; color:#1e40af; }
    .fee-line { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; }
  `]
})
export class GenerateInvoiceComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);
  searching = signal(false);
  notFound = signal(false);
  loadingPreview = signal(false);
  years = signal<AcademicYear[]>([]);
  student = signal<Student | null>(null);
  preview = signal<FeePlanPreview | null>(null);
  classFeeSummary = signal<FeeStructure[]>([]);
  lastSearched = '';

  regNoCtrl = this.fb.control('');
  months = [1,2,3,4,5,6,7,8,9,10,11,12].map(v => ({
    v, l: new Date(2000, v-1, 1).toLocaleString('en', { month: 'long' })
  }));

  tips = [
    { icon: 'badge',        text: 'Enter any part of the registration number — no dropdown needed.' },
    { icon: 'assignment',   text: 'If the student has a fee plan, amounts are automatically frequency-adjusted.' },
    { icon: 'school',       text: "Without a plan, all active class fee structures are included." },
    { icon: 'receipt_long', text: 'The preview shows exactly what will be on the invoice.' },
  ];

  form = this.fb.group({
    academicYearId: ['', Validators.required],
    billingMonth:   [''],
    billingYear:    [new Date().getFullYear()],
    billingLabel:   [''],
    issueDate:      [new Date(), Validators.required],
    dueDate:        ['', Validators.required],
    notes:          [''],
  });

  classFeeTotal() { return this.classFeeSummary().reduce((s, f) => s + +f.amount, 0); }

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) this.form.patchValue({ academicYearId: cur.id });
    });

    const qp = this.route.snapshot.queryParams;
    if (qp['studentId']) this.loadStudentById(qp['studentId']);
    else if (qp['regNo']) { this.regNoCtrl.setValue(qp['regNo']); setTimeout(() => this.lookupStudent(), 300); }
  }

  lookupStudent() {
    const q = this.regNoCtrl.value?.trim();
    if (!q) return;
    this.lastSearched = q;
    this.searching.set(true);
    this.notFound.set(false);
    this.student.set(null);
    this.preview.set(null);
    this.classFeeSummary.set([]);

    this.api.getPaginated<Student>('/students', { limit: 5, search: q }, {}).subscribe({
      next: r => {
        const exact = r.data.find(s => s.registrationNumber.toLowerCase() === q.toLowerCase());
        const found = exact || r.data[0];
        if (found) { this.student.set(found); this.loadFeePreview(found); }
        else this.notFound.set(true);
        this.searching.set(false);
      },
      error: () => { this.notFound.set(true); this.searching.set(false); }
    });
  }

  loadStudentById(id: string) {
    this.api.get<Student>(`/students/${id}`).subscribe(s => {
      this.student.set(s);
      this.regNoCtrl.setValue(s.registrationNumber);
      this.loadFeePreview(s);
    });
  }

  clearStudent() {
    this.student.set(null); this.preview.set(null);
    this.classFeeSummary.set([]); this.notFound.set(false); this.regNoCtrl.reset();
  }

  onYearChange(yearId: string) {
    if (this.student()) this.loadFeePreview(this.student()!);
  }

  loadFeePreview(student: Student) {
    const yearId = this.form.get('academicYearId')?.value;
    if (!yearId) return;
    this.loadingPreview.set(true);
    this.preview.set(null);
    this.classFeeSummary.set([]);

    this.api.get<FeePlanPreview>(`/student-fee-plans/student/${student.id}/preview`, { academicYearId: yearId }).subscribe({
      next: p => {
        this.preview.set(p);
        if (!p.hasPlan && student.classId) {
          this.api.getPaginated<FeeStructure>('/fee-structures', { limit: 50 }, {
            academicYearId: yearId, isActive: 'true', classId: student.classId,
          }).subscribe(r => this.classFeeSummary.set(r.data));
        }
        this.loadingPreview.set(false);
      },
      error: () => {
        this.preview.set({ hasPlan: false, plans: [], totalAmount: 0 });
        if (student.classId) {
          this.api.getPaginated<FeeStructure>('/fee-structures', { limit: 50 }, {
            academicYearId: yearId, isActive: 'true', classId: student.classId,
          }).subscribe(r => this.classFeeSummary.set(r.data));
        }
        this.loadingPreview.set(false);
      }
    });
  }

  submit() {
    if (this.form.invalid || !this.student()) {
      this.snackBar.open('Please find a student first', 'Close');
      return;
    }
    this.saving.set(true);
    const v = this.form.value as any;
    const payload = {
      studentId: this.student()!.id,
      academicYearId: v.academicYearId,
      billingMonth:   v.billingMonth  ? +v.billingMonth  : undefined,
      billingYear:    v.billingYear   ? +v.billingYear   : undefined,
      billingLabel:   v.billingLabel  || undefined,
      issueDate:      new Date(v.issueDate).toISOString().split('T')[0],
      dueDate:        new Date(v.dueDate).toISOString().split('T')[0],
      notes:          v.notes || undefined,
    };
    this.api.post<any>('/fee-invoices/generate', payload).subscribe({
      next: inv => {
        this.snackBar.open('Invoice generated!', 'OK', { duration: 5000 });
        this.router.navigate(['/invoices', inv.id]);
      },
      error: e => { this.snackBar.open(e.message || 'Error generating invoice', 'Close'); this.saving.set(false); }
    });
  }
}
