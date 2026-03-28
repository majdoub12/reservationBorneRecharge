import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Car,
  Shield,
  CheckCircle2,
  Mail,
  Phone,
  ChevronRight,
  Scan,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button.js";

const steps = [
  { label: "Identify", icon: Car },
  { label: "Contact", icon: Shield },
  { label: "Verify", icon: CheckCircle2 },
];

const fadeSlide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};

const TunisianAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [immatricul, setImmatricul] = useState("");
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState([]);
  const [vehicleId, setVehicleId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const fileInputRef = useRef(null);

  const fetchResume = useCallback(async (vId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/contacts/${vId}`);
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts || []);
        if (data.plate) setImmatricul(data.plate);
        if (data.vin) setVin(data.vin);
        setStep(2);
      }
    } catch (e) {
      console.error("Failed to resume:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const state = location.state;
    if (state?.vehicleId) {
      setVehicleId(state.vehicleId);
      if (state.step === 2) fetchResume(state.vehicleId);
    }
  }, [location.state, fetchResume]);

  const handleIdentify = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/tunisian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immatricul, vin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Vehicle not found.");
        return;
      }

      setVehicleId(data.vehicleId);
      setContacts(data.contacts || []);
      setStep(2);
    } catch {
      setError("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!selectedContact) {
      setError("Please select a contact to receive the OTP.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, contact: selectedContact }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send OTP.");
        return;
      }

      navigate("/verify-otp", { state: { vehicleId } });
    } catch {
      setError("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOCR = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("http://localhost:5000/api/auth/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError("OCR failed. Please enter details manually.");
        return;
      }

      if (data.immatricul) setImmatricul(data.immatricul);
      if (data.vin) setVin(data.vin);
    } catch {
      setError("OCR service unavailable. Please enter details manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute left-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/[0.05] blur-[100px]" />

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
        className="relative z-10 w-full max-w-[540px]"
      >
        <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-60" />

        <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

          <motion.div {...fadeSlide} className="relative mb-8 text-center">
            <div className="mb-5 inline-flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-border/60 bg-secondary/80 shadow-lg">
              <span className="font-display text-lg font-semibold tracking-[0.18em] text-primary">
                TN
              </span>
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Vehicle identification gateway
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              Tunisian registered vehicles - secure charging reservation access.
            </p>
          </motion.div>

          <div className="mb-8 flex items-center justify-center gap-0">
            {steps.map((stepItem, index) => {
              const Icon = stepItem.icon;
              const active = step >= index + 1;

              return (
                <React.Fragment key={stepItem.label}>
                  {index > 0 && (
                    <div
                      className={`mx-2 h-px w-12 transition-colors duration-500 md:w-16 ${
                        step > index ? "bg-primary/50" : "bg-border/40"
                      }`}
                    />
                  )}

                  <div className="flex flex-col items-center gap-1.5">
                    <motion.div
                      animate={{
                        scale: step === index + 1 ? 1.1 : 1,
                        boxShadow: active ? "0 0 20px hsla(187,90%,58%,0.3)" : "none",
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500 ${
                        active
                          ? "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground"
                          : "border border-border/40 bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.div>
                    <span
                      className={`text-[0.65rem] font-medium uppercase tracking-widest transition-colors ${
                        active ? "text-foreground" : "text-muted-foreground/60"
                      }`}
                    >
                      {stepItem.label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                {...fadeSlide}
                onSubmit={handleIdentify}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    License plate
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 123 TU 4567"
                      value={immatricul}
                      onChange={(event) => setImmatricul(event.target.value.toUpperCase())}
                      required
                      className="w-full rounded-2xl border border-border/50 bg-secondary/70 px-4 py-3.5 font-heading text-sm tracking-wider text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
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
                      type="text"
                      placeholder="e.g. 1HGCM82633A123456"
                      value={vin}
                      onChange={(event) => setVin(event.target.value.toUpperCase())}
                      required
                      className="w-full rounded-2xl border border-border/50 bg-secondary/70 px-4 py-3.5 font-heading text-sm tracking-wider text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                    <Shield className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-3.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Scan className="h-4 w-4 text-primary/70" />
                  Scan document with OCR
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOCR} />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/80"
                  >
                    {error}
                  </motion.div>
                )}

                <Button type="submit" variant="hero" size="xl" disabled={loading} className="w-full rounded-2xl text-sm">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Zap className="h-4 w-4" />
                      </motion.div>
                      Checking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Identify vehicle
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Foreign vehicle?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/auth/foreign")}
                    className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    Use foreign car flow
                  </button>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div key="step2" {...fadeSlide} className="flex flex-col gap-5">
                <div>
                  <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
                    Choose where to receive your OTP
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select an email or phone number linked to this vehicle.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {contacts.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No contacts found for this vehicle.
                    </p>
                  )}

                  {contacts.map((contact, index) => {
                    const isSelected = selectedContact === contact;

                    return (
                      <motion.div
                        key={`${contact.type}-${contact.value}-${index}`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedContact(contact)}
                        className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? "border-primary/40 bg-primary/[0.08] shadow-[0_8px_30px_hsla(187,90%,58%,0.1)]"
                            : "border-border/40 bg-secondary/40 hover:border-primary/20"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                            isSelected ? "bg-primary/20" : "bg-secondary/80"
                          }`}
                        >
                          {contact.type === "email" ? (
                            <Mail
                              className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                            />
                          ) : (
                            <Phone
                              className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                            {contact.type}
                          </span>
                          <span className="block truncate font-heading text-sm tracking-wide text-foreground">
                            {contact.value}
                          </span>
                        </div>

                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            isSelected ? "border-primary bg-primary" : "border-border/60"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Need to update contacts?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/settings", { state: { vehicleId } })}
                    className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
                  >
                    Manage contact info
                  </button>
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/80"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="heroOutline"
                    size="xl"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-2xl text-sm"
                  >
                    Back
                  </Button>
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleSendOTP}
                    disabled={loading || !selectedContact}
                    className="flex-[2] rounded-2xl text-sm"
                  >
                    {loading ? (
                      "Sending..."
                    ) : (
                      <span className="flex items-center gap-2">
                        Send OTP
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    )}
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

export default TunisianAuth;
