# 📝 Developer Cheat Sheet

Quick reference for common tasks and commands.

---

## 🚀 Essential Commands

### Setup & Installation
```bash
pnpm install                # Install dependencies
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build
```

### Package Management
```bash
pnpm add <package>          # Add dependency
pnpm add -D <package>       # Add dev dependency
pnpm remove <package>       # Remove package
pnpm update                 # Update all packages
pnpm outdated               # Check for updates
pnpm list                   # List installed packages
```

### Clean & Reset
```bash
rm -rf node_modules         # Delete node_modules
rm -rf dist                 # Delete build output
pnpm store prune            # Clear pnpm cache
pnpm install                # Reinstall everything
```

---

## ⌨️ VS Code Shortcuts

### File Operations
| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| New File | `Ctrl+N` | `Cmd+N` |
| Save | `Ctrl+S` | `Cmd+S` |
| Save All | `Ctrl+K S` | `Cmd+K S` |
| Open File | `Ctrl+O` | `Cmd+O` |
| Quick Open | `Ctrl+P` | `Cmd+P` |
| Close Tab | `Ctrl+W` | `Cmd+W` |

### Editing
| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Copy Line | `Ctrl+C` | `Cmd+C` |
| Cut Line | `Ctrl+X` | `Cmd+X` |
| Delete Line | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Move Line Up/Down | `Alt+Up/Down` | `Option+Up/Down` |
| Duplicate Line | `Shift+Alt+Up/Down` | `Shift+Option+Up/Down` |
| Comment Line | `Ctrl+/` | `Cmd+/` |
| Comment Block | `Shift+Alt+A` | `Shift+Option+A` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |

### Navigation
| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Go to Definition | `F12` | `F12` |
| Go to Line | `Ctrl+G` | `Cmd+G` |
| Go Back | `Alt+Left` | `Ctrl+-` |
| Toggle Sidebar | `Ctrl+B` | `Cmd+B` |
| Toggle Terminal | `Ctrl+` ` | `Ctrl+` ` |

### Search
| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Find | `Ctrl+F` | `Cmd+F` |
| Replace | `Ctrl+H` | `Cmd+H` |
| Find in Files | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Find Next | `F3` | `Cmd+G` |

### Debug
| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Start/Continue | `F5` | `F5` |
| Step Over | `F10` | `F10` |
| Step Into | `F11` | `F11` |
| Step Out | `Shift+F11` | `Shift+F11` |
| Stop | `Shift+F5` | `Shift+F5` |

---

## 🎨 React Snippets

### Component Templates
```tsx
// rafce - React Arrow Function Component Export
export const ComponentName = () => {
  return <div>ComponentName</div>
}

// rfc - React Function Component
export default function ComponentName() {
  return <div>ComponentName</div>
}

// rfce - React Function Component Export
function ComponentName() {
  return <div>ComponentName</div>
}
export default ComponentName
```

### Hooks
```tsx
// useState
const [state, setState] = useState(initialValue)

// useEffect
useEffect(() => {
  // Effect logic
  return () => {
    // Cleanup
  }
}, [dependencies])

// useRef
const ref = useRef(null)

// useMemo
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b])

// useCallback
const memoizedCallback = useCallback(() => {
  doSomething(a, b)
}, [a, b])
```

### Import Shortcuts
```tsx
imr     // import React from 'react'
imrc    // import React, { Component } from 'react'
imrs    // import React, { useState } from 'react'
imrse   // import React, { useState, useEffect } from 'react'
```

---

## 🎯 TypeScript Quick Reference

### Basic Types
```tsx
// Primitives
const name: string = "John"
const age: number = 30
const active: boolean = true

// Arrays
const numbers: number[] = [1, 2, 3]
const strings: Array<string> = ["a", "b"]

// Objects
const user: { name: string; age: number } = {
  name: "John",
  age: 30
}
```

### Interfaces & Types
```tsx
// Interface
interface User {
  id: string
  name: string
  age?: number  // Optional
  readonly email: string  // Readonly
}

// Type alias
type ID = string | number

// Function type
type HandleClick = (id: string) => void

// Union types
type Status = 'pending' | 'active' | 'inactive'
```

### Component Props
```tsx
interface ButtonProps {
  text: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button = ({ text, onClick, variant = 'primary', disabled }: ButtonProps) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {text}
    </button>
  )
}
```

### Generics
```tsx
// Generic component
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>
}
```

---

## 🎨 Tailwind CSS Classes

### Layout
```css
/* Display */
block, inline-block, flex, grid, hidden

/* Flexbox */
flex-row, flex-col, justify-center, items-center
justify-between, items-start, gap-4

/* Grid */
grid-cols-2, grid-cols-3, gap-4

/* Position */
relative, absolute, fixed, sticky
top-0, right-0, bottom-0, left-0
```

### Spacing
```css
/* Padding */
p-4, px-4, py-2, pt-2, pr-4, pb-2, pl-4

/* Margin */
m-4, mx-auto, my-2, mt-4, -m-4 (negative)

/* Space between */
space-x-4, space-y-2
```

