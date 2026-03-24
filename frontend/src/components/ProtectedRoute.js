import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('ProtectedRoute: checking token...', token ? 'Found' : 'Missing (Redirecting)');

  if (!token) {
    // Redirect to home or identification if no token
    return <Navigate to="/" replace />;
  }

  // Optional: Add logic to check if token is expired (requires decoding on frontend)
  
  return children;
};

export default ProtectedRoute;
