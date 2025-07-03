"use client";

import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  onSearchClick?: () => void;
}

export default function EmptyState({
  message = "No trips to display",
  onSearchClick,
}: EmptyStateProps) {
  return (
    <div className="bg-muted rounded-lg p-8 text-center">
      <p className="text-lg mb-4">{message}</p>
      {onSearchClick && (
        <Button onClick={onSearchClick}>
          <Filter className="mr-2 h-4 w-4" />
          Search Places
        </Button>
      )}
    </div>
  );
}
