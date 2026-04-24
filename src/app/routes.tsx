import { createBrowserRouter, Navigate } from "react-router";
import { Suspense, lazy } from "react";
import React from "react";
import Root from "./pages/Root";
import ErrorPage from "./pages/ErrorPage";
import { auth } from "./lib/auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const StockMarket = lazy(() => import("./pages/StockMarket"));
const CurrencyTrading = lazy(() => import("./pages/CurrencyTrading"));
const CryptoMarket = lazy(() => import("./pages/CryptoMarket"));
const ScanReceipt = lazy(() => import("./pages/ScanReceipt"));
const OcrPipeline = lazy(() => import("./pages/OcrPipeline"));
const WalletTracker = lazy(() => import("./pages/WalletTracker"));
const SMSParser = lazy(() => import("./pages/SMSParser"));
const QRGenerator = lazy(() => import("./pages/QRGenerator"));
const Webhooks = lazy(() => import("./pages/Webhooks"));
const Login = lazy(() => import("./pages/Login"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const ReconciliationView = lazy(() => import("./pages/ReconciliationView"));
const About = lazy(() => import("./pages/About"));

function RouteFallback() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function withRouteLoader(element: React.ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

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
    element: withRouteLoader(<Login />),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Root />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: withRouteLoader(<Dashboard />) },
      { path: "subscriptions", element: withRouteLoader(<Subscriptions />) },
      { path: "analytics", element: withRouteLoader(<Analytics />) },
      { path: "budgets", element: withRouteLoader(<Budgets />) },
      { path: "stocks", element: withRouteLoader(<StockMarket />) },
      { path: "currency", element: withRouteLoader(<CurrencyTrading />) },
      { path: "crypto", element: withRouteLoader(<CryptoMarket />) },
      { path: "wallets", element: withRouteLoader(<WalletTracker />) },
      { path: "sms-parser", element: withRouteLoader(<SMSParser />) },
      { path: "scan-receipt", element: withRouteLoader(<ScanReceipt />) },
      { path: "ocr-pipeline", element: withRouteLoader(<OcrPipeline />) },
      { path: "gallery", element: withRouteLoader(<Gallery />) },
      { path: "qr-generator", element: withRouteLoader(<QRGenerator />) },
      { path: "reconciliation", element: withRouteLoader(<ReconciliationView />) },
      { path: "automations", element: withRouteLoader(<Webhooks />) },
      { path: "profile", element: withRouteLoader(<Profile />) },
      { path: "about", element: withRouteLoader(<About />) },
      { path: "settings", element: withRouteLoader(<Settings />) },
    ],
  },
]);
