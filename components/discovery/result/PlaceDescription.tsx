"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceDescriptionProps {
  description: string;
}

export default function PlaceDescription({ description }: PlaceDescriptionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">About This Place</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}