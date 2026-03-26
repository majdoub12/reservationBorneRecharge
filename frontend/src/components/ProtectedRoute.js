import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, redirectTo = '/', allowWithStateKey = null }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const hasAllowedState = allowWithStateKey && location.state?.[allowWithStateKey];

  console.log(
    'ProtectedRoute: checking access...',
    token ? 'Authenticated' : hasAllowedState ? 'Allowed by route state' : 'Denied'
  );

  if (!token && !hasAllowedState) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
