# 🛠️ Development Guide

Complete guide for developing and extending the Serverless Expense Tracker.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Architecture](#project-architecture)
3. [Adding Features](#adding-features)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance](#performance)
8. [Deployment](#deployment)

---

## Getting Started

### Development Environment Setup

1. **Prerequisites installed:**
   - Node.js v18+
   - pnpm
   - VS Code (recommended)

2. **Clone and setup:**
   ```bash
   pnpm install
   pnpm dev
   ```

3. **Open in VS Code:**
   ```bash
   code .
   # Or open: expense-tracker.code-workspace
   ```

---

## Project Architecture

### Folder Structure

```
src/
├── app/
│   ├── components/          # Reusable React components
│   │   ├── ui/             # Base UI components (Button, Card, etc.)
│   │   ├── AddExpenseDialog.tsx
│   │   ├── StockPrediction.tsx
│   │   ├── CurrencyPrediction.tsx
│   │   └── ...
│   ├── lib/                # Utility functions
│   │   ├── api.ts          # API client functions
│   │   └── auth.ts         # Authentication logic
│   ├── pages/              # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── StockMarket.tsx
│   │   └── ...
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── routes.tsx          # Routing configuration
└── styles/                 # Global styles
    ├── index.css           # Main styles
    ├── theme.css           # Theme tokens
    └── tailwind.css        # Tailwind base
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, renders RouterProvider |
| `routes.tsx` | Defines all routes and page components |
| `main.tsx` | Application entry point, mounts React |
| `lib/api.ts` | All API calls and data fetching |
| `lib/auth.ts` | Authentication state and functions |

---

## Adding Features

### 1. Adding a New Page

**Step 1: Create page component**
```tsx
// src/app/pages/NewFeature.tsx
export default function NewFeature() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Feature</h1>
        <p className="text-muted-foreground">
          Description of new feature
        </p>
      </div>

      {/* Your content here */}
    </div>
  )
}
```

**Step 2: Add route**
```tsx
// src/app/routes.tsx
import NewFeature from './pages/NewFeature'

// Add to routes array:
{
  path: "/",
  Component: Root,
  children: [
    // ... existing routes
    { path: "new-feature", Component: NewFeature },
  ],
}
```

**Step 3: Add navigation link**
```tsx
// src/app/pages/Root.tsx
// Add to navigation menu:
<Link to="/new-feature">
  <Button variant="ghost" className="w-full justify-start">
    <IconName className="mr-2 size-4" />
    New Feature
  </Button>
</Link>
```

### 2. Adding a New Component

**Step 1: Create component file**
```tsx
// src/app/components/MyComponent.tsx
interface MyComponentProps {
  title: string
  data: any[]
  onAction?: () => void
}

export function MyComponent({ title, data, onAction }: MyComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Use component**
```tsx
// In any page or component
import { MyComponent } from '../components/MyComponent'

<MyComponent 
  title="My Title" 
  data={myData}
  onAction={handleAction}
/>
```

### 3. Adding an API Endpoint

**Step 1: Add function to api.ts**
```tsx
// src/app/lib/api.ts

// Add to api object:
async getMyData(): Promise<MyDataType[]> {
  try {
    const response = await fetch('/api/my-data')
    if (!response.ok) throw new Error('Failed to fetch')
    return await response.json()
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
},
```

**Step 2: Use in component**
```tsx
import { api } from '../lib/api'

function MyComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await api.getMyData()
        setData(result)
      } catch (error) {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return <div>{/* Render data */}</div>
}
```

### 4. Adding State Management

**Simple State (useState)**
```tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState<User | null>(null)
```

**Complex State (useReducer)**
```tsx
interface State {
  data: any[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: any[] }
  | { type: 'FETCH_ERROR'; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { data: action.payload, loading: false, error: null }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
    default:
      return state
  }
}

// Usage:
const [state, dispatch] = useReducer(reducer, {
  data: [],
  loading: false,
  error: null,
})
```

**Global State (Context)**
```tsx
// Create context
interface AppContextType {
  user: User | null
  setUser: (user: User | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  )
}

// Hook
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

// Usage:
const { user, setUser } = useApp()
```

---

## Code Standards

### TypeScript

**Always define types for:**
- Component props
- API responses
- State objects
- Function parameters

```tsx
// ✅ Good
interface UserProps {
  id: string
  name: string
  email: string
}

function UserCard({ id, name, email }: UserProps) {
  // ...
}

// ❌ Bad
function UserCard(props: any) {
  // ...
}
```

### Component Structure

**Recommended order:**
```tsx
// 1. Imports
import { useState } from 'react'
import { Button } from './ui/button'

// 2. Types/Interfaces
interface MyComponentProps {
  title: string
}

// 3. Constants (if any)
const MAX_ITEMS = 10

// 4. Component
export function MyComponent({ title }: MyComponentProps) {
  // 4a. Hooks
  const [count, setCount] = useState(0)
  
  // 4b. Derived state/computed values
  const isMaxed = count >= MAX_ITEMS
  
  // 4c. Functions
  const handleClick = () => {
    setCount(count + 1)
  }
  
  // 4d. Effects
  useEffect(() => {
    // ...
  }, [])
  
  // 4e. Render
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserProfile` |
| Functions | camelCase | `handleSubmit` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `UserData` |
| CSS Classes | kebab-case | `user-card` |
| Files | PascalCase (components) | `UserCard.tsx` |
| Files | camelCase (utils) | `api.ts` |

### File Organization

```
components/
├── ui/                    # Base UI components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── UserProfile.tsx        # Feature components
├── ExpenseList.tsx
└── ...
```

---

## Testing

### Manual Testing Checklist

**Before committing:**
- [ ] Feature works as expected
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Responsive on mobile
- [ ] Works in different browsers
- [ ] Loading states work
- [ ] Error states work
- [ ] Accessibility (keyboard navigation)

### Browser Testing

Test in:
- Chrome (primary)
- Firefox
- Safari (if on Mac)
- Edge

### Responsive Testing

Test at breakpoints:
- Mobile: 375px
- Tablet: 768px
- Desktop: 1280px
- Large: 1920px

**Use DevTools:**
```
F12 → Toggle device toolbar
Select device or set custom dimensions
```

---

## Debugging

### Console Logging

```tsx
// Simple log
console.log('Value:', value)

// Object/array as table
console.table(expenses)

// Group logs
console.group('User Data')
console.log('Name:', user.name)
console.log('Email:', user.email)
console.groupEnd()

// Time operations
console.time('fetch')
await fetchData()
console.timeEnd('fetch')
```

### React DevTools

1. Install React Developer Tools extension
2. Open DevTools (F12)
3. Click "Components" tab
4. Inspect component tree
5. View props, state, hooks

**Select component in tree:**
```javascript
// In console:
$r             // Selected component
$r.props       // Component props
$r.hooks       // Component hooks
```

### VS Code Debugging

1. Set breakpoint (click line number)
2. Press F5
3. Select "Launch Chrome"
4. Code pauses at breakpoint

**Debug controls:**
- F5: Continue
- F10: Step over
- F11: Step into
- Shift+F11: Step out

### Network Debugging

```
F12 → Network tab
Filter: Fetch/XHR
Click request → Preview/Response
```

### Common Issues

**State not updating:**
```tsx
// ❌ Wrong - mutating state
items.push(newItem)

// ✅ Correct - new array
setItems([...items, newItem])
setItems(prev => [...prev, newItem])
```

**Infinite re-renders:**
```tsx
// ❌ Wrong - updating in render
function Component() {
  setState(value)  // Infinite loop!
}

// ✅ Correct - update in effect/handler
function Component() {
  useEffect(() => {
    setState(value)
  }, [])
}
```

**Missing dependencies:**
```tsx
// ❌ Wrong
useEffect(() => {
  doSomething(value)
}, [])  // Missing 'value'

// ✅ Correct
useEffect(() => {
  doSomething(value)
}, [value])
```

---

## Performance

### Optimization Techniques

**1. Memoization**
```tsx
// Memoize expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value)
}, [data])

// Memoize components
const ExpensiveComponent = React.memo(({ data }) => {
  // Heavy rendering
})

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])
```

**2. Code Splitting**
```tsx
// Lazy load heavy components
const StockMarket = lazy(() => import('./pages/StockMarket'))

// Usage:
<Suspense fallback={<Loading />}>
  <StockMarket />
</Suspense>
```

**3. Virtual Lists**
```tsx
// For long lists, use virtualization
// Install: pnpm add react-window

import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={500}
  itemCount={items.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>
      {items[index]}
    </div>
  )}
</FixedSizeList>
```

### Performance Monitoring

**Measure render time:**
```tsx
import { Profiler } from 'react'

<Profiler
  id="MyComponent"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} (${phase}) took ${actualDuration}ms`)
  }}
