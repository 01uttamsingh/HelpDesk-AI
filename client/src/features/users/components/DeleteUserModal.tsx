import { useState, useEffect } from "react";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { UserItem } from "../types";
import { useDeleteUser } from "../hooks/useDeleteUser";
import { getErrorMessage } from "../utils/error";

interface DeleteUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteUserModal({
  user,
  isOpen,
  onClose,
}: DeleteUserModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const deleteUserMutation = useDeleteUser();

  // Clear server error when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
    }
  }, [isOpen, user]);

  const handleDelete = async () => {
    if (!user) return;
    setServerError(null);

    try {
      await deleteUserMutation.mutateAsync(user.id);
      onClose();
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, "Failed to delete user"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <Trash2 className="h-4 w-4" />
              </div>
              <DialogTitle>Delete User</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-foreground">
                {user?.name}
              </strong>{" "}
              ({user?.email})? This user will be deactivated and removed from the
              platform.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Deletion Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={deleteUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
              className="gap-2"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete User</span>
              )}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export default DeleteUserModal;
