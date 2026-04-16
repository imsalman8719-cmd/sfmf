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
import { MatTabsModule } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { FeeStructure, AcademicYear, FeeCategory, FeeFrequency } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-fee-structures-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatMenuModule, MatTooltipModule, MatTabsModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Fee Structures</h1><p class="section-subtitle">{{ total() }} fee items configured</p></div>
        <div class="flex-gap">
          <a mat-stroked-button routerLink="discounts"><mat-icon>discount</mat-icon> Manage Discounts</a>
          <button mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> Add Fee Structure</button>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap">
        <mat-form-field>
          <mat-label>Search</mat-label>
          <input matInput [formControl]="searchCtrl" placeholder="Fee name…">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-form-field style="min-width:200px">
          <mat-label>Academic Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            <mat-option value="">All</mat-option>
            @for (y of years(); track y.id) { 
              <mat-option [value]="y.id">{{ y.name }}</mat-option> 
            }
          </mat-select>
        </mat-form-field>
        
        <mat-form-field style="min-width:160px">
          <mat-label>Category</mat-label>
          <mat-select [formControl]="catCtrl">
            <mat-option value="">All Categories</mat-option>
            @for (c of categories; track c) { 
              <mat-option [value]="c">{{ c | statusLabel }}</mat-option> 
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="structures()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Fee Name</th>
            <td mat-cell *matCellDef="let f">
              <strong>{{ f.name }}</strong>
              <div style="font-size:.75rem;color:#64748b">{{ f.description }}</div>
            </td>
          </ng-container>
          
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Category</th>
            <td mat-cell *matCellDef="let f">
              <span class="badge badge-issued" style="text-transform:capitalize">{{ f.category | statusLabel }}</span>
            </td>
          </ng-container>
          
          <ng-container matColumnDef="frequency">
            <th mat-header-cell *matHeaderCellDef>Frequency</th>
            <td mat-cell *matCellDef="let f" style="text-transform:capitalize">{{ f.frequency | statusLabel }}</td>
          </ng-container>
          
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Amount</th>
            <td mat-cell *matCellDef="let f" style="font-weight:700;color:#0f172a">{{ f.amount | currency:'PKR ':'symbol':'1.0-0' }}</td>
          </ng-container>
          
          <ng-container matColumnDef="class">
            <th mat-header-cell *matHeaderCellDef>Class</th>
            <td mat-cell *matCellDef="let f">{{ f.class?.name || 'All Classes' }}</td>
          </ng-container>
          
          <ng-container matColumnDef="mandatory">
            <th mat-header-cell *matHeaderCellDef>Mandatory</th>
            <td mat-cell *matCellDef="let f">
              <span class="badge" [class]="f.isMandatory ? 'badge-active' : 'badge-inactive'">{{ f.isMandatory ? 'Yes' : 'No' }}</span>
            </td>
          </ng-container>
          
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let f">
              <span class="badge" [class]="f.isActive ? 'badge-active' : 'badge-inactive'">{{ f.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
          </ng-container>
          
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let f">
              <a mat-icon-button [routerLink]="[f.id, 'edit']" matTooltip="Edit"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button (click)="toggle(f)" [matTooltip]="f.isActive ? 'Deactivate' : 'Activate'">
                <mat-icon>{{ f.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              </button>
            </td>
          </ng-container>
          
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
        
        <mat-paginator [length]="total()" [pageSize]="20" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons />
      </div>
    </div>
  `
})
export class FeeStructuresListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  cols = ['name', 'category', 'frequency', 'amount', 'class', 'mandatory', 'status', 'actions'];
  categories = Object.values(FeeCategory);
  structures = signal<FeeStructure[]>([]);
  years = signal<AcademicYear[]>([]);
  total = signal(0);
  page = 1;
  searchCtrl = new FormControl('');
  yearCtrl = new FormControl('');
  catCtrl = new FormControl('');

  ngOnInit() {
    // Fetch academic years and select the current/active one
    this.api.get<any>('/academic-years').subscribe(response => {
      const academicYears = Array.isArray(response) ? response : (response.data || []);
      this.years.set(academicYears);
      
      // Find and select the current/active academic year
      const currentYear = academicYears.find((year: any) => 
        year.isActive === true || 
        year.isCurrent === true || 
        year.status === 'active'
      );
      
      if (currentYear) {
        this.yearCtrl.setValue(currentYear.id);
      }
      
      // Load fee structures after setting the year
      this.load();
    });
    
    // Set up search and filter subscriptions
    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { 
      this.page = 1; 
      this.load(); 
    });
    
    // Handle year and category filter changes
    this.yearCtrl.valueChanges.subscribe(() => { 
      this.page = 1; 
      this.load(); 
    });
    
    this.catCtrl.valueChanges.subscribe(() => { 
      this.page = 1; 
      this.load(); 
    });
  }

  load() {
    const params: any = {
      page: this.page,
      limit: 20,
      search: this.searchCtrl.value || undefined
    };
    
    const filters: any = {};
    
    if (this.yearCtrl.value) {
      filters.academicYearId = this.yearCtrl.value;
    }
    
    if (this.catCtrl.value) {
      filters.category = this.catCtrl.value;
    }
    
    this.api.getPaginated<FeeStructure>('/fee-structures', params, filters)
      .subscribe({
        next: (r) => { 
          this.structures.set(r.data); 
          this.total.set(r.meta.total); 
        },
        error: (err) => {
          console.error('Error loading fee structures:', err);
          this.snackBar.open('Error loading fee structures', 'Close', { duration: 3000 });
        }
      });
  }

  onPage(e: PageEvent) { 
    this.page = e.pageIndex + 1; 
    this.load(); 
  }
  
  toggle(f: FeeStructure) { 
    this.api.patch(`/fee-structures/${f.id}/toggle-active`).subscribe({ 
      next: () => { 
        this.snackBar.open(`Fee structure ${f.isActive ? 'deactivated' : 'activated'}`, 'OK', { duration: 3000 }); 
        this.load(); 
      },
      error: (err) => {
        console.error('Error toggling fee structure:', err);
        this.snackBar.open('Error updating fee structure', 'Close', { duration: 3000 });
      }
    }); 
  }
}