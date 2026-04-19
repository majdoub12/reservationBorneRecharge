import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import './styles/AppSidebar.css';
import { getVehicleFromToken } from '../utils/authVehicle';
import { getStoredTheme, applyTheme } from '../utils/theme';

const AppSidebar = () => {
    const navigate = useNavigate();
    const tokenVehicle = getVehicleFromToken();
    const [vehicle, setVehicle] = useState(tokenVehicle);
    const [theme, setTheme] = useState(getStoredTheme());

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme, true);
    };

    useEffect(() => {
        const syncTheme = (e) => setTheme(e.detail);
        window.addEventListener('theme-changed', syncTheme);
        return () => window.removeEventListener('theme-changed', syncTheme);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const hydrateVehicle = async () => {
            if (!tokenVehicle?.id) {
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/auth/contacts/${tokenVehicle.id}`);
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                if (!isMounted) {
                    return;
                }

                setVehicle((current) => ({
                    ...current,
                    matricule: data.plate || current?.matricule || tokenVehicle.matricule,
                    model: data.model || current?.model || tokenVehicle.model || null,
                    payload: {
                        ...current?.payload,
                        plate: data.plate,
                        vin: data.vin,
                        model: data.model
                    }
                }));
            } catch (error) {
                console.error('Error hydrating vehicle in sidebar:', error);
            }
        };

        hydrateVehicle();

        return () => {
            isMounted = false;
        };
    }, [tokenVehicle?.id, tokenVehicle?.matricule, tokenVehicle?.model]);

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
                <div className="app-sidebar-logo-wrap" aria-hidden="true">
                    <img className="app-sidebar-logo" src="/Tesla.png" alt="" />
                </div>
                <div className="app-sidebar-brand-copy">
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
                <button 
                  className="app-sidebar-theme-toggle" 
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                {vehicle?.matricule && <div className="app-sidebar-chip">{vehicle.matricule}</div>}
                <button className="app-sidebar-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default AppSidebar;
