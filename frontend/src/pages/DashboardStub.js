import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardStub.css';

function DashboardStub() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="dashboard-stub">
      <div className="auth-background-grid" />
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />
      <div className="dashboard-card">
        <span className="dashboard-kicker">Protected session</span>
        <h1>Charging reservation dashboard</h1>
        <p>
          You are authenticated, your reservation flow is secured by JWT,
          and the app is ready for the next operational modules.
        </p>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </div>
  );
}

export default DashboardStub;
