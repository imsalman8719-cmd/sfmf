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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass, Student, FeeStructure } from '../../../core/models';

@Component({
  selector: 'app-generate-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Generate Invoice</h1><p class="section-subtitle">Create a fee invoice for a student</p></div>
        <button mat-stroked-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
        <mat-card>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
              <h3 style="font-weight:600;color:#475569;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em">Student & Period</h3>
              <div class="form-grid-2">
                <mat-form-field>
                  <mat-label>Academic Year *</mat-label>
                  <mat-select formControlName="academicYearId" (selectionChange)="onYearChange($event.value)">
                    @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Student *</mat-label>
                  <mat-select formControlName="studentId">
                    @for (s of students(); track s.id) { <mat-option [value]="s.id">{{ s.user?.firstName }} {{ s.user?.lastName }} – {{ s.registrationNumber }}</mat-option> }
                  </mat-select>
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
                  <input matInput type="number" formControlName="billingYear" [value]="currentYear">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Issue Date *</mat-label>
                  <input matInput [matDatepicker]="issue" formControlName="issueDate">
                  <mat-datepicker-toggle matIconSuffix [for]="issue" /><mat-datepicker #issue />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Due Date *</mat-label>
                  <input matInput [matDatepicker]="due" formControlName="dueDate">
                  <mat-datepicker-toggle matIconSuffix [for]="due" /><mat-datepicker #due />
                </mat-form-field>
              </div>
              <mat-form-field><mat-label>Billing Label</mat-label><input matInput formControlName="billingLabel" placeholder="e.g. January 2025 Fee"></mat-form-field>
              <mat-form-field><mat-label>Notes</mat-label><textarea matInput formControlName="notes" rows="2"></textarea></mat-form-field>
              <div class="flex-end mt-4">
                <button mat-stroked-button type="button" routerLink="/invoices">Cancel</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>receipt</mat-icon> } Generate Invoice
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Fee Structures Preview -->
        <mat-card>
          <mat-card-header><mat-card-title>Applicable Fees</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (feeStructures().length) {
              @for (fs of feeStructures(); track fs.id) {
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
                  <div>
                    <div style="font-size:.875rem;font-weight:600">{{ fs.name }}</div>
                    <div style="font-size:.75rem;color:#64748b;text-transform:capitalize">{{ fs.category }} · {{ fs.frequency }}</div>
                  </div>
                  <div style="font-weight:700;color:#0f172a">{{ fs.amount | currency:'PKR ':'symbol':'1.0-0' }}</div>
                </div>
              }
              <div style="display:flex;justify-content:space-between;padding-top:12px;font-weight:700;font-size:1rem">
                <span>Estimated Total</span>
                <span style="color:#2563eb">{{ feeTotal() | currency:'PKR ':'symbol':'1.0-0' }}</span>
              </div>
            } @else {
              <p style="color:#94a3b8;text-align:center;padding:24px;font-size:.875rem">Select a student to preview fees</p>
            }
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class GenerateInvoiceComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  students = signal<Student[]>([]);
  feeStructures = signal<FeeStructure[]>([]);
  currentYear = new Date().getFullYear();
  months = [1,2,3,4,5,6,7,8,9,10,11,12].map(v => ({v, l: new Date(2000,v-1,1).toLocaleString('en',{month:'long'})}));

  form = this.fb.group({
    academicYearId: ['', Validators.required],
    studentId: ['', Validators.required],
    billingMonth: [''],
    billingYear: [this.currentYear],
    billingLabel: [''],
    issueDate: [new Date(), Validators.required],
    dueDate: ['', Validators.required],
    notes: [''],
  });

  feeTotal() { return this.feeStructures().reduce((s, f) => s + +f.amount, 0); }

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const years = Array.isArray(r) ? r : r.data || [];
      this.years.set(years);
      const cur = years.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.form.patchValue({ academicYearId: cur.id }); this.onYearChange(cur.id); }
    });
    const qp = this.route.snapshot.queryParams;
    if (qp['studentId']) this.form.patchValue({ studentId: qp['studentId'] });
  }

  onYearChange(yearId: string) {
    this.api.getPaginated<Student>('/students', { limit: 500 }, { academicYearId: yearId }).subscribe(r => this.students.set(r.data));
    this.api.getPaginated<FeeStructure>('/fee-structures', { limit: 100 }, { academicYearId: yearId, isActive: 'true' }).subscribe(r => this.feeStructures.set(r.data));
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const payload = {
      ...v,
      issueDate: v.issueDate ? new Date(v.issueDate as any).toISOString().split('T')[0] : '',
      dueDate: v.dueDate ? new Date(v.dueDate as any).toISOString().split('T')[0] : '',
      billingMonth: v.billingMonth ? +v.billingMonth : undefined,
      billingYear: v.billingYear ? +v.billingYear : undefined,
    };
    this.api.post('/fee-invoices/generate', payload).subscribe({
      next: (inv: any) => { this.snackBar.open('Invoice generated!', 'OK'); this.router.navigate(['/invoices', inv.id]); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
