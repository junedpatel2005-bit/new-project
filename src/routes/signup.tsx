"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { countryCodes } from "@/lib/country-codes";

const emptyOtp = ["", "", "", ""];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [role, setRole] = useState<"client" | "pro">("client");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const fullPhone = `${countryCode}${phone.trim().replace(/\D/g, "")}`;
  const [otp, setOtp] = useState(emptyOtp);
  const [otpOpen, setOtpOpen] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const rawRole = searchParams.get("role")?.toLowerCase();
    if (rawRole === "pro" || rawRole === "professional") {
      setRole("pro");
    } else if (rawRole === "client") {
      setRole("client");
    }
  }, [searchParams]);

  function resetPhoneVerification() {
    setOtp(emptyOtp);
    setOtpOpen(false);
    setPhoneVerified(false);
    setPhoneError(null);
  }

  function chooseRole(nextRole: "client" | "pro") {
    setRole(nextRole);
    setError(null);
    resetPhoneVerification();
  }

  async function requestCode() {
    setPhoneError(null);
    if (phone.trim().length < 7) {
      setPhoneError("Enter a valid phone number first.");
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetch("/api/v1/auth/send-phone-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: role === "pro" ? "PROFESSIONAL" : "CLIENT",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPhoneError(result.error ?? "Unable to start phone verification.");
        return;
      }
      setOtpOpen(true);
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch {
      setPhoneError("Network error. Check your connection and try again.");
    } finally {
      setSendingCode(false);
    }
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((item, itemIndex) => (itemIndex === index ? digit : item)));
    if (digit && index < otpRefs.current.length - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!digits) return;
    event.preventDefault();
    setOtp(Array.from({ length: 4 }, (_, index) => digits[index] ?? ""));
    otpRefs.current[Math.min(digits.length, 4) - 1]?.focus();
  }

  async function verifyPhone() {
    const code = otp.join("");
    if (code.length !== 4) {
      setPhoneError("Enter the 4-digit verification code.");
      return;
    }
    setPhoneError(null);
    setVerifyingPhone(true);
    try {
      const response = await fetch("/api/v1/auth/verify-phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          code,
          role: role === "pro" ? "PROFESSIONAL" : "CLIENT",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPhoneError(result.error ?? "Unable to verify this phone number.");
        return;
      }
      setPhoneVerified(true);
      setOtpOpen(false);
    } catch {
      setPhoneError("Network error. Check your connection and try again.");
    } finally {
      setVerifyingPhone(false);
    }
  }

  async function checkAvailability(field: "email" | "phone", value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const response = await fetch("/api/v1/auth/check-availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: trimmed }),
    });
    if (!response.ok) return;
    const result =
      response.status === 204
        ? { fields: {} }
        : ((await response.json()) as { fields?: Record<string, string> });
    setFieldErrors((current) => {
      const next = { ...current };
      if (result.fields?.[field]) next[field] = result.fields[field];
      else delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setError(null);
    const nextErrors: Record<string, string> = {};
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();
    const password = draft.password;
    if (!firstName) nextErrors.firstName = "First name is required.";
    if (!lastName) nextErrors.lastName = "Last name is required.";
    if (!email) nextErrors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Password is required.";
    else if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password))
      nextErrors.password = "Password must include an uppercase letter.";
    else if (!/[a-z]/.test(password))
      nextErrors.password = "Password must include a lowercase letter.";
    else if (!/\d/.test(password)) nextErrors.password = "Password must include a number.";
    if (!draft.confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (password !== draft.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (!phoneDigits) nextErrors.phone = "Phone number is required.";
    else if (phoneDigits.length < 7) nextErrors.phone = "Enter a valid phone number.";
    if (!draft.terms) nextErrors.terms = "Please accept the Terms and Privacy Policy.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    if (!phoneVerified) {
      setFieldErrors((current) => ({
        ...current,
        phone: "Verify your phone number before creating your account.",
      }));
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: fullPhone,
          password,
          role: role === "pro" ? "PROFESSIONAL" : "CLIENT",
          terms: draft.terms,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        redirect?: string;
        fields?: Record<string, string>;
      };
      if (!response.ok) {
        setFieldErrors(result.fields ?? {});
        setError(result.error ?? "Unable to create your account.");
      } else router.push(result.redirect ?? "/client-profile");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join 50,000+ clients and pros on Servio."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {(["client", "pro"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => chooseRole(choice)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${role === choice ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
          >
            I&apos;m a {choice === "client" ? "client" : "professional"}
          </button>
        ))}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        {role === "client"
          ? "Create an account to post jobs and hire trusted professionals."
          : "Create a professional account to showcase your services and find work."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mb-4 w-full"
        onClick={() => {
          window.location.href = `/api/v1/auth/google?role=${role === "pro" ? "PROFESSIONAL" : "CLIENT"}`;
        }}
      >
        Continue with Google
      </Button>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="first"
            name="firstName"
            label="First name"
            placeholder="First name"
            required
            error={fieldErrors.firstName}
            value={draft.firstName}
            onValueChange={(value) => setDraft({ ...draft, firstName: value })}
          />
          <Field
            id="last"
            name="lastName"
            label="Last name"
            placeholder="Last name"
            required
            error={fieldErrors.lastName}
            value={draft.lastName}
            onValueChange={(value) => setDraft({ ...draft, lastName: value })}
          />
        </div>
        <Field
          id="email"
          name="email"
          label="Work email"
          placeholder="you@company.com"
          type="email"
          required
          error={fieldErrors.email}
          value={draft.email}
          onValueChange={(value) => {
            setDraft({ ...draft, email: value });
            setFieldErrors((current) => {
              const next = { ...current };
              delete next.email;
              return next;
            });
          }}
          onBlur={() => checkAvailability("email", draft.email)}
        />
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <div className="flex gap-2">
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(event) => {
                setCountryCode(event.target.value);
                resetPhoneVerification();
              }}
              disabled={phoneVerified}
              className="h-10 w-[104px] shrink-0 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
            >
              {countryCodes.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code}
                </option>
              ))}
            </select>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/[^\d\s-]/g, ""));
                resetPhoneVerification();
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.phone;
                  return next;
                });
              }}
              onBlur={() => {
                if (phone.trim().length >= 7) checkAvailability("phone", fullPhone);
              }}
              type="tel"
              required
              disabled={phoneVerified}
              placeholder="98765 43210"
              className={
                fieldErrors.phone
                  ? "border-destructive placeholder:text-destructive focus-visible:ring-destructive"
                  : ""
              }
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            />
            {!phoneVerified && (
              <Button type="button" variant="outline" onClick={requestCode} disabled={sendingCode}>
                {sendingCode ? "Sending…" : otpOpen ? "Resend" : "Verify"}
              </Button>
            )}
          </div>
          {phoneVerified ? (
            <div className="flex animate-in items-center justify-between rounded-md bg-muted px-3 py-2 text-sm text-primary fade-in zoom-in-95 duration-300">
              <span className="animate-in fade-in slide-in-from-left-1 duration-300">
                ✓ Phone number verified
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={resetPhoneVerification}>
                Change phone number
              </Button>
            </div>
          ) : (
            otpOpen && (
              <div className="animate-in space-y-3 rounded-lg border border-border p-3 fade-in slide-in-from-top-2 duration-300">
                <Label>Verification code</Label>
                <div className="flex gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => updateOtp(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      aria-label={`Verification digit ${index + 1}`}
                      className="h-11 w-11 animate-in text-center text-lg fade-in zoom-in-95 duration-300"
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={verifyPhone}
                  disabled={verifyingPhone || otp.join("").length !== 4}
                >
                  {verifyingPhone ? "Verifying…" : "Verify OTP"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={requestCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? "Sending…" : "Resend code"}
                </Button>
              </div>
            )
          )}
          {(phoneError || fieldErrors.phone) && (
            <p id="phone-error" className="text-sm text-destructive">
              {phoneError || fieldErrors.phone}
            </p>
          )}
        </div>
        <Field
          id="password"
          name="password"
          label="Password"
          placeholder="At least 8 characters"
          type={showPassword ? "text" : "password"}
          required
          error={fieldErrors.password}
          value={draft.password}
          onValueChange={(value) => setDraft({ ...draft, password: value })}
          trailingAction={{
            label: showPassword ? "Hide password" : "Show password",
            onClick: () => setShowPassword((current) => !current),
          }}
        />
        <Field
          id="confirm-password"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Repeat your password"
          type={showConfirmPassword ? "text" : "password"}
          required
          error={fieldErrors.confirmPassword}
          value={draft.confirmPassword}
          onValueChange={(value) => setDraft({ ...draft, confirmPassword: value })}
          trailingAction={{
            label: showConfirmPassword ? "Hide password" : "Show password",
            onClick: () => setShowConfirmPassword((current) => !current),
          }}
        />
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            name="terms"
            type="checkbox"
            required
            checked={draft.terms}
            onChange={(event) => setDraft({ ...draft, terms: event.target.checked })}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          I agree to the Terms and Privacy Policy.
        </label>
        {fieldErrors.terms && <p className="text-sm text-destructive">{fieldErrors.terms}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  error,
  value,
  onValueChange,
  onBlur,
  trailingAction,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  error?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  trailingAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${trailingAction ? "pr-16" : ""} ${error ? "border-destructive placeholder:text-destructive focus-visible:ring-destructive" : ""}`}
        />
        {trailingAction && (
          <button
            type="button"
            onClick={trailingAction.onClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary transition-all duration-200 hover:scale-105 hover:underline active:scale-95"
            aria-label={trailingAction.label}
          >
            {trailingAction.label.startsWith("Show") ? "Show" : "Hide"}
          </button>
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
