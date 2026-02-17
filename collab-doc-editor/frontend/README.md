# CollabDocs Frontend

React + TipTap collaborative document editor frontend. Provides a rich-text editing experience with real-time collaboration, user presence, document management, and authentication.

## Table of Contents

- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Routing](#routing)
- [Component Reference](#component-reference)
  - [Pages](#pages)
  - [Components](#components)
- [State Management](#state-management)
  - [AuthContext](#authcontext)
  - [useCollaboration Hook](#usecollaboration-hook)
- [API Service Layer](#api-service-layer)
- [WebSocket Integration](#websocket-integration)
- [Styling](#styling)
- [Configuration](#configuration)
- [Testing](#testing)
- [Dependencies](#dependencies)

## Architecture

```
src/
├── main.tsx                 # React entry point, mounts App inside AuthProvider
├── App.tsx                  # Router config with ProtectedRoute / GuestRoute guards
├── components/              # Reusable UI components
│   ├── CollaborativeEditor.tsx   # TipTap editor with Yjs collaboration
│   ├── EditorToolbar.tsx         # Rich text formatting toolbar
│   ├── ConnectionStatus.tsx      # WebSocket connection indicator
│   ├── UserPresence.tsx          # Connected users avatars + panel
│   └── ShareDialog.tsx           # Document sharing dialog
├── contexts/
│   └── AuthContext.tsx      # Global authentication state
├── hooks/
│   └── useCollaboration.ts  # Yjs document + WebSocket provider hook
├── pages/                   # Route-level page components
│   ├── HomePage.tsx         # Document list / dashboard
│   ├── EditorPage.tsx       # Document editor view
│   ├── LoginPage.tsx        # Login form
│   └── RegisterPage.tsx     # Registration form
├── services/
│   └── api.ts               # REST API client with types
├── styles/
│   └── index.css            # Global CSS with design tokens
└── test-utils/
    └── setup.ts             # Test environment setup
```

### Component Hierarchy

```
<AuthProvider>                         ← Global auth state
  <BrowserRouter>
    <Routes>
      <GuestRoute>                     ← Redirects to / if authenticated
        ├── <LoginPage />
        └── <RegisterPage />
      </GuestRoute>
      <ProtectedRoute>                 ← Redirects to /login if not authenticated
        ├── <HomePage />               ← Document list
        └── <EditorPage>               ← Document editor container
              ├── <ConnectionStatus />  ← WS connection state
              ├── <ShareDialog />       ← User search + sharing
              ├── <UserPresence />      ← Avatar stack + user panel
              └── <CollaborativeEditor> ← TipTap + Yjs
                    └── <EditorToolbar /> ← Formatting buttons
            </EditorPage>
      </ProtectedRoute>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

### Data Flow

```
                    AuthContext (login/register/logout)
                         │
                         ▼
┌─────────┐    REST    ┌──────────┐    Yjs/WS    ┌─────────────────┐
│  Pages  │ ◄────────► │ api.ts   │              │ useCollaboration │
│         │            │ (fetch)  │              │  (y-websocket)   │
└─────────┘            └──────────┘              └─────────────────┘
     │                                                    │
     │                                                    ▼
     └───────────── Components ◄──── Yjs Doc + Awareness State
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend starts at `http://localhost:5173`. Vite automatically proxies API and WebSocket requests to the backend at `http://localhost:3001`.

> **Prerequisite:** The backend server must be running. See the [backend README](../backend/README.md).

## Scripts

| Script           | Command                       | Description                              |
| ---------------- | ----------------------------- | ---------------------------------------- |
| `dev`            | `vite`                        | Start Vite dev server (port 5173)        |
| `build`          | `tsc -b && vite build`        | Type-check and build for production      |
| `preview`        | `vite preview`                | Preview production build locally         |
| `lint`           | `eslint .`                    | Lint all source files                    |
| `typecheck`      | `tsc --noEmit`                | Type check without emitting files        |
| `test`           | `vitest run`                  | Run tests once                           |
| `test:watch`     | `vitest`                      | Run tests in watch mode                  |
| `test:coverage`  | `vitest run --coverage`       | Run tests with coverage report           |

---

## Routing

Defined in `src/App.tsx` using React Router v7.

| Path          | Component        | Guard           | Description                  |
| ------------- | ---------------- | --------------- | ---------------------------- |
| `/login`      | `LoginPage`      | `GuestRoute`    | Login form                   |
| `/register`   | `RegisterPage`   | `GuestRoute`    | Registration form            |
| `/`           | `HomePage`       | `ProtectedRoute` | Document dashboard           |
| `/doc/:docId` | `EditorPage`     | `ProtectedRoute` | Collaborative document editor |

### Route Guards

**`ProtectedRoute`**  
- Checks `AuthContext` for authenticated user
- Shows a loading spinner while auth state is being resolved
- Redirects to `/login` if user is not authenticated

**`GuestRoute`**  
- Checks `AuthContext` for authenticated user
- Shows a loading spinner while auth state is being resolved
- Redirects to `/` if user is already authenticated

---

## Component Reference

### Pages

#### `LoginPage`

**Path:** `src/pages/LoginPage.tsx`  
**Route:** `/login`

Login form with email and password fields.

| Feature                | Details                                    |
| ---------------------- | ------------------------------------------ |
| Form fields            | Email, Password                            |
| Validation             | Both fields required                       |
| Error display          | Shows API error messages inline            |
| Navigation             | Link to RegisterPage                       |
| On success             | Redirects to `/` via AuthContext            |

---

#### `RegisterPage`

**Path:** `src/pages/RegisterPage.tsx`  
**Route:** `/register`

Registration form with name, email, password, and confirmation.

| Feature                | Details                                         |
| ---------------------- | ----------------------------------------------- |
| Form fields            | Name, Email, Password, Confirm Password         |
| Validation             | All fields required; passwords must match        |
| Error display          | Shows API error messages inline                  |
| Navigation             | Link to LoginPage                                |
| On success             | Redirects to `/` via AuthContext                 |

---

#### `HomePage`

**Path:** `src/pages/HomePage.tsx`  
**Route:** `/`

Document dashboard showing all accessible documents.

| Feature                | Details                                               |
| ---------------------- | ----------------------------------------------------- |
| Document list          | Shows title, last updated time                        |
| Badges                 | "Owner" for authored docs, "Shared" for shared docs   |
| Create document        | "New Document" button in header                       |
| Delete document        | Delete icon (author only), with confirmation           |
| Search/filter          | Search documents by title                             |
| User info              | Displays current user name + email in header          |
| Logout                 | Logout button in header                               |
| Empty state            | Friendly message when no documents exist              |
| Navigation             | Click document to open `/doc/:docId`                  |

---

#### `EditorPage`

**Path:** `src/pages/EditorPage.tsx`  
**Route:** `/doc/:docId`

Document editor container that orchestrates all collaboration components.

| Feature                | Details                                               |
| ---------------------- | ----------------------------------------------------- |
| Title editing          | Inline editable title (blurs to save)                 |
| Back navigation        | Arrow button to return to HomePage                    |
| Share dialog           | Share button opens ShareDialog (author only)          |
| Connection status      | ConnectionStatus component in header                  |
| User presence          | UserPresence component in header                      |
| Collaborative editor   | CollaborativeEditor component in main area            |
| Access control         | Shows 403 message if user lacks access                |
| Loading state          | Shows spinner while document loads                    |

**Integration with `useCollaboration` hook:**

```typescript
const {
  provider,        // y-websocket provider instance
  ydoc,            // Yjs document
  isConnected,     // WebSocket connected?
  isSynced,        // Document synced?
  connectedUsers,  // Array of { name, color, clientId }
  setUserName,     // Update display name
} = useCollaboration(docId, token);
```

---

### Components

#### `CollaborativeEditor`

**Path:** `src/components/CollaborativeEditor.tsx`

TipTap rich text editor with Yjs collaboration integration.

**Props:**

| Prop       | Type                | Description                              |
| ---------- | ------------------- | ---------------------------------------- |
| `ydoc`     | `Y.Doc`             | Yjs document instance                    |
| `provider` | `WebsocketProvider` | y-websocket provider for awareness       |

**TipTap Extensions:**

| Extension              | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `StarterKit`           | Basic editing (paragraphs, history, etc.)  |
| `Collaboration`        | Binds TipTap to Yjs document fragment      |
| `CollaborationCursor`  | Shows remote users' cursors and selections |
| `Underline`            | Underline formatting                       |
| `Highlight`            | Text highlighting                          |
| `Color`                | Text color                                 |
| `Placeholder`          | Placeholder text when editor is empty      |

> The `history` extension from StarterKit is disabled since Yjs provides its own undo/redo.

---

#### `EditorToolbar`

**Path:** `src/components/EditorToolbar.tsx`

Rich text formatting toolbar that appears above the editor.

**Props:**

| Prop     | Type     | Description              |
| -------- | -------- | ------------------------ |
| `editor` | `Editor` | TipTap editor instance   |

**Toolbar Groups:**

| Group           | Actions                                               |
| --------------- | ----------------------------------------------------- |
| Text formatting | Bold, Italic, Underline, Strikethrough                |
| Headings        | H1, H2, H3                                            |
| Lists           | Bullet list, Ordered list                             |
| Blocks          | Blockquote, Code block, Horizontal rule               |
| Extras          | Highlight                                             |
| Utilities       | Clear formatting                                      |
| History         | Undo, Redo                                            |

Each button shows an active state when the corresponding formatting is applied at the cursor position.

---

#### `ConnectionStatus`

**Path:** `src/components/ConnectionStatus.tsx`

Visual indicator of WebSocket connection state.

**Props:**

| Prop          | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| `isConnected` | `boolean` | Whether WebSocket is connected     |
| `isSynced`    | `boolean` | Whether document is synced         |

**States:**

| State        | Icon   | Color  | Condition                       |
| ------------ | ------ | ------ | ------------------------------- |
| Connected    | Check  | Green  | `isConnected && isSynced`       |
| Syncing      | Loader | Yellow | `isConnected && !isSynced`      |
| Disconnected | X      | Red    | `!isConnected`                  |

---

#### `UserPresence`

**Path:** `src/components/UserPresence.tsx`

Shows connected users as an avatar stack with an expandable panel.

**Props:**

| Prop             | Type                                         | Description                       |
| ---------------- | -------------------------------------------- | --------------------------------- |
| `connectedUsers` | `Array<{ name, color, clientId }>`           | Users currently connected         |
| `currentUser`    | `{ name, email }`                            | Current authenticated user        |
| `onNameChange`   | `(name: string) => void`                     | Callback when user edits name     |

**Features:**

- Avatar circles with user initials and assigned colors
- Click to expand a panel showing all users
- "You" badge on the current user
- Inline name editing for the current user
- User count indicator

---

#### `ShareDialog`

**Path:** `src/components/ShareDialog.tsx`

Modal dialog for managing document sharing.

**Props:**

| Prop             | Type                                         | Description                       |
| ---------------- | -------------------------------------------- | --------------------------------- |
| `docId`          | `string`                                     | Document ID                       |
| `isAuthor`       | `boolean`                                    | Whether current user is author    |
| `author`         | `SafeUser`                                   | Document author info              |
| `sharedWith`     | `SafeUser[]`                                 | Currently shared users            |
| `isOpen`         | `boolean`                                    | Dialog visibility                 |
| `onClose`        | `() => void`                                 | Close callback                    |
| `onShare`        | `(userId: string) => Promise<void>`          | Share callback                    |
| `onUnshare`      | `(userId: string) => Promise<void>`          | Unshare callback                  |

**Features:**

- User search with debounced input (300ms delay)
- Search results with "Add" button
- List of current collaborators with role badges (Owner/Editor)
- Remove button for each shared user (author only)
- Only authors can add/remove collaborators
- Minimum 2 character search query

---

## State Management

### AuthContext

**Path:** `src/contexts/AuthContext.tsx`

Global authentication state using React Context API.

#### State

| Field     | Type              | Description                     |
| --------- | ----------------- | ------------------------------- |
| `user`    | `SafeUser \| null` | Current authenticated user     |
| `token`   | `string \| null`  | JWT token                       |
| `loading` | `boolean`         | Auth state is being resolved    |

#### Methods

| Method                                 | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `login(email, password)`               | Authenticate and store token + user             |
| `register(name, email, password)`      | Create account and store token + user           |
| `logout()`                             | Clear token + user, redirect to `/login`        |

#### Initialization Flow

```
App mounts
    │
    ▼
Check localStorage for "collab-auth-token"
    │
    ├── No token → Set loading=false, user=null
    │
    └── Token found → GET /api/auth/me
                          │
                          ├── 200 → Set user + token, loading=false
                          │
                          └── Error → Clear token, set loading=false
```

#### Token Storage

- **Key:** `collab-auth-token`
- **Storage:** `localStorage`
- Automatically included in all API requests via the `api.ts` service layer
- Cleared on logout or 401 response

---

### useCollaboration Hook

**Path:** `src/hooks/useCollaboration.ts`

Custom React hook that manages the Yjs document and WebSocket connection for collaborative editing.

#### Parameters

| Param   | Type              | Description                          |
| ------- | ----------------- | ------------------------------------ |
| `docId` | `string \| null`  | Document ID to collaborate on        |
| `token` | `string \| null`  | JWT token for WebSocket auth         |

#### Return Value

| Field            | Type                                          | Description                          |
| ---------------- | --------------------------------------------- | ------------------------------------ |
| `provider`       | `WebsocketProvider \| null`                   | y-websocket provider instance        |
| `ydoc`           | `Y.Doc \| null`                               | Yjs document instance                |
| `isConnected`    | `boolean`                                     | WebSocket connection status          |
| `isSynced`       | `boolean`                                     | Document sync status                 |
| `connectedUsers` | `Array<{ name, color, clientId }>`            | Currently connected users            |
| `setUserName`    | `(name: string) => void`                      | Update the user's display name       |

#### Lifecycle

```
docId + token provided
         │
         ▼
    Create Y.Doc
         │
         ▼
    Create WebsocketProvider
    (ws://host/collaboration, room=docId, params={token})
         │
         ├── Listen for "status" events → update isConnected
         ├── Listen for "sync" events → update isSynced
         └── Listen for awareness changes → update connectedUsers
         │
         ▼
    Set initial awareness state
    { user: { name, color } }
         │
    Component unmounts or deps change
         │
         ▼
    provider.disconnect()
    provider.destroy()
    ydoc.destroy()
```

#### User Identity

- **Display name:** Stored in `localStorage` key `collab-user`; defaults to user's account name
- **Color:** Randomly selected from 12 predefined colors on first use, stored with name
- **Updates:** Calling `setUserName()` updates both localStorage and awareness state

---

## API Service Layer

**Path:** `src/services/api.ts`

Centralized HTTP client for all REST API calls. Uses the native `fetch` API.

### Configuration

- **Base URL:** `/api` (proxied to backend by Vite in development)
- **Auth:** Reads JWT from `localStorage` and includes `Authorization: Bearer <token>` header
- **401 Handling:** Automatically clears token and redirects to `/login`

### Types

```typescript
interface DocumentMeta {
  id: string;
  title: string;
  authorId: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

interface DocumentDetail extends DocumentMeta {
  author: UserInfo;
  sharedWithUsers: UserInfo[];
  isAuthor: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
}
```

### Methods

#### Document Operations

| Method                                    | HTTP Request                       | Returns           | Description                    |
| ----------------------------------------- | ---------------------------------- | ----------------- | ------------------------------ |
| `api.listDocuments()`                     | `GET /api/documents`               | `DocumentMeta[]`  | List user's documents          |
| `api.getDocument(id)`                     | `GET /api/documents/:id`           | `DocumentDetail`  | Get document with full details |
| `api.createDocument(title)`               | `POST /api/documents`              | `DocumentMeta`    | Create new document            |
| `api.updateDocument(id, title)`           | `PATCH /api/documents/:id`         | `DocumentMeta`    | Update document title          |
| `api.deleteDocument(id)`                  | `DELETE /api/documents/:id`        | `void`            | Delete document                |

#### Sharing Operations

| Method                                    | HTTP Request                            | Returns           | Description                 |
| ----------------------------------------- | --------------------------------------- | ----------------- | --------------------------- |
| `api.shareDocument(docId, userId)`        | `POST /api/documents/:id/share`         | `DocumentDetail`  | Share with a user           |
| `api.unshareDocument(docId, userId)`      | `DELETE /api/documents/:id/share/:uid`  | `DocumentDetail`  | Remove user's access        |

#### User Operations

| Method                                    | HTTP Request                            | Returns           | Description                 |
| ----------------------------------------- | --------------------------------------- | ----------------- | --------------------------- |
| `api.searchUsers(query, excludeIds)`      | `GET /api/auth/users/search`            | `UserInfo[]`      | Search users by name/email  |

### Error Handling

All API methods throw errors with the server's error message. The calling component is responsible for catching and displaying errors.

```typescript
try {
  const doc = await api.createDocument("My Doc");
} catch (error) {
  // error.message contains the server's error message
  setError(error.message);
}
```

---

## WebSocket Integration

Real-time collaboration is powered by **Yjs** + **y-websocket**.

### Connection Details

| Parameter     | Value                                            |
| ------------- | ------------------------------------------------ |
| URL           | `ws://localhost:3001/collaboration` (dev)        |
| Protocol      | Yjs sync protocol (binary)                       |
| Room          | Document ID (`docId`)                            |
| Auth          | JWT token as `token` query parameter             |
| Auto-reconnect | Yes (built into y-websocket)                    |

### What Gets Synced

| Data Type       | Yjs Type           | Purpose                                |
| --------------- | ------------------ | -------------------------------------- |
| Document content | `Y.XmlFragment`   | Rich text content (via TipTap)         |
| Cursor position  | Awareness          | Remote cursor positions                |
| Selection        | Awareness          | Remote text selections                 |
| User info        | Awareness          | Name, color of connected users         |

### Awareness State Shape

Each connected client shares this awareness state:

```typescript
{
  user: {
    name: string;   // Display name (e.g., "Jane Doe")
    color: string;  // Hex color (e.g., "#FF6B6B")
  }
}
```

### Available Colors

The hook randomly assigns one of 12 predefined colors:

```
#FF6B6B  #4ECDC4  #45B7D1  #96CEB4  #FFEAA7  #DDA0DD
#98D8C8  #F7DC6F  #BB8FCE  #85C1E9  #F0B27A  #82E0AA
```

---

## Styling

**Path:** `src/styles/index.css`

The application uses **pure CSS** with **CSS custom properties** (variables) for theming. No CSS framework or preprocessor is used.

### Design Tokens

```css
:root {
  /* Colors */
  --color-primary: #6366f1;        /* Indigo - main brand color */
  --color-primary-hover: #4f46e5;
  --color-bg: #f8fafc;             /* Light gray background */
  --color-surface: #ffffff;         /* Card/panel background */
  --color-text: #1e293b;           /* Primary text */
  --color-text-secondary: #64748b; /* Secondary text */
  --color-border: #e2e8f0;         /* Borders */
  --color-danger: #ef4444;         /* Destructive actions */
  --color-success: #22c55e;        /* Success states */
  --color-warning: #f59e0b;        /* Warning states */

  /* Spacing, shadows, radii, transitions... */
}
```

### CSS Organization

| Section              | Description                                      |
| -------------------- | ------------------------------------------------ |
| Variables & Reset    | CSS custom properties and base reset styles      |
| Shared Components    | Buttons, spinners, loading states                |
| Auth Pages           | Login and registration form styles               |
| Home Page            | Document list, header, empty states              |
| Editor Page          | Editor layout, title area, toolbar               |
| Collaborative Editor | TipTap/ProseMirror content styles                |
| Toolbar              | Formatting button groups                         |
| Connection Status    | Status indicator styles                          |
| User Presence        | Avatar stack, panel, name editing                |
| Share Dialog         | Modal, search, user list                         |
| Cursor Styles        | Remote collaboration cursor labels               |
| Responsive           | Mobile breakpoints (640px)                       |

### Responsive Design

The application is responsive with a breakpoint at **640px**:
- Toolbar wraps to multiple rows on mobile
- Editor padding reduces
- Header elements stack vertically
- Font sizes adjust

---

## Configuration

### Vite (`vite.config.ts`)

```typescript
{
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',        // REST API proxy
      '/collaboration': {                      // WebSocket proxy
        target: 'ws://localhost:3001',
        ws: true
      }
    }
  }
}
```

### Vitest (`vitest.config.ts`)

| Setting              | Value                     |
| -------------------- | ------------------------- |
| Environment          | `jsdom`                   |
| Setup file           | `src/test-utils/setup.ts` |
| Coverage provider    | `v8`                      |
| Coverage thresholds  | 90% (all metrics)         |
| Test timeout         | 15 seconds                |
| Include pattern      | `src/**/*.test.{ts,tsx}`  |

### TypeScript (`tsconfig.json`)

| Setting              | Value       |
| -------------------- | ----------- |
| Target               | ES2022      |
| Module               | ESNext      |
| JSX                  | react-jsx   |
| Strict mode          | Enabled     |
| Module resolution    | Bundler     |

---

## Testing

### Test Structure

```
src/__tests__/
├── components/
│   ├── CollaborativeEditor.test.tsx
│   ├── ConnectionStatus.test.tsx
│   ├── EditorToolbar.test.tsx
│   ├── ShareDialog.test.tsx
│   └── UserPresence.test.tsx
├── contexts/
│   └── AuthContext.test.tsx
├── hooks/
│   └── useCollaboration.test.ts
├── pages/
│   ├── EditorPage.test.tsx
│   ├── HomePage.test.tsx
│   ├── LoginPage.test.tsx
│   └── RegisterPage.test.tsx
└── services/
    └── api.test.ts
```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode (re-run on changes)
npm run test:coverage # Generate coverage report
```

### Coverage Thresholds

All coverage metrics must meet **90%** minimum:
- Statements: 90%
- Branches: 90%
- Functions: 90%
- Lines: 90%

### Test Setup

**Path:** `src/test-utils/setup.ts`

The test setup file:
- Imports `@testing-library/jest-dom` matchers
- Mocks `window.matchMedia` (for responsive queries)
- Mocks `BroadcastChannel` (used by some libraries)
- Provides `localStorage` polyfill

### Test Patterns

- **Component tests:** Use `@testing-library/react` for rendering and interaction
- **Context tests:** Wrap components in providers, test state changes
- **Hook tests:** Use `renderHook` from Testing Library
- **Service tests:** Mock `fetch` and verify request/response handling
- **Page tests:** Full page render with mocked API and navigation

---

## Dependencies

### Runtime

| Package                       | Version  | Purpose                                    |
| ----------------------------- | -------- | ------------------------------------------ |
| `react`                       | ^19.0.0  | UI library                                 |
| `react-dom`                   | ^19.0.0  | React DOM renderer                         |
| `react-router-dom`            | ^7.1.5   | Client-side routing                        |
| `@tiptap/react`               | ^2.11.5  | TipTap React integration                   |
| `@tiptap/starter-kit`         | ^2.11.5  | Basic TipTap extensions bundle             |
| `@tiptap/extension-collaboration` | ^2.11.5 | Yjs collaboration for TipTap           |
| `@tiptap/extension-collaboration-cursor` | ^2.11.5 | Cursor sharing for TipTap       |
| `@tiptap/extension-underline` | ^2.11.5  | Underline formatting                       |
| `@tiptap/extension-highlight` | ^2.11.5  | Text highlight formatting                  |
| `@tiptap/extension-color`     | ^2.11.5  | Text color formatting                      |
| `@tiptap/extension-text-style` | ^2.11.5 | Text style support (required by Color)     |
| `@tiptap/extension-placeholder` | ^2.11.5 | Placeholder text in empty editor          |
| `yjs`                         | ^13.6.22 | CRDT library for real-time collaboration   |
| `y-websocket`                 | ^2.1.0   | Yjs WebSocket provider                     |
| `y-protocols`                 | ^1.0.6   | Yjs sync and awareness protocols           |
| `lucide-react`                | ^0.474.0 | Icon library                               |

### Development

| Package                       | Version  | Purpose                                    |
| ----------------------------- | -------- | ------------------------------------------ |
| `vite`                        | ^6.1.0   | Build tool and dev server                  |
| `@vitejs/plugin-react`        | ^4.3.4   | React support for Vite                     |
| `typescript`                  | ^5.7.3   | TypeScript compiler                        |
| `vitest`                      | ^4.0.18  | Test framework                             |
| `@vitest/coverage-v8`         | ^4.0.18  | Code coverage provider                     |
| `@testing-library/react`      | ^16.2.0  | React component testing utilities          |
| `@testing-library/jest-dom`   | ^6.6.3   | DOM assertion matchers                     |
| `@testing-library/user-event` | ^14.6.1  | User interaction simulation                |
| `jsdom`                       | ^28.1.0  | DOM environment for tests                  |
| `@types/react`                | ^19.0.8  | React type definitions                     |
| `@types/react-dom`            | ^19.0.3  | React DOM type definitions                 |
