# PhotoFlow - Project Documentation

## 🎯 Current Progress (7/27 Steps Complete)

### ✅ Completed Features

1. **Supabase Database Schema** ✓
   - All 12 tables created with proper relationships
   - Row Level Security (RLS) policies configured
   - Triggers for auto-updating timestamps
   - First user becomes admin automatically
   - Audit logging system

2. **Authentication System** ✓
   - Full Supabase Auth integration
   - Role-based access (Admin/Viewer)
   - Face ID / Touch ID support
   - Password validation (10+ chars, uppercase, number, symbol)
   - Secure credential storage
   - Remember me functionality

3. **Admin Mode Toggle** ✓
   - UI-only toggle for admins to preview viewer experience
   - Persisted in AsyncStorage
   - Audit logging on toggle
   - Server-side security unchanged

4. **Multi-language System** ✓
   - 6 languages: English, Spanish, German, French, Italian, Chinese
   - Automatic device locale detection
   - Translation files complete
   - react-i18next integration

5. **Theme & Design System** ✓
   - Blue (#2563EB) and Orange (#F97316) color scheme
   - Typography system with weights and sizes
   - Spacing scale
   - Border radius system
   - Shadow definitions
   - Black & white admin theme

6. **Root Layout & Providers** ✓
   - QueryClient provider
   - tRPC provider
   - AuthContext provider
   - i18n initialization
   - GestureHandler wrapper

7. **Tab Navigation** ✓
   - 5 tabs: Home, Locations, Workshops, Portfolio, Profile
   - Lucide icons
   - Translated tab labels
   - Active/inactive tinting
   - Profile screen with user info and settings

### 🚧 Next Steps

#### High Priority (Authentication Flow)
8. **Splash Screen** - 2s fade-in animation with logo
9. **Login Screen** - Email/password + biometric auth
10. **Sign Up Screen** - Profile image upload, password validation
11. **Password Reset** - Resend email integration

#### Core Features
12. **Home Feed** - Aggregated content with real-time updates
13. **Locations System**
    - List screen with maps
    - Detail screen with camera settings
    - Comments system with moderation
    - Admin creation wizard

14. **Workshops System**
    - List and detail screens
    - Registration system
    - Admin CRUD operations

15. **Portfolio System**
    - Grid layout matching reference image
    - Detail modal
    - Drag-and-drop reordering
    - Admin CRUD operations

16. **BTS Vault**
    - Video streaming
    - Subscriber-only gating
    - Thumbnail previews

#### Premium Features
17. **Subscription Screen** - StoreKit integration
18. **Coupon Management** - Admin-only coupon creation
19. **Licensing Section** - Inquiry form with Resend

#### Admin Features
20. **Admin Panel**
    - User management
    - Role changes
    - Content moderation
    - Audit logs viewer

#### System Features
21. **Push Notifications** - Expo push notifications
22. **Social Sharing** - Native share with deep links
23. **Backend tRPC Routes** - All API endpoints
24. **Error Boundaries** - Graceful error handling
25. **Tests** - Critical flow testing

#### Polish
26. **README** - Complete documentation
27. **Final QA** - End-to-end testing

## 🔑 Environment Variables

Required in Rork settings:
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EXPO_PUBLIC_RESEND_FROM_EMAIL
RESEND_DOMAIN
EXPO_PUBLIC_EXPO_PUSH_KEY
```

## 📊 Database Tables

1. **profiles** - User accounts with roles
2. **locations** - Photography locations
3. **location_comments** - User comments
4. **workshops** - Workshop listings
5. **workshop_registrations** - User registrations
6. **portfolio** - Portfolio items
7. **bts_videos** - Subscriber content
8. **coupons** - Discount codes
9. **notification_devices** - Push tokens
10. **audit_logs** - Admin actions
11. **licensing_inquiries** - Licensing requests
12. **password_reset_tokens** - Password resets

## 🏗️ Project Structure

```
app/
├── (tabs)/                    # Tab navigation
│   ├── index.tsx             # Home (✓ Basic version)
│   ├── locations.tsx         # Locations (✓ Placeholder)
│   ├── workshops.tsx         # Workshops (✓ Placeholder)
│   ├── portfolio.tsx         # Portfolio (✓ Placeholder)
│   └── profile.tsx           # Profile (✓ Complete)
├── _layout.tsx               # Root layout (✓)
└── +not-found.tsx            # 404 (✓)

contexts/
└── AuthContext.tsx           # Auth state (✓)

i18n/
├── [6 language files]        # Translations (✓)
└── index.ts                  # Config (✓)

constants/
└── colors.ts                 # Theme (✓)

supabase/
└── schema.sql                # DB Schema (✓)

backend/
├── hono.ts                   # Server (✓)
└── trpc/                     # API (Partial)
```

## 🎨 Design Guidelines

### Colors
- Primary: Blue #2563EB
- Secondary: Orange #F97316
- Admin: Black & White

### Layout
- Grid layout for portfolio (per reference image)
- Card-based UI
- Smooth animations
- iOS-style pickers

### Components Needed
- Button (primary, secondary, outline)
- Input (text, email, password, textarea)
- Card
- Modal
- Loading spinner
- Error boundary
- ImagePicker
- VideoPlayer
- MapView
- CommentList
- CameraSettingsCard

## 🔐 Authentication Flow

```
Launch → Check session
  ├─ No session → Splash → Login/SignUp
  └─ Has session → Check role
      ├─ Admin (first login) → Force password change
      └─ Any user → Home
```

## 📱 Screen Specifications

### Home Feed
- Welcome message with user name
- Latest from each content type
- Real-time updates via Supabase
- Card-based layout
- Pull-to-refresh

### Locations
- **List**: Map pins + list view toggle
- **Detail**: Hero image, camera settings, story, map, comments
- **Admin**: Creation wizard with multi-step form

### Workshops
- **List**: Cards with date, price, image
- **Detail**: Full description, registration button
- **Admin**: CRUD operations, registration viewer

### Portfolio
- **Grid**: Photo grid matching reference design
- **Detail**: Full-screen modal with swipe
- **Admin**: Upload, reorder (drag-drop), edit, delete

### BTS Vault
- Video thumbnails
- Locked overlay for non-subscribers
- Subscriber badge
- Video player modal

### Profile
- Avatar (profile image or icon)
- Name, email, role badge
- Settings menu
- Admin mode toggle (if admin)
- Sign out button

### Admin Panel
- User list with search
- Role management
- Content visibility toggles
- Audit log viewer
- Coupon management

## 🚀 Commands

```bash
# Development
bun start                 # Start dev server
bun run start-web        # Start web only
bun run start-web-dev    # Start web with debug

# Quality
bun lint                 # Run linter

# Notes
# - Tests not set up yet
# - EAS not configured
# - Git not available
```

## ⚠️ Known Issues & Limitations

1. No custom native modules (Expo Go limitation)
2. No Xcode/Android Studio access
3. Cannot build binary directly
4. Must use public URLs for assets
5. Web compatibility required for all features

## 📝 Next Session TODO

1. Create Splash screen with animation
2. Build Login screen with biometric
3. Build Sign Up screen
4. Implement password reset flow
5. Start on Home feed with real data

---

**Progress: 7 of 27 steps complete (26%)**
