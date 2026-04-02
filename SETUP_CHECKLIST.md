# ✅ Complete Setup Checklist

Use this checklist to ensure everything is configured correctly.

---

## Phase 1: Prerequisites ✓

### Required Software

- [ ] **Node.js v18+** installed
  ```bash
  node --version
  # Should show v18.x.x or higher
  ```

- [ ] **pnpm** package manager installed
  ```bash
  pnpm --version
  # If not installed: npm install -g pnpm
  ```

- [ ] **VS Code** installed
  - Download from: https://code.visualstudio.com/

- [ ] **Modern Browser** (Chrome, Edge, or Firefox)
  - For testing and debugging

---

## Phase 2: Project Setup ✓

### Open Project in VS Code

- [ ] Open VS Code
- [ ] File > Open Folder
- [ ] Navigate to project directory
- [ ] Click "Select Folder"

### Install Dependencies

- [ ] Open integrated terminal (`Ctrl+` `)
- [ ] Run installation command:
  ```bash
  pnpm install
  ```
- [ ] Wait for completion (2-5 minutes on first install)
- [ ] Verify no errors in output

---

## Phase 3: VS Code Extensions ✓

### Recommended Extensions

When you open the project, you should see a notification:
> "This workspace has extension recommendations"

- [ ] Click **"Install All"** or **"Show Recommendations"**

### Manual Installation (if needed)

Press `Ctrl+Shift+X` and search/install:

- [ ] **ESLint** (dbaeumer.vscode-eslint)
  - For code quality and linting

- [ ] **Prettier** (esbenp.prettier-vscode)
  - For code formatting

- [ ] **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
  - For CSS class autocomplete

- [ ] **ES7+ React Snippets** (dsznajder.es7-react-js-snippets)
  - For React code snippets

- [ ] **Path Intellisense** (christian-kohler.path-intellisense)
  - For file path autocomplete

### Verify Extensions

- [ ] Open Extensions panel (`Ctrl+Shift+X`)
- [ ] Check all extensions show "Enabled"
- [ ] Reload window if needed (`Ctrl+Shift+P` → "Reload Window")

---

## Phase 4: Workspace Configuration ✓

### Verify Workspace Settings

- [ ] Check `.vscode/settings.json` exists
- [ ] Open Settings (`Ctrl+,`)
- [ ] Search "format on save" → Should be checked ✓
- [ ] Search "default formatter" → Should be "Prettier"

### Test Auto-Format

- [ ] Open any `.tsx` file
- [ ] Make a formatting mess (remove spaces, add blank lines)
- [ ] Save file (`Ctrl+S`)
- [ ] File should auto-format ✓

### Verify TypeScript

- [ ] Open `/src/app/App.tsx`
- [ ] Hover over any variable
- [ ] Should see type information popup ✓
- [ ] No red squiggly lines (TypeScript errors)

### Verify Tailwind IntelliSense

- [ ] Open any component file
- [ ] Type `className="`
- [ ] Should see Tailwind class suggestions ✓
- [ ] Try typing `flex` → See autocomplete options

---

## Phase 5: Start Development Server ✓

### Run Dev Server

- [ ] Open terminal (`Ctrl+` `)
- [ ] Run command:
  ```bash
  pnpm dev
  ```
- [ ] Wait for server to start
- [ ] Look for output:
  ```
  VITE v6.3.5  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ```

### Verify Server Running

- [ ] Server starts without errors
- [ ] Port 5173 is available
- [ ] No "EADDRINUSE" error

**If port is in use:**
```bash
# Kill process on port 5173
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
pnpm dev -- --port 3000
```

---

## Phase 6: Test Application ✓

### Open in Browser

- [ ] Open browser
- [ ] Navigate to `http://localhost:5173`
- [ ] Page loads successfully ✓

### Test Login Page

- [ ] See login/signup page
- [ ] Form fields are visible
- [ ] No console errors (Press F12 → Console tab)

### Test Demo Account

- [ ] Click "Login" tab
- [ ] Enter:
  - Email: `demo@expense-tracker.com`
  - Password: `demo123`
- [ ] Click "Login"
- [ ] Redirects to dashboard ✓

### Test Dashboard

- [ ] Dashboard page loads
- [ ] See expense cards/stats
- [ ] See navigation sidebar
- [ ] No JavaScript errors in console

### Test Navigation

- [ ] Click different menu items:
  - [ ] Dashboard
  - [ ] Analytics
  - [ ] Stock Market
  - [ ] Currency Trading
  - [ ] Scan Receipt
  - [ ] Budgets
  - [ ] Profile
  - [ ] Settings
- [ ] All pages load correctly
- [ ] No errors

### Test Hot Reload

- [ ] Open `/src/app/pages/Dashboard.tsx` in VS Code
- [ ] Change some text (e.g., page title)
- [ ] Save file (`Ctrl+S`)
- [ ] Browser updates automatically (within 1 second) ✓

---

## Phase 7: Test Features ✓

### Add Expense

- [ ] Click "Add Expense" button
- [ ] Dialog opens
- [ ] Fill in form:
  - Amount: `500`
  - Description: `Test expense`
  - Category: Select any
  - Date: Today's date
- [ ] Click "Add Expense"
- [ ] Success toast appears
- [ ] Expense appears in list ✓

### AI Categorization

- [ ] Click "Add Expense"
- [ ] In description field, type: "Pizza at dominos"
- [ ] Wait 1 second
- [ ] AI suggestion badge appears
- [ ] Suggests "Food & Dining" category ✓

### Receipt Scanner

- [ ] Navigate to "Scan Receipt" page
- [ ] See two options: Camera / Upload
- [ ] Click "Upload Image" (easier to test)
- [ ] Dialog appears for file selection ✓

### Stock Market

- [ ] Navigate to "Stock Market" page
- [ ] See list of stocks
- [ ] Prices update every ~3 seconds (look for animation)
- [ ] Click "Buy" on any stock
- [ ] Dialog opens
- [ ] Can select quantity
- [ ] Total price calculates ✓

### Currency Trading

- [ ] Navigate to "Currency Trading" page
- [ ] See currency pairs
- [ ] Rates update in real-time
- [ ] See prediction charts ✓

### Analytics

- [ ] Navigate to "Analytics" page
- [ ] See charts (bar, pie)
- [ ] Data visualizes correctly
- [ ] Tabs work (Weekly, Daily, Category) ✓

### Budgets

- [ ] Navigate to "Budgets" page
- [ ] Click "Create Budget"
- [ ] Fill in form
- [ ] Submit
- [ ] Budget appears in list ✓

---

## Phase 8: Camera/OCR Features ✓

### Test Camera Permissions

**Note:** Camera only works on HTTPS or localhost

- [ ] Navigate to "Scan Receipt" page
- [ ] Click "Take Photo"
- [ ] Browser asks for camera permission
- [ ] Click "Allow"
- [ ] Camera feed appears ✓

**If camera doesn't work:**
- Check browser permissions (Settings → Privacy → Camera)
- Ensure using `localhost` (not 127.0.0.1 or IP)
- Try different browser

### Test OCR

- [ ] Upload or capture receipt image
- [ ] Wait for processing (5-10 seconds)
- [ ] OCR text extracts
- [ ] Form pre-fills with extracted data ✓

---

## Phase 9: Debugging Setup ✓

### Test Breakpoint Debugging

- [ ] Open `/src/app/pages/Dashboard.tsx`
- [ ] Click line number (left margin) to set breakpoint
- [ ] Red dot appears
- [ ] Press `F5`
- [ ] Select "Launch Chrome against localhost"
- [ ] Browser opens
- [ ] Code pauses at breakpoint ✓

### Test Console Debugging

- [ ] In browser, press `F12`
- [ ] Click "Console" tab
- [ ] Type: `console.log('Test')`
- [ ] Press Enter
- [ ] "Test" appears in console ✓

### Test React DevTools

- [ ] Install React Developer Tools extension
  - [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [ ] Press `F12`
- [ ] See "Components" and "Profiler" tabs
- [ ] Click "Components"
- [ ] Inspect component tree ✓

---

## Phase 10: Build & Production ✓

### Test Production Build

- [ ] Stop dev server (`Ctrl+C` in terminal)
- [ ] Run build command:
  ```bash
  pnpm build
  ```
- [ ] Build completes without errors
- [ ] `dist/` folder created ✓

### Test Production Preview

- [ ] Run preview command:
  ```bash
  pnpm preview
  ```
- [ ] Server starts at `http://localhost:4173`
- [ ] Open in browser
- [ ] App works correctly ✓

---

## Phase 11: Advanced Features ✓

### TensorFlow.js

- [ ] Stock predictions show
- [ ] Currency predictions show
- [ ] No TensorFlow errors in console
- [ ] Predictions update in real-time ✓

### Real-time Updates

- [ ] Stock prices update every 3 seconds
- [ ] Currency rates update continuously
- [ ] Time displays update (if shown)
- [ ] No performance issues ✓

### Responsive Design

Test on different screen sizes:

- [ ] Desktop (1920x1080)
  - Layout looks good
  - No horizontal scroll
  
- [ ] Tablet (768px)
  - Press `F12` → Toggle device toolbar
  - Select iPad
  - Layout adjusts correctly
  
- [ ] Mobile (375px)
  - Select iPhone
  - Navigation collapses (hamburger menu)
  - Touch-friendly buttons ✓

---

## Phase 12: Code Quality ✓

### TypeScript Checks

- [ ] Run TypeScript compiler:
  ```bash
  npx tsc --noEmit
  ```
- [ ] No TypeScript errors ✓

### Check for Console Logs

- [ ] Search project for `console.log`:
  ```bash
  # In VS Code: Ctrl+Shift+F
  # Search for: console.log
  ```
- [ ] Remove any debug logs from production code

### Check Dependencies

- [ ] Check for outdated packages:
  ```bash
  pnpm outdated
  ```
- [ ] Note any major version differences

---

## Phase 13: Documentation ✓

### Verify Documentation Exists

- [ ] `README.md` - Main project documentation
- [ ] `README_VSCODE.md` - VS Code setup guide
- [ ] `QUICKSTART.md` - Quick start guide
- [ ] `VSCODE_SETUP.md` - Detailed setup
- [ ] `TROUBLESHOOTING.md` - Common issues
- [ ] `CHEATSHEET.md` - Developer reference
- [ ] `.env.example` - Environment variables template

### Read Key Documents

- [ ] Read `QUICKSTART.md` for overview
- [ ] Skim `README_VSCODE.md` for shortcuts
- [ ] Bookmark `CHEATSHEET.md` for reference

---

## Phase 14: Git Setup (Optional) ✓

### Initialize Git Repository

- [ ] Initialize git:
  ```bash
  git init
  ```

- [ ] Add all files:
  ```bash
  git add .
  ```

- [ ] Create first commit:
  ```bash
  git commit -m "Initial commit: Serverless Expense Tracker setup"
  ```

### Verify .gitignore

- [ ] Check `.gitignore` exists
- [ ] Verify excludes:
  - `node_modules/`
  - `dist/`
  - `.env`
  - `.DS_Store`

---

## ✅ Final Verification

### Quick Test Checklist

Run through these quickly:

- [ ] Dev server starts: `pnpm dev` ✓
- [ ] App opens in browser ✓
- [ ] Login works ✓
- [ ] Add expense works ✓
- [ ] Navigation works ✓
- [ ] Stock market loads ✓
- [ ] Hot reload works ✓
- [ ] Format on save works ✓
- [ ] TypeScript autocomplete works ✓
- [ ] Tailwind autocomplete works ✓

### Performance Check

- [ ] Page load < 3 seconds
- [ ] No lag when clicking buttons
- [ ] Smooth animations
- [ ] Charts render quickly
- [ ] Real-time updates don't freeze UI

### Browser Console

- [ ] Press `F12`
- [ ] Check Console tab
- [ ] No red errors ✓
- [ ] Only expected warnings (if any)

---

## 🎉 Setup Complete!

If all items are checked, your setup is complete and working perfectly!

### What's Next?

1. **Start Developing**
   - Modify components in `/src/app/components/`
   - Add new pages in `/src/app/pages/`
   - Update styles in `/src/styles/`

2. **Learn the Codebase**
   - Read component files
   - Understand data flow
   - Explore API integration

3. **Add Features**
   - Check `README.md` for future enhancements
   - Implement your ideas
   - Test thoroughly

4. **Deploy** (when ready)
   - Build: `pnpm build`
   - Deploy `dist/` folder to hosting
   - Configure environment variables

---

## 🚨 If Something's Not Working

### Quick Fixes

1. **Restart everything:**
   ```bash
   # Stop dev server (Ctrl+C)
   rm -rf node_modules dist
   pnpm install
   pnpm dev
   ```

2. **Reload VS Code:**
   - `Ctrl+Shift+P` → "Reload Window"

3. **Check guides:**
   - `TROUBLESHOOTING.md` for specific issues
   - `README_VSCODE.md` for VS Code problems

### Still Having Issues?

- Check browser console for errors
- Review VS Code problems panel (`Ctrl+Shift+M`)
- Search error message in `TROUBLESHOOTING.md`
- Check Node.js and pnpm versions

---

## 📊 Setup Stats

Track your setup:

- **Total Time**: _____ minutes
- **Node Version**: _____
- **pnpm Version**: _____
- **Extensions Installed**: _____ / 5
- **Tests Passed**: _____ / all
- **Date Completed**: _____

---

**Congratulations! You're ready to build amazing features! 🚀**

Save this file and refer back to it for future setups or troubleshooting.
