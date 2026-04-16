import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SchoolClass, AcademicYear, UserRole } from '../../../core/models';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatTooltipModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Classes</h1><p class="section-subtitle">{{ total() }} classes configured</p></div>
        @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
          <button mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> Add Class</button>
        }
      </div>
      <div style="background:#fff;border:1px solid #e2f0e8;border-radius:8px;margin-bottom:16px;padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap">
        <mat-form-field><mat-label>Search</mat-label><input matInput [formControl]="searchCtrl" placeholder="Name, grade…"><mat-icon matSuffix>search</mat-icon></mat-form-field>
        <mat-form-field style="min-width:200px">
          <mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            <mat-option value="">All Years</mat-option>
            @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="table-container">
        <table mat-table [dataSource]="classes()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Class</th>
            <td mat-cell *matCellDef="let c"><strong>{{ c.name }}</strong></td>
          </ng-container>
          
          <ng-container matColumnDef="grade">
            <th mat-header-cell *matHeaderCellDef>Grade</th>
            <td mat-cell *matCellDef="let c">{{ c.grade }}</td>
          </ng-container>
          
          <ng-container matColumnDef="section">
            <th mat-header-cell *matHeaderCellDef>Section</th>
            <td mat-cell *matCellDef="let c">{{ c.section || '—' }}</td>
          </ng-container>
          
          <ng-container matColumnDef="teacher">
            <th mat-header-cell *matHeaderCellDef>Class Teacher</th>
            <td mat-cell *matCellDef="let c">{{ c.classTeacher ? c.classTeacher.firstName + ' ' + c.classTeacher.lastName : '—' }}</td>
          </ng-container>
          
          <ng-container matColumnDef="capacity">
            <th mat-header-cell *matHeaderCellDef>Capacity</th>
            <td mat-cell *matCellDef="let c">{{ c.maxCapacity }}</td>
          </ng-container>
          
          <ng-container matColumnDef="year">
            <th mat-header-cell *matHeaderCellDef>Academic Year</th>
            <td mat-cell *matCellDef="let c">{{ c.academicYear?.name }}</td>
          </ng-container>
          
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let c"><span class="badge" [class]="c.isActive ? 'badge-active' : 'badge-inactive'">{{ c.isActive ? 'Active' : 'Inactive' }}</span></td>
          </ng-container>
          
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c">
              @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
                <a mat-icon-button [routerLink]="[c.id, 'edit']" matTooltip="Edit"><mat-icon>edit</mat-icon></a>
              }
            </td>
          </ng-container>
          
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        <mat-paginator [length]="total()" [pageSize]="20" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons />
      </div>
    </div>
  `
})
export class ClassesListComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  UserRole = UserRole;
  columns = ['name', 'grade', 'section', 'teacher', 'capacity', 'year', 'status', 'actions'];
  classes = signal<SchoolClass[]>([]);
  years = signal<AcademicYear[]>([]);
  total = signal(0);
  page = 1;
  searchCtrl = new FormControl('');
  yearCtrl = new FormControl('');

  ngOnInit() {
    // Fetch academic years
    this.api.get<any>('/academic-years').subscribe(response => {
      const academicYears = Array.isArray(response) ? response : (response.data || []);
      this.years.set(academicYears);

      // Find and select the current/active academic year
      // Note: Adjust the property name based on your API response
      // Common property names: 'isActive', 'isCurrent', 'status', 'current'
      const currentYear = academicYears.find((year: any) => year.isActive === true || year.isCurrent === true || year.status === 'active');

      if (currentYear) {
        this.yearCtrl.setValue(currentYear.id);
      }

      // Load classes after setting the year
      this.load();
    });

    // Set up search and year filters
    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.load();
    });

    this.yearCtrl.valueChanges.subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  load() {
    this.api.getPaginated<SchoolClass>('/classes',
      { page: this.page, limit: 20, search: this.searchCtrl.value || undefined },
      { academicYearId: this.yearCtrl.value || undefined }
    ).subscribe(r => {
      this.classes.set(r.data);
      this.total.set(r.meta.total);
    });
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.load();
  }
}