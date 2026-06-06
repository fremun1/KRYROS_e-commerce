# KRYROS MOBILE TECH - Enterprise Commerce Platform Specification

## Project Overview
- **Company**: KRYROS MOBILE TECH LIMITED
- **Brand**: KRYROS
- **Type**: Multi-service Commerce + Fintech Platform
- **Sector**: Technology & Electronics

---

## 1. UI/UX Design System

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary: #0f172a;        /* Deep blue-black */
  --primary-light: #1e293b;  /* Slate */
  --accent: #22c55e;         /* Tech green */
  --accent-hover: #16a34a;   /* Green hover */
  
  /* Secondary Colors */
  --secondary: #64748b;      /* Slate gray */
  --secondary-light: #94a3b8;
  
  /* CTA Colors */
  --cta-orange: #f97316;     /* Orange for CTAs */
  --cta-teal: #14b8a6;       /* Teal for highlights */
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  /* Status Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Border */
  --border: #e2e8f0;
  --border-hover: #cbd5e1;
}
```

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Display Font**: Poppins (for headings)
- **Mono Font**: JetBrains Mono (for code/prices)
- **Base Size**: 16px
- **Scale**: 1.25 (Major Third)

### Spacing System (8pt Grid)
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px - 1440px
- Wide: > 1440px

---

## 2. Page Structure

### 2.1 User-Facing Pages

#### Homepage Sections (Dynamic - Admin Controlled)
1. **Hero Slider** - Full-width banner carousel
2. **Flash Sales** - Countdown timer + product slider
3. **Categories Grid** - 6-8 category cards
4. **Featured Products** - Product slider
5. **Promo Banners** - Split layout ads
6. **Wholesale Deals** - Bulk pricing section
7. **Credit Offers** - Buy on credit highlights
8. **Services Section** - Service cards
9. **Software Products** - Digital goods
10. **Testimonials** - Customer reviews
11. **Blog/News** - Latest announcements

#### Shop Pages
- `/shop` - Retail store with filters
- `/wholesale` - Wholesale store
- `/software` - Digital products
- `/services` - Service catalog

#### Product Pages
- `/product/[slug]` - Product detail
- Quick view modals
- Compare page
- Wishlist page

#### Credit/Fintech Pages
- `/credit` - Credit hub
- `/credit/apply` - Credit application
- `/credit/dashboard` - User credit management

#### User Dashboard
- `/dashboard` - Overview
- `/dashboard/orders` - Order history
- `/dashboard/installments` - Credit plans
- `/dashboard/wallet` - Wallet balance
- `/dashboard/downloads` - Digital downloads
- `/dashboard/profile` - Profile settings
- `/dashboard/addresses` - Address book
- `/dashboard/support` - Support tickets

### 2.2 Admin Panel Pages
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/inventory` - Stock management
- `/admin/orders` - Order management
- `/admin/wholesale` - Wholesale accounts
- `/admin/credit` - Credit management
- `/admin/services` - Services management
- `/admin/cms` - Content management
- `/admin/users` - User management
- `/admin/settings` - System settings

---

## 3. Component Architecture

### 3.1 Core Components

#### Header Components
- `Header` - Main sticky header
- `MegaMenu` - Multi-level navigation
- `SearchBar` - Live search with suggestions
- `CartDropdown` - Mini cart
- `UserMenu` - Account dropdown

#### Homepage Components
- `HeroSlider` - Banner carousel
- `FlashSales` - Timed deals section
- `CategoryGrid` - Category cards
- `ProductSlider` - Horizontal scroll products
- `PromoBanner` - Advertisement banners
- `TestimonialCarousel` - Customer reviews
- `BlogCard` - News articles

#### Product Components
- `ProductCard` - Product display
- `ProductGrid` - Grid layout
- `ProductGallery` - Image gallery
- `VariantSelector` - Size/color picker
- `PriceDisplay` - Dynamic pricing
- `InstallmentCalculator` - Credit calculator

#### Cart & Checkout
- `CartDrawer` - Slide-in cart
- `CartItem` - Cart line item
- `CheckoutForm` - Multi-step checkout
- `PaymentMethods` - Payment selection

#### Credit Components
- `CreditApplication` - Credit request form
- `InstallmentPlan` - Payment breakdown
- `CreditDashboard` - Credit management
- `PaymentSchedule` - Due dates display

#### User Dashboard
- `DashboardStats` - Overview cards
- `OrderTable` - Order history
- `WalletBalance` - Balance display
- `DownloadList` - Digital downloads

#### Admin Components
- `AdminSidebar` - Navigation
- `DataTable` - CRUD tables
- `StatsCard` - Analytics cards
- `ChartWidget` - Data visualization
- `BannerUploader` - Image upload
- `SectionManager` - Homepage control

### 3.2 Component Props Interface
```typescript
interface ProductCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
  onAddToWishlist: (id: string) => void;
  onQuickView: (product: Product) => void;
  showActions?: boolean;
  layout?: 'grid' | 'list' | 'slider';
}
```

---

## 4. Animation & Interactions

### 4.1 Page Transitions
- Fade in on route change
- Stagger children elements

### 4.2 Component Animations
- **Hover Effects**: Scale, shadow, color transition
- **Buttons**: Press effect, ripple
- **Cards**: Lift on hover
- **Modals**: Slide + fade
- **Dropdowns**: Slide down + fade
- **Cart**: Slide from right

