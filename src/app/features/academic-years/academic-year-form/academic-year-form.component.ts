import { Component, inject, signal, OnInit } from '@angular/core';
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
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-academic-year-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">{{ isEdit ? 'Edit Academic Year' : 'New Academic Year' }}</h1></div>
        <button mat-stroked-button routerLink="/academic-years"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>
      <mat-card style="max-width:720px">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            <div class="form-grid-2">
              <mat-form-field><mat-label>Year Name *</mat-label><input matInput formControlName="name" placeholder="2024-2025"></mat-form-field>
              <mat-form-field><mat-label>Annual Fee Target (PKR)</mat-label><input matInput type="number" formControlName="feeTarget"></mat-form-field>
              <mat-form-field><mat-label>Start Date *</mat-label><input matInput [matDatepicker]="sd" formControlName="startDate"><mat-datepicker-toggle matIconSuffix [for]="sd" /><mat-datepicker #sd /></mat-form-field>
              <mat-form-field><mat-label>End Date *</mat-label><input matInput [matDatepicker]="ed" formControlName="endDate"><mat-datepicker-toggle matIconSuffix [for]="ed" /><mat-datepicker #ed /></mat-form-field>
            </div>
            <mat-checkbox formControlName="isCurrent">Set as current academic year</mat-checkbox>
            <mat-form-field><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>

            <mat-divider class="mt-4 mb-4" />
            <h3 style="font-weight:600;color:#475569;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em">Monthly Targets (PKR)</h3>
            <div class="form-grid-3">
              @for (m of monthNames; track m.n) {
                <mat-form-field>
                  <mat-label>{{ m.l }}</mat-label>
                  <input matInput type="number" [formControlName]="'month_' + m.n">
                  <span matTextPrefix>₨ </span>
                </mat-form-field>
              }
            </div>
            <div class="flex-end mt-4">
              <button mat-stroked-button type="button" routerLink="/academic-years">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> } Save
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class AcademicYearFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  yearId = '';
  saving = signal(false);
  monthNames = [
    {n:1,l:'January'},{n:2,l:'February'},{n:3,l:'March'},{n:4,l:'April'},
    {n:5,l:'May'},{n:6,l:'June'},{n:7,l:'July'},{n:8,l:'August'},
    {n:9,l:'September'},{n:10,l:'October'},{n:11,l:'November'},{n:12,l:'December'},
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    feeTarget: [0],
    isCurrent: [false],
    description: [''],
    month_1: [0], month_2: [0], month_3: [0], month_4: [0],
    month_5: [0], month_6: [0], month_7: [0], month_8: [0],
    month_9: [0], month_10: [0], month_11: [0], month_12: [0],
  });

  ngOnInit() {
    this.yearId = this.route.snapshot.params['id'];
    this.isEdit = !!this.yearId;
    if (this.isEdit) {
      this.api.get<any>(`/academic-years/${this.yearId}`).subscribe(y => {
        const patch: any = { ...y };
        if (y.monthlyTargets) {
          Object.entries(y.monthlyTargets).forEach(([k, v]) => { patch[`month_${k}`] = v; });
        }
        this.form.patchValue(patch);
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value as any;
    const monthlyTargets: Record<string, number> = {};
    this.monthNames.forEach(m => { if (v[`month_${m.n}`]) monthlyTargets[m.n] = +v[`month_${m.n}`]; });
    const payload = {
      name: v.name, startDate: v.startDate ? new Date(v.startDate).toISOString().split('T')[0] : '',
      endDate: v.endDate ? new Date(v.endDate).toISOString().split('T')[0] : '',
      feeTarget: +v.feeTarget, isCurrent: v.isCurrent, description: v.description, monthlyTargets,
    };
    const req = this.isEdit ? this.api.put(`/academic-years/${this.yearId}`, payload) : this.api.post('/academic-years', payload);
    req.subscribe({
      next: () => { this.snackBar.open('Saved', 'OK'); this.router.navigate(['/academic-years']); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
