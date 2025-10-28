<!--
Sync Impact Report:
- Version: 0.0.0 → 1.0.0 (MAJOR: Initial constitution establishment)
- Added Principles: 5 core architecture principles
- Added Sections: Technology Stack, Design System, Security, Performance, Quality Assurance, Development Workflow, i18n, Accessibility, Support, Success Metrics
- Templates Status: ⚠ Pending review of plan-template.md, spec-template.md, tasks-template.md
- Follow-up TODOs: None - all placeholders filled
-->

# CremmaVerse B2B Platform Constitution

## Project Identity

**Name:** CremmaVerse B2B Platform  
**Version:** v1.9.0-stable  
**Type:** Enterprise B2B Web Application  
**Industry:** Food Production & Distribution  
**Organization:** Anadolu Sinerji  
**Primary Users:** Branch Managers, Warehouse Supervisors, Production Managers  
**Development Start:** 2024  
**Current Status:** Production (Active)

---

## Core Principles

### I. Modular Component Architecture

**Philosophy:** Separation of concerns with reusable components

**MUST Requirements:**
- All UI components MUST be placed in `components/` directory
- All JavaScript modules MUST be placed in `js/` directory
- All stylesheets MUST be placed in `css/` directory
- Components MUST be reusable across multiple pages
- Clear separation MUST exist between UI, business logic, and data access

**Rationale:** Modular architecture ensures maintainability, consistency, and faster development. Code duplication is minimized, and updates can be made in a single location affecting all pages.

### II. SAP-Centric Integration

**Philosophy:** Single source of truth from SAP Business One

**MUST Requirements:**
- All SAP configuration MUST be centralized in `SAP_CONFIG` object in `server.js`
- All data retrieval MUST use SAP View Services (AS_B2B_*) when available
- All endpoints MUST implement OData filtering with server-side fallback
- All authentication MUST use SAP Business One credentials
- Session management MUST use B1SESSION cookie

**Rationale:** Centralized configuration allows environment changes with single-point updates. View Services provide optimized queries. Fallback mechanisms ensure graceful degradation.

### III. Responsive & Mobile-First Design (NON-NEGOTIABLE)

**Philosophy:** Accessible on any device, optimized for mobile

**MUST Requirements:**
- All pages MUST use Bootstrap 5 responsive grid system
- All DataTables MUST use `scrollX: true` for horizontal scrolling
- All interactive elements MUST be touch-friendly (minimum 44x44px)
- Orientation detection MUST be implemented via `js/orientation.js`
- Device-specific warnings MUST be styled in `css/orientation.css`

**Rationale:** Mobile accessibility is critical for branch managers and warehouse staff who work on-the-go. Consistent experience across devices improves adoption and productivity.

### IV. Performance Optimization

**Philosophy:** Fast, responsive, and efficient

**MUST Requirements:**
- All data fetches MUST use `cache: 'no-cache'` for freshness
- Client-side pagination MUST be used for datasets <1000 rows
- Server-side pagination MUST be used for datasets >1000 rows
- Search inputs MUST be debounced (300ms delay)
- Request logging MUST be limited to 1000 entries
- SAP view queries MUST use indexed fields

**Rationale:** Performance directly impacts user satisfaction and productivity. Real-time data ensures accuracy. Optimized queries reduce server load.

### V. User Experience Standards

**Philosophy:** Intuitive, consistent, and user-friendly

**MUST Requirements:**
- All DataTables MUST use zebra striping (`table-striped`) and hover effects (`table-hover`)
- All DataTables MUST have always-visible scrollbars (14px height, styled)
- UOM (Ölçü Birimi) columns MUST be styled red and bold
- All action buttons MUST be stacked vertically with `d-flex flex-column gap-2`
- Multi-select filters MUST use Select2
- "Tabloyu Yenile" buttons MUST NOT be present (removed in v1.9.0)
- DataTable font size MUST be 0.85rem for headers and cells
- DataTable DOM parameter MUST be `'lfrtip'` (no buttons)

**Rationale:** Consistent UI patterns reduce learning curve and user errors. Color-coding improves data scanning. Always-visible scrollbars improve navigation.

---

## Technology Stack

