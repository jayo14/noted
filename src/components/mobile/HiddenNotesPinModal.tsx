import React, { useState, useEffect } from "react";
import { Lock, Fingerprint, KeyRound, X, Delete } from "lucide-react";
import { hiddenNotesService, type BiometricAvailability } from "@/services/hiddenNotesService";

export type HiddenPinModalMode = "setup" | "unlock" | "change";

interface HiddenNotesPinModalProps {
  isOpen: boolean;
  mode: HiddenPinModalMode;
  onClose: () => void;
  onSuccess: () => void;
}

export const HiddenNotesPinModal: React.FC<HiddenNotesPinModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"current" | "enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [biometricAvail, setBiometricAvail] = useState<BiometricAvailability>({
    available: false,
    mode: "none",
    label: "",
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPin("");
    setFirstPin("");
    setCurrentPin("");
    setError(null);
    setShowBiometricPrompt(false);
    setStep(mode === "change" ? "current" : "enter");

    let active = true;
    (async () => {
      const avail = await hiddenNotesService.getBiometricAvailability();
      const enabled = await hiddenNotesService.isBiometricEnabled();
      if (!active) return;
      setBiometricAvail(avail);
      setBiometricEnabled(enabled);

      // Automatically prompt native biometric / passkey on unlock if enabled
      if (mode === "unlock" && enabled && avail.available) {
        const ok = await hiddenNotesService.verifyBiometric();
        if (active && ok) {
          onSuccess();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, mode, onSuccess]);

  if (!isOpen) return null;

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(null);

    if (next.length < 4) return;

    if (mode === "unlock") {
      const valid = await hiddenNotesService.verifyPin(next);
      if (valid) {
        onSuccess();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
      return;
    }

    if (mode === "change" && step === "current") {
      const valid = await hiddenNotesService.verifyPin(next);
      if (valid) {
        setCurrentPin(next);
        setPin("");
        setStep("enter");
      } else {
        setError("Incorrect current PIN.");
        setPin("");
      }
      return;
    }

    if (step === "enter") {
      setFirstPin(next);
      setPin("");
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      if (next !== firstPin) {
        setError("PINs did not match. Try again.");
        setPin("");
        setFirstPin("");
        setStep("enter");
        return;
      }

      if (mode === "change") {
        await hiddenNotesService.changePin(currentPin, next);
        onSuccess();
        return;
      }

      await hiddenNotesService.setupPin(next);
      if (biometricAvail.available && !biometricEnabled) {
        setShowBiometricPrompt(true);
      } else {
        onSuccess();
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleBiometricUnlock = async () => {
    setError(null);
    const ok = await hiddenNotesService.verifyBiometric();
    if (ok) {
      onSuccess();
    } else {
      setError(`${biometricAvail.label || "Biometric"} verification cancelled or failed.`);
    }
  };

  const heading = showBiometricPrompt
    ? `Enable ${biometricAvail.label}?`
    : mode === "unlock"
    ? "Hidden Notes"
    : mode === "change"
    ? step === "current"
      ? "Enter Current PIN"
      : step === "enter"
      ? "Enter New 4-Digit PIN"
      : "Confirm New PIN"
    : step === "enter"
    ? "Set 4-Digit PIN"
    : "Confirm 4-Digit PIN";

  const subheading = showBiometricPrompt
    ? `Unlock your hidden notes faster using ${biometricAvail.label} on this device.`
    : mode === "unlock"
    ? "Enter your 4-digit PIN to view hidden notes."
    : "This 4-digit PIN protects your hidden notes.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Close PIN dialog"
        >
          <X size={16} />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
          {showBiometricPrompt ? (
            biometricAvail.mode === "passkey" ? (
              <KeyRound size={22} />
            ) : (
              <Fingerprint size={22} />
            )
          ) : (
            <Lock size={20} />
          )}
        </div>

        <h3 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
          {heading}
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-muted)] leading-snug">{subheading}</p>

        {showBiometricPrompt ? (
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={async () => {
                await hiddenNotesService.enrollBiometric();
                onSuccess();
              }}
              className="w-full rounded-xl bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] py-2.5 text-[14px] font-semibold active:scale-95 transition-transform cursor-pointer"
            >
              Enable {biometricAvail.label}
            </button>
            <button
              type="button"
              onClick={onSuccess}
              className="w-full rounded-xl bg-black/[0.06] dark:bg-white/[0.08] text-[var(--text-primary)] py-2.5 text-[14px] font-semibold active:scale-95 transition-transform cursor-pointer"
            >
              Use PIN Only
            </button>
          </div>
        ) : (
          <>
            {/* 4-digit PIN dots */}
            <div className="mt-5 flex items-center justify-center gap-3.5" aria-label="PIN progress">
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < pin.length;
                return (
                  <div
                    key={idx}
                    className={`h-3.5 w-3.5 rounded-full border transition-all duration-150 ${
                      filled
                        ? "bg-[var(--text-primary)] border-[var(--text-primary)] scale-110"
                        : "bg-transparent border-[var(--text-subtle)]"
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <p className="mt-3 text-[12.5px] font-medium text-red-500">{error}</p>
            )}

            {/* Numeric keypad */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => void handleDigit(d)}
                  className="flex h-12 items-center justify-center rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[18px] font-semibold text-[var(--text-primary)] active:scale-92 transition-transform cursor-pointer"
                >
                  {d}
                </button>
              ))}
              {mode === "unlock" && biometricEnabled && biometricAvail.available ? (
                <button
                  type="button"
                  onClick={() => void handleBiometricUnlock()}
                  className="flex h-12 items-center justify-center rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[var(--text-primary)] active:scale-92 transition-transform cursor-pointer"
                  aria-label={`Unlock with ${biometricAvail.label}`}
                  title={`Unlock with ${biometricAvail.label}`}
                >
                  {biometricAvail.mode === "passkey" ? (
                    <KeyRound size={20} />
                  ) : (
                    <Fingerprint size={22} />
                  )}
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => void handleDigit("0")}
                className="flex h-12 items-center justify-center rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[18px] font-semibold text-[var(--text-primary)] active:scale-92 transition-transform cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="flex h-12 items-center justify-center rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[var(--text-primary)] active:scale-92 transition-transform cursor-pointer"
                aria-label="Backspace"
              >
                <Delete size={19} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
