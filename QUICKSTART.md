# 🚀 Quick Start Guide - Serverless Expense Tracker

## One-Command Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

That's it! Your app will be running at **http://localhost:5173** 🎉

---

## 📋 Step-by-Step Setup (First Time)

### 1. Install Node.js and pnpm

**Install Node.js** (if not already installed):
- Download from: https://nodejs.org/ (v18 or higher)
- Verify: `node --version`

**Install pnpm globally**:
```bash
npm install -g pnpm
```

### 2. Open Project in VS Code

```bash
# Navigate to project directory
cd path/to/serverless-expense-tracker

# Open in VS Code
code .
```

### 3. Install Recommended Extensions

When VS Code opens, you'll see a notification:
- Click **"Install All"** on the recommended extensions popup
- Or manually: Press `Ctrl+Shift+X`, search and install:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

### 4. Install Dependencies

Open VS Code terminal (`Ctrl+` ` or View > Terminal):

```bash
pnpm install
```

This will install all required packages including:
- React 18.3.1
- TensorFlow.js (ML/AI features)
- Tesseract.js (OCR for receipt scanning)
- Material UI components
- And 60+ other packages

### 5. Start Development Server

```bash
pnpm dev
```

You should see:
```
  VITE v6.3.5  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 6. Open in Browser

- Click the link in terminal: `http://localhost:5173`
- Or manually open your browser and navigate to the URL

---

## 🎯 VS Code Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Start Dev Server | `Ctrl+Shift+B` |
| Open Terminal | `Ctrl+` ` |
| Quick File Open | `Ctrl+P` |
| Command Palette | `Ctrl+Shift+P` |
| Format Document | `Shift+Alt+F` |
| Toggle Sidebar | `Ctrl+B` |
| Split Editor | `Ctrl+\\` |

---

## 🛠️ VS Code Tasks

Press `Ctrl+Shift+P` and type "Run Task":

1. **Start Dev Server** - Starts Vite development server
2. **Build for Production** - Creates optimized build
3. **Preview Production Build** - Preview production locally
4. **Install Dependencies** - Reinstall all packages

---

## 🔍 Debugging in VS Code

### Browser Debugging

1. Press `F5` or click **Run > Start Debugging**
2. Select **"Launch Chrome against localhost"** or **"Launch Edge against localhost"**
3. Browser opens with debugger attached
4. Set breakpoints by clicking line numbers
5. Code execution pauses at breakpoints

### Console Debugging

- Open browser DevTools: `F12`
- Check Console tab for logs
- Use React DevTools extension

---

## 📁 Key Files to Know

```
├── src/app/App.tsx              # Main application entry
├── src/app/routes.tsx           # Page routing
├── src/app/pages/               # All page components
│   ├── Dashboard.tsx           # Home dashboard
│   ├── ScanReceipt.tsx         # Receipt scanner
│   ├── StockMarket.tsx         # Stock trading
│   └── CurrencyTrading.tsx     # Forex trading
├── src/app/components/          # Reusable components
│   ├── AddExpenseDialog.tsx    # Add expense form
│   ├── StockPrediction.tsx     # ML stock predictions
│   └── CurrencyPrediction.tsx  # Forex predictions
├── package.json                 # Dependencies & scripts
└── vite.config.ts              # Vite configuration
```

---

## ✅ Testing the App

### 1. Add an Expense
- Click **"Add Expense"** button
- Fill in amount, description
- Watch AI suggest category automatically
- Click **"Add Expense"**

### 2. Scan Receipt
- Navigate to **"Scan Receipt"** page (left sidebar)
- Click **"Take Photo"** or **"Upload Image"**
- Grant camera permissions when prompted
- Capture/upload receipt
- Watch OCR extract data automatically

### 3. View Stock Market
- Click **"Stock Market"** in sidebar
- See real-time stock prices updating
- View ML-powered price predictions
- Click **"Buy"** or **"Sell"** to simulate trades

### 4. Currency Trading
- Click **"Currency Trading"** in sidebar
- View live forex rates
- See AI prediction charts
- Simulate currency exchanges

---

## 🐛 Common Issues & Fixes

### Issue: Port 5173 Already in Use

**Solution:**
```bash
# Option 1: Kill the process
lsof -ti:5173 | xargs kill -9

# Option 2: Use different port
pnpm dev -- --port 3000
```

### Issue: "Module not found" Errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Issue: TypeScript Errors in VS Code

**Solution:**
1. Press `Ctrl+Shift+P`
2. Type: "TypeScript: Reload Project"
3. Or: "Reload Window"

### Issue: Camera Not Working

**Requirements:**
- Browser must have camera access permissions
- Must use HTTPS or localhost (http://localhost works)
- Camera must be available on device

**Grant Permissions:**
- Chrome: Click lock icon > Site Settings > Camera > Allow
- Edge: Similar to Chrome
- Firefox: Click camera icon in address bar > Allow

### Issue: Slow First Load

**Normal Behavior:**
- TensorFlow.js models download on first load
- OCR (Tesseract.js) downloads language data
- Subsequent loads are faster (cached)

---

## 🎨 Customization

### Change Theme Colors

Edit `/src/styles/theme.css`:
```css
@theme {
  --color-primary: oklch(0.55 0.25 264); /* Purple */
  /* Change to your preferred color */
}
```

### Change Port

Edit `vite.config.ts`:
```ts
export default defineConfig({
  server: {
    port: 3000, // Change from default 5173
  },
  // ...
})
```

### Add New Page

1. Create file in `/src/app/pages/NewPage.tsx`
2. Add route in `/src/app/routes.tsx`:
```tsx
{ path: "newpage", Component: NewPage },
```
3. Add navigation link in `/src/app/pages/Root.tsx`

---

## 📊 Project Statistics

- **Total Components**: 50+
- **Total Dependencies**: 68 packages
- **Technologies**: React, TypeScript, Vite, TensorFlow.js, Tailwind
- **Features**: Expense tracking, ML predictions, OCR scanning, Stock trading, Forex trading
- **Lines of Code**: 5000+
- **Bundle Size**: ~2.5MB (includes ML models)

---

## 🚀 Next Steps

1. ✅ Explore the Dashboard
2. ✅ Try adding expenses
3. ✅ Test receipt scanner
4. ✅ Check stock market predictions
5. ✅ Try currency trading
6. ✅ View analytics charts
7. ✅ Set budgets
8. ✅ Customize your profile

---

## 📚 Learn More

- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **TensorFlow.js**: https://www.tensorflow.org/js
- **Tesseract.js**: https://tesseract.projectnaptha.com/

---

## 💬 Tips for VS Code Users

1. **Format on Save**: Already enabled in workspace settings
2. **Auto Import**: Type component name, VS Code auto-suggests import
3. **IntelliSense**: Tailwind class autocomplete works automatically
4. **Quick Fix**: `Ctrl+.` for quick fixes and suggestions
5. **Multi-Cursor**: `Alt+Click` to add cursors
6. **Rename Symbol**: `F2` to rename across all files

---

**Happy Coding! 🎉**

Need help? Check `VSCODE_SETUP.md` for detailed documentation.
