import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Car,
  Shield,
  Mail,
  Phone,
  ChevronRight,
  ChevronDown,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { COUNTRIES } from "../../utils/constants";

const fadeSlide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};

const ForeignAuth = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    matricule: "",
    vin: "",
    email: "",
    phone: "",
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (dropdownRef.current && target instanceof Node && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (step !== 2) return undefined;

    const matricule = formData.matricule.trim();
    const vin = formData.vin.trim();
    if (!matricule || !vin) return undefined;

    const poll = async () => {
      try {
        const statusResp = await fetch(
          `http://localhost:5000/api/auth/foreign/status?matricule=${encodeURIComponent(
            matricule
          )}&vin=${encodeURIComponent(vin)}`
        );
        if (!statusResp.ok) return;

        const data = await statusResp.json();
        if (data.status === "approved") {
          setStep(3);
          navigate("/verify-foreign-otp", { state: { email: formData.email } });
        } else if (data.status === "rejected") {
          setError("Your foreign vehicle request was rejected by back-office. Please review and retry.");
          setStep(1);
        }
      } catch (err) {
        console.warn("Unable to read foreign auth status:", err);
      }
    };

    const intervalId = setInterval(poll, 3000);
    poll();

    return () => clearInterval(intervalId);
  }, [step, formData, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "matricule" || name === "vin" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfoMessage("");

    const fullPhone = `${selectedCountry.code}${formData.phone.replace(/\D/g, "")}`;
    if (formData.phone.length < 5) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/foreign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, phone: fullPhone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Request failed.");
        return;
      }

      if (data.status === "approved") {
        navigate("/verify-foreign-otp", { state: { email: formData.email } });
        return;
      }

      setInfoMessage(
        data.message || "Your vehicle details have been sent to our back-office team for validation."
      );
      setStep(2);
    } catch {
      setError("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-border/50 bg-secondary/70 px-4 py-3.5 font-heading text-sm tracking-wider text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute right-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />

      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/")}
        className="fixed left-6 top-6 z-50 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[560px]"
      >
        <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-60" />

        <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

          <motion.div {...fadeSlide} className="relative mb-8 text-center">
            <div className="mb-5 inline-flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-border/60 bg-secondary/80 shadow-lg">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <div className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary">
              International charging route
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Foreign vehicle reservation gateway
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              Designed for non-Tunisian registered vehicles with guided contact intake.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                {...fadeSlide}
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    License plate
                  </label>
                  <div className="relative">
                    <input
                      name="matricule"
                      type="text"
                      placeholder="e.g. AB-123-CD"
                      value={formData.matricule}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                    <Car className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Chassis number (VIN)
                  </label>
                  <div className="relative">
                    <input
                      name="vin"
                      type="text"
                      placeholder="e.g. 1HGCM82633A123456"
                      value={formData.vin}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                    <Shield className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  </div>
                </div>

                <div className="my-1 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground/60">
                    Your contact information
                  </span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      placeholder="you@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                    <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    WhatsApp number
                  </label>
                  <div className="flex gap-2">
                    <div ref={dropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex h-full min-w-[110px] items-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/70 px-3 py-3.5 text-sm text-foreground transition-colors hover:border-primary/30"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="font-heading text-xs tracking-wider">{selectedCountry.code}</span>
                        <ChevronDown
                          className={`h-3 w-3 text-muted-foreground transition-transform ${
                            showDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-0 top-full z-50 mt-2 max-h-[240px] w-[240px] overflow-y-auto rounded-xl border border-border/60 bg-card py-1 shadow-2xl"
                          >
                            {COUNTRIES.map((country) => (
                              <button
                                key={country.name}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedCountry(country);
                                  setShowDropdown(false);
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/[0.06]"
                              >
                                <span className="text-base">{country.flag}</span>
                                <span className="flex-1 text-foreground/90">{country.name}</span>
                                <span className="font-heading text-xs text-muted-foreground">
                                  {country.code}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative flex-1">
                      <input
                        name="phone"
                        type="tel"
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        onFocus={() => setShowDropdown(false)}
                        required
                        className={inputClass}
                      />
                      <Phone className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/80"
                  >
                    {error}
                  </motion.div>
                )}

                {!error && infoMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground/80"
                  >
                    {infoMessage}
                  </motion.div>
                )}

                <Button type="submit" variant="hero" size="xl" disabled={loading} className="w-full rounded-2xl text-sm">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Submit request
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Tunisian vehicle?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/tunisian-auth")}
                    className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    Use Tunisian car flow
                  </button>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                {...fadeSlide}
                className="flex flex-col items-center gap-6 text-center"
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-secondary/80">
                    <Clock className="h-7 w-7 text-primary" />
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 font-heading text-xl font-bold text-foreground">
                    {infoMessage.includes("already") ? "Request already in progress" : "Request submitted"}
                  </h2>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive-foreground/80"
                  >
                    {error}
                  </motion.div>
                )}

                {!error && infoMessage && (
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {infoMessage}
                  </p>
                )}

                <p className="text-xs text-muted-foreground/70">
                  Once approved, you will receive your OTP at:
                </p>

                <div className="flex w-full flex-col gap-2.5">
                  <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-secondary/40 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                        Email
                      </span>
                      <span className="block truncate font-heading text-sm tracking-wide text-foreground">
                        {formData.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-secondary/40 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                        WhatsApp
                      </span>
                      <span className="block truncate font-heading text-sm tracking-wide text-foreground">
                        {selectedCountry.code} {formData.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground/60">
                  This usually takes just a few minutes.
                  <br />
                  Keep this page open or check your email and WhatsApp.
                </p>

                <div className="flex w-full flex-col gap-2.5">
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full rounded-2xl text-sm"
                    onClick={() => navigate("/verify-foreign-otp", { state: { email: formData.email } })}
                  >
                    <span className="flex items-center gap-2">
                      I received my OTP, verify now
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                  <Button
                    variant="heroOutline"
                    size="lg"
                    className="w-full rounded-2xl text-sm"
                    onClick={() => setStep(1)}
                  >
                    Back and edit details
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForeignAuth;