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
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, AdmissionStatus, UserRole } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatMenuModule,
    MatTooltipModule, StatusLabelPipe
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Students</h1>
          <p class="section-subtitle">{{ total() | number }} students enrolled</p>
        </div>
        @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
          <button mat-flat-button color="primary" routerLink="new">
            <mat-icon>person_add</mat-icon> Enroll Student
          </button>
        }
      </div>

      <div class="table-container">
        <div class="table-filters">
          <mat-form-field>
            <mat-label>Search</mat-label>
            <input matInput [formControl]="searchCtrl" placeholder="Name, reg. no., email…">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field style="min-width:160px">
            <mat-label>Admission Status</mat-label>
            <mat-select [formControl]="statusCtrl">
              <mat-option value="">All</mat-option>
              @for (s of statuses; track s) { <mat-option [value]="s">{{ s | statusLabel }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field style="min-width:120px">
            <mat-label>Active</mat-label>
            <mat-select [formControl]="activeCtrl">
              <mat-option value="">All</mat-option>
              <mat-option value="true">Active</mat-option>
              <mat-option value="false">Inactive</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <table mat-table [dataSource]="students()">
          <ng-container matColumnDef="registration">
            <th mat-header-cell *matHeaderCellDef>Reg. No.</th>
            <td mat-cell *matCellDef="let s"><span class="text-mono">{{ s.registrationNumber }}</span></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let s">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="s-avatar">{{ (s.user?.firstName||'U')[0] }}{{ (s.user?.lastName||'U')[0] }}</div>
                <div>
                  <div style="font-weight:600;font-size:.875rem">{{ s.user?.firstName }} {{ s.user?.lastName }}</div>
                  <div style="font-size:.75rem;color:#64748b">{{ s.user?.email }}</div>
                </div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="class">
            <th mat-header-cell *matHeaderCellDef>Class</th>
            <td mat-cell *matCellDef="let s">{{ s.class?.name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="guardian">
            <th mat-header-cell *matHeaderCellDef>Father / Guardian</th>
            <td mat-cell *matCellDef="let s">
              <div style="font-size:.8rem">{{ s.fatherName || s.guardianName || '—' }}</div>
              <div style="font-size:.75rem;color:#64748b">{{ s.fatherPhone || '' }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let s">
              <span class="badge" [class]="'badge-' + s.admissionStatus">{{ s.admissionStatus | statusLabel }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Active</th>
            <td mat-cell *matCellDef="let s">
              <span class="badge" [class]="s.isActive ? 'badge-active' : 'badge-inactive'">{{ s.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s">
              <button mat-icon-button [routerLink]="[s.id,'details']" matTooltip="View"><mat-icon>visibility</mat-icon></button>
              @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
                <button mat-icon-button [routerLink]="[s.id,'edit']" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
              }
              <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu>
                <button mat-menu-item [routerLink]="['/invoices']" [queryParams]="{studentId:s.id}"><mat-icon>description</mat-icon> Invoices</button>
                <button mat-menu-item [routerLink]="['/reports/student-statement',s.id]"><mat-icon>receipt</mat-icon> Fee Statement</button>
                @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
                  <button mat-menu-item (click)="toggleActive(s)"><mat-icon>{{ s.isActive ? 'person_off' : 'person' }}</mat-icon> {{ s.isActive ? 'Deactivate' : 'Activate' }}</button>
                }
              </mat-menu>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        <mat-paginator [length]="total()" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons />
      </div>
    </div>
  `,
  styles: [`.s-avatar{width:36px;height:36px;border-radius:50%;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0}`]
})
export class StudentsListComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  UserRole = UserRole;
  columns = ['registration','name','class','guardian','status','active','actions'];
  statuses = Object.values(AdmissionStatus);
  students = signal<Student[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1; pageSize = 20;
  searchCtrl = new FormControl('');
  statusCtrl = new FormControl('');
  activeCtrl = new FormControl('');

  ngOnInit() {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { this.page = 1; this.load(); });
    this.statusCtrl.valueChanges.subscribe(() => { this.page = 1; this.load(); });
    this.activeCtrl.valueChanges.subscribe(() => { this.page = 1; this.load(); });
  }

  load() {
    this.loading.set(true);
    this.api.getPaginated<Student>('/students', { page: this.page, limit: this.pageSize, search: this.searchCtrl.value || undefined }, {
      admissionStatus: this.statusCtrl.value || undefined,
      isActive: this.activeCtrl.value || undefined,
    }).subscribe({ next: r => { this.students.set(r.data); this.total.set(r.meta.total); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  toggleActive(s: Student) {
    this.api.patch(`/students/${s.id}/toggle-active`).subscribe({ next: () => { this.snackBar.open('Status updated', 'OK'); this.load(); } });
  }
}
