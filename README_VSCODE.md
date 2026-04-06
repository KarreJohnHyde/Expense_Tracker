# 🎯 Running in VS Code - Complete Guide

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js** v18+ installed → [Download](https://nodejs.org/)
- [ ] **pnpm** package manager → `npm install -g pnpm`
- [ ] **VS Code** installed → [Download](https://code.visualstudio.com/)
- [ ] **Git** (optional) → [Download](https://git-scm.com/)

---

## 🚀 Setup in 3 Steps

### Step 1: Open Project in VS Code

**Option A: Using Terminal**
```bash
cd /path/to/serverless-expense-tracker
code .
```

**Option B: Using VS Code**
1. Open VS Code
2. File > Open Folder
3. Navigate to project directory
4. Click "Select Folder"

### Step 2: Install Extensions

When VS Code opens, you'll see a popup in the bottom-right:

> "This workspace has extension recommendations"

Click **"Install All"** or **"Show Recommendations"**

**Manual Installation** (if popup doesn't appear):
1. Press `Ctrl+Shift+X` (Extensions panel)
2. Search and install:
   - ✅ **ESLint** (dbaeumer.vscode-eslint)
   - ✅ **Prettier** (esbenp.prettier-vscode)
   - ✅ **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
   - ✅ **ES7+ React Snippets** (dsznajder.es7-react-js-snippets)

### Step 3: Install Dependencies & Run

Open VS Code terminal (`Ctrl+` ` or View > Terminal):

```bash
# Install all packages
pnpm install

# Start development server
pnpm dev
```

✅ **Success!** Your app is now running at `http://localhost:5173`

---

## 🎮 Using VS Code Features

### 1. Integrated Terminal

**Open Terminal:** `Ctrl+` ` (backtick)

**Multiple Terminals:**
- Click `+` icon in terminal panel
- Or: `Ctrl+Shift+` `

**Useful Commands:**
```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### 2. Running Tasks

**Quick Start:** Press `Ctrl+Shift+B` (Build Task)

**All Tasks:** 
1. Press `Ctrl+Shift+P`
2. Type: "Tasks: Run Task"
3. Select:
   - **Start Dev Server** (most common)
   - Build for Production
   - Preview Production Build
   - Install Dependencies

### 3. Debugging

**Start Debugging:**
1. Press `F5` or click Run icon (left sidebar)
2. Select "Launch Chrome against localhost"
3. Browser opens with debugger attached

**Set Breakpoints:**
- Click left margin (line number area) in any `.tsx` file
- Red dot appears = breakpoint set
- Code execution pauses here during debug

**Debug Controls:**
- `F5` - Continue
- `F10` - Step Over
- `F11` - Step Into
- `Shift+F11` - Step Out
- `Shift+F5` - Stop

### 4. IntelliSense & Autocomplete

**Component Autocomplete:**
- Start typing component name
- Press `Ctrl+Space` for suggestions
- Auto-import on selection

**Tailwind Class Suggestions:**
- Type `className="`
- Get autocomplete for Tailwind classes
- Hover to see CSS properties

**Props Autocomplete:**
- Type `<Component ` then `Ctrl+Space`
- See all available props with types

### 5. Code Navigation

| Action | Shortcut |
|--------|----------|
| Go to Definition | `F12` |
| Peek Definition | `Alt+F12` |
| Go to File | `Ctrl+P` |
| Go to Symbol | `Ctrl+Shift+O` |
| Find All References | `Shift+F12` |
| Go Back | `Alt+Left` |
| Go Forward | `Alt+Right` |

### 6. Search & Replace

**Find:** `Ctrl+F`
**Replace:** `Ctrl+H`
**Find in Files:** `Ctrl+Shift+F`
**Replace in Files:** `Ctrl+Shift+H`

**Regex Search:**
- Click `.*` icon in search box
- Use regex patterns

### 7. Multi-Cursor Editing

**Add Cursor:**
- `Alt+Click` anywhere
- `Ctrl+Alt+Down` (add below)
- `Ctrl+Alt+Up` (add above)

**Select All Occurrences:**
- `Ctrl+Shift+L` (select all instances of selection)
- `Ctrl+D` (add selection to next occurrence)

---

## 📁 VS Code Workspace Layout

### Recommended Layout

1. **Explorer** (Left) - File tree
2. **Editor** (Center) - Code files
3. **Terminal** (Bottom) - Command line
4. **Debug/Extensions** (Left) - As needed

**Toggle Panels:**
- Sidebar: `Ctrl+B`
- Terminal: `Ctrl+` `
- Problems: `Ctrl+Shift+M`
- Output: `Ctrl+Shift+U`

### Split Editor

**Vertical Split:** `Ctrl+\`
**Horizontal Split:** `Ctrl+K` then `Ctrl+\`

**Example Layout:**
```
┌─────────────┬─────────────┐
│             │             │
│  App.tsx    │  routes.tsx │
│             │             │
├─────────────┴─────────────┤
│     Terminal (pnpm dev)   │
└───────────────────────────┘
```

---

## 🔧 VS Code Settings Explained

The project includes `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,        // Auto-format when saving
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [...],  // Tailwind autocomplete
  "npm.packageManager": "pnpm"        // Use pnpm instead of npm
}
```

**Custom Settings:**
1. File > Preferences > Settings
2. Search for setting name
3. Modify as needed

---

## 🎨 Code Formatting

### Auto-Format

**Format Document:** `Shift+Alt+F`
**Format Selection:** `Ctrl+K Ctrl+F`

**Auto-format on Save:**
Already enabled in workspace settings!

### Manual Format All Files

```bash
npx prettier --write .
```

---

## 🐛 Debugging Tips

### Console Logging

```tsx
console.log('Value:', value);
console.table(array);
console.error('Error:', error);
```

**View Logs:**
1. Open Browser DevTools: `F12`
2. Click Console tab
3. See all console outputs

### React DevTools

**Install Extension:**
- Chrome: [React Developer Tools](https://chrome.google.com/webstore)
- Edge: [React Developer Tools](https://microsoftedge.microsoft.com/addons)

**Usage:**
1. Open DevTools (`F12`)
2. Click "Components" or "Profiler" tab
3. Inspect React component tree
4. View props, state, hooks

### VS Code Debug Console

**During Debugging:**
1. Set breakpoint
2. Press `F5` to start debugging
3. When paused, use Debug Console
4. Type variable names to inspect
5. Execute expressions

---

## 📊 File Structure Overview

```
serverless-expense-tracker/
│
├── .vscode/                    # VS Code workspace settings
│   ├── extensions.json        # Recommended extensions
│   ├── launch.json            # Debug configurations
│   ├── settings.json          # Workspace settings
│   └── tasks.json             # Build tasks
│
├── src/
│   ├── app/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # Base UI components
│   │   │   ├── AddExpenseDialog.tsx
│   │   │   ├── StockPrediction.tsx
│   │   │   └── ...
│   │   ├── lib/              # Utilities
│   │   │   ├── api.ts        # API functions
│   │   │   └── auth.ts       # Authentication
│   │   ├── pages/            # Route pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ScanReceipt.tsx
│   │   │   └── ...
│   │   ├── App.tsx           # Root component
│   │   ├── main.tsx          # Entry point
│   │   └── routes.tsx        # Routing
│   └── styles/               # CSS files
│
├── index.html                # HTML entry
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── README files             # Documentation
```

---

## ⌨️ Essential Keyboard Shortcuts

### File Operations
| Action | Shortcut |
|--------|----------|
| New File | `Ctrl+N` |
| Open File | `Ctrl+O` |
| Save File | `Ctrl+S` |
| Save All | `Ctrl+K S` |
| Close File | `Ctrl+W` |
| Close All | `Ctrl+K W` |

### Editing
| Action | Shortcut |
|--------|----------|
| Cut Line | `Ctrl+X` |
| Copy Line | `Ctrl+C` |
| Move Line Up/Down | `Alt+Up/Down` |
| Copy Line Up/Down | `Shift+Alt+Up/Down` |
| Delete Line | `Ctrl+Shift+K` |
| Comment Line | `Ctrl+/` |
| Comment Block | `Shift+Alt+A` |

### Navigation
| Action | Shortcut |
|--------|----------|
| Quick Open | `Ctrl+P` |
| Command Palette | `Ctrl+Shift+P` |
| Go to Line | `Ctrl+G` |
| Go to Symbol | `Ctrl+Shift+O` |
| Breadcrumbs | `Ctrl+Shift+.` |

### Display
| Action | Shortcut |
|--------|----------|
| Toggle Sidebar | `Ctrl+B` |
| Toggle Terminal | `Ctrl+` ` |
| Zoom In | `Ctrl++` |
| Zoom Out | `Ctrl+-` |
| Full Screen | `F11` |

---

## 🚨 Troubleshooting

### "Cannot find module" Errors

**Solution 1: Restart TypeScript Server**
1. `Ctrl+Shift+P`
2. Type: "TypeScript: Restart TS Server"

**Solution 2: Reload Window**
1. `Ctrl+Shift+P`
2. Type: "Developer: Reload Window"

**Solution 3: Reinstall Dependencies**
```bash
rm -rf node_modules
pnpm install
```

### Extensions Not Working

1. Check if extension is enabled:
   - `Ctrl+Shift+X` → Click extension → Ensure "Disable" button shows
2. Reload window: `Ctrl+Shift+P` → "Reload Window"
3. Check extension requirements (some need Node.js)

### Terminal Not Opening

1. Try: `Ctrl+` `
2. Or: View menu → Terminal
3. If still doesn't work:
   - `Ctrl+Shift+P`
   - Type: "Terminal: Kill All Terminals"
   - Then create new terminal

### Format on Save Not Working

1. Check settings: `Ctrl+,`
2. Search: "format on save"
3. Ensure checkbox is checked
4. Verify Prettier extension is installed
5. Check bottom-right corner shows "Prettier"

### Port 5173 Already in Use

**Check what's using the port:**
```bash
# Windows
netstat -ano | findstr :5173

# Mac/Linux
lsof -i :5173
```

**Kill the process:**
```bash
# Windows (replace PID with actual process ID)
taskkill /PID <PID> /F

# Mac/Linux
kill -9 <PID>
```

**Or use different port:**
```bash
pnpm dev -- --port 3000
```

---

## 💡 Pro Tips

### 1. Code Snippets

Type these shortcuts and press `Tab`:

- `rafce` → React Arrow Function Component Export
- `imr` → Import React
- `imrc` → Import React Component
- `ust` → useState hook
- `uef` → useEffect hook

### 2. Emmet for JSX

```
div.container>ul>li*5
```
Press `Tab` → Generates:
```jsx
<div className="container">
  <ul>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
  </ul>
</div>
```

### 3. Quick Fixes

Position cursor on error → Press `Ctrl+.`:
- Auto-import missing modules
- Fix TypeScript errors
- Add missing properties

### 4. Rename Symbol

Position cursor on variable/function → Press `F2`:
- Renames across all files
- Updates all references
- Safe refactoring

### 5. Peek Definition

Position cursor on component → Press `Alt+F12`:
- Shows definition in popup
- No need to leave current file

---

## 📈 Performance Tips

### 1. Exclude Folders from Search

Already configured in `.vscode/settings.json`:
- `node_modules/` excluded
- `dist/` excluded
- Faster file searches

### 2. Disable Extensions for This Workspace

For better performance:
1. Click Extensions icon
2. Right-click extension
3. "Disable (Workspace)"

### 3. Use Workspace Folders

For large projects:
1. File > Add Folder to Workspace
2. Organize multi-repo projects

---

## 🎓 Learning Resources

### Official Docs
- [VS Code Docs](https://code.visualstudio.com/docs)
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Vite Docs](https://vitejs.dev/)

### Keyboard Shortcuts
- Help > Keyboard Shortcuts Reference
- Or: `Ctrl+K Ctrl+R`

### Interactive Playground
- Help > Welcome
- Click "Interactive Playground"

---

## ✅ Checklist for Success

- [ ] Node.js installed and verified (`node --version`)
- [ ] pnpm installed globally (`pnpm --version`)
- [ ] Project opened in VS Code
- [ ] Recommended extensions installed
- [ ] Dependencies installed (`pnpm install`)
- [ ] Dev server running (`pnpm dev`)
- [ ] App opens in browser at `localhost:5173`
- [ ] TypeScript working (no red squiggly lines)
- [ ] Tailwind IntelliSense working (class suggestions)
- [ ] Format on save working (code auto-formats)

---

## 🎉 You're All Set!

Your development environment is ready. Start coding:

1. **Edit a component**: Try modifying `/src/app/pages/Dashboard.tsx`
2. **See changes instantly**: File saved → Browser updates automatically
3. **Debug**: Set a breakpoint and press `F5`
4. **Build**: `pnpm build` when ready to deploy

**Happy coding in VS Code!** 🚀

---

For more detailed info, check:
- `QUICKSTART.md` - Quick reference guide
- `VSCODE_SETUP.md` - Comprehensive setup guide
- `README.md` - Project documentation
