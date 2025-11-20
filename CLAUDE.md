# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: User Instructions

- Follow the DRY principle.
- Extract long components into smaller components.
- Use Clean Code principles.
- Question the user if not 100% sure instead of guessing.
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
- `pnpm type-check` - TypeScript type checking
- `pnpm generate-types` - Generate TypeScript types from Supabase

### Database Enrichment Scripts

Scripts for populating and enriching the places database:

**Data Fetching:**
- `pnpm fetch-osm-places` - Fetch places from OpenStreetMap
- `pnpm fetch-overture-places` - Fetch places from Overture Maps
- `pnpm fetch-french-regional-parks` - Fetch French regional parks
- `pnpm fetch-french-national-parks` - Fetch French national parks
- `pnpm fetch-photos` - Fetch photos for places (Wikimedia + Google Places)
- `pnpm fetch-ratings` - Fetch ratings from Google Places API

**Data Analysis & Enhancement:**
- `pnpm analyze-place-website` - Analyze a single place's website with AI
- `pnpm batch-analyze-place-websites` - Batch analyze multiple place websites
- `pnpm analyze-place-wikipedia` - Analyze a place's Wikipedia page
- `pnpm batch-analyze-place-wikipedias` - Batch analyze Wikipedia pages
- `pnpm analyze-place-reddit` - Analyze Reddit discussions about a place
- `pnpm analyze-urls` - Extract places from URLs (travel guides, blogs)

**Data Management:**
- `pnpm verify-places` - Verify generated places against OSM
- `pnpm recalculate-scores` - Recalculate quality scores for all places
- `pnpm migrate-place-types` - Migrate place types
- `pnpm remove-places` - Remove places from database
- `pnpm clean-invalid-wikipedia` - Clean invalid Wikipedia entries

## Project Architecture

### Next.js 15 Application Structure

This is a Next.js 15 application using App Router with the following key directories:

- `app/(app)/` - Main application routes requiring authentication
- `app/(auth-pages)/` - Authentication routes (sign-in, sign-up, forgot-password)
- `actions/` - Server actions for all backend functionality
- `components/` - Reusable UI components organized by feature
- `services/` - Business logic services (AI, geocoding, places, etc.)
- `db/` - Database access layer (Supabase queries)
- `utils/` - Utility functions and helpers
- `scripts/` - Data enrichment and management scripts
- `types/` - TypeScript type definitions

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
- **Shared Utilities**: Common functions in `utils/`
- **Type Definitions**: Centralized type definitions in `types/`
- **Constants**: Configuration values in `constants/`

## Data Enhancement System

The application includes comprehensive data enrichment services that enhance place records with information from multiple sources:

### Enhancement Services

- **AI Service** (`services/ai-backend.service.ts`) - Google Gemini integration for content summarization with relevance filtering
- **Website Analysis** - HTTP-based text extraction and analysis from place websites using Cheerio
- **Reddit Service** - Official Reddit API integration to find and analyze discussions about places
- **Wikipedia Service** - Wikipedia API integration with multi-language support (French/English)
- **Photo Fetcher** - Wikimedia Commons and Google Places photo fetching
- **Ratings Fetcher** - Google Places ratings and review collection

### Quality Scoring System

Places receive quality points based on data sources and enhancements (configured in `services/score-config.service.ts`):

**Base Scores:**
- Base place: 1 point
- National park: 10 points
- Regional park: 5 points

**Enhancement Scores:**
- Has website: +1 point
- Has photos: +2 points
- Has Reddit info: +2 points
- Wikipedia score: variable (0-8 points based on article quality)
- Google rating: calculated from rating × count
- Verified generated place: +1 point

### Database Layer (`db/`)

Centralized database access functions for:
- `places.ts` - Main places table queries and updates
- `generated-places.ts` - AI-generated place suggestions
- `place-photos.ts` - Photo management
- `wikipedia.ts` - Wikipedia article data
- `sources.ts` - URL sources for place discovery

### Required Environment Variables

```bash
# Supabase (for scripts - without NEXT_PUBLIC prefix)
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key

# AI & Enhancement
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Reddit API
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
```

### Enhancement Logic

The system only adds information deemed relevant by AI. It prefers no information over irrelevant or poor quality data. All content is filtered through AI prompts emphasizing relevance to nature/outdoor activities and visitor planning.
