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
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { Discount, AcademicYear, DiscountCategory, DiscountType } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatTableModule, MatDialogModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Discount Rules</h1><p class="section-subtitle">Configure student discounts and concessions</p></div>
        <button mat-stroked-button routerLink="/fee-structures"><mat-icon>arrow_back</mat-icon> Fee Structures</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 360px;gap:20px;align-items:start">
        <!-- Existing Discounts -->
        <div class="table-container">
          <div class="table-header"><h3>{{ discounts().length }} Discount Rules</h3></div>
          <table mat-table [dataSource]="discounts()">
            <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let d"><strong>{{ d.name }}</strong></td></ng-container>
            <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let d"><span class="badge badge-issued" style="text-transform:capitalize">{{ d.category | statusLabel }}</span></td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let d" style="text-transform:capitalize">{{ d.type }}</td></ng-container>
            <ng-container matColumnDef="value"><th mat-header-cell *matHeaderCellDef>Value</th><td mat-cell *matCellDef="let d" style="font-weight:700">{{ d.value }}{{ d.type === 'percentage' ? '%' : ' PKR' }}</td></ng-container>
            <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let d">{{ d.student ? (d.student.user?.firstName + ' ' + d.student.user?.lastName) : 'All Students' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let d"><span class="badge" [class]="d.isActive ? 'badge-active' : 'badge-inactive'">{{ d.isActive ? 'Active' : 'Inactive' }}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let d">
                <button mat-icon-button (click)="approve(d)" [disabled]="!!d.approvedBy"><mat-icon>verified</mat-icon></button>
                <button mat-icon-button (click)="deleteDiscount(d)"><mat-icon color="warn">delete</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        </div>

        <!-- Create Discount -->
        <mat-card>
          <mat-card-header><mat-card-title>Add Discount Rule</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
              <mat-form-field><mat-label>Name *</mat-label><input matInput formControlName="name" placeholder="Merit Scholarship 25%"></mat-form-field>
              <mat-form-field>
                <mat-label>Academic Year *</mat-label>
                <mat-select formControlName="academicYearId">
                  @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Category *</mat-label>
                <mat-select formControlName="category">
                  @for (c of categories; track c) { <mat-option [value]="c" style="text-transform:capitalize">{{ c | statusLabel }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <div class="form-grid-2">
                <mat-form-field>
                  <mat-label>Type *</mat-label>
                  <mat-select formControlName="type">
                    <mat-option value="percentage">Percentage</mat-option>
                    <mat-option value="fixed">Fixed Amount</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Value *</mat-label>
                  <input matInput type="number" formControlName="value">
                  <span matTextSuffix>{{ form.get('type')?.value === 'percentage' ? '%' : 'PKR' }}</span>
                </mat-form-field>
              </div>
              <mat-form-field><mat-label>Student ID (optional)</mat-label><input matInput formControlName="studentId" placeholder="Leave blank for all students"></mat-form-field>
              <mat-form-field><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid"><mat-icon>add</mat-icon> Create Discount</button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class DiscountsComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  discounts = signal<Discount[]>([]);
  years = signal<AcademicYear[]>([]);
  categories = Object.values(DiscountCategory);
  cols = ['name','category','type','value','student','status','actions'];

  form = this.fb.group({
    name: ['', Validators.required],
    academicYearId: ['', Validators.required],
    category: [DiscountCategory.MERIT, Validators.required],
    type: [DiscountType.PERCENTAGE, Validators.required],
    value: ['', [Validators.required, Validators.min(0)]],
    studentId: [''],
    description: [''],
  });

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.form.patchValue({ academicYearId: cur.id }); this.load(cur.id); }
    });
  }

  load(yearId: string) {
    this.api.get<Discount[]>('/fee-structures/discounts/all', { academicYearId: yearId }).subscribe(d => this.discounts.set(Array.isArray(d) ? d : (d as any).data || []));
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    this.api.post('/fee-structures/discounts', { ...v, value: +v.value, studentId: v.studentId || undefined }).subscribe({
      next: () => { this.snackBar.open('Discount created', 'OK'); this.form.reset({ academicYearId: v.academicYearId, category: DiscountCategory.MERIT, type: DiscountType.PERCENTAGE }); this.load(v.academicYearId); },
      error: (e) => this.snackBar.open(e.message || 'Error', 'Close')
    });
  }

  approve(d: Discount) { this.api.patch(`/fee-structures/discounts/${d.id}/approve`).subscribe({ next: () => { this.snackBar.open('Approved', 'OK'); this.load(this.form.value.academicYearId!); } }); }
  deleteDiscount(d: Discount) { this.api.delete(`/fee-structures/discounts/${d.id}`).subscribe({ next: () => { this.snackBar.open('Deleted', 'OK'); this.load(this.form.value.academicYearId!); } }); }
}
