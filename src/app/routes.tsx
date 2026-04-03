import { createBrowserRouter, Navigate } from "react-router";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Budgets from "./pages/Budgets";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import StockMarket from "./pages/StockMarket";
import CurrencyTrading from "./pages/CurrencyTrading";
import CryptoMarket from "./pages/CryptoMarket";
import ScanReceipt from "./pages/ScanReceipt";
import WalletTracker from "./pages/WalletTracker";
import SMSParser from "./pages/SMSParser";
import QRGenerator from "./pages/QRGenerator";
import Webhooks from "./pages/Webhooks";
import Login from "./pages/Login";
import Root from "./pages/Root";
import { auth } from "./lib/auth";

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = auth.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Root />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "analytics", Component: Analytics },
      { path: "budgets", Component: Budgets },
      { path: "stocks", Component: StockMarket },
      { path: "currency", Component: CurrencyTrading },
      { path: "crypto", Component: CryptoMarket },
      { path: "wallets", Component: WalletTracker },
      { path: "sms-parser", Component: SMSParser },
      { path: "scan-receipt", Component: ScanReceipt },
      { path: "qr-generator", Component: QRGenerator },
      { path: "automations", Component: Webhooks },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
    ],
  },
]);