### Sizing
```css
/* Width */
w-full, w-1/2, w-screen, w-64

/* Height */
h-full, h-screen, h-64

/* Min/Max */
min-w-0, max-w-md, min-h-screen
```

### Typography
```css
/* Size - Use custom sizes, not Tailwind defaults */
/* Weight - Use custom weights */
text-left, text-center, text-right
text-primary, text-muted-foreground
```

### Colors
```css
/* Background */
bg-primary, bg-secondary, bg-muted

/* Text */
text-primary, text-secondary, text-muted-foreground

/* Border */
border-primary, border-muted
```

### Borders
```css
/* Border */
border, border-2, border-t, border-l
rounded, rounded-lg, rounded-full

/* Border Color */
border-gray-300, border-primary
```

### Effects
```css
/* Shadow */
shadow, shadow-md, shadow-lg

/* Opacity */
opacity-50, opacity-75

/* Hover/Focus */
hover:bg-primary, focus:ring-2
```

### Responsive
```css
/* Breakpoints */
sm:, md:, lg:, xl:, 2xl:

/* Example */
w-full md:w-1/2 lg:w-1/3
```

---

## 🔧 Common Tasks

### Add New Component
```bash
# 1. Create file
/src/app/components/MyComponent.tsx

# 2. Component template
export function MyComponent() {
  return <div>MyComponent</div>
}

# 3. Import and use
import { MyComponent } from './components/MyComponent'
```

### Add New Page
```bash
# 1. Create file
/src/app/pages/NewPage.tsx

# 2. Add route in routes.tsx
{ path: "newpage", Component: NewPage }

# 3. Add navigation link in Root.tsx
```

### Add New Package
```bash
# 1. Install package
pnpm add package-name

# 2. Import in component
import { Something } from 'package-name'

# 3. Use it
<Something />
```

### Debug Component
```tsx
// 1. Add console.log
console.log('Component rendered', { props, state })

// 2. Set breakpoint in VS Code (click line number)

// 3. Press F5 to start debugging

// 4. Use React DevTools
// Install extension → F12 → Components tab
```

### Fix TypeScript Error
```tsx
// 1. Hover over error to see message

// 2. Press Ctrl+. for quick fix

// 3. Or manually add types
interface MyData {
  id: string
  name: string
}

const data: MyData = { id: '1', name: 'Test' }
```

---

## 🐛 Debug Console Commands

### Browser Console
```javascript
// Log variable
console.log(variable)

// Log object as table
console.table(arrayOfObjects)

// Log with styling
console.log('%cHello', 'color: blue; font-size: 20px')

// Clear console
console.clear()

// Time operations
console.time('operation')
// ... code ...
console.timeEnd('operation')
```

### React DevTools
```bash
# Access component in console
$r  # Selected component

# Access props
$r.props

# Access state (hooks)
$r.hooks
```

---

## 🔍 Useful Git Commands

```bash
# Initialize
git init
git add .
git commit -m "Initial commit"

# Status & Changes
git status
git diff

# Branching
git branch feature-name
git checkout feature-name
git checkout -b feature-name  # Create and switch

# Commit
git add .
git commit -m "Add feature"
git commit -am "Quick commit"  # Add and commit

# Push/Pull
git push origin main
git pull origin main

# Undo
git reset HEAD~1              # Undo last commit
git checkout -- file.txt      # Discard changes
```

---

## 📦 Environment Variables

### Access in Code
```tsx
// ✅ Correct
const apiKey = import.meta.env.VITE_API_KEY

// ❌ Wrong
const apiKey = process.env.VITE_API_KEY
```

### .env File Format
```env
# Always prefix with VITE_
VITE_API_KEY=your-key-here
VITE_API_URL=https://api.example.com
VITE_ENABLE_FEATURE=true
```

---

## 🚨 Common Errors & Quick Fixes

### Error: Module not found
```bash
# Fix: Install package
pnpm add missing-package
```

### Error: Port already in use
```bash
# Fix: Kill process
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
pnpm dev -- --port 3000
```

### Error: TypeScript errors
```bash
# Fix: Restart TS server
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Error: Styles not applying
```bash
# Fix: Check import order
# main.tsx should import styles BEFORE App
import '../styles/index.css'
import App from './App'
```

---

## 🎯 Performance Tips

```tsx
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Heavy computation
})

// Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value)
}, [data])

// Use useCallback for callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])

// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

---

## 📝 Code Quality Checklist

- [ ] TypeScript types defined for all props
- [ ] No console.log in production code
- [ ] Error boundaries for error handling
- [ ] Loading states for async operations
- [ ] Unique keys for list items
- [ ] Accessibility attributes (aria-*)
- [ ] Responsive design tested
- [ ] Cross-browser compatibility checked

---

## 🔗 Quick Links

- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [VS Code Docs](https://code.visualstudio.com/docs)

---

**Pro Tip:** Bookmark this file in VS Code for quick access!
