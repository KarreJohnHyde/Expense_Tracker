# 🔧 Troubleshooting Guide

## Quick Fixes

### The "Turn it off and on again" approach:

```bash
# 1. Stop the dev server (Ctrl+C in terminal)
# 2. Clear cache and reinstall
rm -rf node_modules dist
pnpm install
# 3. Restart dev server
pnpm dev
```

---

## Common Issues & Solutions

### 🚫 Installation Issues

#### Issue: `pnpm: command not found`

**Cause:** pnpm is not installed globally

**Solution:**
```bash
npm install -g pnpm
# Verify installation
pnpm --version
```

#### Issue: `Permission denied` during install

**Cause:** Insufficient permissions

**Solution (Mac/Linux):**
```bash
sudo pnpm install
# Or fix permissions
sudo chown -R $USER ~/.pnpm-store
```

**Solution (Windows):**
Run Command Prompt or PowerShell as Administrator

#### Issue: Network/Proxy Errors

**Solution:**
```bash
# Set npm registry
pnpm config set registry https://registry.npmjs.org/

# Clear pnpm cache
pnpm store prune

# Retry installation
pnpm install
```

---

### 🌐 Port Issues

#### Issue: `Port 5173 is already in use`

**Find what's using the port:**

**Windows:**
```bash
netstat -ano | findstr :5173
# Note the PID (last column)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -i :5173
# Note the PID
kill -9 <PID>
```

**Alternative: Use different port**
```bash
pnpm dev -- --port 3000
# Or edit vite.config.ts
```

---

### 📦 Module Errors

#### Issue: `Cannot find module 'X'` or `Module not found`

**Solution 1: Install missing package**
```bash
pnpm add <package-name>
```

**Solution 2: Reinstall all packages**
```bash
rm -rf node_modules
pnpm install
```

**Solution 3: Check import path**
```tsx
// ❌ Wrong
import { Button } from 'components/ui/button';

// ✅ Correct
import { Button } from './components/ui/button';
```

#### Issue: `Could not resolve "react-webcam"`

**Cause:** Package not installed or corrupted

**Solution:**
```bash
pnpm add react-webcam
# If still fails
rm -rf node_modules
pnpm install
```

---

### 🎨 Styling Issues

#### Issue: Tailwind classes not working

**Check 1: Verify Tailwind CSS is loaded**
```bash
# Check package.json has these packages
"@tailwindcss/vite": "4.1.12"
"tailwindcss": "4.1.12"
```

**Check 2: Verify imports in index.css**
```css
/* Should be at top of /src/styles/index.css */
@import "tailwindcss";
```

**Check 3: Restart dev server**
```bash
# Ctrl+C to stop
pnpm dev
```

#### Issue: Custom CSS not applying

**Check load order:**
```tsx
// In main.tsx
import '../styles/index.css';  // ✅ Should be imported
```

---

### 🎥 Camera/Webcam Issues

#### Issue: Camera not detected

**Check 1: Browser Permissions**
1. Click lock icon (🔒) in address bar
2. Camera → Allow
3. Reload page

**Check 2: HTTPS/Localhost requirement**
- Camera API only works on:
  - `https://` URLs
  - `http://localhost`
  - `http://127.0.0.1`

**Check 3: Camera availability**
```bash
# Test camera access
# Open browser DevTools console and run:
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera works!'))
  .catch(err => console.error('Camera error:', err));
```

#### Issue: `DOMException: Permission denied`

**Solution:**
1. **Chrome/Edge:**
   - Settings → Privacy and security → Site Settings
   - Camera → Remove localhost from blocked list

2. **Firefox:**
   - Click camera icon in address bar
   - Permissions → Camera → Allow

3. **Safari:**
   - Safari → Preferences → Websites → Camera
   - Allow for localhost

---

### 🧠 TensorFlow.js / ML Issues

#### Issue: `Cannot read property 'setBackend'` 

**Cause:** TensorFlow.js not loaded properly

**Solution:**
```tsx
// In main.tsx - wrap in try-catch
try {
  import('@tensorflow/tfjs').then((tf) => {
    tf.setBackend('webgl');
  });
} catch (error) {
  console.warn('TensorFlow.js not available', error);
}
```

#### Issue: Slow predictions / High memory usage

**Solution: Use CPU backend instead of WebGL**

Create `.env`:
```env
VITE_TF_BACKEND=cpu
```

Or manually:
```tsx
import * as tf from '@tensorflow/tfjs';
await tf.setBackend('cpu');
```

---

### 📸 OCR / Tesseract Issues

#### Issue: `Failed to fetch Tesseract worker`

**Cause:** Tesseract.js downloading language files

