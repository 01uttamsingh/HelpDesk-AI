import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LifeBuoy,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSession } from "../context/AuthContext";
import { signIn } from "../lib/auth-client";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // If already logged in, redirect to home page
  if (!session.isPending && session.data?.user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const res = await signIn.email({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (res.error) {
        setServerError(res.error.message || "Invalid email or password. Please try again.");
      } else {
        await session.refetch();
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to Helpdesk
          </h1>
          <p className="text-sm text-slate-600">
            Enter your credentials to access your support dashboard
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          {serverError && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1 font-medium">{serverError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 text-left"
              >
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  placeholder="admin@example.com"
                  className={`block w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 text-left font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 text-left"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••"
                  className={`block w-full rounded-lg border py-2 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 text-left font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
