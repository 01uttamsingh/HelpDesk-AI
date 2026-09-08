import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface BackToTicketsButtonProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  testId?: string;
}

export function BackToTicketsButton({
  variant = "default",
  size = "sm",
  className = "gap-2",
  testId = "back-to-tickets-btn",
}: BackToTicketsButtonProps = {}) {
  return (
    <Link to="/tickets">
      <Button variant={variant} size={size} className={className} data-testid={testId}>
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Button>
    </Link>
  );
}
