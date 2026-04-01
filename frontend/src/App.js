import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
        <AnimatedRoutes />
      </TooltipProvider>
    </BrowserRouter>
  );
}

const routeMotionProps = {
  initial: { opacity: 0, y: 10, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.995 },
  transition: { duration: 0.24, ease: 'easeOut' },
};

const PageTransition = ({ children }) => (
  <motion.main className="page-shell" {...routeMotionProps}>
    {children}
  </motion.main>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/tunisian-auth" element={<PageTransition><TunisianAuth /></PageTransition>} />
        <Route path="/verify-otp" element={<PageTransition><OTPVerification /></PageTransition>} />
        <Route path="/auth/foreign" element={<PageTransition><ForeignAuth /></PageTransition>} />
        <Route path="/verify-foreign-otp" element={<PageTransition><ForeignOTPVerification /></PageTransition>} />

        <Route
          path="/reservation"
          element={
            <PageTransition>
              <ProtectedRoute redirectTo="/tunisian-auth">
                <Reservation />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/active-reservations"
          element={
            <PageTransition>
              <ProtectedRoute redirectTo="/tunisian-auth">
                <ActiveReservations />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/invoices"
          element={
            <PageTransition>
              <ProtectedRoute redirectTo="/tunisian-auth">
                <Invoices />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <ProtectedRoute redirectTo="/tunisian-auth" allowWithStateKey="vehicleId">
                <Settings />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/charging-visualization"
          element={
            <PageTransition>
              <ProtectedRoute redirectTo="/tunisian-auth" allowWithStateKey="vehicleId">
                <ChargingVisualizationPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