**Solution 1: Wait for download**
- First load takes longer (downloads ~2MB)
- Subsequent loads use cache

**Solution 2: Check internet connection**
```bash
# Test connection
ping cdn.jsdelivr.net
```

**Solution 3: Use local worker**
```tsx
// Update Tesseract.recognize config
Tesseract.recognize(image, 'eng', {
  workerPath: '/node_modules/tesseract.js/dist/worker.min.js',
  langPath: '/tessdata',
  corePath: '/node_modules/tesseract.js-core',
})
```

#### Issue: Poor OCR accuracy

**Solutions:**
1. **Better image quality:**
   - Good lighting
   - High contrast
   - Clear text
   - Minimum 300 DPI

2. **Preprocess image:**
```tsx
// Convert to grayscale, increase contrast
// Use canvas to preprocess before OCR
```

---

### 🔴 TypeScript Errors

#### Issue: Red squiggly lines everywhere

**Solution 1: Reload TypeScript Server**
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

**Solution 2: Reload VS Code Window**
1. Press `Ctrl+Shift+P`
2. Type: "Developer: Reload Window"
3. Press Enter

**Solution 3: Check TypeScript version**
```bash
# Should use workspace version
pnpm add -D typescript@latest
```

#### Issue: `Cannot find name 'useState'`

**Cause:** React import missing

**Solution:**
```tsx
// Add at top of file
import { useState } from 'react';
```

#### Issue: `Property 'X' does not exist on type 'Y'`

**Solution: Check prop types**
```tsx
// Define proper interface
interface MyComponentProps {
  title: string;
  count: number;
  onUpdate?: () => void;  // Optional prop
}

export function MyComponent({ title, count }: MyComponentProps) {
  // ...
}
```

---

### ⚡ Performance Issues

#### Issue: Slow dev server start

**Cause:** Large node_modules, many files

**Solution 1: Exclude folders**
Already configured in `.vscode/settings.json`

**Solution 2: Disable source maps in dev**
```ts
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false,  // Faster builds
  },
})
```

**Solution 3: Use SWC instead of Babel**
```bash
pnpm add -D @vitejs/plugin-react-swc
```

#### Issue: Hot reload slow or not working

**Solution 1: Restart dev server**
```bash
# Ctrl+C
pnpm dev
```

**Solution 2: Check file watchers limit (Linux)**
```bash
# Increase limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### 🌍 Browser Issues

#### Issue: White screen / blank page

**Check 1: Console errors**
1. Press `F12`
2. Check Console tab
3. Look for red errors

**Check 2: Verify dev server running**
```bash
# Should see
VITE v6.3.5  ready in xxx ms
➜  Local:   http://localhost:5173/
```

**Check 3: Try different browser**
- Chrome
- Edge
- Firefox

#### Issue: `Failed to fetch` errors

**Cause:** API/Network issues

**Solution:**
```tsx
// Add error handling
try {
  const data = await api.fetchData();
} catch (error) {
  console.error('API Error:', error);
  toast.error('Failed to load data');
}
```

---

### 🔐 Environment Variables Issues

#### Issue: Environment variables not loading

**Check 1: Prefix with `VITE_`**
```env
# ❌ Wrong
API_KEY=xxx

# ✅ Correct
VITE_API_KEY=xxx
```

**Check 2: Restart dev server**
```bash
# Changes to .env require restart
# Ctrl+C
pnpm dev
```

**Check 3: Access correctly**
```tsx
// ❌ Wrong
const key = process.env.API_KEY;

// ✅ Correct
const key = import.meta.env.VITE_API_KEY;
```

---

### 🎯 Build Issues

#### Issue: Build fails with errors

**Check 1: TypeScript errors**
```bash
# Fix all TypeScript errors first
npx tsc --noEmit
```

**Check 2: Build with verbose output**
```bash
pnpm build --debug
```

**Check 3: Clear cache**
```bash
rm -rf dist node_modules/.vite
pnpm install
pnpm build
```

#### Issue: Build succeeds but app doesn't work

**Check 1: Base path**
```ts
// vite.config.ts
export default defineConfig({
  base: '/',  // Adjust if deploying to subdirectory
})
```

**Check 2: Preview build**
```bash
pnpm preview
# Check if works at http://localhost:4173
```

---

### 📱 Responsive Design Issues

#### Issue: App doesn't work on mobile

**Check 1: Viewport meta tag**
```html
<!-- Should be in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Check 2: Test in DevTools**
1. Press `F12`
2. Click device toggle (phone icon)
3. Select device (iPhone, Android)

**Check 3: Touch events**
```tsx
// Use onClick for both mouse and touch
<button onClick={handleClick}>Click me</button>
```

