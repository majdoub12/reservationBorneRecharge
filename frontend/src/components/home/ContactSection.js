import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button.js";
import { Mail, PhoneCall, Clock3, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="relative overflow-hidden py-24 scroll-mt-28">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[2rem] border border-border/60 bg-card/75 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
        >
          <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:p-12">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-primary/70" />
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">
                  Contact support
                </span>
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Contact our support team
              </h2>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                For reservation help, account questions, or station guidance, reach out
                directly using the details below. We keep the process simple and professional.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="hero"
                  size="lg"
                  className="min-w-[180px] shadow-[0_14px_28px_rgba(125,211,252,0.10)]"
                >
                  <a href="mailto:support@idd.tn">
                    <Mail className="h-4 w-4" />
                    Email support
                  </a>
                </Button>
                <Button asChild variant="heroOutline" size="lg" className="min-w-[180px]">
                  <a href="tel:+21671123456">
                    <PhoneCall className="h-4 w-4" />
                    Call support
                  </a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/55 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Email
                  </p>
                  <a
                    href="mailto:support@idd.tn"
                    className="mt-2 block text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    support@idd.tn
                  </a>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/55 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Phone
                  </p>
                  <a
                    href="tel:+21671123456"
                    className="mt-2 block text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    +216 71 123 456
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-background/50 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Support details
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    Direct and easy to reach
                  </h3>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  Available
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Working hours</p>
                    <p className="mt-1 text-sm text-muted-foreground">Monday to Friday, 9:00 AM to 6:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Location</p>
                    <p className="mt-1 text-sm text-muted-foreground">Tunis, Tunisia</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Preferred contact</p>
                    <p className="mt-1 text-sm text-muted-foreground">Email for general support, phone for urgent requests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
