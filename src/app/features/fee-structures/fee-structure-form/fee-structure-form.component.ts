import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass, FeeCategory, FeeFrequency, DiscountType } from '../../../core/models';

@Component({
  selector: 'app-fee-structure-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">{{ isEdit ? 'Edit Fee Structure' : 'New Fee Structure' }}</h1></div>
        <button mat-stroked-button routerLink="/fee-structures"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>
      <mat-card style="max-width:780px">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            <div class="form-grid-2">
              <mat-form-field style="grid-column:1/-1"><mat-label>Fee Name *</mat-label><input matInput formControlName="name" placeholder="e.g. Monthly Tuition Fee – Primary"></mat-form-field>
              <mat-form-field>
                <mat-label>Category *</mat-label>
                <mat-select formControlName="category">
                  @for (c of categories; track c) { <mat-option [value]="c" style="text-transform:capitalize">{{ c }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Frequency *</mat-label>
                <mat-select formControlName="frequency">
                  @for (f of frequencies; track f) { <mat-option [value]="f" style="text-transform:capitalize">{{ f }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Amount (PKR) *</mat-label>
                <input matInput type="number" formControlName="amount">
                <span matTextPrefix>₨ </span>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Academic Year *</mat-label>
                <mat-select formControlName="academicYearId" (selectionChange)="onYearChange($event.value)">
                  @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Specific Class</mat-label>
                <mat-select formControlName="classId">
                  <mat-option value="">All Classes</mat-option>
                  @for (c of classes(); track c.id) { <mat-option [value]="c.id">{{ c.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field><mat-label>Due Day of Month</mat-label><input matInput type="number" formControlName="dueDayOfMonth" placeholder="10 = due on 10th"><mat-hint>Leave blank for one-time fees</mat-hint></mat-form-field>
              <mat-form-field><mat-label>Grace Period (Days)</mat-label><input matInput type="number" formControlName="gracePeriodDays"></mat-form-field>
              <mat-form-field><mat-label>Sort Order</mat-label><input matInput type="number" formControlName="sortOrder"></mat-form-field>
            </div>
            <div class="flex-gap">
              <mat-checkbox formControlName="isMandatory">Mandatory Fee</mat-checkbox>
              <mat-checkbox formControlName="lateFeeEnabled">Enable Late Fee</mat-checkbox>
            </div>
            @if (form.get('lateFeeEnabled')?.value) {
              <mat-divider />
              <h3 style="font-weight:600;color:#475569;font-size:.875rem">Late Fee Configuration</h3>
              <div class="form-grid-2">
                <mat-form-field>
                  <mat-label>Late Fee Type</mat-label>
                  <mat-select formControlName="lateFeeType">
                    <mat-option value="percentage">Percentage (%)</mat-option>
                    <mat-option value="fixed">Fixed Amount (PKR)</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Late Fee Value</mat-label>
                  <input matInput type="number" formControlName="lateFeeValue">
                  <span matTextSuffix>{{ form.get('lateFeeType')?.value === 'percentage' ? '%' : ' PKR' }}</span>
                </mat-form-field>
              </div>
            }
            <mat-form-field><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
            <div class="flex-end mt-4">
              <button mat-stroked-button type="button" routerLink="/fee-structures">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> } Save Fee Structure
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class FeeStructureFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  fsId = '';
  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  classes = signal<SchoolClass[]>([]);
  categories = Object.values(FeeCategory);
  frequencies = Object.values(FeeFrequency);

  form = this.fb.group({
    name: ['', Validators.required],
    category: [FeeCategory.TUITION, Validators.required],
    frequency: [FeeFrequency.MONTHLY, Validators.required],
    amount: ['', [Validators.required, Validators.min(1)]],
    academicYearId: ['', Validators.required],
    classId: [''],
    dueDayOfMonth: [''],
    gracePeriodDays: [7],
    sortOrder: [0],
    isMandatory: [true],
    lateFeeEnabled: [true],
    lateFeeType: [DiscountType.PERCENTAGE],
    lateFeeValue: [2],
    description: [''],
  });

  ngOnInit() {
    this.fsId = this.route.snapshot.params['id'];
    this.isEdit = !!this.fsId;
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur && !this.isEdit) { this.form.patchValue({ academicYearId: cur.id }); this.loadClasses(cur.id); }
    });
    if (this.isEdit) {
      this.api.get<any>(`/fee-structures/${this.fsId}`).subscribe(f => { this.form.patchValue(f); if (f.academicYearId) this.loadClasses(f.academicYearId); });
    }
  }

  onYearChange(yearId: string) { this.loadClasses(yearId); }
  loadClasses(yearId: string) { this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId }).subscribe(r => this.classes.set(r.data)); }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = { ...this.form.value, amount: +this.form.value.amount!, dueDayOfMonth: this.form.value.dueDayOfMonth ? +this.form.value.dueDayOfMonth : undefined };
    const req = this.isEdit ? this.api.put(`/fee-structures/${this.fsId}`, payload) : this.api.post('/fee-structures', payload);
    req.subscribe({
      next: () => { this.snackBar.open('Saved', 'OK'); this.router.navigate(['/fee-structures']); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
