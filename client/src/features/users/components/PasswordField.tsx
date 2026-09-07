import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PasswordFieldProps {
  id: string;
  label?: string;
  placeholder?: string;
  optional?: boolean;
  error?: string;
  registration: UseFormRegisterReturn;
}

export function PasswordField({
  id,
  label = "Password",
  placeholder = "••••••••",
  optional = false,
  error,
  registration,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="pl-9 pr-10"
          aria-invalid={!!error}
          {...registration}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
