"use client";

import { useMemo } from "react";
import Image from "next/image";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = "Searching for amazing places...",
}: LoadingStateProps) {
  // Randomly select a loading GIF each time the component loads
  const loadingGif = useMemo(() => {
    const gifs = ["animals.gif", "lake.gif", "landscape.gif"];
    const randomIndex = Math.floor(Math.random() * gifs.length);
    return `/images/${gifs[randomIndex]}`;
  }, []);

  return (
    <div className="bg-muted rounded-lg p-8 text-center">
      <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
        <Image
          src={loadingGif}
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
