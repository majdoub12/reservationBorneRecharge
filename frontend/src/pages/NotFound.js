import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <div className="auth-background-grid" />
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />
      
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1 className="error-title">Destination Not Found</h1>
        <p className="error-description">
          The charging station or page you are looking for is offline, 
          out of range, or has been relocated in the digital grid.
        </p>
        
        <div className="error-actions">
          <button 
            className="btn-primary" 
            onClick={() => navigate('/')}
          >
            Return to Home Base
          </button>
        </div>
      </div>
      
      <div className="not-found-footer">
        <p>System Status: <span className="status-err">Anomaly Detected</span></p>
      </div>
    </div>
  );
};

export default NotFound;
