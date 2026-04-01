import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isTokenSessionValid } from '../utils/authVehicle';

const ProtectedRoute = ({ children, redirectTo = '/', allowWithStateKey = null }) => {
  const location = useLocation();
  const hasValidSession = isTokenSessionValid();
  const hasAllowedState = allowWithStateKey && location.state?.[allowWithStateKey];

  console.log(
    'ProtectedRoute: checking access...',
    hasValidSession ? 'Authenticated' : hasAllowedState ? 'Allowed by route state' : 'Denied'
  );

  if (!hasValidSession && !hasAllowedState) {
    localStorage.removeItem('token');
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
