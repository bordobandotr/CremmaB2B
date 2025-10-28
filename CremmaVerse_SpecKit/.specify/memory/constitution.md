<!--
Sync Impact Report:
- Version: 1.0.0 → 1.1.0 (MINOR: v1.9.0-stable features added)
- Added: Sticky Header standards (UI/UX principle)
- Added: DataTable pagination standards (25, 50, 100)
- Added: Üretim Teslim Alma module (Type=PROD)
- Added: WhsCode/CardCode filtering requirements (Security)
- Updated: Recent Changes section with v1.9.0-stable details
- Templates Status: ✅ All templates reviewed and active
- Follow-up TODOs: None - all v1.9.0 features documented
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
- All DataTables MUST use `pageLength: 25` and `lengthMenu: [[25, 50, 100], [25, 50, 100]]`
- UOM (Ölçü Birimi) columns MUST be styled red and bold
- All action buttons MUST be stacked vertically with `d-flex flex-column gap-2`
- Multi-select filters MUST use Select2
- "Tabloyu Yenile" buttons MUST NOT be present (removed in v1.9.0)
- DataTable font size MUST be 0.85rem for headers and cells
- DataTable DOM parameter MUST be `'lfrtip'` (no buttons)
- All list page headers MUST use sticky positioning with scroll-triggered size reduction
- Sticky headers MUST transition smoothly (0.3s ease) at 50px scroll threshold
- Scrolled headers MUST reduce padding (0.5rem 1rem) and font size (1.1rem)

**Rationale:** Consistent UI patterns reduce learning curve and user errors. Color-coding improves data scanning. Always-visible scrollbars improve navigation. 25-item default pagination reduces scrolling while maintaining performance. Sticky headers improve navigation and context awareness during scrolling.

---

## Technology Stack

### Frontend Technologies (MANDATORY)
- **HTML5** - Semantic markup, modern web standards, accessibility features
- **CSS3** - Responsive design, Flexbox, Grid layouts, animations, transitions
- **JavaScript ES6+** - Modern features, async/await, modules, arrow functions, destructuring
- **Bootstrap 5.3.2** - UI framework, responsive grid system, utility classes
- **jQuery 3.7.0** - DOM manipulation, AJAX, event handling
- **DataTables 1.13.7** - Advanced table management, sorting, filtering, pagination
- **DataTables Responsive 2.5.0** - Mobile-optimized table display
- **Bootstrap Icons 1.11.2** - Comprehensive icon library (1,800+ icons)
- **Select2 4.1.0** - Enhanced multi-select dropdowns with search
- **SweetAlert2 11.x** - Beautiful, responsive alert/modal dialogs
- **Tom Select** - Advanced select boxes for checklists

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

## Frontend Capabilities & Features

### Advanced UI Components

#### 1. DataTables (Enterprise-Grade)
**Features:**
- Client-side & server-side pagination
- Multi-column sorting with custom comparators
- Real-time search with debouncing (300ms)
- Column-specific filtering
- Responsive design with horizontal scrolling
- Custom cell rendering (badges, buttons, icons)
- Row selection and bulk actions
- Export capabilities (planned)
- State persistence (planned)

**Styling:**
- Zebra striping for readability
- Hover effects for row highlighting
- Always-visible custom scrollbars (14px, styled)
- Font size: 0.85rem (optimized for data density)
- Red+bold UOM columns for emphasis
- Status badges with color coding

**Performance:**
- Optimized rendering for 1000+ rows
- Virtual scrolling (planned for v2.0)
- Lazy loading for large datasets
- Debounced search inputs

#### 2. Modal System (SweetAlert2)
**Capabilities:**
- Confirmation dialogs with custom actions
- Success/error/warning/info notifications
- Input prompts with validation
- Image preview modals
- Custom HTML content support
- Promise-based API
- Keyboard navigation (ESC, Enter)
- Backdrop click handling

**Use Cases:**
- Delivery confirmations
- Order submissions
- Error notifications
- Image uploads (defective items)
- Note taking
- Deletion confirmations

#### 3. Form Controls

**Select2 Dropdowns:**
- Multi-select with search
- AJAX data loading
- Custom templates
- Tag creation
- Placeholder support
- Clear button
- Bootstrap 5 theme integration

**Tom Select (Checklists):**
- Advanced filtering
- Grouping support
- Custom rendering
- Keyboard navigation
- Accessibility compliant

**Standard Inputs:**
- Real-time validation
- Error state styling (`is-invalid`)
- Success state styling (`is-valid`)
- Required field indicators (red asterisk)
- Placeholder text
- Input masking (planned)

#### 4. Sticky Header System (v1.9.0)
**Features:**
- Position: sticky with top: 0
- Scroll-triggered size reduction (50px threshold)
- Smooth transitions (0.3s ease)
- Responsive to sidebar toggle
- Z-index management (1000)

**Behavior:**
- Normal state: Full padding (1rem 3rem), font-size (1.25rem)
- Scrolled state: Reduced padding (0.5rem 1rem), font-size (1.1rem)
- Button size reduction in scrolled state
- Shadow enhancement on scroll

