import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import {
  ArrowRight,
  ChevronDown,
  Zap,
} from "lucide-react";
import darkHeroImage from "../../assets/premium-dark-hero.png";
import lightHeroImage from "../../assets/Light Mode Image.jpeg";
import { getStoredTheme } from "../../utils/theme";

const HeroSection = ({ onReserve }) => {
  const [theme, setTheme] = useState(getStoredTheme());

  useEffect(() => {
    const handleThemeChange = (e) => setTheme(e.detail);
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      {/* Background & Gradients */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="w-full h-full"
        >
          <img
            src={theme === 'light' ? lightHeroImage : darkHeroImage}
            alt="Cinematic Tesla charging experience"
            className={`h-full w-full object-cover transition-all duration-1000 ${theme === "light"
                ? "brightness-[0.95] contrast-[1.1] saturate-[1.1]"
                : "brightness-[0.85] contrast-[1.05] saturate-[1.05]"
              }`}
            width={1920}
            height={1080}
          />
        </motion.div>

        {/* Left-to-right fade for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
        <div className={`absolute inset-0 bg-gradient-to-b transition-all duration-700 ${theme === 'light'
            ? 'from-black/20 via-transparent to-background/90'
            : 'from-transparent via-transparent to-background/70'
          }`} />
      </div>

      {/* Left-aligned content — vertically centered with slight upward offset */}
      <div className="relative z-10 flex min-h-screen items-center justify-start px-8 sm:px-16 md:px-24">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex max-w-lg flex-col items-start text-left -mt-16"
        >
          {/* Tesla Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-6 flex items-center gap-3"
          >
            {/* Tesla "T" Shield Icon */}
            <svg viewBox="0 0 342 512" className="h-8 w-auto fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" xmlns="http://www.w3.org/2000/svg">
              <path d="M171 0C76.9 0 0 76.9 0 171c0 73.8 47.1 137 113.7 160.3L171 512l57.3-180.7C295 307 342 243.8 342 171 342 76.9 265.1 0 171 0zm0 48.2c16.7 0 32.8 2.7 47.9 7.7C189.6 67.2 171 82 171 82s-18.6-14.8-47.9-26.1c15.1-5 31.2-7.7 47.9-7.7zM54.6 88.3C85 100.8 171 136 171 136S257 100.8 287.4 88.3C310.6 109.1 326 139.3 326 171c0 8.4-.9 16.6-2.6 24.5C295.4 185.8 247 175 171 175s-124.4 10.8-152.4 20.5C16.9 187.6 16 179.4 16 171c0-31.7 15.4-61.9 38.6-82.7z" />
            </svg>

            {/* Wordmark */}
            <span
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.45em" }}
              className="text-sm font-semibold uppercase text-white/70"
            >
              TESLA CHARGE
            </span>

            {/* Divider */}
            <div className="h-4 w-px bg-white/20" />

            <span
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.3em" }}
              className="text-[10px] uppercase text-primary/80 font-medium"
            >
              Supercharger Network
            </span>
          </motion.div>

          {/* Main Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mb-8"
          >
            <h2
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}
              className="mb-3 text-3xl font-light leading-tight text-white/90 sm:text-4xl md:text-[2.6rem]"
            >
              Reserve your charge.{" "}
              <br />
              <span
                style={{ letterSpacing: "-0.02em" }}
                className="font-extrabold text-white"
              >
                Own the road.
              </span>
            </h2>
            <div className="mb-4 h-px w-16 bg-primary/60" />
            <p
              style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em" }}
              className="text-sm leading-[1.9] text-white/45 sm:text-[0.95rem]"
            >
              Seamless identity validation.
              <br />
              Next-generation charging infrastructure.
              <br />
              Cinematic reservation workflows.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <Button
              variant="hero"
              size="xl"
              onClick={onReserve}
              className="h-14 min-w-[240px] rounded-md px-10 text-sm uppercase tracking-[0.2em] font-bold shadow-[0_0_30px_rgba(0,255,240,0.25)] hover:shadow-[0_0_50px_rgba(0,255,240,0.45)] border border-primary/40 relative overflow-hidden group backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Zap className="h-4 w-4 mr-2 group-hover:animate-bounce" />
              Reserve Now
            </Button>
            <Button
              variant="ghost"
              onClick={scrollToFeatures}
              className="h-14 min-w-[200px] rounded-md px-10 text-sm uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300"
            >
              Explore
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        onClick={scrollToFeatures}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 transition-colors hover:text-white group"
      >
        <span className="text-[9px] font-bold tracking-[0.5em] uppercase text-white/25 group-hover:text-white/50 transition-colors">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default HeroSection;
