import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TunisianAuth from './pages/TunisianAuth';
import OTPVerification from './pages/OTPVerification';
import ForeignAuth from './pages/ForeignAuth';
import ForeignOTPVerification from './pages/ForeignOTPVerification';
import ManageContacts from './pages/ManageContacts';

// other pages will come later

import ProtectedRoute from './components/ProtectedRoute';
import DashboardStub from './pages/DashboardStub';

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
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardStub />
            </ProtectedRoute>
          } 
        />
        <Route path="/manage-contacts" element={<ManageContacts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;