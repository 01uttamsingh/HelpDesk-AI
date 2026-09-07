import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Reset form and errors whenever the modal is closed or opened
  useEffect(() => {
    if (!isOpen) {
      reset();
      setServerError(null);
      setShowPassword(false);
    }
  }, [isOpen, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const res = await api.post<{
        success: boolean;
        data?: unknown;
        error?: string;
      }>("/api/users", {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (!res.data.success) {
        throw new Error(res.data.error || "Failed to create user");
      }

      return res.data;
    },
    onSuccess: () => {
      // Invalidate users query to update the table immediately
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      setServerError(null);
      onClose();
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.error ||
            err.message ||
            "Failed to create user. Please try again."
        );
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    },
  });

  const onSubmit = (values: CreateUserFormValues) => {
    setServerError(null);
    mutation.mutate(values);
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <DialogTitle>Create New User</DialogTitle>
            </div>
            <DialogDescription className="mt-1">
              Add a new team member to your helpdesk platform.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="size-4" />
              <AlertTitle>Creation Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 mt-2"
            noValidate
          >
            {/* Name Field */}
            <div className="space-y-1.5">
              <Label htmlFor="create-user-name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="create-user-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  aria-invalid={!!errors.name}
                  className="pl-9 h-9"
                  disabled={mutation.isPending}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs font-medium text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="create-user-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="create-user-email"
                  type="email"
                  placeholder="e.g. jane@example.com"
                  aria-invalid={!!errors.email}
                  className="pl-9 h-9"
                  disabled={mutation.isPending}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="create-user-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="create-user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className="pl-9 pr-10 h-9"
                  disabled={mutation.isPending}
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>Create User</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export default CreateUserModal;
