import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Superfast Charging",
    description: "Up to 250kW charging speed. Get 200 miles of range in just 15 minutes.",
  },
  {
    icon: MapPin,
    title: "Find Nearby Stations",
    description: "Real-time station availability across the entire network at your fingertips.",
  },
  {
    icon: Clock,
    title: "Reserve in Advance",
    description: "Book your charging slot ahead of time. No waiting, no surprises.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security for your account, payments, and vehicle data.",
  },
];

function useReveal(threshold = 0.2) {
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

function FeatureCard({ feature, index }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const { ref, visible } = useReveal(0.2);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setTilt({
      x: ((event.clientY - cy) / rect.height) * -8,
      y: ((event.clientX - cx) / rect.width) * 8,
    });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="group rounded-3xl border border-border/50 bg-card/60 p-8 transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_40px_hsla(187,90%,58%,0.12)]"
      style={{
        transform: visible
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : "translateY(24px)",
      }}
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20">
        <feature.icon className="h-6 w-6" />
      </div>
      <h3 className="mb-3 font-display text-base font-semibold tracking-wide text-foreground">
        {feature.title}
      </h3>
      <p className="font-body text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </motion.div>
  );
}

const FeaturesSection = () => {
  const { ref: headingRef, visible: headingVisible } = useReveal(0.3);

  return (
    <section className="relative py-24 md:py-32" id="features">
      <div className="container mx-auto px-6">
        <div
          ref={headingRef}
          className={`mb-16 text-center transition-all duration-700 ${
            headingVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-primary">
            Why TeslaCharge
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            BUILT FOR THE FUTURE
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
