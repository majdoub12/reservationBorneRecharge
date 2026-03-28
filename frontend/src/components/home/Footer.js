import React from "react";
const Footer = () => {
    return (React.createElement("footer", { className: "border-t border-border/50 py-8 px-6" },
        React.createElement("div", { className: "max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4" },
            React.createElement("div", { className: "flex items-center gap-3 font-display text-xs font-semibold tracking-[0.14em] uppercase text-foreground/50" },
                React.createElement("div", { className: "w-2 h-2 rounded-full bg-primary/40" }),
                "Tesla Charge"),
            React.createElement("p", { className: "text-xs text-muted-foreground" }, "\u00A9 2026 Tesla Charge ID concept. Crafted for standout presentation."))));
};
export default Footer;
