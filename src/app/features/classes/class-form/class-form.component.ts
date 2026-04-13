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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, User, UserRole } from '../../../core/models';

@Component({
  selector: 'app-class-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatCheckboxModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">{{ isEdit ? 'Edit Class' : 'Add New Class' }}</h1>
          <p class="section-subtitle">Configure class details and assign a teacher</p>
        </div>
        <button mat-stroked-button routerLink="/classes"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>
      <mat-card style="max-width:700px">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            <div class="form-grid-2">
              <mat-form-field><mat-label>Class Name *</mat-label><input matInput formControlName="name" placeholder="Grade 5 - A"></mat-form-field>
              <mat-form-field><mat-label>Grade *</mat-label><input matInput formControlName="grade" placeholder="5, KG, Nursery"></mat-form-field>
              <mat-form-field><mat-label>Section</mat-label><input matInput formControlName="section" placeholder="A, B, C"></mat-form-field>
              <mat-form-field><mat-label>Max Capacity</mat-label><input matInput type="number" formControlName="maxCapacity"></mat-form-field>
              <mat-form-field>
                <mat-label>Academic Year *</mat-label>
                <mat-select formControlName="academicYearId">
                  @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Class Teacher</mat-label>
                <mat-select formControlName="classTeacherId">
                  <mat-option value="">— None —</mat-option>
                  @for (t of teachers(); track t.id) { <mat-option [value]="t.id">{{ t.firstName }} {{ t.lastName }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            <mat-form-field><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
            @if (isEdit) { <mat-checkbox formControlName="isActive">Class is Active</mat-checkbox> }
            <div class="flex-end mt-4">
              <button mat-stroked-button type="button" routerLink="/classes">Cancel</button>
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
export class ClassFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  classId = '';
  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  teachers = signal<User[]>([]);

  form = this.fb.group({
    name: ['', Validators.required],
    grade: ['', Validators.required],
    section: [''],
    maxCapacity: [35],
    academicYearId: ['', Validators.required],
    classTeacherId: [''],
    description: [''],
    isActive: [true],
  });

  ngOnInit() {
    this.classId = this.route.snapshot.params['id'];
    this.isEdit = !!this.classId;
    this.api.get<any>('/academic-years').subscribe(r => this.years.set(Array.isArray(r) ? r : r.data || []));
    this.api.getPaginated<User>('/users', { limit: 100 }, { role: UserRole.TEACHER }).subscribe(r => this.teachers.set(r.data));
    if (this.isEdit) {
      this.api.get<any>(`/classes/${this.classId}`).subscribe(c => this.form.patchValue(c));
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const req = this.isEdit ? this.api.put(`/classes/${this.classId}`, this.form.value) : this.api.post('/classes', this.form.value);
    req.subscribe({
      next: () => { this.snackBar.open(this.isEdit ? 'Class updated' : 'Class created', 'OK'); this.router.navigate(['/classes']); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
