# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: User Instructions

- Follow the DRY principle.
- Extract long components into smaller components.
- Use Clean Code principles.
- Question the user if needed instead of guessing.
- Never run `pnpm dev` or `pnpm build` at the end of tasks. The user will handle these checks manually.
- **Always verify both mobile (`md:hidden`) and desktop (`hidden md:block`) layouts when implementing UI features.** Test both responsive breakpoints and ensure consistent functionality across platforms.
- **Comment Policy: Only add critically important comments that explain WHY, not WHAT.** Avoid descriptive comments that can be easily understood from the code itself. Focus on business logic, complex algorithms, or non-obvious implementation decisions.

## App buisiness logic

- The app is a nature places discovery app.
- It uses AI to save the user's time by suggesting places based on their preferences.
- The app is a web app which will be used mostly on mobile devices.

## Development Commands

### Build and Development

- `pnpm dev` - Start development server with Turbopack (Next.js)
- `pnpm build` - Build the application
- `pnpm lint` - Run ESLint across all files
- `pnpm generate-types` - Generate TypeScript types from Supabase

## Project Architecture

### Next.js 15 Application Structure

This is a Next.js 15 application using App Router with the following key directories:

- `app/(app)/` - Main application routes requiring authentication
- `app/(auth-pages)/` - Authentication routes (sign-in, sign-up, forgot-password)
- `actions/` - Server actions for all backend functionality
- `components/` - Reusable UI components organized by feature
- `utils/supabase/` - Supabase client/server utilities

### Authentication Architecture

- **Supabase Auth** with SSR support
- **Middleware** (`middleware.ts`) handles route protection:
  - Root path (`/`) requires authentication
  - Protected routes: `/discover`, `/past-places`, `/protected`
  - Unauthenticated users redirected to `/sign-in`
- Auth utilities in `utils/supabase/` handle client/server contexts

### Core Features Architecture

#### UI Patterns

- **Radix UI + shadcn/ui**: Consistent component library > Never make updates to the shadcn/ui library in 'components/ui' directory. if needed, create a custom version in 'components/ui/custom' directory.
- **Framer Motion**: Page transitions and loading animations
- **Loading States**: Random WebP animations from `public/animated/`
- **Form Validation**: React Hook Form + Zod schemas

### Server Actions Architecture

#### Key Server Actions

- `discover.actions.ts` - AI places search with batch loading
- `history.actions.ts` - Search history management
- `place.actions.ts` - Saved places functionality
- `weather.actions.ts` - Weather forecast integration
- `map-search-to-form.actions.ts` - AI-powered form pre-filling

#### State Management

- **React Hooks**: Local component state
- **Form State**: React Hook Form for complex forms
- **Server State**: Server actions for all backend operations
- **Navigation State**: Context provider for loading indicators

### Styling Architecture

- **Tailwind CSS 4.1** with custom design system
- **CSS Variables**: Theme-aware color system
- **Responsive Design**: Mobile-first approach
- **Unit Preference**: Use `rem` units instead of `px` for better accessibility
- **Animation**: Framer Motion for smooth transitions

### Type Safety

- **TypeScript 5.8** with strict configuration
- **Zod Schemas**: Runtime validation for forms and API responses
- **Type Definitions**: Centralized in `types/` directory
- **Supabase Types**: Auto-generated in `types/supabase.ts` using `pnpm generate-types`

## Development Guidelines

### Code Patterns

- **Server Actions**: All backend logic in server actions with auth checks. Never use client side requests to APIs.
- **Component Composition**: Small, focused components with clear interfaces
- **Error Boundaries**: Graceful error handling throughout the app
- **Loading States**: Consistent loading indicators and skeleton screens

### File Organization

- **Feature-based**: Components grouped by functionality
- **Shared Utilities**: Common functions in `lib/` and `utils/`
- **Type Definitions**: Centralized type definitions
- **Constants**: Configuration values in `constants/`
