import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass } from '../../../core/models';

@Component({
  selector: 'app-bulk-generate',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Bulk Generate Invoices</h1><p class="section-subtitle">Generate invoices for entire class or academic year at once</p></div>
        <button mat-stroked-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>
      <mat-card style="max-width:680px">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            <div class="form-grid-2">
              <mat-form-field>
                <mat-label>Academic Year *</mat-label>
                <mat-select formControlName="academicYearId" (selectionChange)="onYearChange($event.value)">
                  @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Class (Optional)</mat-label>
                <mat-select formControlName="classId">
                  <mat-option value="">All Active Students</mat-option>
                  @for (c of classes(); track c.id) { <mat-option [value]="c.id">{{ c.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Billing Month</mat-label>
                <mat-select formControlName="billingMonth">
                  <mat-option value="">None</mat-option>
                  @for (m of months; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field><mat-label>Billing Year</mat-label><input matInput type="number" formControlName="billingYear"></mat-form-field>
              <mat-form-field><mat-label>Issue Date *</mat-label><input matInput [matDatepicker]="idate" formControlName="issueDate"><mat-datepicker-toggle matIconSuffix [for]="idate" /><mat-datepicker #idate /></mat-form-field>
              <mat-form-field><mat-label>Due Date *</mat-label><input matInput [matDatepicker]="ddate" formControlName="dueDate"><mat-datepicker-toggle matIconSuffix [for]="ddate" /><mat-datepicker #ddate /></mat-form-field>
            </div>
            <mat-form-field><mat-label>Billing Label</mat-label><input matInput formControlName="billingLabel" placeholder="e.g. January 2025 Fee"></mat-form-field>

            @if (result()) {
              <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:16px;margin-top:8px">
                <div style="font-weight:700;color:#15803d;margin-bottom:4px">✓ Bulk generation complete!</div>
                <div style="font-size:.875rem;color:#166534">
                  Generated: <strong>{{ result()!.generated }}</strong> invoices ·
                  Skipped (duplicate): <strong>{{ result()!.skipped }}</strong>
                </div>
                @if (result()!.errors?.length) {
                  <div style="color:#dc2626;font-size:.8rem;margin-top:4px">{{ result()!.errors.length }} errors occurred</div>
                }
              </div>
            }

            <div class="flex-end mt-4">
              <button mat-stroked-button type="button" routerLink="/invoices">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>auto_awesome</mat-icon> }
                Generate All Invoices
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class BulkGenerateComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);
  result = signal<any>(null);
  years = signal<AcademicYear[]>([]);
  classes = signal<SchoolClass[]>([]);
  months = [1,2,3,4,5,6,7,8,9,10,11,12].map(v => ({ v, l: new Date(2000, v - 1, 1).toLocaleString('en', { month: 'long' }) }));

  form = this.fb.group({
    academicYearId: ['', Validators.required],
    classId: [''],
    billingMonth: [''],
    billingYear: [new Date().getFullYear()],
    billingLabel: [''],
    issueDate: [new Date(), Validators.required],
    dueDate: ['', Validators.required],
  });

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.form.patchValue({ academicYearId: cur.id }); this.onYearChange(cur.id); }
    });
  }

  onYearChange(yearId: string) {
    this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId }).subscribe(r => this.classes.set(r.data));
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value as any;
    const payload = {
      ...v,
      issueDate: new Date(v.issueDate).toISOString().split('T')[0],
      dueDate: new Date(v.dueDate).toISOString().split('T')[0],
      billingMonth: v.billingMonth ? +v.billingMonth : undefined,
      billingYear: +v.billingYear,
      classId: v.classId || undefined,
    };
    this.api.post<any>('/fee-invoices/bulk-generate', payload).subscribe({
      next: r => { this.result.set(r); this.saving.set(false); this.snackBar.open(`Generated ${r.generated} invoices`, 'OK', { duration: 6000 }); },
      error: e => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
