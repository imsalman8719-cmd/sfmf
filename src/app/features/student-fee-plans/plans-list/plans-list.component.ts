import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear } from '../../../core/models';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule, MatCardModule],
  templateUrl: './plans-list.component.html'
})
export class PlansListComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  cols = ['student', 'feeStructure', 'frequency', 'amount', 'year', 'status', 'actions'];
  plans = signal<any[]>([]);
  years = signal<AcademicYear[]>([]);
  loading = signal(false);
  searchCtrl = new FormControl('');
  yearCtrl = new FormControl('');
  freqCtrl = new FormControl('');

  counts() {
    const p = this.plans();
    return {
      monthly: p.filter(x => x.billingFrequency === 'monthly').length,
      quarterly: p.filter(x => x.billingFrequency === 'quarterly').length,
      annual: p.filter(x => x.billingFrequency === 'annual').length,
    };
  }

  uniqueStudents() { return new Set(this.plans().map(p => p.studentId)).size; }

  filtered() {
    const q = this.searchCtrl.value?.toLowerCase() || '';
    const y = this.yearCtrl.value || '';
    const f = this.freqCtrl.value || '';
    return this.plans().filter(p =>
      (!q || `${p.student?.user?.firstName} ${p.student?.user?.lastName} ${p.student?.registrationNumber}`.toLowerCase().includes(q)) &&
      (!y || p.academicYearId === y) &&
      (!f || p.billingFrequency === f)
    );
  }

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => this.years.set(Array.isArray(r) ? r : r.data || []));
    this.load();

    // Trigger reload when search text changes (debounced to avoid spamming the server)
    this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.load());

    // Trigger reload immediately for dropdown filters
    this.yearCtrl.valueChanges.subscribe(() => this.load());
    this.freqCtrl.valueChanges.subscribe(() => this.load());
  }

  load() {
    this.loading.set(true);
    const params: any = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };

    if (this.searchCtrl.value) params.search = this.searchCtrl.value;
    if (this.yearCtrl.value) params.academicYearId = this.yearCtrl.value;
    if (this.freqCtrl.value) params.billingFrequency = this.freqCtrl.value;

    this.api.get<any>('/student-fee-plans', params).subscribe({
      next: res => {
        const data = res.data?.items || res.data || [];
        this.plans.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  freqBadge(f: string) {
    const map: Record<string, string> = { monthly: 'badge-active', quarterly: 'badge-paid', semi_annual: 'badge-pending', annual: 'badge-waived', one_time: 'badge-inactive' };
    return map[f] || 'badge-inactive';
  }

  calcAmount(p: any): number {
    if (p.customAmount) return +p.customAmount;
    const base = Number(p.feeStructure?.amount || 0);
    const mult: Record<string, number> = { one_time: 1, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12, custom: 1 };
    return base * (mult[p.billingFrequency] || 1);
  }

  toggle(p: any) {
    this.api.patch(`/student-fee-plans/${p.id}/toggle`).subscribe({ next: () => { this.snackBar.open('Updated', 'OK'); this.load(); } });
  }

  remove(p: any) {
    this.api.delete(`/student-fee-plans/${p.id}`).subscribe({ next: () => { this.snackBar.open('Removed', 'OK'); this.load(); } });
  }
}