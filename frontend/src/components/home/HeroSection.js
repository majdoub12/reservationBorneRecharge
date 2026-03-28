import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import {
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  Zap,
} from "lucide-react";
import heroImage from "../../assets/hero-charging.jpg";

const HeroSection = ({ onReserve }) => {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Tesla charging at a futuristic station"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,240,0.18)_0%,rgba(0,0,0,0.18)_35%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background/90" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.08]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <div className="absolute left-[4%] top-[14%] h-[420px] w-[420px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute right-[10%] top-[30%] h-[260px] w-[260px] rounded-full bg-primary/10 blur-[100px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto flex w-full max-w-4xl flex-col items-center text-center"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 backdrop-blur-md">
            <BatteryCharging className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold tracking-[0.36em] uppercase text-primary/90">
              Tesla-inspired charging reservation
            </span>
          </div>

          <p className="mb-8 text-sm font-medium tracking-[0.5em] uppercase text-primary/80 sm:text-base">
            The future of charging
          </p>

          <h1 className="font-display text-6xl font-bold leading-[0.86] tracking-tight text-foreground drop-shadow-[0_0_22px_rgba(255,255,255,0.16)] sm:text-7xl lg:text-[7.75rem]">
            <span className="block text-white/95">POWER</span>
            <span className="block text-gradient-cyan">UNLIMITED</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground/90 sm:text-lg lg:text-[1.35rem]">
            Reserve your charging station in seconds. Fast, reliable, and always ready when you
            are.
          </p>

          <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="hero"
              size="xl"
              onClick={onReserve}
              className="h-14 min-w-[280px] rounded-md px-10 text-lg uppercase tracking-[0.14em]"
            >
              <Zap className="h-5 w-5" />
              Reserve Now
            </Button>
            <Button
              variant="heroOutline"
              size="xl"
              onClick={scrollToFeatures}
              className="h-14 min-w-[280px] rounded-md border-primary/25 bg-background/10 px-10 text-lg uppercase tracking-[0.14em] text-foreground backdrop-blur-md"
            >
              Explore Stations
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          
        </motion.div>
      </div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        onClick={scrollToFeatures}
        className="absolute mt-5 bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="text-xs font-medium tracking-[0.3em] uppercase">Scroll</span>
        <ChevronDown className="h-5 w-5 text-primary" />
      </motion.button>
    </section>
  );
};

export default HeroSection;