---

### 🗄️ State Management Issues

#### Issue: State not updating

**Check: Are you mutating state?**
```tsx
// ❌ Wrong - mutating
const [items, setItems] = useState([1, 2, 3]);
items.push(4);  // Doesn't trigger re-render

// ✅ Correct - creating new array
setItems([...items, 4]);
setItems(prev => [...prev, 4]);
```

#### Issue: Infinite re-renders

**Cause:** State update in render

**Solution:**
```tsx
// ❌ Wrong
function Component() {
  const [count, setCount] = useState(0);
  setCount(1);  // Infinite loop!
  return <div>{count}</div>;
}

// ✅ Correct
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(1);  // Runs once on mount
  }, []);
  return <div>{count}</div>;
}
```

---

## VS Code Specific Issues

### Issue: Extensions not working

**Solution 1: Check extension enabled**
1. `Ctrl+Shift+X` (Extensions)
2. Find extension
3. Ensure not disabled

**Solution 2: Reload window**
1. `Ctrl+Shift+P`
2. Type: "Reload Window"

**Solution 3: Check extension logs**
1. Help > Toggle Developer Tools
2. Console tab
3. Look for extension errors

### Issue: Intellisense not working

**Solution:**
1. `Ctrl+Shift+P`
2. Type: "TypeScript: Restart TS Server"
3. If still not working: Reload window

### Issue: Prettier not formatting

**Check 1: Prettier installed**
```bash
pnpm add -D prettier
```

**Check 2: Default formatter set**
1. `Ctrl+,` (Settings)
2. Search: "default formatter"
3. Select: "Prettier - Code formatter"

**Check 3: Format on save enabled**
1. `Ctrl+,`
2. Search: "format on save"
3. Check the box

---

## System-Specific Issues

### Windows

#### Issue: `'pnpm' is not recognized`

**Solution:**
```powershell
# Restart PowerShell/CMD after installing pnpm
# Or add to PATH manually:
# System Properties > Environment Variables > Path
# Add: C:\Users\<YourUser>\AppData\Roaming\npm
```

#### Issue: Long path errors

**Solution:**
```powershell
# Enable long paths (Run as Administrator)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Mac

#### Issue: `gyp: No Xcode or CLT version detected!`

**Solution:**
```bash
xcode-select --install
```

### Linux

#### Issue: `ENOSPC: System limit for number of file watchers reached`

**Solution:**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Getting Help

### 1. Check Console

**Browser Console (F12):**
- Red errors
- Warning messages
- Network failures

**VS Code Problems Panel (`Ctrl+Shift+M`):**
- TypeScript errors
- Lint warnings

### 2. Search Logs

**Dev Server Logs:**
```bash
# In terminal where pnpm dev is running
# Look for error messages, stack traces
```

**Build Logs:**
```bash
pnpm build --debug
# Shows detailed build information
```

### 3. Verbose Mode

```bash
# More detailed output
pnpm dev --debug
pnpm build --debug
```

### 4. Clean Install

```bash
# Nuclear option - fresh start
rm -rf node_modules dist .vite
pnpm install
pnpm dev
```

---

## Diagnostic Commands

Run these to check your setup:

```bash
# Check versions
node --version          # Should be v18+
pnpm --version         # Should be v8+
npm list react         # Check React version

# Check project
pnpm list              # Show all packages
pnpm outdated          # Check for updates

# Check ports
netstat -ano | findstr :5173    # Windows
lsof -i :5173                   # Mac/Linux

# Clean cache
pnpm store prune       # Clear pnpm cache
```

---

## Still Having Issues?

### Create a GitHub Issue

Include:
1. **Error message** (full text)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Environment:**
   - OS (Windows/Mac/Linux)
   - Node version: `node --version`
   - pnpm version: `pnpm --version`
   - Browser & version

### Collect Debug Info

```bash
# Save to file
pnpm list > packages.txt
pnpm dev --debug 2>&1 | tee dev-log.txt
```

---

## Prevention Tips

### Regular Maintenance

```bash
# Weekly
pnpm outdated          # Check for updates
pnpm audit             # Security check

# Monthly
pnpm update            # Update packages
pnpm store prune       # Clean cache
```

### Best Practices

1. ✅ Commit `package.json` and `pnpm-lock.yaml`
2. ✅ Don't commit `node_modules/` or `dist/`
3. ✅ Keep dependencies updated
4. ✅ Test before committing
5. ✅ Use TypeScript types
6. ✅ Handle errors gracefully

---

**Remember:** Most issues are solved by restarting the dev server or reinstalling packages! 🔄
