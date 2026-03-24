import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const handleReservation = () => {
    navigate('/tunisian-auth');
  };

  return (
    <div className="home-page-container">
      <nav className="home-nav">
        <div className="brand-logo">
          <span className="brand-mark" />
          Tesla Charge ID
        </div>
        <div className="nav-links">
          <button
            className="nav-link-button"
            onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Experience
          </button>
          <button className="btn-secondary-outline" onClick={handleReservation}>
            Start reservation
          </button>
        </div>
      </nav>

      <header className="hero-section">
        <div className="hero-content">
          <div className="badge-pill">Tesla-inspired charging reservation platform</div>
          <h1 className="hero-title">
            Reserve charging with
            <br />
            <span className="text-highlight">cinematic precision.</span>
          </h1>
          <p className="hero-subtitle">
            A futuristic identity flow for EV drivers: vehicle verification, secure OTP delivery,
            and contact management wrapped in a premium 3D interface built to stand out.
          </p>
          <div className="hero-actions">
            <button className="btn-primary-large" onClick={handleReservation}>
              Launch reservation flow
            </button>
            <button
              className="btn-text"
              onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore the concept
            </button>
          </div>
          <div className="hero-metrics">
            <div className="metric-chip">
              <strong>3 steps</strong>
              <span>Identify, validate, reserve</span>
            </div>
            <div className="metric-chip">
              <strong>Dual flows</strong>
              <span>Tunisian and foreign vehicle support</span>
            </div>
            <div className="metric-chip">
              <strong>JWT secured</strong>
              <span>Protected dashboard and contacts</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="energy-orb orb-one" />
          <div className="energy-orb orb-two" />
          <div className="hero-scene">
            <div className="scene-platform" />
            <div className="scene-ring scene-ring-one" />
            <div className="scene-ring scene-ring-two" />
            <div className="tesla-station">
              <div className="station-glow" />
              <div className="station-arch">
                <span>T</span>
              </div>
              <div className="station-core" />
              <div className="station-base" />
              <div className="charging-cable" />
            </div>
            <div className="car-model">
              <div className="car-top" />
              <div className="car-body" />
              <div className="car-window" />
              <div className="car-light left" />
              <div className="car-light right" />
              <div className="wheel wheel-left" />
              <div className="wheel wheel-right" />
            </div>
            <div className="scene-panel scene-panel-left">
              <span className="scene-label">Vehicle ID</span>
              <strong>Plate + VIN</strong>
              <p>Fast lookup and OCR fallback.</p>
            </div>
            <div className="scene-panel scene-panel-right">
              <span className="scene-label">Secure route</span>
              <strong>OTP + Contact control</strong>
              <p>Designed for trust, speed, and wow factor.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="features-section" id="experience">
        <div className="section-heading">
          <span>Why it feels different</span>
          <h2>The app behaves like a premium charging experience, not a generic form.</h2>
        </div>
        <div className="feature-card">
          <div className="feature-icon">01</div>
          <h3 className="feature-title">Spatial 3D storytelling</h3>
          <p className="feature-desc">
            Layered depth, soft reflections, floating rails, and energy halos create a memorable first impression.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">02</div>
          <h3 className="feature-title">Trust-first identity flow</h3>
          <p className="feature-desc">
            Every state uses clear hierarchy, guided steps, and visible security cues so users never feel lost.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">03</div>
          <h3 className="feature-title">Competition-level polish</h3>
          <p className="feature-desc">
            Responsive composition, bolder typography, and motion details make the project feel jury-ready.
          </p>
        </div>
      </section>

      <section className="showcase-section">
        <div className="showcase-copy">
          <span className="eyebrow">Flow architecture</span>
          <h2>One visual language across every step of the journey.</h2>
          <p>
            Landing, vehicle lookup, OTP verification, foreign request handling, contact management,
            and dashboard states now share the same metallic-glass atmosphere and electric accent system.
          </p>
        </div>
        <div className="showcase-grid">
          <div className="showcase-tile wide">
            <span>Charging lane</span>
            <strong>Dimensional onboarding</strong>
            <p>Hero visuals simulate a charging bay with perspective and soft neon energy.</p>
          </div>
          <div className="showcase-tile">
            <span>Security</span>
            <strong>OTP focus mode</strong>
            <p>Countdown urgency, tactile inputs, and concentrated layout.</p>
          </div>
          <div className="showcase-tile">
            <span>Operations</span>
            <strong>Contact control center</strong>
            <p>Manage email and WhatsApp access without breaking the visual identity.</p>
          </div>
        </div>
      </section>

      <section className="contact-section-modern">
        <div className="contact-container">
          <div className="contact-info">
            <span className="eyebrow">Support line</span>
            <h2 className="contact-heading">Ready for a juried demo.</h2>
            <p className="contact-subheading">
              The interface is now positioned like a concept product for Tesla charging reservations:
              memorable, clean, and clearly more ambitious than a standard admin flow.
            </p>
            <div className="contact-details">
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">support@idd.tn</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">+216 71 123 456</span>
              </div>
            </div>
          </div>

          <div className="contact-sculpture">
            <div className="sculpture-card sculpture-top">
              <span>Live reservation</span>
              <strong>Station Bay A12</strong>
            </div>
            <div className="sculpture-column" />
            <div className="sculpture-card sculpture-bottom">
              <span>Authentication</span>
              <strong>Vehicle + OTP complete</strong>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer-modern">
        <p>Copyright 2026 Tesla Charge ID concept. Crafted for standout presentation.</p>
      </footer>
    </div>
  );
}

export default Home;
