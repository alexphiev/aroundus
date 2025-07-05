"use client";

import { useMemo } from "react";
import Image from "next/image";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = "Searching for amazing places...",
}: LoadingStateProps) {
  // Randomly select a loading animation each time the component loads
  const loadingImage = useMemo(() => {
    const animations = [
      "duck.webp",
      "woodpecker.webp",
      "bee.webp",
      "bear.webp",
      "squirrel.webp",
      "horse.webp",
      "coral.webp",
    ];
    const randomIndex = Math.floor(Math.random() * animations.length);
    return `/animated/${animations[randomIndex]}`;
  }, []);

  return (
    <div className="p-8 text-center">
      <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
        <Image
          src={loadingImage}
          alt="Loading animation"
          width={160}
          height={160}
          className="rounded-lg object-cover"
          unoptimized
        />
      </div>
      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  );
}
