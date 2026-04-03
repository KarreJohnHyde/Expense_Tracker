# Serverless Expense Tracker

## 🚀 Quick Start for VS Code

**NEW!** Complete VS Code setup guides available:

- 📖 **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- 💻 **[VS Code Setup](README_VSCODE.md)** - Complete VS Code guide with shortcuts
- 📚 **[Detailed Setup](VSCODE_SETUP.md)** - Comprehensive installation & configuration
- 🔧 **[Troubleshooting](TROUBLESHOOTING.md)** - Solutions to common issues

### Installation (3 steps)

```bash
# 1. Install dependencies
pnpm install

# 2. Start development server
pnpm dev

# 3. Open browser
# Go to http://localhost:5173
```

That's it! 🎉

---

## Mobile HTTPS Dev (Camera + Voice)

Modern mobile browsers require HTTPS to grant camera/microphone access. Use the tunnel scripts to expose a secure URL.

```bash
# 1. Add your ngrok token to .env
NGROK_AUTHTOKEN=your_token_here

# 2. Start dev server + HTTPS tunnel (one command)
pnpm dev:tunnel

# Or run separately:
# pnpm dev:host
# pnpm tunnel
```

Open the printed HTTPS URL on your phone and use the app features that request camera or voice access.

## Overview
A production-ready, serverless expense tracking application with AI/ML capabilities built following AWS serverless architecture principles (Lambda + DynamoDB + API Gateway equivalent using Supabase).

**Now with Authentication, User Profiles, Bank Account Management, and Real-Time Stock Market Trading!**

## Architecture

### Serverless Backend
- **Compute**: Supabase Edge Functions (Deno-based serverless functions, equivalent to AWS Lambda)
- **Database**: PostgreSQL with KV Store (Document-style NoSQL, similar to DynamoDB)
- **API Gateway**: RESTful API with full CRUD operations
- **Authentication**: Email/Password authentication with session management
- **Storage**: Supabase Storage for receipts and documents

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7 (Data Mode) with protected routes
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **State Management**: React Hooks + LocalStorage
- **Charts**: Recharts for data visualization

### AI/ML Features
- **TensorFlow.js**: Client-side machine learning
- **Smart Categorization**: Automatic expense category detection
- **Budget Predictions**: ML-based spending forecasts
- **Pattern Recognition**: Unusual spending detection
- **OCR**: Receipt text extraction (Tesseract.js)
- **Stock Analysis**: Real-time market trend analysis

## Features

### 🔐 Authentication & User Management
✅ **Complete Authentication System**
- Email and password signup/login
- Username and full name support
- Protected routes with automatic redirect
- Session persistence with localStorage
- Secure logout functionality
- Demo account for quick testing

### 👤 User Profile Management
✅ **Comprehensive Profile Page**
- Personal information display
- User ID and account details
- Account creation date tracking
- Verification status badges
- Account statistics dashboard

### 🏦 Bank Account Management
✅ **Multi-Account Financial System**
- Add unlimited bank accounts
- Support for multiple account types:
  - Savings Account
  - Current Account
  - Credit Card
  - Debit Card
  - UPI
  - Net Banking
- Complete account details:
  - Account numbers
  - IFSC codes
  - UPI IDs
  - Card numbers (with masking)
  - CVV (encrypted display)
  - Expiry dates
- Balance tracking per account
- Default account selection
- Secure card number visibility toggle
- Account deletion with confirmation

### 📈 Stock Market Trading
✅ **Real-Time Stock Market Integration**
- **Live Market Data**: Real-time price updates every 3 seconds
- **12+ Indian Stocks**: TCS, Infosys, Reliance, HDFC Bank, and more
- **Sector-Based Filtering**: 
  - Technology
  - Finance
  - Healthcare
  - Energy
  - Consumer Goods
  - Telecommunications
  - Automotive
  - Real Estate
- **Buy/Sell Operations**: 
  - Instant buy orders
  - Sell with profit/loss calculation
  - Quantity selection
  - Real-time total value calculation
- **Portfolio Management**:
  - Track all holdings
  - Average buy price calculation
  - Current value monitoring
  - P&L tracking (Profit & Loss)
  - Percentage returns
- **Live Charts**: Intraday price movement visualization
- **Stock Details**:
  - Current price
  - Day high/low
  - Opening price
  - Market cap
  - Trading volume
  - Price change percentage
- **Search & Filter**: Quick stock discovery

### Core Functionality
✅ **Complete CRUD Operations**
- Create expenses with multiple fields
- Read/List expenses with pagination
- Update existing expenses
- Delete expenses with confirmation

✅ **Advanced Filtering & Search**
- Real-time search across descriptions and categories
- Filter by category, date range, payment method
- Multi-criteria filtering
- Results counter

✅ **Data Export**
- Export to CSV format
- Export to JSON format
- Filtered data export
- Date-stamped file names

### Analytics & Insights
✅ **Visual Analytics**
- Category breakdown pie charts
- Weekly spending trends
- Daily spending bar charts
- Payment method distribution
- Stock portfolio charts

✅ **AI-Powered Insights**
- Spending pattern analysis
- Budget recommendations
- Anomaly detection
- Predictive analytics
- Investment suggestions

