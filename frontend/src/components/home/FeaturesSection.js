import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
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
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setTilt({
      x: ((event.clientY - cy) / rect.height) * -10,
      y: ((event.clientX - cx) / rect.width) * 10,
    });
    
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="group glass-card-hover p-8 relative overflow-hidden"
      style={{
        transform: visible
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : "translateY(30px)",
      }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              hsla(187, 100%, 55%, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-white/5 text-primary shadow-[0_0_15px_rgba(0,255,240,0.2)] transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(0,255,240,0.4)]">
        <feature.icon className="h-7 w-7 drop-shadow-[0_0_8px_rgba(0,255,240,0.8)]" />
      </div>
      <h3 className="mb-3 font-display text-lg font-bold tracking-wide text-foreground group-hover:text-white transition-colors duration-300">
        {feature.title}
      </h3>
      <p className="font-body text-sm leading-relaxed text-muted-foreground group-hover:text-white/80 transition-colors duration-300">
        {feature.description}
      </p>
    </motion.div>
  );
}

const FeaturesSection = () => {
  const { ref: headingRef, visible: headingVisible } = useReveal(0.3);

  return (
    <section className="relative py-32 isolate" id="features">
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,240,0.05)_0%,transparent_70%)]" />
      <div className="container mx-auto px-6 relative z-10">
        <div
          ref={headingRef}
          className={`mb-20 flex flex-col items-center text-center transition-all duration-1000 ${
            headingVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 backdrop-blur-md">
             <span className="font-body text-xs uppercase tracking-[0.3em] text-primary font-bold">
                 Why TeslaCharge
             </span>
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl max-w-2xl">
            BUILT FOR THE <span className="text-gradient-cyan glow-text">FUTURE</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
