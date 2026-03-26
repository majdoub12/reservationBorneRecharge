import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TunisianAuth from './pages/authentication/TunisianAuth';
import OTPVerification from './pages/authentication/OTPVerification';
import ForeignAuth from './pages/authentication/ForeignAuth';
import ForeignOTPVerification from './pages/authentication/ForeignOTPVerification';
import ManageContacts from './pages/authentication/ManageContacts';

// other pages will come later

import ProtectedRoute from './components/ProtectedRoute';
import Reservation from './pages/Reservation';

function App() {
  return (
    <BrowserRouter>
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
          path="/manage-contacts"
          element={
            <ProtectedRoute redirectTo="/tunisian-auth" allowWithStateKey="vehicleId">
              <ManageContacts />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