**Pages Implemented:**
- All list pages (8 pages total)
- Maintains context during scrolling
- Improves navigation efficiency

#### 5. Responsive Design System

**Breakpoints (Bootstrap 5):**
- xs: <576px (Mobile portrait)
- sm: ≥576px (Mobile landscape)
- md: ≥768px (Tablet)
- lg: ≥992px (Desktop)
- xl: ≥1200px (Large desktop)
- xxl: ≥1400px (Extra large)

**Mobile Optimizations:**
- Touch-friendly buttons (44x44px minimum)
- Collapsible sidebar with overlay
- Horizontal scrolling for tables
- Stacked form layouts
- Orientation detection and warnings
- Viewport meta tag optimization

**Tablet Optimizations:**
- Hybrid layout (sidebar + content)
- Touch and mouse support
- Landscape/portrait adaptations

#### 6. Loading & Feedback Systems

**Loading Screens:**
- Full-screen overlay with spinner
- Animated rotation (1s linear infinite)
- Semi-transparent backdrop
- "Yükleniyor..." text
- Z-index: 9999 (top layer)

**Progress Indicators:**
- Inline spinners for AJAX calls
- Button loading states
- Skeleton screens (planned)

**User Feedback:**
- Toast notifications (planned)
- Inline validation messages
- Success/error alerts
- Status badges (color-coded)

#### 7. Image Handling

**Upload System:**
- File input with preview
- Base64 encoding for transmission
- Blob conversion for FormData
- Image compression (planned)
- Multiple file support (planned)

**Display:**
- Thumbnail previews
- Full-size modal view
- Lazy loading
- Fallback images

#### 8. Navigation & Routing

**Sidebar Navigation:**
- Collapsible menu
- Active state highlighting
- Icon + text labels
- Role-based menu items
- Mobile overlay behavior

**Breadcrumbs:**
- Contextual navigation
- Back button support
- URL parameter preservation

**URL Management:**
- Query parameters for filters
- State preservation in URL
- Deep linking support

### JavaScript Architecture

#### Modular Structure
```
js/
├── api.js              # API wrapper, session management
├── login.js            # Authentication logic
├── datatable-helper.js # DataTable utilities
├── sidebar-toggle.js   # Sidebar behavior
├── orientation.js      # Device orientation detection
├── dark-mode.js        # Theme switching (planned)
└── [module-specific].js
```

#### Core Modules

**api.js:**
- Session management (localStorage)
- API endpoint wrapper
- Request/response interceptors
- Error handling
- Token refresh (planned)

**datatable-helper.js:**
- DataTable initialization
- Turkish language support
- Custom rendering functions
- Export utilities (planned)

**sidebar-toggle.js:**
- Mobile sidebar control
- Click outside detection
- State persistence
- Animation handling

**orientation.js:**
- Portrait/landscape detection
- Device type identification
- Warning messages
- Responsive adjustments

#### Design Patterns

**Async/Await:**
- All API calls use async/await
- Try-catch error handling
- Promise chaining where appropriate

**Event Delegation:**
- Efficient event handling
- Dynamic content support
- Memory leak prevention

**Debouncing:**
- Search inputs (300ms)
- Resize handlers
- Scroll listeners

**State Management:**
- localStorage for persistence
- Session state in memory
- URL parameters for filters

### CSS Architecture

#### Structure
```
css/
├── style.css           # Main styles, variables
├── login.css           # Authentication pages
├── orientation.css     # Device warnings
├── dark-mode-fixes.css # Theme overrides (planned)
└── home-style.css      # Dashboard specific
```

#### CSS Features

**Custom Properties (Variables):**
- Color palette
- Spacing scale
- Border radius
- Transition timing
- Z-index layers

**Flexbox & Grid:**
- Responsive layouts
- Card grids
- Form layouts
- Button groups

**Animations & Transitions:**
- Smooth state changes (0.3s ease)
- Loading spinners
- Modal fade-in/out
- Hover effects
- Sticky header transitions

**Utility Classes:**
- Spacing (margin, padding)
- Typography (font-size, weight)
- Colors (text, background)
- Display (flex, grid, none)
- Positioning (sticky, fixed, absolute)

### Performance Optimizations

**Code Splitting:**
- Page-specific JavaScript
- Lazy loading modules (planned)
- Dynamic imports (planned)

**Asset Optimization:**
- Minified CSS/JS (production)
- Image compression
- Icon sprite sheets (planned)
- CDN usage for libraries

**Caching Strategy:**
- `cache: 'no-cache'` for data freshness
- Browser caching for static assets
- Service workers (planned for PWA)

**Rendering Optimization:**
- Debounced scroll/resize handlers
- RequestAnimationFrame for animations
- Virtual scrolling for large lists (planned)
- Intersection Observer for lazy loading (planned)

### Accessibility (a11y)

**Keyboard Navigation:**
- Tab order management
- Focus indicators
- Keyboard shortcuts (planned)
- Skip links

**Screen Readers:**
- ARIA labels
- ARIA roles
- ARIA live regions
- Semantic HTML