### Frontend Technologies (MANDATORY)
- **HTML5** - Semantic markup, modern web standards
- **CSS3** - Responsive design, Flexbox, Grid layouts
- **JavaScript ES6+** - Modern features, async/await, modules
- **Bootstrap 5.3.2** - UI framework, responsive grid
- **jQuery 3.7.0** - DOM manipulation, AJAX
- **DataTables 1.13.7** - Table management
- **Bootstrap Icons 1.11.2** - Icon library
- **Select2** - Enhanced dropdowns

### Backend Technologies (MANDATORY)
- **Node.js** - Server-side runtime
- **Express.js 4.21.2** - Web framework
- **Axios 1.7.9** - HTTP client for SAP
- **Multer 1.4.5** - File uploads
- **http-proxy-middleware 2.0.7** - SAP proxy

### External Integrations (MANDATORY)
- **SAP Business One Service Layer** - ERP integration
- **SAP B1 Custom Views** - Optimized views (AS_B2B_*)
- **OData Protocol** - Data querying

---

## Design System

### Color Palette (MANDATORY)
- **Danger Red:** `#dc3545` - Primary actions, UOM emphasis
- **Primary Blue:** `#0d6efd` - Secondary actions, outline buttons
- **Success Green:** `#198754` - Confirmations, delivery buttons
- **Warning Yellow:** `#ffc107` - Warnings
- **Info Cyan:** `#0dcaf0` - Information

### Typography (MANDATORY)
- **Base:** 1rem (16px)
- **DataTable:** 0.85rem (13.6px) - NON-NEGOTIABLE
- **Font Stack:** System fonts (Bootstrap default)

### Component Standards (MANDATORY)
- **Buttons:** Primary (`btn-danger`), Secondary (`btn-outline-primary`), Success (`btn-success`)
- **DataTables:** `scrollX: true`, `dom: 'lfrtip'`, `cache: 'no-cache'`, font-size: 0.85rem
- **Forms:** `form-control`, Select2 integration
- **Modals:** Static backdrop, right-aligned action buttons

---

## Security Standards

### Authentication (NON-NEGOTIABLE)
- Session-based authentication via SAP Business One
- B1SESSION cookie (HTTP-only, secure)
- 30-minute timeout
- Auto-logout on expiration
- Passwords NEVER stored client-side

### Authorization (NON-NEGOTIABLE)
- Role-Based Access Control (RBAC)
- Branch-based permissions (WhsCode)
- User type separation (MAIN, BRANCH, PROD)
- Server-side endpoint validation
- Every API request MUST validate sessionId

### Data Security (NON-NEGOTIABLE)
- HTTPS only (TLS 1.2+)
- SAP connection SSL/TLS encrypted
- Passwords masked in logs (`********`)
- Session IDs truncated in logs (first 8 chars + `...`)
- Input validation client-side AND server-side
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

---

## Performance Standards

### Frontend (MANDATORY TARGETS)
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Largest Contentful Paint: <2.5s

### Backend (MANDATORY TARGETS)
- API response time: <500ms (95th percentile)
- Database query time: <200ms
- SAP Service Layer calls: <1s

### DataTable (MANDATORY STRATEGIES)
- Client-side pagination for <1000 rows
- Server-side pagination for >1000 rows
- Debounced search (300ms)
- Optimized column rendering

---

## Quality Assurance

### Testing Requirements (MANDATORY)
- **Manual Testing:** Cross-browser (Chrome, Firefox, Safari, Edge)
- **Mobile Testing:** iOS (Safari), Android (Chrome)
- **Tablet Testing:** iPad, Android tablets
- **Orientation Testing:** Portrait and landscape
- **UAT:** Branch managers, warehouse supervisors, production managers
- **Integration Testing:** SAP connectivity, View Services, OData filters, fallback mechanisms

### Code Quality (MANDATORY)
- Comments in Turkish language
- JSDoc documentation for functions
- Descriptive naming (camelCase for JS, kebab-case for CSS)
- Modular structure, DRY principles
- Try-catch blocks for error handling

---

## Development Workflow

### Version Control (MANDATORY)
- **System:** Git
- **Repository:** GitHub (bordobandotr/CremmaB2B)
- **Branching:** main branch (production)
- **Commits:** Descriptive messages, semantic versioning
- **Tags:** Version tags (v1.9.0-stable)

