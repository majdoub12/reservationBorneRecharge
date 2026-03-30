import { motion } from "framer-motion";
import { Zap, Globe, BatteryCharging, Shield } from "lucide-react";

export function Footer() {
  const footerLinks = {
    Product: ["Stations", "Pricing", "Mobile App", "Features"],
    Company: ["About Us", "Careers", "Press", "Contact"],
    Resources: ["Help Center", "Blog", "Documentation", "API"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Licenses"],
  };

  const socialLinks = [
    { icon: Globe, href: "#" },
    { icon: BatteryCharging, href: "#" },
    { icon: Shield, href: "#" },
    { icon: Zap, href: "#" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-border/30 bg-background py-12 px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_22%)]" />
      <div className="relative container mx-auto max-w-7xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">Tesla Charge</span>
            </div>
            <p className="mb-6 max-w-md text-muted-foreground">
              The future of electric vehicle charging. Fast, reliable, and always available.
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.button
                    key={index}
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-surface-muted text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 font-semibold text-foreground">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <button type="button" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        
      </div>
    </footer>
  );
}

export default Footer;