**Visual Accessibility:**
- Color contrast ratios (WCAG AA)
- Focus indicators
- Error messages
- Loading states

**Form Accessibility:**
- Label associations
- Error announcements
- Required field indicators
- Input validation feedback

### Browser Compatibility

**Supported Browsers:**
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

**Polyfills:**
- ES6+ features for older browsers
- Fetch API fallback
- CSS Grid fallback

**Testing:**
- Cross-browser manual testing
- Mobile device testing
- Tablet testing
- Orientation testing

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
- All delivery endpoints MUST filter by WhsCode (ana depo, üretim) or CardCode (dış tedarik)
- WhsCode filtering MUST be implemented in both OData queries and fallback mechanisms
- Users MUST only access data for their assigned branch/warehouse

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
- **v1.1.0 (2025-10-28):** Added sticky header standards, DataTable pagination requirements (25/50/100), WhsCode/CardCode filtering mandates, and v1.9.0-stable feature documentation.
- **v1.0.0 (2025-10-28):** Initial constitution establishment with 5 core principles, comprehensive technology stack, design system, security standards, and governance rules.

---

**Version**: 1.1.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-10-28

---

# PROJECT PLAN REFERENCE

## Technical Context

**Language/Version**: JavaScript ES6+ (Node.js for backend, Browser for frontend)  
**Primary Dependencies**: Express.js 4.21.2, Bootstrap 5.3.2, jQuery 3.7.0, DataTables 1.13.7, Axios 1.7.9  
**Storage**: SAP HANA & SQL Server Database (via SAP Business One Service Layer)  
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
- `GET /api/anadepo-delivery/:docNum` - View: AS_B2B_OwtrNew_B1SLQuery (Type='MAIN', WhsCode filter)
- `POST /api/anadepo-delivery/:docNum` - Submit delivery (ASUDO_B2B_OWTR)

### Dış Tedarik
- `GET /api/supply-orders` - View: AS_B2B_OporList_B1SLQuery
- `GET /api/supply-items-list/:whsCode` - View: AS_B2B_OporNew_B1SLQuery
- `POST /api/supply-order` - Create purchase order
- `GET /api/supply-detail-order/:docNum` - View: AS_B2B_OpdnNew_B1SLQuery (Type='SUPPLY', CardCode filter)
- `POST /api/supply-delivery/:docNum` - Submit delivery (ASUDO_B2B_OPDN)

### Production (Üretim)
- `GET /api/production-orders` - Query: OWTQ_LIST
- `POST /api/production-order` - Create production order
- `GET /api/uretim-delivery/:docNum` - View: AS_B2B_OwtrNew_B1SLQuery (Type='PROD', WhsCode filter)
- `POST /api/uretim-delivery/:docNum` - Submit delivery (ASUDO_B2B_OWTR)

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
- ✅ **Üretim Teslim Alma:** Created GET/POST `/api/uretim-delivery/:docNum` endpoints (Type='PROD')
- ✅ **Ana Depo WhsCode Filtering:** Added WhsCode parameter to `/api/anadepo-delivery/:docNum` for branch-based security
- ✅ **Dış Tedarik View Service:** Migrated `/api/supply-detail-order/:docNum` from SQLQuery to AS_B2B_OpdnNew_B1SLQuery with CardCode filtering
- ✅ **View Service Migration:** Migrated `/api/supply-orders` to AS_B2B_OporList_B1SLQuery and `/anadepo-siparisleri-list` to AS_B2B_OwtqNew_B1SLQuery
- ✅ **OData Filtering:** Implemented OData $filter with server-side fallback on 400 errors across all delivery endpoints
- ✅ **Security Enhancement:** All delivery endpoints now filter by WhsCode (ana depo, üretim) or CardCode (dış tedarik)
- ✅ **Error Handling:** Enhanced error logging and response validation

### Frontend
- ✅ **Sticky Header (8 pages):** Implemented sticky positioning with scroll-triggered size reduction (50px threshold, 0.3s ease transition)
  - uretim-siparisleri.html, dis-tedarik-siparisleri.html, anadepo-siparisleri.html
  - transferler.html, check-list.html, fire-zayi.html, ticket.html, stok-sayimlarim.html
- ✅ **DataTable Pagination (3 pages):** Changed default from 10 to 25 records with [25, 50, 100] options
  - stok-sayimlarim.html (js/stok-sayimlarim.js), ticket.html, fire-zayi.html
- ✅ **Üretim Teslim Alma Page:** Created uretim-siparisi-teslim.html (copied from ana depo, Type='PROD')
- ✅ **Ana Depo Status Badge:** Fixed getStatusBadge function to use bg-orange for status 2 (matching dış tedarik)
- ✅ **UI/UX Consistency:** Removed "Tabloyu Yenile" button globally, implemented always-visible scrollbars (14px height)
- ✅ **Typography:** Standardized font size to 0.85rem for all DataTables
- ✅ **Styling:** Applied red+bold to UOM columns, added Birim Çevirimi columns, stacked action buttons vertically
- ✅ **Performance:** Applied `cache: 'no-cache'` to all data fetches, optimized column widths

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
