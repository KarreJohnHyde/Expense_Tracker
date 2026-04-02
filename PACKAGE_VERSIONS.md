# 📦 Package Versions & Dependencies

## Current Package Versions

This document lists all packages used in the project with their current versions.

Last Updated: **March 20, 2026**

---

## Runtime Dependencies (68 packages)

### Core React & UI Framework
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | Core React library (peer dependency) |
| react-dom | 18.3.1 | React DOM renderer (peer dependency) |
| react-router | 7.13.0 | Client-side routing |

### UI Component Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| @mui/material | 7.3.5 | Material UI components |
| @mui/icons-material | 7.3.5 | Material UI icons |
| @emotion/react | 11.14.0 | CSS-in-JS library (MUI dependency) |
| @emotion/styled | 11.14.1 | Styled components for MUI |

### Radix UI Primitives (18 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-accordion | 1.2.3 | Accordion component |
| @radix-ui/react-alert-dialog | 1.1.6 | Alert dialog component |
| @radix-ui/react-aspect-ratio | 1.1.2 | Aspect ratio container |
| @radix-ui/react-avatar | 1.1.3 | Avatar component |
| @radix-ui/react-checkbox | 1.1.4 | Checkbox component |
| @radix-ui/react-collapsible | 1.1.3 | Collapsible component |
| @radix-ui/react-context-menu | 2.2.6 | Context menu |
| @radix-ui/react-dialog | 1.1.6 | Dialog/Modal component |
| @radix-ui/react-dropdown-menu | 2.1.6 | Dropdown menu |
| @radix-ui/react-hover-card | 1.1.6 | Hover card |
| @radix-ui/react-label | 2.1.2 | Label component |
| @radix-ui/react-menubar | 1.1.6 | Menu bar |
| @radix-ui/react-navigation-menu | 1.2.5 | Navigation menu |
| @radix-ui/react-popover | 1.1.6 | Popover component |
| @radix-ui/react-progress | 1.1.2 | Progress bar |
| @radix-ui/react-radio-group | 1.2.3 | Radio button group |
| @radix-ui/react-scroll-area | 1.2.3 | Scroll area |
| @radix-ui/react-select | 2.1.6 | Select dropdown |
| @radix-ui/react-separator | 1.1.2 | Separator/divider |
| @radix-ui/react-slider | 1.2.3 | Slider component |
| @radix-ui/react-slot | 1.1.2 | Slot component |
| @radix-ui/react-switch | 1.1.3 | Toggle switch |
| @radix-ui/react-tabs | 1.1.3 | Tabs component |
| @radix-ui/react-toggle | 1.1.2 | Toggle button |
| @radix-ui/react-toggle-group | 1.1.2 | Toggle group |
| @radix-ui/react-tooltip | 1.1.8 | Tooltip component |

### AI/ML & Computer Vision
| Package | Version | Purpose |
|---------|---------|---------|
| @tensorflow/tfjs | 4.22.0 | Machine learning in browser |
| tesseract.js | 7.0.0 | OCR text extraction |

### Backend & Database
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | 2.99.2 | Supabase client library |

### Data Visualization
| Package | Version | Purpose |
|---------|---------|---------|
| recharts | 2.15.2 | React chart library |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.55.0 | Form state management |
| input-otp | 1.4.2 | OTP input component |

### UI Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| lucide-react | 0.487.0 | Icon library |
| canvas-confetti | 1.9.4 | Confetti animations |
| sonner | 2.0.3 | Toast notifications |
| vaul | 1.1.2 | Drawer component |
| cmdk | 1.1.1 | Command menu |

### Styling & CSS
| Package | Version | Purpose |
|---------|---------|---------|
| tailwind-merge | 3.2.0 | Merge Tailwind classes |
| class-variance-authority | 0.7.1 | Variant-based styling |
| clsx | 2.1.1 | Class name utility |
| tw-animate-css | 1.3.8 | Tailwind animations |
| next-themes | 0.4.6 | Theme management |

### Date & Time
| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | 3.6.0 | Date utility library |
| react-day-picker | 8.10.1 | Date picker component |

### Media & Camera
| Package | Version | Purpose |
|---------|---------|---------|
| react-webcam | 7.2.0 | Webcam/camera access |

### Carousel & Sliders
| Package | Version | Purpose |
|---------|---------|---------|
| embla-carousel-react | 8.6.0 | Carousel component |
| react-slick | 0.31.0 | Carousel/slider |

### Layout & Interaction
| Package | Version | Purpose |
|---------|---------|---------|
| react-responsive-masonry | 2.7.1 | Masonry grid layout |
| react-resizable-panels | 2.1.7 | Resizable panels |
| react-dnd | 16.0.1 | Drag and drop |
| react-dnd-html5-backend | 16.0.1 | HTML5 drag backend |

### Animation
| Package | Version | Purpose |
|---------|---------|---------|
| motion | 12.23.24 | Animation library (Framer Motion) |