### 4.3 Product Slider Behaviors
- Auto-play with pause on hover
- Touch swipe on mobile
- Infinite loop
- Smooth scroll snapping

### 4.4 Micro-interactions
- Add to cart: Button pulse + cart icon bounce
- Wishlist: Heart fill animation
- Loading: Skeleton screens
- Toast notifications: Slide in

---

## 5. Backend Architecture

### 5.1 Microservices Structure
```
/backend
  /src
    /auth           - Authentication service
    /users          - User management
    /products       - Product catalog
    /inventory      - Stock management
    /orders         - Order processing
    /payments       - Payment processing
    /wallet         - Wallet service
    /credit         - Credit/financing
    /wholesale      - Wholesale module
    /services       - Service bookings
    /cms            - Content management
    /notifications  - Push/email notifications
    /analytics      - Reporting
    /shared         - Shared utilities
```

### 5.2 API Endpoints Structure

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset

#### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

#### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status

#### Credit
- `GET /api/credit/profile` - Get credit profile
- `POST /api/credit/apply` - Apply for credit
- `GET /api/credit/plans` - Get installment plans
- `POST /api/credit/payment` - Make payment

#### Payments
- `POST /api/payments/initialize` - Init payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Payment history

---

## 6. Database Schema (Prisma)

### Core Tables
- `users` - User accounts
- `roles` - User roles
- `permissions` - Access permissions
- `user_roles` - Role assignments
- `products` - Product catalog
- `product_variants` - Product variants
- `categories` - Product categories
- `brands` - Brand references
- `inventory` - Stock levels
- `stock_movements` - Stock history
- `orders` - Customer orders
- `order_items` - Order line items
- `order_logs` - Order history

### Credit/Fintech Tables
- `credit_profiles` - User credit scores
- `credit_requests` - Credit applications
- `credit_accounts` - Active credit accounts
- `credit_plans` - Installment plans
- `repayments` - Payment records
- `penalties` - Late payment fees
- `blacklist` - Credit blacklist

### Commerce Tables
- `wholesale_accounts` - Distributor accounts
- `wholesale_prices` - Bulk pricing
- `wallets` - User wallets
- `transactions` - Wallet transactions
- `services` - Service catalog
- `service_bookings` - Service appointments

### Content Tables
- `cms_pages` - Page content
- `cms_sections` - Homepage sections
- `cms_banners` - Banner images
- `blog_posts` - Blog articles

### System Tables
- `notifications` - User notifications
- `support_tickets` - Help desk
- `audit_logs` - Activity logs
- `settings` - System configuration

---

## 7. Security Requirements

### Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (7 days expiry)
- HTTP-only cookies
- CSRF protection

### Authorization
- Role-based access control (RBAC)
- Permission middleware
- Feature flags

### API Security
- Rate limiting (100 req/min)
- IP throttling
- Request validation
- SQL injection prevention
- XSS protection

### Financial Security
- Transaction locking
- Encrypted sensitive fields
- Audit logging
- Two-factor authentication option

---

## 8. Payment Integration

### Supported Methods
- Paystack (Cards, Bank, USSD)
- Flutterwave (Cards, Bank, Mobile Money)
- Bank Transfer (Manual)
- Wallet Balance

### Payment Flows
1. **Standard Checkout**: Full payment
2. **Installment**: Split payments
3. **Wallet**: Deduct from balance

---

## 9. Admin CMS Features

### Homepage Control
- Drag-and-drop section ordering
- Enable/disable sections
- Set section content
- Schedule promotions

### Banner Management
- Upload images
- Set links
- Set display order
- Set active dates

### Product Management
- CRUD operations
- Bulk import/export
- Inventory tracking
- Price management

### Order Management
- View all orders
- Update status
- Process refunds
- Generate invoices

---

## 10. File Structure

```
/kryros-mobile-project
  /frontend
    /user-ui
      /src
        /app                    # Next.js App Router
          /(auth)               # Auth routes
          /(dashboard)          # User dashboard
          /(shop)               # Shop pages
          /api                  # API routes
        /components
          /ui                   # Base components
          /layout               # Layout components
          /products             # Product components
          /cart                 # Cart components
          /credit               # Credit components
          /admin                # Admin components
        /lib                    # Utilities
        /hooks                  # Custom hooks
        /store                  # Zustand stores
        /types                  # TypeScript types
    /admin-panel
      # Similar structure
  /backend
    /src
      /modules                  # NestJS modules
      /common                   # Shared code
      /config                   # Configuration
  /infrastructure
    /docker                     # Docker configs
    /scripts                    # Deployment scripts
```

---

## 11. Acceptance Criteria

### User Platform
- [ ] Homepage loads with all sections
- [ ] Products display with correct pricing
- [ ] Cart functionality works
- [ ] Checkout completes successfully
- [ ] Credit application submits
- [ ] User dashboard shows correct data

### Admin Panel
- [ ] All CRUD operations work
- [ ] Homepage sections are controllable
- [ ] Orders can be managed
- [ ] Credit system can be administered

### Performance
- [ ] Lighthouse score > 90
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s

### Responsive
- [ ] Mobile: All features work
- [ ] Tablet: Full functionality
- [ ] Desktop: Optimal layout
