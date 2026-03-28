import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import { Zap, Mail, Phone } from "lucide-react";
const CTASection = ({ onReserve }) => {
    return (React.createElement("section", { className: "relative py-32 overflow-hidden" },
        React.createElement("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-border to-transparent" }),
        React.createElement("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[150px]" }),
        React.createElement("div", { className: "relative z-10 max-w-[1400px] mx-auto px-6" },
            React.createElement(motion.div, { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, className: "text-center max-w-3xl mx-auto" },
                React.createElement("span", { className: "text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 block" }, "Ready to charge"),
                React.createElement("h2", { className: "font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6" },
                    "The future of",
                    React.createElement("br", null),
                    React.createElement("span", { className: "text-gradient-cyan" }, "EV charging.")),
                React.createElement("p", { className: "text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto" }, "Memorable, clean, and clearly more ambitious than a standard flow. Reserve your station today."),
                React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-center gap-4 mb-16" },
                    React.createElement(Button, { variant: "hero", size: "xl", onClick: onReserve },
                        React.createElement(Zap, { className: "w-5 h-5" }),
                        "Launch Reservation"),
                    React.createElement(Button, { variant: "heroOutline", size: "xl" }, "Contact Support")),
                React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(Mail, { className: "w-4 h-4 text-primary/60" }),
                        React.createElement("span", null, "support@idd.tn")),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(Phone, { className: "w-4 h-4 text-primary/60" }),
                        React.createElement("span", null, "+216 71 123 456")))))));
};
export default CTASection;
