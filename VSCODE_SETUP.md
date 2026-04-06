# VS Code Setup Guide - Serverless Expense Tracker

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **pnpm** package manager - Install with:
   ```bash
   npm install -g pnpm
   ```
3. **VS Code** - [Download](https://code.visualstudio.com/)

### Installation Steps

1. **Clone or Open the Project**
   ```bash
   # If you haven't already, navigate to your project directory
   cd path/to/serverless-expense-tracker
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Development Server**
   ```bash
   pnpm dev
   ```

4. **Open in Browser**
   - The application will start at `http://localhost:5173`
   - Your browser should automatically open. If not, manually navigate to the URL.

## 🎯 VS Code Configuration

### Recommended Extensions

When you open this project in VS Code, you'll be prompted to install recommended extensions. Click "Install" to get:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind class autocomplete
- **ES7+ React/Redux Snippets** - React code snippets
- **Path Intellisense** - File path autocomplete
- **Auto Rename Tag** - Automatically rename paired HTML/JSX tags
- **Import Cost** - Display import sizes
- **IntelliCode** - AI-assisted coding
- **TypeScript Next** - Enhanced TypeScript support

### Workspace Settings

The project includes pre-configured VS Code settings (`.vscode/settings.json`) that:
- Formats code on save
- Enables Tailwind CSS IntelliSense
- Configures TypeScript support
- Sets up ESLint integration

## 🛠️ Available Commands

```bash
# Start development server with hot-reload
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

## 📁 Project Structure

```
serverless-expense-tracker/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable components
│   │   │   ├── ui/             # UI components (buttons, cards, etc.)
│   │   │   ├── AddExpenseDialog.tsx
│   │   │   ├── AIInsights.tsx
│   │   │   ├── CurrencyPrediction.tsx
│   │   │   ├── ExpenseList.tsx
│   │   │   ├── SpendingChart.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   └── StockPrediction.tsx
│   │   ├── lib/               # Utility libraries
│   │   │   ├── api.ts         # API functions
│   │   │   └── auth.ts        # Authentication
│   │   ├── pages/             # Page components
│   │   │   ├── Analytics.tsx
│   │   │   ├── Budgets.tsx
│   │   │   ├── CurrencyTrading.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── ScanReceipt.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── StockMarket.tsx
│   │   ├── App.tsx            # Main app component
│   │   └── routes.tsx         # Routing configuration
│   └── styles/                # Global styles
│       ├── fonts.css
│       ├── index.css
│       ├── tailwind.css
│       └── theme.css
├── .vscode/                   # VS Code workspace settings
├── package.json
├── vite.config.ts            # Vite configuration
└── tsconfig.json             # TypeScript configuration
```

## 🎨 Features

### Core Features
- ✅ **Expense Tracking** - Add, edit, delete expenses in Indian Rupees (₹)
- 🤖 **AI-Powered Categorization** - Automatic expense categorization
- 📊 **Analytics Dashboard** - Visual spending insights
- 💰 **Budget Management** - Set and track budgets by category
- 📸 **Receipt Scanner** - OCR-powered receipt scanning with camera/upload
- 👤 **User Authentication** - Secure login and profile management

### Advanced Features
- 📈 **Stock Market Integration** - Real-time stock prices with ML predictions
- 💱 **Currency Trading Platform** - Forex rates with AI-powered predictions
- 🔮 **Deep Learning Models** - TensorFlow.js powered predictions
- ⏰ **Real-time Updates** - Live price updates every few seconds
- 📱 **Responsive Design** - Works on all devices

## 🎮 Debugging in VS Code

### Launch Configurations

Press `F5` or go to Run > Start Debugging to debug in:
- **Chrome** - Opens application in Chrome with debugger attached
- **Edge** - Opens application in Edge with debugger attached

### Breakpoint Debugging

1. Set breakpoints by clicking the left margin in your code
2. Press `F5` to start debugging
3. Application will pause at breakpoints
4. Use debug controls to step through code

## 🔧 Troubleshooting

### Port Already in Use

If port 5173 is already in use:
```bash
# Kill the process using the port (Linux/Mac)
lsof -ti:5173 | xargs kill -9

# Or specify a different port
pnpm dev -- --port 3000
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### TypeScript Errors

```bash
# Reload VS Code window
# Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
# Type: "Reload Window"
```

### Camera Not Working

The receipt scanner requires camera permissions:
- **Browser**: Grant camera access when prompted
- **HTTPS**: Camera API works on localhost or HTTPS only

## 🌐 Environment Variables

Create a `.env` file in the root directory for environment-specific configuration:

```env
# Supabase Configuration (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys (if needed)
VITE_API_KEY=your_api_key
```

## 📝 Code Style

The project uses:
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **ESLint** for code quality
- **Prettier** for code formatting

Format all files:
```bash
npx prettier --write .
```

## 🚦 Production Build

Build for production:
```bash
pnpm build
```

Preview production build:
```bash
pnpm preview
```

The optimized build will be in the `dist/` directory.

## 📚 Technology Stack

- **Frontend Framework**: React 18.3.1
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4.1.12
- **UI Components**: Radix UI + Custom Components
- **Routing**: React Router 7.13.0
- **Charts**: Recharts 2.15.2
- **ML/AI**: TensorFlow.js 4.22.0
- **OCR**: Tesseract.js 7.0.0
- **Camera**: react-webcam 7.2.0
- **Forms**: React Hook Form 7.55.0
- **State Management**: React Hooks
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Material UI**: @mui/material 7.3.5

## 🎯 Key Components

### Receipt Scanner (`ScanReceipt.tsx`)
- Camera integration with permission handling
- File upload support
- OCR text extraction
- Automatic data parsing
- Category and payment method detection

### Stock Prediction (`StockPrediction.tsx`)
- Real-time stock price updates
- ML-powered price predictions
- Buy/sell functionality
- Historical data visualization

### Currency Trading (`CurrencyPrediction.tsx`)
- Live forex rates
- AI prediction models
- Currency conversion
- Trading platform

### Expense Management
- AI-powered auto-categorization
- Multi-currency support (₹ Indian Rupees)
- Tag and location tracking
- Payment method tracking

## 💡 Tips for Development

1. **Hot Reload**: Changes are reflected instantly
2. **Console Logs**: Check browser console for debugging
3. **React DevTools**: Install React DevTools extension
4. **Component Props**: Use TypeScript for prop type safety
5. **Tailwind Classes**: Use IntelliSense for class suggestions

## 🤝 Contributing

When making changes:
1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Format code with Prettier
5. Commit with descriptive messages

## 📞 Support

For issues or questions:
- Check browser console for errors
- Review Vite/React documentation
- Check component TypeScript types
- Review API integration in `/src/app/lib/api.ts`

---

**Happy Coding! 🎉**

Built with ❤️ using React, Vite, and Tailwind CSS