### Popper & Positioning
| Package | Version | Purpose |
|---------|---------|---------|
| @popperjs/core | 2.11.8 | Tooltip positioning |
| react-popper | 2.3.0 | React wrapper for Popper |

---

## Development Dependencies (4 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| @tailwindcss/vite | 4.1.12 | Tailwind CSS Vite plugin |
| @vitejs/plugin-react | 4.7.0 | Vite React plugin |
| tailwindcss | 4.1.12 | Tailwind CSS framework |
| vite | 6.3.5 | Build tool and dev server |

---

## Package Manager

**pnpm** - Fast, disk space efficient package manager

---

## Node.js Version Requirement

**Node.js v18.0.0 or higher**

Check your version:
```bash
node --version
```

---

## Installation

### Install All Dependencies
```bash
pnpm install
```

### Install Specific Package
```bash
pnpm add <package-name>
```

### Update All Packages
```bash
pnpm update
```

### Check for Outdated Packages
```bash
pnpm outdated
```

---

## Important Package Notes

### TensorFlow.js
- Large package (~15MB)
- Downloads additional models at runtime
- Can use different backends: WebGL (default), CPU, WASM

### Tesseract.js
- OCR engine
- Downloads language data on first use (~2MB)
- Cached after first download

### Material UI (@mui/material)
- Requires @emotion/react and @emotion/styled as peer dependencies
- Already included in package.json

### React Hook Form
- Using specific version 7.55.0 (as per library requirements)
- Do not upgrade without testing

### Motion (formerly Framer Motion)
- Import from `motion/react` subpath
- Not compatible with old `framer-motion` imports

---

## Bundle Size Information

### Production Build Size (approx.)
- **Total**: ~2.5 MB (compressed)
- **JavaScript**: ~2.2 MB
- **CSS**: ~300 KB
- **ML Models** (loaded separately): ~15 MB

### Largest Dependencies
1. TensorFlow.js (~900 KB)
2. Material UI (~500 KB)
3. Recharts (~400 KB)
4. Radix UI (combined ~300 KB)
5. Tesseract.js (~200 KB)

---

## Package Categories Summary

| Category | Count | Examples |
|----------|-------|----------|
| UI Components | 32 | Radix UI, Material UI, custom |
| AI/ML | 2 | TensorFlow.js, Tesseract.js |
| Charts | 1 | Recharts |
| Forms | 3 | React Hook Form, Input OTP |
| Styling | 5 | Tailwind, CVA, clsx |
| Routing | 1 | React Router |
| Date/Time | 2 | date-fns, react-day-picker |
| Media | 1 | react-webcam |
| Animation | 2 | Motion, canvas-confetti |
| Utilities | 10+ | Various helpers |
| **Total Runtime** | **68** | |
| **Total Dev** | **4** | |
| **Grand Total** | **72** | |

---

## Upgrade Guide

### Check for Updates
```bash
# See what can be updated
pnpm outdated

# Update all to latest (careful!)
pnpm update --latest

# Update specific package
pnpm update <package-name> --latest
```

### Major Version Upgrades

⚠️ **Be careful with major version upgrades!**

Test thoroughly after upgrading:
- React (18.x)
- React Router (7.x)
- Tailwind CSS (4.x)
- Vite (6.x)

### Version Pinning

Some packages are pinned to specific versions:
- `react-hook-form@7.55.0` - Required version

---

## Security

### Audit Packages
```bash
# Check for vulnerabilities
pnpm audit

# Fix vulnerabilities automatically
pnpm audit fix
```

### Update Security Patches
```bash
# Update to latest patch versions
pnpm update
```

---

## Package Management Tips

1. **Always use pnpm** (not npm or yarn)
   - Configured in package.json
   - Faster and more efficient

2. **Lock file is important**
   - Commit `pnpm-lock.yaml` to git
   - Ensures same versions for everyone

3. **Check compatibility**
   - Before adding new packages
   - Check React version compatibility
   - Check TypeScript support

4. **Keep packages updated**
   - Weekly: `pnpm outdated`
   - Monthly: `pnpm update`
   - Quarterly: Review major updates

5. **Test after updates**
   - Run `pnpm dev`
   - Test all major features
   - Check for console errors

---

## Common Issues

### Package Installation Fails
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm store prune
pnpm install
```

### Peer Dependency Warnings
- Usually safe to ignore
- Only matter if functionality breaks

### Version Conflicts
- Check pnpm-lock.yaml
- Delete node_modules and reinstall
- Use specific versions if needed

---

## License Information

All packages use permissive open-source licenses:
- **MIT License**: Most packages
- **Apache 2.0**: TensorFlow.js
- **BSD**: Some utilities

No GPL or restrictive licenses used.

---

**Last Updated:** March 20, 2026  
**Node Version:** 18.x or higher  
**Package Manager:** pnpm  
**Total Packages:** 72 (68 runtime + 4 dev)
