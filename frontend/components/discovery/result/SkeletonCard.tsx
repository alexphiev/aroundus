"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SkeletonCard() {
  return (
    <Card className="card-layout animate-pulse">
      <CardHeader className="layout-card-header">
        <div className="layout-flex-between">
          <div className="flex gap-1">
            <div className="skeleton-icon"></div>
            <div className="skeleton-icon"></div>
          </div>
          <div className="skeleton-button"></div>
        </div>
        <div className="skeleton-title w-3/4 mt-2"></div>
      </CardHeader>
      <CardContent className="layout-card-content">
        <div className="skeleton-text w-full mb-2"></div>
        <div className="skeleton-text w-2/3 mb-3"></div>

        <div className="flex gap-2 mb-3">
          <div className="skeleton-base h-6 w-20"></div>
          <div className="skeleton-base h-6 w-16"></div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <div className="skeleton-base h-3 w-3"></div>
          <div className="skeleton-base h-3 w-3"></div>
          <div className="skeleton-base h-3 w-3"></div>
          <div className="skeleton-base h-3 w-16 ml-1"></div>
        </div>

        <div className="skeleton-base h-3 w-full mb-1"></div>
        <div className="skeleton-base h-3 w-3/4"></div>

        <div className="flex items-center text-xs mt-auto pt-2 border-t">
          <div className="skeleton-base h-3 w-3 mr-1"></div>
          <div className="skeleton-base h-3 w-24"></div>
        </div>
      </CardContent>
    </Card>
  );
}
