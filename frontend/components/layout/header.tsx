"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MountainIcon, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "./sidebar"; // Import the sidebar content
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient(); // Create client once

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/sign-in");
    router.refresh(); // to update server components and middleware
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-between">
      <div className="flex items-center gap-2">
        {/* SheetTrigger for mobile sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              {" "}
              {/* Hidden on md and larger screens */}
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:w-80 md:hidden">
            {" "}
            {/* Ensure content is also hidden on larger screens if only for drawer */}
            {/* Reuse AppSidebar content here for the drawer */}
            {/* We need to pass setIsOpen or handle it differently for drawer if AppSidebar manages its own state */}
            {/* For simplicity, let's re-declare a minimal nav for the drawer for now */}
            <nav className="flex flex-col gap-4 p-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold mb-4"
              >
                <MountainIcon className="h-6 w-6" />
                <span>NatureTrips AI</span>
              </Link>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className="text-muted-foreground hover:text-foreground"
              >
                Search History
              </Link>
              <Button className="w-full justify-start mt-auto">
                Start New Search
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        {/* App Name/Logo for larger screens, hidden on small to avoid clash with drawer trigger */}
        <Link
          href="/"
          className="hidden items-center gap-2 text-lg font-semibold md:flex"
        >
          <MountainIcon className="h-6 w-6" />
          <span>NatureTrips AI</span>
        </Link>
      </div>

      <div>
        {isLoading ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle2 className="h-6 w-6" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.email || "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem> */}
              {/* <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem> */}
              {/* <DropdownMenuSeparator /> */}
              <DropdownMenuItem onClick={handleSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => router.push("/sign-in")} variant="outline">
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient(); // Create client once

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/sign-in");
    router.refresh(); // to update server components and middleware
  };

  const navItems = [
    { href: "/", label: "Dashboard (Map)" },
    { href: "/history", label: "Search History" },
    // Add more items later
  ];

  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 sm:w-80 md:hidden p-0">
          <div className="flex flex-col h-full p-4">
            <div className="flex items-center gap-2 text-lg font-semibold mb-6">
              <MountainIcon className="h-6 w-6" />
              <span>NatureTrips AI</span>
            </div>

            <nav className="flex flex-col gap-1 mb-4">
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="justify-start text-left h-auto py-2.5 px-3"
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>

            <div className="flex-1 flex flex-col">
              <div className="mt-auto">
                <Button className="w-full justify-start mb-6">
                  Start New Search
                </Button>

                <div className="border-t pt-4 mt-2">
                  {isLoading ? (
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted mx-auto" />
                  ) : user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2"
                        >
                          <UserCircle2 className="h-5 w-5" />
                          <span>{user.email || "My Account"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {user.email || "My Account"}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      onClick={() => router.push("/sign-in")}
                      variant="outline"
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// This component is now only used for the mobile user menu at the top right
// The sidebar handles the main navigation
export function MobileUserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="md:hidden">
      {isLoading ? (
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      ) : user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle2 className="h-6 w-6" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.email || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={() => router.push("/sign-in")}
          variant="outline"
          size="sm"
        >
          Sign In
        </Button>
      )}
    </div>
  );
}

// Using the same MountainIcon from sidebar for consistency
// function MountainIcon(props: React.SVGProps<SVGSVGElement>) { ... } // Assuming it's available or defined elsewhere
