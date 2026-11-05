"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, RefreshCw, Mail } from "lucide-react";
import {
  forgotPasswordSchema,
  otpResetPasswordSchema,
  type ForgotPasswordFormData,
  type OtpResetPasswordFormData,
} from "./auth-schemas";
import { AuthFormField } from "./auth-form-field";

export interface ForgotPasswordFormProps {
  initialEmail?: string;
  onSwitchToLogin: () => void;
  onEmailChange?: (email: string) => void;
}

type Step = "REQUEST_OTP" | "ENTER_OTP" | "SUCCESS";

export function ForgotPasswordForm({
  initialEmail = "",
  onSwitchToLogin,
  onEmailChange,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [activeEmail, setActiveEmail] = useState(initialEmail);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend OTP cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1 Form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });

  // Step 2 Form
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors },
    reset: resetOtpForm,
  } = useForm<OtpResetPasswordFormData>({
    resolver: zodResolver(otpResetPasswordSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle Step 1: Send OTP to email
  const onSendOtp = async (data: ForgotPasswordFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    const targetEmail = data.email.trim();
    setActiveEmail(targetEmail);
    onEmailChange?.(targetEmail);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (!res.ok && res.status !== 404) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.error?.message || "Unable to send verification code. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Generic privacy-preserving flow: transition to OTP step
      setStep("ENTER_OTP");
      setResendCooldown(60);
    } catch {
      // In network error / fallback mode, still transition gracefully
      setStep("ENTER_OTP");
      setResendCooldown(60);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP in Step 2
  const onResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setFormError(err?.error?.message || "Could not resend code. Please wait a moment.");
      } else {
        setResendCooldown(60);
      }
    } catch {
      setResendCooldown(60);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 2: Verify OTP and update password
  const onVerifyAndReset = async (data: OtpResetPasswordFormData) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: activeEmail,
          otp: data.otp.trim(),
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        const message = body?.error?.message || "Failed to reset password. Please verify the 6-digit code.";
        setFormError(message);
        setIsSubmitting(false);
        return;
      }

      setStep("SUCCESS");
      resetOtpForm();
    } catch {
      setFormError("A network error occurred. Please verify your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Brand Logo */}
      <div className="mb-4 sm:mb-5">
        <Image
          src="/images/logo/peralagae-logo.png"
          alt="PERALAGAE"
          width={180}
          height={74}
          className="h-10 sm:h-12 w-auto object-contain mx-auto"
          priority
        />
      </div>

      {/* Heading & Supporting Text */}
      <h2
        id="auth-modal-title"
        className="text-xl sm:text-2xl font-serif text-[#111111] tracking-[-0.01em] text-center"
      >
        {step === "REQUEST_OTP" && "Reset Your Password"}
        {step === "ENTER_OTP" && "Enter Verification Code"}
        {step === "SUCCESS" && "Password Reset Complete"}
      </h2>

      <p
        id="auth-modal-description"
        className="text-xs sm:text-[13px] text-[#666666] text-center mt-1 sm:mt-1.5 mb-6 max-w-xs font-normal leading-relaxed"
      >
        {step === "REQUEST_OTP" && (
          "Enter your registered email address and we'll send a 6-digit verification code to reset your password."
        )}
        {step === "ENTER_OTP" && (
          <span>
            We sent a 6-digit code to <strong className="text-[#111111]">{activeEmail}</strong>. Valid for 10 minutes.
          </span>
        )}
        {step === "SUCCESS" && (
          "Your password has been updated securely. You can now sign in with your new credentials."
        )}
      </p>

      {/* Form Error Banner */}
      {formError && (
        <div
          role="alert"
          data-testid="auth-error-banner"
          className="w-full mb-4 p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B] flex items-start gap-2 leading-relaxed rounded-lg"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      {/* STEP 1: Enter Email */}
      {step === "REQUEST_OTP" && (
        <>
          <form onSubmit={handleSubmitEmail(onSendOtp)} className="w-full space-y-4" noValidate>
            <AuthFormField
              id="forgot-password-email"
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="your.name@example.com"
              disabled={isSubmitting}
              error={emailErrors.email?.message}
              {...registerEmail("email", {
                onChange: (e) => {
                  setActiveEmail(e.target.value);
                  onEmailChange?.(e.target.value);
                },
              })}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="forgot-password-submit-button"
              className="w-full h-11 sm:h-12 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs sm:text-[13px] font-semibold uppercase tracking-[0.08em] transition-all duration-250 flex items-center justify-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>Send Verification Code</span>
              )}
            </button>
          </form>

          {/* Back to Sign In Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-[#666666] hover:text-[#C5A572] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </>
      )}

      {/* STEP 2: Enter OTP & New Password */}
      {step === "ENTER_OTP" && (
        <>
          <form onSubmit={handleSubmitOtp(onVerifyAndReset)} className="w-full space-y-3.5" noValidate>
            <div className="w-full">
              <label
                htmlFor="otp-code"
                className="block text-xs font-semibold uppercase tracking-[0.06em] text-[#222222] mb-1.5 flex items-center justify-between"
              >
                <span>6-Digit Verification Code</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("REQUEST_OTP");
                    setFormError(null);
                  }}
                  className="text-[11px] text-[#C5A572] hover:text-[#9A7B3E] font-normal normal-case underline"
                >
                  Change Email
                </button>
              </label>
              <div className="relative">
                <input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  className={`w-full h-11 sm:h-12 px-3.5 sm:px-4 text-center text-lg font-mono tracking-[0.35em] text-[#111111] placeholder:text-[#BBBBBB] bg-white border transition-colors duration-200 outline-none rounded-lg disabled:bg-[#F5F5F5] ${
                    otpErrors.otp
                      ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      : "border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572]"
                  }`}
                  {...registerOtp("otp")}
                />
              </div>
              {otpErrors.otp && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{otpErrors.otp.message}</span>
                </p>
              )}
            </div>

            <AuthFormField
              id="new-password"
              label="New Password"
              type="password"
              isPassword
              autoComplete="new-password"
              placeholder="At least 8 characters (letters & numbers)"
              disabled={isSubmitting}
              error={otpErrors.newPassword?.message}
              {...registerOtp("newPassword")}
            />

            <AuthFormField
              id="confirm-new-password"
              label="Confirm New Password"
              type="password"
              isPassword
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              disabled={isSubmitting}
              error={otpErrors.confirmPassword?.message}
              {...registerOtp("confirmPassword")}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 sm:h-12 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs sm:text-[13px] font-semibold uppercase tracking-[0.08em] transition-all duration-250 flex items-center justify-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>

          {/* Resend Code Action */}
          <div className="mt-4 flex items-center justify-between w-full text-xs text-[#666666] pt-2 border-t border-[#F0EFEA]">
            <button
              type="button"
              onClick={onResendOtp}
              disabled={resendCooldown > 0 || isSubmitting}
              className="inline-flex items-center gap-1.5 hover:text-[#111111] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isSubmitting ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
              </span>
            </button>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="hover:text-[#111111] transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </>
      )}

      {/* STEP 3: Success Confirmation */}
      {step === "SUCCESS" && (
        <div className="w-full text-center py-4 space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF8F5] text-[#C5A572] mx-auto border border-[#EAE6DF] shadow-sm">
            <CheckCircle2 className="h-7 w-7 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#111111] uppercase tracking-[0.08em]">
              Security Credentials Updated
            </h3>
            <p className="text-xs text-[#666666] leading-relaxed max-w-xs mx-auto">
              Your password has been securely reset. You can now access your PERALAGAE account and explore your fine jewellery bag.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full h-11 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-[0.08em] transition-colors duration-200 mt-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            Sign In with New Password
          </button>
        </div>
      )}
    </div>
  );
}
