import React, { useEffect, useRef, useState } from "react";
import { Battery, Timer, Wifi } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: 500, suffix: "+", label: "Stations", icon: Battery },
  { value: 99.9, suffix: "%", label: "Uptime", icon: Wifi },
  { value: 15, prefix: "<", suffix: "min", label: "Avg Charge", icon: Timer },
];

function useReveal(threshold = 0.3) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function AnimatedNumber({ value, suffix, prefix = "", active }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current * 10) / 10);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [active, value]);

  const formatted = Number.isInteger(value) ? Math.round(display) : display.toFixed(1);

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}

const StateSection = () => {
  const { ref, visible } = useReveal(0.3);

  return (
    <section ref={ref} className="relative py-24 isolate">
       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent skew-y-3" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="glass-panel rounded-3xl grid grid-cols-1 divide-y divide-border/20 md:grid-cols-3 md:divide-x md:divide-y-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
              className="flex flex-col items-center justify-center p-12 text-center group hover:bg-white/5 transition-colors duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <stat.icon className="mb-6 text-primary group-hover:scale-110 drop-shadow-[0_0_12px_rgba(0,255,240,0.6)] transition-all duration-300" size={36} />
              <span className="font-display text-5xl font-extrabold text-foreground tracking-tight drop-shadow-md group-hover:text-primary transition-colors duration-500 md:text-6xl">
                <AnimatedNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  active={visible}
                />
              </span>
              <span className="mt-4 font-body text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-white transition-colors duration-500">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StateSection;
