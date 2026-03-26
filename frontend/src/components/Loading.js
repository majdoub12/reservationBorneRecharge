import React from 'react';
import './Loading.css';

/**
 * A premium, full-screen loading component that matches the futuristic/cyberpunk
 * aesthetic of the EV Charging platform.
 */
const Loading = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-inner"></div>
          <div className="spinner-outer"></div>
          <div className="spinner-center"></div>
        </div>
        <h2 className="loading-text">Initializing Systems</h2>
        <div className="loading-progress-track">
          <div className="loading-progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
