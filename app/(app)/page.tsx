"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Sparkles, Dumbbell, Leaf, Compass, Search } from "lucide-react";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to discover page with search query
      router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // Navigate to discover page
      router.push("/discover");
    }
  };

  const handleShortcut = (type: string) => {
    // Navigate to discover page with predefined search based on type
    const shortcuts = {
      "feeling-lucky": "/discover?q=feeling%20lucky",
      exercise: "/discover?q=exercise",
      relax: "/discover?q=relax",
      "something-new": "/discover?q=something%20new",
    };

    router.push(shortcuts[type as keyof typeof shortcuts] || "/discover");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Title */}
        <div className="space-y-4 mb-16">
          <h1 className="text-3xl md:text-4xl text-primary font-regular tracking-wide">
            Reconnect with nature around you
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative max-w-4xl mx-auto">
          <Input
            type="text"
            placeholder="What do you want to discover today?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full h-16 text-lg px-6 pr-14 rounded-2xl border-2 border-gray-200 focus:border-gray-400 focus:ring-0 shadow-sm bg-white/60 backdrop-blur-sm"
          />
          <Button
            onClick={handleSearch}
            size="icon"
            className="absolute right-2 top-2 h-12 w-12 rounded-xl"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Shortcut Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => handleShortcut("feeling-lucky")}
            className="h-16 rounded-2xl border-2 hover:shadow-md transition-all group bg-white/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Feeling Lucky</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut("exercise")}
            className="h-16 rounded-2xl border-2 hover:shadow-md transition-all group bg-white/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <Dumbbell className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium">I need to exercise</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut("relax")}
            className="h-16 rounded-2xl border-2 hover:shadow-md transition-all group bg-white/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <Leaf className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Let's Relax</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut("something-new")}
            className="h-16 rounded-2xl border-2 hover:shadow-md transition-all group bg-white/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <Compass className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Something new</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