### Budget Management
✅ **Budget Tracking**
- Category-wise budgets
- Progress indicators
- Alert thresholds
- Monthly reset capability

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/user` - Get current user

### Expenses
- `GET /make-server-8d54d463/expenses` - List all expenses
- `POST /make-server-8d54d463/expenses` - Create new expense
- `PUT /make-server-8d54d463/expenses/:id` - Update expense
- `DELETE /make-server-8d54d463/expenses/:id` - Delete expense

### Analytics
- `GET /make-server-8d54d463/analytics` - Get analytics data
- `GET /make-server-8d54d463/ai-insights` - Get AI insights

### Budgets
- `GET /make-server-8d54d463/budgets` - List budgets
- `POST /make-server-8d54d463/budgets` - Create budget
- `PUT /make-server-8d54d463/budgets/:id` - Update budget
- `DELETE /make-server-8d54d463/budgets/:id` - Delete budget

### Stock Market
- `GET /api/stocks` - Get all stocks with live prices
- `GET /api/stocks/:id` - Get specific stock details
- `POST /api/stocks/buy` - Execute buy order
- `POST /api/stocks/sell` - Execute sell order
- `GET /api/portfolio` - Get user portfolio

### Bank Accounts
- `GET /api/accounts` - List user bank accounts
- `POST /api/accounts` - Add new bank account
- `DELETE /api/accounts/:id` - Remove bank account

### Data Management
- `GET /make-server-8d54d463/export` - Export all data

## Technology Stack

### Backend
- Deno (Serverless Runtime)
- Hono (Web Framework)
- Supabase Client
- PostgreSQL

### Frontend
- React 18.3
- TypeScript
- Tailwind CSS 4
- React Router 7
- Recharts
- TensorFlow.js
- Tesseract.js

### Development
- Vite 6 (Build Tool)
- pnpm (Package Manager)

## Currency
All amounts are in Indian Rupees (₹).

## Data Storage
Uses Supabase KV Store (key-value storage) + LocalStorage with the following structure:
- `user:{id}` - User profile data
- `expense:{id}` - Individual expense records
- `budget:{id}` - Budget records
- `account:{id}` - Bank account records
- `portfolio:{userId}` - Stock portfolio data
- `settings:user` - User preferences

## Security
- HTTPS encryption in transit
- Environment-based configuration
- Serverless architecture (no server to maintain)
- Secure API authentication
- Password hashing (in production)
- Card number masking
- Encrypted sensitive data display
- Protected routes
- Session management
- No third-party data sharing

## Responsive Design
✅ **Multi-Device Support**
- 📱 Mobile phones (iOS & Android)
- 📲 iPhones (all sizes)
- 💻 Desktops (Windows & Mac)
- 🖥️ MacBooks (all screen sizes)
- Tablet optimization
- Adaptive layouts
- Touch-friendly interfaces
- Mobile-first navigation

## Serverless Benefits
1. **No Server Management**: Fully managed infrastructure
2. **Auto-Scaling**: Scales automatically with usage
3. **Pay-per-Use**: Cost-effective serverless pricing
4. **High Availability**: Built-in redundancy
5. **Fast Deployment**: Instant updates with edge functions
6. **Global Distribution**: Edge network deployment

## Quick Start

### Demo Account
- Email: `demo@expense-tracker.com`
- Password: `demo123`

Or create your own account with:
- Full name
- Username
- Email
- Password

## User Journey

1. **Authentication**: Sign up or login
2. **Profile Setup**: Add your bank accounts and payment methods
3. **Expense Tracking**: Record daily expenses
4. **Budget Planning**: Set category-wise budgets
5. **Stock Trading**: Invest in stock market
6. **Analytics**: View insights and reports
7. **Portfolio Management**: Track investments and returns
8. **Data Export**: Download your financial data

## Future Enhancements
- Real stock market API integration (NSE/BSE)
- Cryptocurrency trading support
- Multi-currency wallet
- Automated expense categorization via ML
- Receipt photo upload with OCR
- Recurring expenses automation
- Expense sharing between users
- Mobile app (React Native)
- Email/SMS notifications
- Bank account sync via API
- Tax calculation and reporting
- Investment recommendations
- Bill payment reminders
- Credit score tracking

## Project Structure
```
/
├── src/
│   ├── app/
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/           # Utilities, API client, and auth
│   │   ├── pages/         # Route pages
│   │   │   ├── Login.tsx       # Authentication page
│   │   │   ├── Dashboard.tsx   # Main dashboard
│   │   │   ├── Profile.tsx     # User profile & accounts
│   │   │   ├── StockMarket.tsx # Stock trading
│   │   │   ├── Analytics.tsx   # Analytics & reports
│   │   │   ├── Budgets.tsx     # Budget management
│   │   │   └── Settings.tsx    # App settings
│   │   ├── routes.tsx     # Router configuration
│   │   └── App.tsx        # Main app component
│   └── styles/           # Global styles
├── supabase/
│   └── functions/
│       └── server/        # Edge functions (serverless backend)
└── public/               # Static assets
```

## AWS Serverless Architecture Equivalent

This project demonstrates AWS serverless architecture using Supabase:

| AWS Service | Supabase Equivalent | Usage |
|------------|---------------------|-------|
| Lambda | Edge Functions | Serverless compute |
| DynamoDB | PostgreSQL + KV Store | NoSQL database |
| API Gateway | Auto-generated REST API | API management |
| Cognito | Supabase Auth | User authentication |
| S3 | Supabase Storage | File storage |
| CloudWatch | Supabase Logs | Monitoring |

## Development
This application demonstrates a complete serverless backend implementation similar to AWS Lambda + DynamoDB + API Gateway architecture, but using Supabase's serverless stack.

## License
MIT

## Portfolio Note
This project showcases:
- ✅ Full-stack serverless development
- ✅ RESTful API design
- ✅ Real-time data processing
- ✅ AI/ML integration
- ✅ Modern React patterns
- ✅ TypeScript proficiency
- ✅ UI/UX design skills
- ✅ Data visualization
- ✅ Cloud architecture understanding
- ✅ Authentication & authorization
- ✅ Financial application development
- ✅ Real-time stock market integration
- ✅ Multi-device responsive design
- ✅ State management
- ✅ Security best practices

---

**Built with ❤️ using serverless technologies**
