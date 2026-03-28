import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Clock, ChevronRight, Loader2, Mail } from "lucide-react";
import { Button } from "../../components/ui/button.js";

const fadeSlide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const ForeignOTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email = "" } = location.state || {};

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate("/auth/foreign");
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return undefined;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60).toString().padStart(2, "0");
    const seconds = (secs % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const nextDigits = [...digits];
    nextDigits[index] = value;
    setDigits(nextDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
    event.preventDefault();
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-foreign-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Verification failed.");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      setError("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFilled = digits.every((digit) => digit !== "");
  const progress = (timeLeft / 300) * 100;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute right-[15%] top-[-18%] h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[10%] h-[400px] w-[400px] rounded-full bg-primary/[0.04] blur-[100px]" />

      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/auth/foreign")}
        className="fixed left-6 top-6 z-50 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[480px]"
      >
        <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-60" />

        <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

          <motion.div {...fadeSlide} className="relative mb-8 text-center">
            <div className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary">
              International access
            </div>
            <div className="mx-auto mb-5 inline-flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-border/60 bg-secondary/80 shadow-lg">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Verify foreign vehicle access
            </h1>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </motion.div>

          <motion.div
            {...fadeSlide}
            className="mb-6 flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/40 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate font-heading text-sm tracking-wide text-foreground">{email}</span>
          </motion.div>

          <motion.div {...fadeSlide} className="mb-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Clock className={`h-4 w-4 ${timeLeft <= 60 ? "text-destructive" : "text-primary"}`} />
              {timeLeft > 0 ? (
                <span className={`text-sm font-medium ${timeLeft <= 60 ? "text-destructive" : "text-muted-foreground"}`}>
                  Code expires in <span className="font-heading tracking-wider text-foreground">{formatTime(timeLeft)}</span>
                </span>
              ) : (
                <span className="text-sm font-medium text-destructive">Code expired. Please request a new one.</span>
              )}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/60">
              <motion.div
                className={`h-full rounded-full ${timeLeft <= 60 ? "bg-destructive/70" : "bg-primary/50"}`}
                initial={{ width: "100%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </motion.div>

          <motion.div {...fadeSlide} className="mb-6 flex justify-center gap-2.5 md:gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                autoFocus={index === 0}
                whileFocus={{ scale: 1.08, borderColor: "hsl(187, 90%, 58%)" }}
                className={`h-14 w-12 rounded-2xl border text-center text-xl font-heading font-bold tracking-wider outline-none transition-all duration-300 md:h-16 md:w-14 md:text-2xl ${
                  digit
                    ? "border-primary/40 bg-primary/[0.08] text-foreground shadow-[0_0_20px_hsla(187,90%,58%,0.15)]"
                    : "border-border/50 bg-secondary/60 text-muted-foreground"
                } focus:border-primary/60 focus:bg-primary/[0.06] focus:ring-2 focus:ring-primary/15`}
              />
            ))}
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive-foreground/80"
            >
              {error}
            </motion.div>
          )}

          <Button
            variant="hero"
            size="xl"
            onClick={handleVerify}
            disabled={loading || timeLeft <= 0 || !isFilled}
            className="mb-4 w-full rounded-2xl text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Verify code
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <p className="mb-4 text-center text-xs leading-relaxed text-muted-foreground/60">
            Didn't receive a code? It might still be waiting for back-office approval.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/auth/foreign")}
              className="text-sm text-muted-foreground underline decoration-border/50 underline-offset-4 transition-colors hover:text-foreground"
            >
              Back and review details
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForeignOTPVerification;
