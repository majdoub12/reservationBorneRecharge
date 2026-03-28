import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import { Zap, Menu, X } from "lucide-react";
const Navbar = ({ onReserve }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    return (React.createElement(motion.nav, { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.6 }, className: `fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50" : ""}` },
        React.createElement("div", { className: "max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4" },
            React.createElement("div", { className: "flex items-center gap-3 font-display text-sm font-semibold tracking-[0.14em] uppercase text-foreground/90" },
                React.createElement("div", { className: "w-3 h-3 rounded-full bg-primary shadow-[0_0_20px_hsla(187,90%,58%,0.7)]" }),
                "Tesla Charge"),
            React.createElement("div", { className: "hidden md:flex items-center gap-2" },
                React.createElement(Button, { variant: "ghost", className: "text-muted-foreground hover:text-foreground", onClick: () => { var _a; return (_a = document.getElementById("features")) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" }); } }, "Experience"),
                React.createElement(Button, { variant: "nav", size: "default", onClick: onReserve },
                    React.createElement(Zap, { className: "w-4 h-4" }),
                    "Reserve Now")),
            React.createElement("button", { className: "md:hidden text-foreground", onClick: () => setMobileOpen(!mobileOpen) }, mobileOpen ? React.createElement(X, { size: 24 }) : React.createElement(Menu, { size: 24 }))),
        mobileOpen && (React.createElement(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 px-6 pb-6 flex flex-col gap-3" },
            React.createElement(Button, { variant: "ghost", className: "justify-start text-muted-foreground", onClick: () => { var _a; setMobileOpen(false); (_a = document.getElementById("features")) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" }); } }, "Experience"),
            React.createElement(Button, { variant: "ghost", className: "justify-start text-muted-foreground", onClick: () => { var _a; setMobileOpen(false); (_a = document.getElementById("flow")) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" }); } }, "How it works"),
            React.createElement(Button, { variant: "hero", size: "lg", onClick: () => { setMobileOpen(false); onReserve(); } },
                React.createElement(Zap, { className: "w-4 h-4" }),
                "Reserve Now")))));
};
export default Navbar;
