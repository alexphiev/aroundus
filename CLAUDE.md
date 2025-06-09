# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `pnpm dev` - Start development server with Turbopack (Next.js)
- `pnpm build` - Build all packages and frontend
- `pnpm lint` - Run linting across all packages
- `pnpm check-types` - Type checking across all packages
- `pnpm format` - Format code with Prettier

### Database Types
- `cd packages/database-types && pnpm generate-types` - Generate TypeScript types from Supabase

## Project Architecture

### Monorepo Structure
This is a Turborepo monorepo with:
- `frontend/` - Next.js 15 application using App Router
- `packages/database-types/` - Shared TypeScript types generated from Supabase

### Frontend Architecture

#### App Router Structure
- `(app)/` - Main application routes (requires authentication)
- `(auth-pages)/` - Authentication routes (sign-in, sign-up, forgot-password)
- Protected routes: `/search-trip`, `/search-history`, `/trip-results`

#### Authentication & Middleware
- Uses Supabase Auth with SSR
- Middleware handles route protection and redirects
- Unauthenticated users redirected to `/sign-in`
- Root path (`/`) requires authentication

#### Core Features
- **Trip Search**: AI-powered nature trip suggestions using Google Gemini API
- **Progressive Results**: Returns 3-star (iconic), 2-star (good), 1-star (hidden gems) destinations
- **Map Integration**: MapLibre GL JS for interactive trip visualization
- **Search History**: User trip search history tracking

#### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth with SSR
- **AI**: Google Gemini API (`gemma-3-27b-it` model)
- **Maps**: MapLibre GL JS with custom markers
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Forms**: React Hook Form with Zod validation

#### State Management
- Server Actions for AI trip search (`frontend/app/(app)/search-trip/actions.ts`)
- Client-side state with React hooks
- Form validation with Zod schemas

#### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - Google Gemini API key for AI functionality

## AI Trip Search Architecture

The trip search uses a sophisticated progressive approach:
1. **3-Star Results**: Iconic, must-visit destinations
2. **2-Star Results**: High-quality but less crowded spots  
3. **1-Star Results**: Hidden gems and secret locations

Each AI request maintains conversation context to avoid duplicates and uses deduplication logic based on location proximity and name similarity.

### Progressive Loading Implementation
- `handleProgressiveTripSearchByStage` executes each search stage separately
- Results display immediately as each stage completes
- Users can interact with results while search continues
- Map bounds update progressively to show new results
- Walking animation displays until first results arrive

## Code Patterns

### Server Actions
- All AI functionality in server actions with proper authentication checks
- Zod validation for form data
- Error handling with user-friendly messages

### Map Components
- Custom MapLibre markers with activity-based icons
- Landscape-based color coding
- Reactive marker highlighting

### Database Integration
- Supabase client/server utilities in `utils/supabase/`
- TypeScript types auto-generated from database schema
- Workspace dependency: `"database-types": "workspace:*"`