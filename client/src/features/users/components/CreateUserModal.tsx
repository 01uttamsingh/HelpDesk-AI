import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Loader2, AlertCircle, UserPlus } from "lucide-react";
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
import { useCreateUser } from "../hooks/useCreateUser";
import {
  createUserSchema,
  type CreateUserFormValues,
} from "../schemas/user.schema";
import { PasswordField } from "./PasswordField";
import { getErrorMessage } from "../utils/error";

export type { CreateUserFormValues };

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createUserMutation = useCreateUser();

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

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        email: "",
        password: "",
      });
      setServerError(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: CreateUserFormValues) => {
    setServerError(null);
    try {
      await createUserMutation.mutateAsync(values);
      onClose();
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, "Failed to create user"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <UserPlus className="h-4 w-4" />
              </div>
              <DialogTitle>Create New User</DialogTitle>
            </div>
            <DialogDescription>
              Add a new team member to your helpdesk platform.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Creation Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="create-user-name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-9"
                  aria-invalid={!!errors.name}
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
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="create-user-email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field (Reusable) */}
            <PasswordField
              id="create-user-password"
              label="Password"
              placeholder="••••••••"
              error={errors.password?.message}
              registration={register("password")}
            />

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="gap-2"
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create User</span>
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
