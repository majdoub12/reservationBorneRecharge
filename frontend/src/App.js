import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Home from './pages/Home';
import TunisianAuth from './pages/authentication/TunisianAuth';
import OTPVerification from './pages/authentication/OTPVerification';
import ForeignAuth from './pages/authentication/ForeignAuth';
import ForeignOTPVerification from './pages/authentication/ForeignOTPVerification';
import Settings from './pages/Settings';
import ChargingVisualizationPage from './pages/Chargingvisualizationpage';

// other pages will come later

import ProtectedRoute from './components/ProtectedRoute';
import Reservation from './pages/Reservation';
import ActiveReservations from './pages/ActiveReservations';
import Invoices from './pages/Invoices';
import { initializeTheme } from './utils/theme';

import { Toaster as Sonner } from "./components/ui/sonner.js";
import { Toaster } from "./components/ui/toaster.js";
import { TooltipProvider } from "./components/ui/tooltip.js";
import Home from "./pages/Home.js";
import NotFound from "./pages/NotFound.js";

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tunisian-auth" element={<TunisianAuth />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/auth/foreign" element={<ForeignAuth />} />
          <Route path="/verify-foreign-otp" element={<ForeignOTPVerification />} />

          {/* Protected Routes */}
          <Route
            path="/reservation"
            element={
              <ProtectedRoute>
                <Reservation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/active-reservations"
            element={
              <ProtectedRoute>
                <ActiveReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute redirectTo="/tunisian-auth" allowWithStateKey="vehicleId">
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charging-visualization"
            element={
              <ProtectedRoute redirectTo="/tunisian-auth" allowWithStateKey="vehicleId">
                <ChargingVisualizationPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
