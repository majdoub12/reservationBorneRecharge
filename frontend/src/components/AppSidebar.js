import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './styles/AppSidebar.css';
import { getVehicleFromToken } from '../utils/authVehicle';

const AppSidebar = () => {
    const navigate = useNavigate();
    const vehicle = getVehicleFromToken();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <aside className="app-sidebar">
            <div
                className="app-sidebar-brand"
                onClick={() => navigate('/reservation')}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        navigate('/reservation');
                    }
                }}
                role="button"
                tabIndex={0}
            >
                <span className="app-sidebar-mark" />
                <div>
                    <strong>Tesla Charge</strong>
                    <span>Driver workspace</span>
                </div>
            </div>

            <nav className="app-sidebar-links">
                <NavLink to="/reservation" className={({ isActive }) => `app-side-link ${isActive ? 'active' : ''}`}>
                    Reservation
                </NavLink>
                <NavLink
                    to="/active-reservations"
                    className={({ isActive }) => `app-side-link ${isActive ? 'active' : ''}`}
                >
                    Active Reservations
                </NavLink>
                <NavLink to="/invoices" className={({ isActive }) => `app-side-link ${isActive ? 'active' : ''}`}>
                    Invoices
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `app-side-link ${isActive ? 'active' : ''}`}>
                    Settings
                </NavLink>
            </nav>

            <div className="app-sidebar-footer">
                {vehicle?.matricule && <div className="app-sidebar-chip">{vehicle.matricule}</div>}
                <button className="app-sidebar-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default AppSidebar;