### Deployment Process (MANDATORY STEPS)
1. Local testing on dev SAP (192.168.54.185)
2. Code review
3. Version bump in `package.json`
4. Git commit with detailed message
5. Git push to main
6. Server restart: `pkill -f "node server.js" && node server.js`
7. Smoke testing
8. User notification

### Rollback Procedure (MANDATORY STEPS)
1. Identify problematic commit
2. Git revert or checkout previous stable version
3. Server restart
4. Verification testing
5. User notification

---

## Internationalization (i18n)

### Current Support
- Primary Language: Turkish (tr)
- Translation File: `i18n/tr.json`
- DataTables: `js/datatables-tr.json`

### Future Expansion
- English (en) support planned
- Arabic (ar) for potential expansion

---

## Accessibility (a11y)

### Standards (MANDATORY)
- Target: WCAG 2.1 Level AA compliance
- Semantic HTML5 elements
- ARIA labels for icons and dynamic content
- Full keyboard navigation support
- Sufficient color contrast ratios
- Screen reader compatibility (NVDA, JAWS, VoiceOver)

---

## Support & Maintenance

### Development Team
- **Lead Developer:** Cascade AI
- **Project Owner:** Hakan Bilgin
- **Organization:** Anadolu Sinerji

### Maintenance Schedule (MANDATORY)
- **Dependency Updates:** Monthly
- **Security Patches:** Immediate
- **Framework Upgrades:** Quarterly
- **Browser Compatibility:** Continuous monitoring

---

## Success Metrics

### User Adoption
- Active users per day
- Feature usage statistics
- User satisfaction scores
- Support ticket volume

### Performance Metrics
- Page load times
- API response times
- Error rates
- Uptime percentage

### Business Impact
- Order processing time reduction
- Inventory accuracy improvement
- Transfer efficiency increase
- Waste reduction tracking

---

## Governance

This constitution supersedes all other development practices and guidelines. All code changes, feature additions, and architectural decisions MUST comply with the principles and standards defined herein.

### Amendment Process
1. Proposed changes MUST be documented with rationale
2. Impact analysis MUST be performed on existing codebase
3. Approval required from Project Owner
4. Migration plan MUST be created for breaking changes
5. Version number MUST be incremented per semantic versioning rules

### Compliance
- All pull requests MUST verify compliance with constitution
- Code reviews MUST check adherence to principles
- Complexity MUST be justified with clear rationale
- Deviations MUST be documented and approved

### Version History
- **v1.0.0 (2025-10-28):** Initial constitution establishment with 5 core principles, comprehensive technology stack, design system, security standards, and governance rules.

---

**Version**: 1.0.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-10-28

---

# PROJECT PLAN REFERENCE

## Technical Context

**Language/Version**: JavaScript ES6+ (Node.js for backend, Browser for frontend)  
**Primary Dependencies**: Express.js 4.21.2, Bootstrap 5.3.2, jQuery 3.7.0, DataTables 1.13.7, Axios 1.7.9  
**Storage**: SAP HANA Database (via SAP Business One Service Layer)  
**Testing**: Manual testing (cross-browser, mobile, UAT), Integration testing (SAP connectivity)  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), Mobile browsers (iOS Safari, Android Chrome)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: <1.5s FCP, <3s TTI, <500ms API response (95th percentile)  
**Constraints**: <200ms DB queries, 30min session timeout, HTTPS only, WCAG 2.1 AA compliance  
**Scale/Scope**: 10 modules, 41 HTML pages, 27 JS files, ~50 active users, multi-branch deployment

## Project Structure

### Source Code (repository root)

