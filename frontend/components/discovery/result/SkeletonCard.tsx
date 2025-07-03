"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SkeletonCard() {
  return (
    <Card className="h-full flex flex-col animate-pulse">
      <CardHeader className="p-4 pb-2 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex gap-1">
            <div className="bg-gray-200 h-7 w-7 rounded-full"></div>
            <div className="bg-gray-200 h-7 w-7 rounded-full"></div>
          </div>
          <div className="bg-gray-200 h-8 w-8 rounded"></div>
        </div>
        <div className="bg-gray-200 h-6 w-3/4 rounded mt-2"></div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
        <div className="bg-gray-200 h-4 w-full rounded mb-2"></div>
        <div className="bg-gray-200 h-4 w-2/3 rounded mb-3"></div>

        <div className="flex gap-2 mb-3">
          <div className="bg-gray-200 h-6 w-20 rounded"></div>
          <div className="bg-gray-200 h-6 w-16 rounded"></div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-16 rounded ml-1"></div>
        </div>

        <div className="bg-gray-200 h-3 w-full rounded mb-1"></div>
        <div className="bg-gray-200 h-3 w-3/4 rounded"></div>

        <div className="flex items-center text-xs mt-auto pt-2 border-t">
          <div className="bg-gray-200 h-3 w-3 rounded mr-1"></div>
          <div className="bg-gray-200 h-3 w-24 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
}
