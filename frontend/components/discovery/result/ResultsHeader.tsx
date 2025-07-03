"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ResultsHeaderProps {
  title: string;
  subtitle: string;
  onNewSearch?: () => void;
}

export default function ResultsHeader({
  title,
  subtitle,
  onNewSearch,
}: ResultsHeaderProps) {
  return (
    <div className="flex-shrink-0 pt-6 pb-4 bg-background">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          variant="default"
          onClick={onNewSearch}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Search
        </Button>
      </div>
    </div>
  );
}
