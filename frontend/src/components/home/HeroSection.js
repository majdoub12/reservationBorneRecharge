import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import {
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  Zap,
} from "lucide-react";
import darkHeroImage from "../../assets/hero-charging.jpg";
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
            alt="Tesla charging at a futuristic station"
            className={`h-full w-full object-cover transition-all duration-700 ${
                theme === "light" 
                ? "brightness-[0.95] contrast-[1.1] saturate-[1.1] mix-blend-normal" 
                : "brightness-75 contrast-[1.1] saturate-[1.1]"
            }`}
            width={1920}
            height={1080}
            />
        </motion.div>
        <div className={`absolute inset-0 transition-opacity duration-700 ${
            theme === 'light'
            ? 'bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.08)_40%,rgba(0,0,0,0.2)_100%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(0,255,240,0.1)_0%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.9)_100%)]'
        }`} />
        <div className={`absolute inset-0 bg-gradient-to-b transition-all duration-700 ${
            theme === 'light'
            ? 'from-black/10 via-background/10 to-background/95'
            : 'from-background/30 via-background/60 to-background'
        }`} />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.1]" />

        
        {/* Animated Particles */}
        <motion.div 
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[15%] top-[25%] h-[400px] w-[400px] rounded-full bg-primary/20 blur-[140px]" 
        />
        <motion.div 
            animate={{ y: [0, 30, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-[10%] bottom-[20%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px]" 
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex w-full max-w-5xl flex-col items-center text-center"
        >
          <motion.div 
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.3, duration: 0.6 }}
             className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2.5 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,240,0.15)] group hover:bg-primary/20 transition-colors cursor-default"
          >
            <BatteryCharging className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(0,255,240,0.8)] animate-pulse" />
            <span className="text-xs font-bold tracking-[0.4em] uppercase text-primary/95">
              Next-Gen Precision
            </span>
          </motion.div>

          <p className="mb-6 text-sm font-semibold tracking-[0.6em] uppercase text-primary/70 sm:text-base">
            The extraordinary standard
          </p>

          <h1 className="font-display text-7xl font-extrabold leading-[0.82] tracking-tight text-foreground sm:text-8xl lg:text-[9rem]">
            <span className={`block transition-colors duration-700 ${theme === 'light' ? 'text-foreground' : 'text-white/95'} drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>POWER</span>
            <span className="block text-gradient-cyan glow-text mt-2">UNLIMITED</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground/90 sm:text-lg lg:text-[1.4rem] font-medium opacity-90">
            A symphonic blend of speed, seamless identity validation, and cinematic reservation workflows.
          </p>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5, duration: 0.6 }}
             className="mt-12 flex w-full flex-col gap-6 sm:w-auto sm:flex-row sm:items-center"
          >
            <Button
              variant="hero"
              size="xl"
              onClick={onReserve}
              className="h-16 min-w-[280px] rounded-lg px-10 text-lg uppercase tracking-[0.15em] font-bold shadow-[0_0_40px_rgba(0,255,240,0.3)] hover:shadow-[0_0_60px_rgba(0,255,240,0.5)] border border-primary/50 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Zap className="h-5 w-5 mr-3 group-hover:animate-bounce" />
              Reserve Now
            </Button>
            <Button
              variant="heroOutline"
              size="xl"
              onClick={scrollToFeatures}
              className="h-16 min-w-[280px] rounded-lg border-white/10 bg-white/5 hover:bg-white/10 px-10 text-lg uppercase tracking-[0.15em] text-foreground backdrop-blur-xl transition-all duration-300"
            >
              Explore Experience
              <ArrowRight className="h-5 w-5 ml-3" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        onClick={scrollToFeatures}
        className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-muted-foreground transition-colors hover:text-white group"
      >
        <span className="text-xs font-bold tracking-[0.4em] uppercase text-white/50 group-hover:text-white transition-colors">Scroll</span>
        <motion.div
             animate={{ y: [0, 8, 0] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
             <ChevronDown className="h-6 w-6 text-primary drop-shadow-[0_0_10px_rgba(0,255,240,0.5)]" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default HeroSection;
