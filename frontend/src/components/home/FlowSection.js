import React from "react";
import { motion } from "framer-motion";
import { Car, KeyRound, MapPin, CheckCircle2 } from "lucide-react";
import chargerImage from "../../assets/charger-station.jpg";
const steps = [
    {
        icon: React.createElement(Car, { className: "w-5 h-5" }),
        title: "Vehicle Identification",
        desc: "Enter your plate number or VIN. Fast OCR fallback available for quick lookup.",
        tag: "Step 1",
    },
    {
        icon: React.createElement(KeyRound, { className: "w-5 h-5" }),
        title: "Secure Verification",
        desc: "OTP delivered to your registered contact. Countdown timer with tactile input.",
        tag: "Step 2",
    },
    {
        icon: React.createElement(MapPin, { className: "w-5 h-5" }),
        title: "Station Selection",
        desc: "Browse available charging bornes. Real-time availability with map integration.",
        tag: "Step 3",
    },
    {
        icon: React.createElement(CheckCircle2, { className: "w-5 h-5" }),
        title: "Reservation Confirmed",
        desc: "Your bay is locked. Arrive, plug in, and charge with zero waiting time.",
        tag: "Complete",
    },
];
const FlowSection = () => {
    return (React.createElement("section", { id: "flow", className: "relative py-32 overflow-hidden" },
        React.createElement("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-border to-transparent" }),
        React.createElement("div", { className: "relative z-10 max-w-[1400px] mx-auto px-6" },
            React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" },
                React.createElement(motion.div, { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.7 }, className: "relative" },
                    React.createElement("div", { className: "relative rounded-3xl overflow-hidden glow-accent" },
                        React.createElement("img", { src: chargerImage, alt: "Tesla Supercharger", className: "w-full h-auto object-cover rounded-3xl", loading: "lazy", width: 800, height: 1000 }),
                        React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" }),
                        React.createElement(motion.div, { animate: { y: [0, -8, 0] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }, className: "absolute bottom-6 left-6 right-6 glass-card rounded-2xl p-5" },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                React.createElement("div", { className: "w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]" }),
                                React.createElement("span", { className: "font-display text-sm font-semibold text-foreground" }, "Borne A12 \u2014 Available")),
                            React.createElement("div", { className: "mt-2 w-full h-1.5 rounded-full bg-secondary overflow-hidden" },
                                React.createElement(motion.div, { initial: { width: "0%" }, whileInView: { width: "78%" }, viewport: { once: true }, transition: { duration: 1.5, delay: 0.5 }, className: "h-full rounded-full bg-gradient-to-r from-primary to-primary/60" })),
                            React.createElement("span", { className: "text-xs text-muted-foreground mt-1 block" }, "78% borne capacity")))),
                React.createElement("div", null,
                    React.createElement(motion.div, { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, className: "mb-12" },
                        React.createElement("span", { className: "text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4 block" }, "Flow Architecture"),
                        React.createElement("h2", { className: "font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4" },
                            "How it",
                            React.createElement("span", { className: "text-gradient-cyan" }, " works.")),
                        React.createElement("p", { className: "text-muted-foreground leading-relaxed max-w-md" }, "One visual language across every step \u2014 from landing to confirmed reservation.")),
                    React.createElement("div", { className: "flex flex-col gap-5" }, steps.map((step, i) => (React.createElement(motion.div, { key: i, initial: { opacity: 0, x: 30 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { delay: i * 0.12 }, className: "group glass-card-hover rounded-2xl p-6 flex gap-5 items-start" },
                        React.createElement("div", { className: "shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors" }, step.icon),
                        React.createElement("div", null,
                            React.createElement("span", { className: "text-[10px] font-semibold tracking-[0.2em] uppercase text-primary/70 mb-1 block" }, step.tag),
                            React.createElement("h3", { className: "font-display text-lg font-semibold text-foreground mb-1" }, step.title),
                            React.createElement("p", { className: "text-sm text-muted-foreground leading-relaxed" }, step.desc)))))))))));
};
export default FlowSection;
