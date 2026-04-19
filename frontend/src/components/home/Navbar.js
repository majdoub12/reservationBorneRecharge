import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button.js";
import { Sun, Moon, Zap, Menu, X, BatteryCharging } from "lucide-react";
import { getStoredTheme, applyTheme } from "../../utils/theme.js";

const Navbar = ({ onReserve }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme());

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    
    // Sync initial state and listen for changes
    const syncTheme = (e) => setTheme(e.detail);
    window.addEventListener("theme-changed", syncTheme);
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("theme-changed", syncTheme);
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl border-b border-border/40 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.14em] uppercase text-foreground/90 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 to-background/80 shadow-[0_10px_24px_rgba(15,23,42,0.2)] backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <BatteryCharging
              className="h-6 w-6 text-primary drop-shadow-[0_0_12px_rgba(0,255,240,0.5)] z-10"
              strokeWidth={2.2}
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.95rem] font-bold tracking-[0.12em] text-foreground/95">
              Tesla Charge
            </span>
            <span className="text-[0.65rem] font-medium tracking-[0.28em] text-primary/70">
              Driver workspace
            </span>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <div className="relative group">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm tracking-widest uppercase transition-colors"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Experience
            </Button>
            <motion.div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </div>

          <div className="relative group">
             <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm tracking-widest uppercase transition-colors"
              onClick={() => document.getElementById("flow")?.scrollIntoView({ behavior: "smooth" })}
            >
              Flow
            </Button>
             <motion.div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </div>

          <Button
            variant="hero"
            size="default"
            onClick={onReserve}
            className={`relative overflow-hidden group transition-all duration-500 ${
              theme === "light"
                ? "border border-slate-200/80 bg-white/74 text-slate-900 shadow-[0_0_20px_hsla(215,25%,35%,0.10)] hover:border-slate-300 hover:bg-white/88 hover:shadow-[0_0_40px_hsla(215,25%,35%,0.14)]"
                : "border border-primary/30 shadow-[0_0_20px_rgba(0,255,240,0.15)] hover:shadow-[0_0_40px_rgba(0,255,240,0.3)]"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-sky-100/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out ${theme === "light" ? "opacity-60" : ""}`} />
            <Zap className="w-4 h-4 mr-2" />
            <span className="tracking-widest uppercase text-sm font-semibold">Reserve Now</span>
          </Button>

          {/* Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="relative flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors shadow-lg overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ y: 20, opacity: 0, rotate: 45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: -20, opacity: 0, rotate: -45 }}
                transition={{ duration: 0.3, ease: "anticipate" }}
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5 text-foreground/80" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-foreground p-2 rounded-md hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-border/50 px-6 pb-6 pt-2 flex flex-col gap-4 overflow-hidden"
          >
            <Button
              variant="ghost"
              className="justify-start text-muted-foreground w-full tracking-widest uppercase text-sm"
              onClick={() => {
                setMobileOpen(false);
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Experience
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-muted-foreground w-full tracking-widest uppercase text-sm"
              onClick={() => {
                setMobileOpen(false);
                document.getElementById("flow")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              How it works
            </Button>
            <Button
              variant="hero"
              size="lg"
              className="w-full mt-2 shadow-[0_0_20px_rgba(0,255,240,0.2)]"
              onClick={() => {
                setMobileOpen(false);
                onReserve();
              }}
            >
              <Zap className="w-4 h-4 mr-2" />
              Reserve Now
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-3 bg-white/5 border-white/10 backdrop-blur-md"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-5 w-5" />
                  <span className="tracking-widest uppercase text-sm font-semibold">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-5 w-5 text-primary" />
                  <span className="tracking-widest uppercase text-sm font-semibold">Light Mode</span>
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
