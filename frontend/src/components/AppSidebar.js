import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Menu,
  Moon,
  Sun,
  X,
  LogOut,
  CarFront,
} from 'lucide-react';
import './styles/AppSidebar.css';
import { getVehicleFromToken } from '../utils/authVehicle';
import { getStoredTheme, applyTheme } from '../utils/theme';

const navItems = [
  { to: '/reservation', label: 'Reservation' },
  { to: '/active-reservations', label: 'Active reservations' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/settings', label: 'Settings' },
  { to: '/charging-visualization', label: 'Charging' }
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const tokenVehicle = getVehicleFromToken();
  const [vehicle, setVehicle] = useState(tokenVehicle);
  const [theme, setTheme] = useState(getStoredTheme());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  useEffect(() => {
    const syncTheme = (event) => setTheme(event.detail);
    const handleScroll = () => setScrolled(window.scrollY > 12);

    window.addEventListener('theme-changed', syncTheme);
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('theme-changed', syncTheme);
      window.removeEventListener('scroll', handleScroll);
    };
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
        console.error('Error hydrating vehicle in navbar:', error);
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
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`app-navbar ${scrolled ? 'is-scrolled' : ''}`}
    >
      <div className="app-navbar-inner">
        <button
          type="button"
          className="app-navbar-brand"
          onClick={() => navigate('/reservation')}
        >
          <span className="app-navbar-logo-wrap" aria-hidden="true">
            <img className="app-navbar-logo" src="/Tesla.png" alt="" />
          </span>

          <span className="app-navbar-brand-copy">
            <strong>Tesla Charge</strong>
            <span>Driver workspace</span>
          </span>
        </button>

        <nav className="app-navbar-links" aria-label="App navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-navbar-link ${isActive ? 'active' : ''}`}
              onClick={closeMobile}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-navbar-actions">
          <button
            type="button"
            className="app-navbar-icon-button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {vehicle?.matricule && (
            <div className="app-navbar-chip" title={vehicle?.model ? `${vehicle.model} - ${vehicle.matricule}` : vehicle.matricule}>
              <CarFront size={14} />
              <span>{vehicle.matricule}</span>
            </div>
          )}

          <button type="button" className="app-navbar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>

          <button
            type="button"
            className="app-navbar-menu"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="app-navbar-mobile"
          >
            <div className="app-navbar-mobile-links">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `app-navbar-mobile-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="app-navbar-mobile-actions">
              <button type="button" className="app-navbar-mobile-theme" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
              </button>

              <button type="button" className="app-navbar-mobile-logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default AppSidebar;
