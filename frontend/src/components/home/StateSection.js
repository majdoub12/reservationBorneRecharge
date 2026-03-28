import React, { useEffect, useRef, useState } from "react";
import { Battery, Timer, Wifi } from "lucide-react";

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

    const duration = 1500;
    const steps = 40;
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
    <section ref={ref} className="relative border-y border-border/30 py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 divide-y divide-border/30 md:grid-cols-3 md:divide-x md:divide-y-0">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center px-8 py-8 text-center transition-all duration-700 md:py-0 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${index * 0.2}s` }}
            >
              <stat.icon className="mb-4 text-primary" size={28} />
              <span className="font-display text-4xl font-bold text-foreground text-glow md:text-5xl">
                <AnimatedNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  active={visible}
                />
              </span>
              <span className="mt-2 font-body text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StateSection;
