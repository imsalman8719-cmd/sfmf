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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { User, UserRole, UserStatus } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatMenuModule, MatTooltipModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">System Users</h1><p class="section-subtitle">{{ total() }} users registered</p></div>
        <button mat-flat-button color="primary" routerLink="new"><mat-icon>person_add</mat-icon> Add User</button>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap">
        <mat-form-field><mat-label>Search</mat-label><input matInput [formControl]="searchCtrl" placeholder="Name, email, employee ID…"><mat-icon matSuffix>search</mat-icon></mat-form-field>
        <mat-form-field style="min-width:160px"><mat-label>Role</mat-label>
          <mat-select [formControl]="roleCtrl">
            <mat-option value="">All Roles</mat-option>
            @for (r of roles; track r) { <mat-option [value]="r">{{ r | statusLabel }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="table-container">
        <table mat-table [dataSource]="users()">
          <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let u">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="u-avatar">{{ u.firstName[0] }}{{ u.lastName[0] }}</div>
                <div><div style="font-weight:600;font-size:.875rem">{{ u.firstName }} {{ u.lastName }}</div><div style="font-size:.75rem;color:#64748b">{{ u.email }}</div></div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Role</th><td mat-cell *matCellDef="let u"><span class="badge badge-issued" style="text-transform:capitalize">{{ u.role | statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="empId"><th mat-header-cell *matHeaderCellDef>Employee ID</th><td mat-cell *matCellDef="let u"><span class="text-mono">{{ u.employeeId || '—' }}</span></td></ng-container>
          <ng-container matColumnDef="dept"><th mat-header-cell *matHeaderCellDef>Department</th><td mat-cell *matCellDef="let u">{{ u.department || '—' }}</td></ng-container>
          <ng-container matColumnDef="lastLogin"><th mat-header-cell *matHeaderCellDef>Last Login</th><td mat-cell *matCellDef="let u" style="font-size:.8rem;color:#64748b">{{ u.lastLogin ? (u.lastLogin | date:'mediumDate') : 'Never' }}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let u"><span class="badge" [class]="'badge-' + u.status">{{ u.status | statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <a mat-icon-button [routerLink]="[u.id, 'edit']" matTooltip="Edit"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu>
                <button mat-menu-item (click)="toggleStatus(u)">
                  <mat-icon>{{ u.status === 'active' ? 'person_off' : 'person' }}</mat-icon>
                  {{ u.status === 'active' ? 'Suspend' : 'Activate' }}
                </button>
                <button mat-menu-item (click)="resetPassword(u)"><mat-icon>lock_reset</mat-icon> Reset Password</button>
                <button mat-menu-item (click)="deleteUser(u)"><mat-icon color="warn">delete</mat-icon> Delete</button>
              </mat-menu>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
        <mat-paginator [length]="total()" [pageSize]="20" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons />
      </div>
    </div>
  `,
  styles: [`.u-avatar{width:36px;height:36px;border-radius:50%;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0}`]
})
export class UsersListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  cols = ['name','role','empId','dept','lastLogin','status','actions'];
  roles = Object.values(UserRole);
  users = signal<User[]>([]);
  total = signal(0);
  page = 1;
  searchCtrl = new FormControl('');
  roleCtrl = new FormControl('');

  ngOnInit() {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { this.page = 1; this.load(); });
    this.roleCtrl.valueChanges.subscribe(() => { this.page = 1; this.load(); });
  }

  load() {
    this.api.getPaginated<User>('/users', { page: this.page, limit: 20, search: this.searchCtrl.value || undefined }, { role: this.roleCtrl.value || undefined })
      .subscribe(r => { this.users.set(r.data); this.total.set(r.meta.total); });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.load(); }

  toggleStatus(u: User) {
    const status = u.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    this.api.patch(`/users/${u.id}/status`, { status }).subscribe({ next: () => { this.snackBar.open('Status updated', 'OK'); this.load(); } });
  }

  resetPassword(u: User) {
    this.api.patch(`/users/${u.id}/reset-password`, { newPassword: 'School@12345' }).subscribe({ next: () => this.snackBar.open('Password reset to School@12345', 'OK', { duration: 6000 }) });
  }

  deleteUser(u: User) {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete User', message: `Delete ${u.firstName} ${u.lastName}? This cannot be undone.`, confirmLabel: 'Delete', confirmColor: 'warn' } });
    ref.afterClosed().subscribe(ok => { if (ok) this.api.delete(`/users/${u.id}`).subscribe({ next: () => { this.snackBar.open('User deleted', 'OK'); this.load(); } }); });
  }
}
