"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { loginSchema, type LoginFormData } from "./auth-schemas";
import { AuthFormField } from "./auth-form-field";
import { GoogleSignInButton } from "./google-sign-in-button";

import { loginAdmin } from "@/services/admin-auth-service";
import { useRouter } from "next/navigation";
import { useStorefront } from "@/providers/storefront-provider";

export interface LoginFormProps {
  initialEmail?: string;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  onSuccess?: () => void;
  onEmailChange?: (email: string) => void;
}

export function LoginForm({
  initialEmail = "",
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onSuccess,
  onEmailChange,
}: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { loginCustomer, authReturnUrl, setAuthReturnUrl } = useStorefront();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail,
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      // 1. If StorefrontProvider is mounted with customer auth, attempt customer login
      let isUnmounted = false;
      try {
        const loggedInCustomer = await loginCustomer({
          email: data.email.trim(),
          password: data.password,
        });

        onSuccess?.();

        if (!loggedInCustomer?.isProfileComplete) {
          const returnTarget = authReturnUrl ? `?returnUrl=${encodeURIComponent(authReturnUrl)}` : "";
          setAuthReturnUrl(null);
          router.push(`/profile/setup${returnTarget}`);
        } else if (authReturnUrl) {
          const dest = authReturnUrl;
          setAuthReturnUrl(null);
          router.push(dest);
        }
        return;
      } catch (custErr: unknown) {
        const cErr = custErr as Error;
        if (cErr?.message === "StorefrontProvider not mounted") {
          isUnmounted = true;
        } else {
          // If customer login fails, check if admin credentials are provided
          try {
            const adminResult = await loginAdmin({
              email: data.email.trim(),
              password: data.password,
            });

            if (adminResult?.admin?.role === "admin") {
              onSuccess?.();
              router.push("/admin/dashboard");
              return;
            }
          } catch {
            // Keep original customer error
          }
          throw cErr;
        }
      }

      // 2. Fallback to loginAdmin (when unmounted in isolated tests or admin portal)
      if (isUnmounted) {
        const authResult = await loginAdmin({
          email: data.email.trim(),
          password: data.password,
        });

        if (authResult?.admin?.role === "admin") {
          onSuccess?.();
          router.push("/admin/dashboard");
        } else {
          onSuccess?.();
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.includes("fetch") ||
          err.message.includes("network") ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("connect")
        ) {
          setFormError(
            "Unable to connect to the authentication server. Please ensure the backend server is running and try again."
          );
        } else if (err.message === "Invalid email or password") {
          setFormError("Invalid email or password. Please try again.");
        } else {
          setFormError(err.message || "Invalid email or password. Please try again.");
        }
      } else {
        setFormError("An unexpected authentication error occurred. Please try again.");
      }
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
        className="text-xl sm:text-2xl font-normal text-[#111111] tracking-[-0.01em] text-center"
      >
        Welcome Back
      </h2>
      <p
        id="auth-modal-description"
        className="text-xs sm:text-[13px] text-[#666666] text-center mt-1 sm:mt-1.5 mb-6 max-w-xs font-normal"
      >
        Sign in to continue your jewellery journey.
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

      {/* Sign In Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4" noValidate>
        {/* Email Address */}
        <AuthFormField
          id="login-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="your.name@example.com"
          disabled={isSubmitting}
          error={errors.email?.message}
          {...register("email", {
            onChange: (e) => onEmailChange?.(e.target.value),
          })}
        />

        {/* Password */}
        <div>
          <AuthFormField
            id="login-password"
            label="Password"
            type="password"
            isPassword
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Forgot Password Link */}
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs text-[#666666] hover:text-[#C5A572] hover:underline underline-offset-2 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* NOTE: Strictly NO "Remember me" checkbox anywhere per requirements */}

        {/* Primary Sign In Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="login-submit-button"
          className="w-full h-11 sm:h-12 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs sm:text-[13px] font-semibold uppercase tracking-[0.08em] transition-all duration-250 flex items-center justify-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Elegant Divider: OR */}
      <div className="w-full flex items-center my-5">
        <div className="flex-1 h-px bg-[#EAE6DF]" />
        <span className="px-3 text-[11px] font-medium tracking-[0.08em] text-[#999999] uppercase select-none">
          OR
        </span>
        <div className="flex-1 h-px bg-[#EAE6DF]" />
      </div>

      {/* Google Sign In */}
      <GoogleSignInButton disabled={isSubmitting} />

      {/* Bottom Switch to Register */}
      <div className="mt-6 text-center text-xs sm:text-[13px] text-[#666666]">
        <span>New to Peralagae?{" "}</span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#111111] hover:text-[#C5A572] font-semibold underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}