```text
server.js                     # Express.js backend (Port 3000)
package.json                  # NPM dependencies
SAP_CONFIG_README.md          # SAP configuration guide

components/                   # Reusable HTML components
├── header.html
├── footer.html
├── sidebar.html
├── nav-menu.html
├── sidebar_user.html
└── logo_container.html

css/                          # Stylesheets
├── style.css                 # Main styles
├── login.css
├── orientation.css
├── dark-mode-fixes.css
└── home-style.css

js/                           # JavaScript modules
├── api.js                    # API wrapper
├── login.js                  # Authentication
├── datatable-helper.js       # DataTable utilities
├── nav-menu.js               # Navigation
├── sidebar-toggle.js
├── dark-mode.js
├── orientation.js
├── safe-datatables.js
└── [27 total JS files]

[Root HTML Pages]             # 41 HTML pages
├── login.html
├── index.html
├── anadepo-siparisleri.html
├── anadepo-siparisi-olustur.html
├── dis-tedarik-siparisleri.html
├── dis-tedarik-siparisi-olustur.html
├── uretim-siparisleri.html
├── transferler.html
├── fire-zayi.html
├── stok-sayimlarim.html
├── ticket.html
└── [31 more pages]

i18n/                         # Internationalization
└── tr.json                   # Turkish translations

data/                         # Static data
└── sales-report.json

img/                          # Images and media
uploads/                      # User uploads
```

**Structure Decision**: Web application structure chosen. Backend (server.js) serves as proxy to SAP Service Layer. Frontend uses component-based architecture with reusable HTML/JS/CSS modules. No separate backend/frontend directories - monolithic structure for simplicity.

## Module Summary

### Completed Modules (10/10)
1. **Authentication** - SAP B1 login, session management, RBAC
2. **Ana Depo Orders** - Main warehouse ordering with stock validation
3. **Dış Tedarik Orders** - External supply ordering with supplier management
4. **Production Orders** - Manufacturing order management with BOM
5. **Transfers** - Inter-branch stock transfers with approval
6. **Waste Management** - Fire/zayi recording with reason tracking
7. **Stock Counting** - Inventory counts with variance analysis
8. **Tickets** - Support ticket system with department routing
9. **Checklists** - Daily task checklists
10. **Dashboard** - Real-time analytics and AI insights

## API Endpoints (Key Routes)

### Authentication
- `POST /api/login` - SAP B1 authentication

### Ana Depo
- `GET /anadepo-siparisleri-list` - View: AS_B2B_OwtqNew_B1SLQuery
- `POST /api/anadepo-order` - Create order

### Dış Tedarik
- `GET /api/supply-orders` - View: AS_B2B_OporList_B1SLQuery
- `GET /api/supply-items-list/:whsCode` - View: AS_B2B_OporNew_B1SLQuery
- `POST /api/supply-order` - Create purchase order

### Production
- `GET /api/production-orders` - Query: OWTQ_LIST
- `POST /api/production-order` - Create production order

### Transfers
- `GET /api/transfers` - Query: OWTR_LIST
- `POST /api/transfer` - Create transfer

### Tickets
- `GET /api/tickets-view` - View: AS_B2B_TicketList_B1SLQuery
- `POST /api/ticket` - Create ticket

### Stock Counting
- `GET /api/count-list` - Custom view
- `POST /api/count` - Submit count

## Recent Changes (v1.9.0-stable)

### Backend
- Migrated `/api/supply-orders` to View Service (AS_B2B_OporList_B1SLQuery)
- Migrated `/anadepo-siparisleri-list` to View Service (AS_B2B_OwtqNew_B1SLQuery)
- Implemented OData $filter with server-side fallback on 400 errors
- Enhanced error logging and response validation

### Frontend
- Removed "Tabloyu Yenile" button globally (from datatable-helper.js)
- Implemented always-visible scrollbars (14px height, styled)
- Standardized font size to 0.85rem for all DataTables
- Applied red+bold styling to UOM (Ölçü Birimi) columns
- Added Birim Çevirimi (UOM Conversion) columns
- Stacked action buttons vertically (Detay + Teslim Al)
- Applied `cache: 'no-cache'` to all data fetches
- Optimized column widths across all pages

## Future Roadmap

### Q1 2026
- Advanced analytics dashboard
- Push notifications
- Barcode scanning improvements

### Q2 2026
- AI-powered demand forecasting
- Automated reordering
- Multi-language support (English)

### Q3 2026
- Third-party logistics integration
- Customer portal
- Supplier portal
- External API

### Q4 2026
- ML inventory optimization
- Predictive maintenance
- Advanced reporting
- Mobile-first redesign
