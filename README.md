# 🏫 School Fee Management — Angular Frontend

A full-featured Angular 18 frontend for the School Fee Management System, built with Angular Material and standalone components.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server (auto-proxies API to localhost:3000)
npm start

# 3. Open browser
# → http://localhost:4200

# Default credentials (after running backend seed):
#   Super Admin : superadmin@school.edu  / Admin@123456
#   Finance     : finance@school.edu     / Finance@123
#   Admission   : admission@school.edu   / Admission@123
```

> **Backend must be running** on port 3000. The `proxy.conf.json` forwards all `/api` requests to `http://localhost:3000`.

---

## 🛠 Tech Stack

| | |
|--|--|
| Framework | Angular 18 (standalone components) |
| UI Library | Angular Material 18 |
| State | Angular Signals |
| HTTP | HttpClient + functional interceptors |
| Routing | Angular Router with lazy loading |
| Forms | Reactive Forms |
| Styling | SCSS + CSS variables |
| Charts | Custom CSS bar chart (no deps) |

---

## 📁 Project Structure

```
src/app/
├── core/
│   ├── guards/          # authGuard, roleGuard
│   ├── interceptors/    # JWT auth, global error handler
│   ├── models/          # All TypeScript interfaces & enums
│   └── services/        # AuthService, ApiService
│
├── shared/
│   ├── components/
│   │   ├── layout/      # Sidebar + header shell
│   │   └── confirm-dialog/
│   └── pipes/
│       └── status-label # "partially_paid" → "Partially Paid"
│
└── features/            # Lazy-loaded feature modules
    ├── auth/            # Login page
    ├── dashboard/       # Finance KPI dashboard
    ├── academic-years/  # Year management + monthly targets
    ├── classes/         # Class/section management
    ├── students/        # Enrollment, profiles, ledger
    ├── fee-structures/  # Fee items + discount rules
    ├── invoices/        # Generate, bulk generate, waivers
    ├── payments/        # Record, receipts, refunds
    ├── reports/         # 5 finance reports
    └── users/           # User management (Super Admin)
```

---

## 🔑 Role-Based Access

| Page | Super Admin | Finance | Admission | Teacher | Student |
|------|:-----------:|:-------:|:---------:|:-------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Academic Years | ✅ | ✅ | ❌ | ❌ | ❌ |
| Classes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Students | ✅ | ✅ | ✅ | ✅ | ❌ |
| Fee Structures | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invoices | ✅ | ✅ | ❌ | ✅ | ✅ |
| Payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📊 Pages & Features

### Dashboard
- KPI cards: students, invoiced, collected, outstanding, overdue, defaulters
- Monthly collection bar chart
- Payment method breakdown
- Class-wise summary table
- Recent payments list
- Collection rate progress bar

### Students
- Searchable, filterable paginated list
- 3-step enroll form (Account → Academic → Guardian)
- Student detail with fee ledger tab
- Sibling detection, class assignment
- CSV export of defaulters

### Fee Structures
- Create fee items by category, frequency, amount
- Per-class or school-wide applicability
- Late fee configuration (% or fixed)
- Copy structures across academic years
- Discount rules management (merit, sibling, staff ward, etc.)

### Invoices
- Single invoice generation with fee preview
- **Bulk generation** for entire class or school
- Duplicate prevention (skips already-generated months)
- Waiver request → approve/reject workflow
- Cancel with reason
- Line item breakdown

### Payments
- Record with method: cash, bank transfer, cheque, online, POS
- Cheque-specific fields (number, bank, date)
- Overpayment protection
- Verify cheque clearance
- Refund processing
- Printable receipt page

### Reports
| Report | Features |
|--------|---------|
| Target vs Actual | Annual, quarterly, monthly with achievement % |
| Defaulters | Sortable list, CSV export, filter by class |
| Class-wise | Collection rate per class, CSV export |
| Outstanding | All unpaid invoices, aging, CSV export |
| Student Statement | Full ledger, printable |

### Academic Years
- Create with start/end dates
- Set annual fee target
- Configure **monthly targets** (12 individual fields)
- Set as current year

---

## ⚙️ Configuration

### API URL
Edit `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiUrl: '/api/v1'    // proxied to localhost:3000 in dev
};
```

For production, set `apiUrl` to your actual backend URL.

### Proxy (dev only)
`proxy.conf.json` — forwards `/api` to backend:
```json
{ "/api": { "target": "http://localhost:3000", "secure": false } }
```

### Material Theme
Global theme is configured in `src/styles.scss` using the blue palette. To change:
```scss
$primary-palette: mat.define-palette(mat.$indigo-palette, 600);
```

---

## 🔧 Build for Production

```bash
ng build --configuration production
```

Output goes to `dist/school-fee-frontend/browser/`. Serve with nginx or any static file server:

```nginx
server {
  listen 80;
  root /var/www/school-fee/browser;
  index index.html;

  location /api/ {
    proxy_pass http://localhost:3000/api/;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server on port 4200 with API proxy |
| `npm run build` | Production build |
| `npm run build:prod` | Production build (explicit) |
| `npm test` | Run unit tests |

---

## 🎨 Design System

CSS variables (in `styles.scss`):

```css
--primary-500: #2563eb;    /* Main brand blue */
--text-primary: #0f172a;   /* Headings */
--text-secondary: #475569; /* Body text */
--bg: #f8fafc;             /* Page background */
--surface: #ffffff;        /* Card background */
--border: #e2e8f0;         /* Borders */
```

Key utility classes:
- `.page-container` — page wrapper with max-width
- `.kpi-card.kpi-blue/green/orange/red/purple/cyan` — metric cards
- `.badge.badge-paid/overdue/issued/...` — status chips
- `.table-container` — table wrapper with header+filters
- `.form-grid-2`, `.form-grid-3` — responsive form grids
- `.flex-between`, `.flex-gap`, `.flex-end` — flex helpers
- `.text-mono` — monospace for IDs, receipt numbers
