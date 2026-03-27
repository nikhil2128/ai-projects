# Frontend Documentation

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Application Entry Point](#application-entry-point)
- [Routing](#routing)
- [Authentication](#authentication)
- [State Management](#state-management)
- [API Client](#api-client)
- [Pages](#pages)
- [Components](#components)
- [Type System](#type-system)
- [Styling](#styling)
- [Configuration](#configuration)
- [Build & Development](#build--development)

---

## Overview

The frontend is a **single-page application** branded as **SoulMatch**, built with React 18 and Vite 6. It communicates with the backend REST API via a centralized fetch-based HTTP client and uses React Context for global authentication state.

## Tech Stack

| Concern | Library | Version |
|---------|---------|---------|
| UI Framework | React | 18.3 |
| Build Tool | Vite | 6.0 |
| Routing | React Router DOM | 6.28 |
| Language | TypeScript | 5.6 |
| Styling | Tailwind CSS | 3.4 |
| Icons | lucide-react | 0.468 |
| PostCSS | Autoprefixer | 10.4 |

No external state management library, HTTP client library, or form library is used — the app relies on React's built-in hooks and the native `fetch` API.

## Directory Structure

```
frontend/
├── index.html                 # SPA shell (title: "SoulMatch")
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite + React plugin + API proxy
├── tailwind.config.js         # Theme: colors, fonts, animations
├── postcss.config.js          # Tailwind + Autoprefixer
├── tsconfig.json              # TypeScript config (strict)
├── tsconfig.node.json         # TS config for Vite/Node
│
└── src/
    ├── main.tsx               # createRoot, StrictMode
    ├── App.tsx                # BrowserRouter, AuthProvider, routes
    ├── api.ts                 # Centralized HTTP client
    ├── types.ts               # Shared interfaces + constant arrays
    ├── index.css              # Tailwind layers + custom components
    │
    ├── context/
    │   └── AuthContext.tsx     # Auth state, login/register/logout
    │
    ├── pages/
    │   ├── Login.tsx           # Email/password login
    │   ├── Register.tsx        # Sign up form
    │   ├── BuildProfile.tsx    # Multi-step profile wizard
    │   ├── Browse.tsx          # Recommendations + filtered grid
    │   ├── MyProfile.tsx       # View own profile
    │   ├── ProfileDetail.tsx   # View another user's profile
    │   ├── FamilyProfile.tsx   # Family profile CRUD
    │   ├── Shortlist.tsx       # Shortlisted profiles + compare
    │   └── SharedProfiles.tsx  # Sent/received shared profiles
    │
    └── components/
        ├── Layout.tsx          # App shell: navbar, footer, mobile menu
        ├── ProtectedRoute.tsx  # Auth guard + loading state
        ├── ProfileCard.tsx     # Profile summary card (browse grid)
        │
        ├── profile/
        │   └── ProfileSections.tsx  # Composable profile display blocks
        │
        └── shared/
            ├── index.ts        # Barrel export
            ├── LoadingSpinner.tsx
            ├── EmptyState.tsx
            ├── ErrorAlert.tsx
            ├── Modal.tsx       # Modal + Modal.Header + Modal.Body
            ├── StepIndicator.tsx
            ├── InfoCard.tsx
            ├── Section.tsx
            ├── DetailRow.tsx
            └── SelectionGroup.tsx
```

## Application Entry Point

### `main.tsx`

Mounts the React app into the `#root` element with `StrictMode` enabled. Imports `index.css` for Tailwind.

### `App.tsx`

Wraps the entire app in `BrowserRouter` and `AuthProvider`, then renders `AppRoutes` — a component that reads auth state and declares all route definitions.

```
<BrowserRouter>
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
</BrowserRouter>
```

---

## Routing

All routes are defined client-side using React Router v6 in `App.tsx`.

### Route Table

| Path | Component | Auth | Layout | Description |
|------|-----------|------|--------|-------------|
| `/login` | `Login` | Public (redirects if logged in) | None | Email/password login form |
| `/register` | `Register` | Public (redirects if logged in) | None | Registration form |
| `/build-profile` | `BuildProfile` | Protected | `Layout` | Multi-step profile creation wizard |
| `/browse` | `Browse` | Protected | `Layout` | Daily recommendations + browse grid |
| `/my-profile` | `MyProfile` | Protected | `Layout` | View own profile with edit link |
| `/family-profile` | `FamilyProfile` | Protected | `Layout` | Family profile form/view |
| `/shortlist` | `Shortlist` | Protected | `Layout` | Shortlisted profiles + compare mode |
| `/shared-profiles` | `SharedProfiles` | Protected | `Layout` | Sent/received profile shares |
| `/profile/:userId` | `ProfileDetail` | Protected | `Layout` | Another user's full profile |
| `*` | — | — | — | Redirect to `/browse` or `/login` |

### Route Guards

**`ProtectedRoute`** wraps authenticated pages. Behavior:

1. While `loading` is true → render `LoadingSpinner`
2. If no `user` → redirect to `/login`
3. If `requireProfile` is set and `!hasProfile` → redirect to `/build-profile`
4. Otherwise → render `children`

---

## Authentication

### Flow

```
┌──────────┐     POST /auth/register     ┌──────────┐
│          │ ──────────────────────────── │          │
│  Client  │     POST /auth/login        │  Server  │
│          │ ──────────────────────────── │          │
│          │ ◄── { token, user }         │          │
└────┬─────┘                              └──────────┘
     │
     │  token → localStorage
     │
     │  GET /auth/me  (Authorization: Bearer <token>)
     │ ──────────────────────────────────────────────►
     │ ◄── { user, profile, familyProfile, hasProfile, hasFamilyProfile }
```

### AuthContext

Located in `src/context/AuthContext.tsx`. Provides:

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current authenticated user |
| `profile` | `Profile \| null` | User's profile (null if not created) |
| `familyProfile` | `FamilyProfile \| null` | User's family profile |
| `hasProfile` | `boolean` | Whether user has completed a profile |
| `hasFamilyProfile` | `boolean` | Whether user has a family profile |
| `loading` | `boolean` | Auth state is being resolved |
| `token` | `string \| null` | Bearer token |
| `login(email, password)` | Function | Authenticate and persist token |
| `register(data)` | Function | Create account and persist token |
| `logout()` | Function | Clear token and state |
| `refreshProfile()` | Function | Re-fetch user session data |

### Token Persistence

The JWT token is stored in `localStorage` under the key `token`. On app mount, `AuthProvider` checks for an existing token and calls `GET /auth/me` to rehydrate the session.

---

## State Management

The app uses a **minimal state architecture**:

| Scope | Mechanism | Usage |
|-------|-----------|-------|
| Global | `AuthContext` | User session, profile, auth actions |
| Page-local | `useState` + `useEffect` | Form data, lists, filters, pagination, modals |
| Side effects | `useEffect` + `useCallback` | Data fetching on mount or filter change |
| Navigation | `useNavigate`, `useParams`, `useLocation` | Programmatic routing and URL params |

There is no Redux, Zustand, React Query, or SWR. Server state is fetched on mount and managed locally within each page component.

---

## API Client

Defined in `src/api.ts`. A thin wrapper around `fetch` that handles:

- Base path prefixing (`/api`)
- Bearer token injection from `localStorage`
- JSON request/response serialization
- Error extraction from response body

### Namespaces

#### `api.auth`

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `register(data)` | POST | `/auth/register` | Create account |
| `login(data)` | POST | `/auth/login` | Authenticate |
| `me()` | GET | `/auth/me` | Get current session |

#### `api.profiles`

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `getMyProfile()` | GET | `/profiles/me` | Own profile |
| `updateMyProfile(data)` | PUT | `/profiles/me` | Create/update profile |
| `browse(filters, page, pageSize)` | GET | `/profiles/browse` | Filtered paginated browse |
| `getRecommendations()` | GET | `/profiles/recommendations/daily` | Daily recommendations |
| `getProfile(userId)` | GET | `/profiles/:userId` | View profile by ID |
| `sendInterest(userId)` | POST | `/profiles/:userId/interest` | Send interest |
| `getInterests()` | GET | `/profiles/interests/list` | Sent/received interests |
| `updateInterest(id, status)` | PATCH | `/profiles/interests/:id` | Accept/decline interest |

#### `api.family`

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `getMyFamilyProfile()` | GET | `/family/me` | Own family profile |
| `updateMyFamilyProfile(data)` | PUT | `/family/me` | Create/update family profile |
| `getFamilyProfile(userId)` | GET | `/family/user/:userId` | Other user's family profile |
| `shareProfile(data)` | POST | `/family/share` | Share a profile with another user |
| `getSharedProfiles()` | GET | `/family/shared` | List shared profiles |
| `updateSharedProfileStatus(id, status)` | PATCH | `/family/shared/:id` | Update share status |

#### `api.shortlist`

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `getAll()` | GET | `/shortlist` | Full shortlist with profiles |
| `getIds()` | GET | `/shortlist/ids` | Shortlisted user IDs (lightweight) |
| `add(userId, note?)` | POST | `/shortlist/:userId` | Add to shortlist |
| `remove(userId)` | DELETE | `/shortlist/:userId` | Remove from shortlist |

---

## Pages

### Login (`/login`)

Email/password login form with demo account hints. Redirects to `/browse` on success or if already logged in.

### Register (`/register`)

Registration form with email, password, and optional first/last name. On success, navigates to `/build-profile`.

### BuildProfile (`/build-profile`)

A **4-step wizard** for creating or editing a profile:

| Step | Fields |
|------|--------|
| 1. Basic Info | First name, last name, gender, date of birth, religion, mother tongue, height, marital status |
| 2. Education & Career | Education level, profession, company, salary range, location, state, country |
| 3. Lifestyle | Family type, diet, smoking, drinking, looking for |
| 4. Interests & Bio | Interest tags (multi-select), bio text |

Uses `StepIndicator` for progress visualization. Submits via `PUT /profiles/me`.

### Browse (`/browse`)

Two sections:

1. **Daily Recommendations** — carousel of AI-scored profile cards with match percentages and reasons
2. **Browse Grid** — paginated profile cards with 11-dimension filter panel and full-text search

Filters: gender, age range, religion, profession, salary, location, education, marital status, diet, mother tongue, search text.

### MyProfile (`/my-profile`)

Displays the authenticated user's profile and family profile (if present) using composable `ProfileSections` components. Links to edit profile and manage family profile.

### ProfileDetail (`/profile/:userId`)

Full profile view of another user including:

- Profile avatar, highlights, and all attribute sections
- Family profile section (if public)
- Action buttons: Send Interest, Toggle Shortlist, Share Profile
- **ShareModal**: search users and share the viewed profile with a message

### FamilyProfile (`/family-profile`)

Family profile wizard or read-only view. Fields: father/mother (name + occupation), siblings, family income, family values, about family, contact person, contact phone, family location.

### Shortlist (`/shortlist`)

- List of shortlisted profiles with notes
- **Compare mode**: select two profiles for side-by-side comparison (`CompareView`)
- Send interest directly from the shortlist

### SharedProfiles (`/shared-profiles`)

Two tabs:

- **Sent**: profiles you've shared with others
- **Received**: profiles others have shared with you

Each shared profile card shows status (`pending` / `viewed` / `interested` / `declined`) with action buttons to update status.

---

## Components

### Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `Layout` | `components/Layout.tsx` | App shell with responsive navbar, mobile hamburger menu, user avatar, logout, main content area, and footer |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Auth guard that redirects unauthenticated users |

### Feature Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProfileCard` | `components/ProfileCard.tsx` | Compact profile summary card used in browse grid and shortlist; includes shortlist toggle |

### Profile Display Components

All exported from `components/profile/ProfileSections.tsx`:

| Export | Type | Purpose |
|--------|------|---------|
| `ProfileAvatar` | Component | Photo display with initials fallback |
| `ProfileHighlights` | Component | Key stats: age, location, profession, education |
| `ProfileAttributeSections` | Component | Grouped attributes: personal, education, lifestyle |
| `ProfileNarrativeSections` | Component | Bio and interests display |
| `FamilyProfileContent` | Component | Family details display |
| `formatHeight` | Helper | Convert cm to ft/in string |
| `getProfileInitials` | Helper | Initials from first/last name |
| `getProfileFullName` | Helper | Full name string |
| `getProfileSubtitle` | Helper | Profession + company subtitle |
| `getProfileLocation` | Helper | City, state, country string |
| `hasFamilyProfileContent` | Helper | Check if family profile has data |

### Shared UI Components

All exported from `components/shared/index.ts`:

| Component | Purpose |
|-----------|---------|
| `LoadingSpinner` | Centered spinner with optional message |
| `EmptyState` | Icon + title + description for empty lists |
| `ErrorAlert` | Dismissible error banner |
| `Modal` | Overlay modal with `Modal.Header` and `Modal.Body` subcomponents |
| `StepIndicator` | Multi-step progress indicator (used in BuildProfile) |
| `InfoCard` | Titled card container with icon |
| `Section` | Titled content section |
| `DetailRow` | Label-value row for profile attributes |
| `SelectionGroup` | Multi-select tag/chip group (used for interests) |

### Page-local Components

| Component | Defined In | Purpose |
|-----------|-----------|---------|
| `RecommendationsSection` | `Browse.tsx` | Daily recommendation carousel |
| `ShareModal` | `ProfileDetail.tsx` | User search + share with message |
| `FamilyProfileView` | `FamilyProfile.tsx` | Read-only family profile display |
| `SharedProfileCard` | `SharedProfiles.tsx` | Individual shared profile entry |
| `CompareView` | `Shortlist.tsx` | Side-by-side profile comparison |

---

## Type System

All shared TypeScript interfaces and constant arrays are in `src/types.ts`.

### Core Interfaces

| Interface | Key Fields |
|-----------|------------|
| `User` | `id`, `email` |
| `Profile` | 25+ fields covering personal, education, career, lifestyle, interests, match metadata |
| `Interest` | `fromUserId`, `toUserId`, `status` (pending/accepted/declined), optional `profile` |
| `FamilyProfile` | Father/mother details, siblings, income, values, contact info |
| `SharedProfile` | From/to users, shared profile reference, message, status, enriched profiles |
| `Shortlist` | `userId`, `shortlistedUserId`, `note`, optional enriched `profile` |
| `AuthResponse` | `token`, `user` |
| `RecommendationResponse` | `generatedAt`, `basedOnHistory`, signal counts, `recommendations[]` |
| `BrowseResponse` | `profiles[]`, `total`, `page`, `pageSize` |
| `BrowseFilters` | 12 filter dimensions |

### Constant Arrays

Used for dropdowns, filters, and multi-select groups:

| Constant | Values |
|----------|--------|
| `SALARY_RANGES` | 8 ranges from "5-10 LPA" to "50+ LPA" |
| `RELIGIONS` | Hindu, Muslim, Christian, Sikh, Buddhist, Jain, Other |
| `EDUCATION_LEVELS` | 18 levels from High School to Ph.D |
| `PROFESSIONS` | 19 professions |
| `MOTHER_TONGUES` | 13 Indian languages + Other |
| `FAMILY_VALUES_LIST` | Traditional, Moderate, Liberal |
| `FAMILY_INCOME_RANGES` | 9 ranges from "5-10 LPA" to "1 Cr+" |
| `INTERESTS_LIST` | 36 hobbies and interests |

---

## Styling

### Approach

- **Tailwind CSS** utility classes applied directly in JSX
- Custom theme colors, fonts, and animations defined in `tailwind.config.js`
- Global component classes defined in `src/index.css` using `@layer components`

### Theme

| Token | Value |
|-------|-------|
| **Primary** | Pink palette (50-900) |
| **Accent** | Orange palette (50-900) |
| **Font (sans)** | Inter |
| **Font (display)** | Playfair Display |

### Custom CSS Classes

Defined in `index.css` via `@layer components`:

| Class | Purpose |
|-------|---------|
| `.btn-primary` | Primary action button (pink gradient) |
| `.btn-secondary` | Secondary button (outline) |
| `.btn-accent` | Accent button (orange) |
| `.input-field` | Styled text input |
| `.select-field` | Styled select dropdown |
| `.card` | Elevated card container |
| `.glass` | Glassmorphism effect |
| `.text-gradient` | Gradient text effect |
| `.animate-float` | Floating animation |
| `.scrollbar-hide` | Hide scrollbar |

---

## Configuration

### Vite (`vite.config.ts`)

- React plugin enabled
- Dev server proxy: `/api` requests forwarded to `http://localhost:3100` (configurable via `API_PROXY_TARGET` env var)

### Tailwind (`tailwind.config.js`)

- Content: `./src/**/*.{js,ts,jsx,tsx}`
- Extended theme with custom colors (primary/accent), fonts (sans/display), and animations

### TypeScript (`tsconfig.json`)

- Strict mode enabled
- Source directory: `src/`
- JSX: `react-jsx`
- Module: `ESNext`

---

## Build & Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then build for production (`vite build`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on `src/` |
| `npm run typecheck` | Type-check without emitting |

### Dev Server

Vite runs on `http://localhost:5173` (or `5180` in Docker) and proxies all `/api/*` requests to the backend at `http://localhost:3100`. This allows the SPA to make same-origin API calls in development without CORS issues.