>
  <MyComponent />
</Profiler>
```

**Check bundle size:**
```bash
pnpm build
# Check dist/ folder size
```

---

## Deployment

### Build for Production

```bash
# Create optimized build
pnpm build

# Preview production build locally
pnpm preview
```

### Environment Variables

**Create `.env` file:**
```env
VITE_API_URL=https://api.production.com
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

**Access in code:**
```tsx
const apiUrl = import.meta.env.VITE_API_URL
```

### Deployment Checklist

- [ ] Update environment variables
- [ ] Build without errors: `pnpm build`
- [ ] Test production build: `pnpm preview`
- [ ] Check bundle size (should be < 3MB)
- [ ] Remove console.logs
- [ ] Update README with live URL
- [ ] Test on production domain

### Deployment Platforms

**Vercel (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

**Build settings:**
- Build command: `pnpm build`
- Publish directory: `dist`
- Node version: 18

---

## Best Practices

### 1. Keep Components Small

**Goal:** Each component should do one thing well

```tsx
// ❌ Too large
function Dashboard() {
  // 500 lines of code
}

// ✅ Better - split into smaller components
function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <StatsCards />
      <ExpenseList />
      <AnalyticsChart />
    </>
  )
}
```

### 2. Use TypeScript Properly

```tsx
// ✅ Define explicit types
interface User {
  id: string
  name: string
}

// ❌ Avoid 'any'
const user: any = {}

// ✅ Use proper types
const user: User = { id: '1', name: 'John' }
```

### 3. Handle Loading and Errors

```tsx
function MyComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return null

  return <div>{/* Render data */}</div>
}
```

### 4. Accessibility

```tsx
// Use semantic HTML
<button onClick={handleClick}>Click me</button>

// Add ARIA labels
<button aria-label="Close dialog" onClick={onClose}>
  <X />
</button>

// Keyboard navigation
<div 
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Click or press Enter
</div>
```

### 5. Code Reviews

**Before submitting:**
- [ ] Code is clean and readable
- [ ] No commented-out code
- [ ] No console.logs
- [ ] TypeScript types defined
- [ ] Components are small and focused
- [ ] No duplicate code
- [ ] Error handling in place
- [ ] Responsive design works

---

## Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Package management
pnpm add <package>          # Add dependency
pnpm add -D <package>       # Add dev dependency
pnpm remove <package>       # Remove package
pnpm update                 # Update all packages

# TypeScript
npx tsc --noEmit           # Check TypeScript errors

# Clean up
rm -rf node_modules dist    # Delete build artifacts
pnpm install               # Reinstall dependencies
```

---

## Resources

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

**Happy developing! 🚀**
