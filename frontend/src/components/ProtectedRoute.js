import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isTokenSessionValid } from '../utils/authVehicle';

const ProtectedRoute = ({ children, redirectTo = '/', allowWithStateKey = null }) => {
  const location = useLocation();
  const hasValidSession = isTokenSessionValid();
  const hasAllowedState = allowWithStateKey && location.state?.[allowWithStateKey];

  if (!hasValidSession && !hasAllowedState) {
    // ✅ Clear all auth data including vehicleId
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('vehicleId');
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;