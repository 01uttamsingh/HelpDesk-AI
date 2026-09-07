import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Loader2, AlertCircle, Pencil } from "lucide-react";
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
import type { UserItem } from "../types";
import { useUpdateUser } from "../hooks/useUpdateUser";
import {
  editUserSchema,
  type EditUserFormValues,
} from "../schemas/user.schema";
import { PasswordField } from "./PasswordField";
import { getErrorMessage } from "../utils/error";

export type { EditUserFormValues };

interface EditUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, isOpen, onClose }: EditUserModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const updateUserMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
    },
  });

  // Pre-populate or reset form when user or isOpen changes
  useEffect(() => {
    if (isOpen && user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        password: "",
      });
      setServerError(null);
    }
  }, [isOpen, user, reset]);

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;
    setServerError(null);

    // Build payload: only include password if provided
    const payload: { name: string; email: string; password?: string } = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
    };

    if (values.password && values.password.trim().length > 0) {
      payload.password = values.password;
    }

    try {
      await updateUserMutation.mutateAsync({ id: user.id, input: payload });
      onClose();
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, "Failed to update user"));
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
                <Pencil className="h-4 w-4" />
              </div>
              <DialogTitle>Edit User</DialogTitle>
            </div>
            <DialogDescription>
              Update team member details or change their password.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Update Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="edit-user-name"
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
              <Label htmlFor="edit-user-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="edit-user-email"
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

            {/* Password Field (Optional Reusable) */}
            <PasswordField
              id="edit-user-password"
              label="Password"
              placeholder="Leave blank to keep current password"
              optional={true}
              error={errors.password?.message}
              registration={register("password")}
            />

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="gap-2"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export default EditUserModal;
