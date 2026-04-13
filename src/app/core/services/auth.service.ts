import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, ApiResponse, User, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  private _currentUser = signal<AuthResponse['user'] | null>(this.loadUser());
  private _token = signal<string | null>(localStorage.getItem('access_token'));

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());
  readonly userRole = computed(() => this._currentUser()?.role);
  readonly isAdmin = computed(() => this._currentUser()?.role === UserRole.SUPER_ADMIN);
  readonly isFinance = computed(() => [UserRole.SUPER_ADMIN, UserRole.FINANCE].includes(this._currentUser()?.role as UserRole));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/auth/login`, { email, password }).pipe(
      map(r => r.data),
      tap(data => {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('current_user', JSON.stringify(data.user));
        this._currentUser.set(data.user);
        this._token.set(data.accessToken);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.API}/auth/logout`, {}).subscribe({ error: () => {} });
    localStorage.clear();
    this._currentUser.set(null);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null { return this._token(); }

  hasRole(...roles: UserRole[]): boolean {
    const role = this._currentUser()?.role;
    return role ? roles.includes(role as UserRole) : false;
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${this.API}/auth/refresh`, { refreshToken }
    ).pipe(tap(r => {
      localStorage.setItem('access_token', r.data.accessToken);
      this._token.set(r.data.accessToken);
    }));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API}/auth/reset-password`, { token, newPassword });
  }

  private loadUser(): AuthResponse['user'] | null {
    try { return JSON.parse(localStorage.getItem('current_user') || 'null'); } catch { return null; }
  }
}
