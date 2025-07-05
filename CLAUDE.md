# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `pnpm dev` - Start development server with Turbopack (Next.js)
- `pnpm build` - Build the application
- `pnpm lint` - Run ESLint across all files
- `pnpm generate-types` - Generate TypeScript types from Supabase

**IMPORTANT**: Never run `pnpm dev` or `pnpm build` at the end of tasks. The user will handle these checks manually.

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_PROJECT_ID` - Supabase project ID for type generation
- `GEMINI_API_KEY` - Google Gemini API key for AI functionality
- `OPENWEATHER_API_KEY` - OpenWeather API key for weather data

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
  - Protected routes: `/discover`, `/past-trips`, `/protected`
  - Unauthenticated users redirected to `/sign-in`
- Auth utilities in `utils/supabase/` handle client/server contexts

### Core Features Architecture

#### AI-Powered Trip Discovery
- **Batch-based Search**: `handleTripSearchBatch` in `actions/discover.actions.ts`
- **Google Gemini Integration**: Uses `gemini-2.5-flash` model for trip suggestions
- **Batch Loading**: Returns 4 results per batch with "load more" functionality
- **Conversation Context**: Maintains AI conversation history to avoid duplicates
- **Star Rating System**: 1-3 stars based on relevance to user's specific request

#### Search Flow Architecture
1. **Form Submission**: `DiscoverFormModal` collects user preferences
2. **AI Search**: Server action processes request with conversation context
3. **Progressive Display**: Results appear immediately, more can be loaded
4. **Map Integration**: MapLibre GL JS shows results with custom markers
5. **History Tracking**: Searches saved to Supabase for later retrieval

#### Map Integration
- **MapLibre GL JS** for interactive maps
- **Custom Markers**: Activity and landscape-based icons
- **Real-time Updates**: Map bounds adjust as new results load
- **User Location**: GPS-based starting point for trip suggestions

### Component Architecture

#### Discovery Components (`components/discovery/`)
- **Form**: `DiscoverFormModal` - Search form with AI-powered pre-filling
- **Results**: `DiscoveryResult` - Main results container with map integration
- **Cards**: `PlaceCard` - Individual trip result cards
- **Map**: `Map` - MapLibre integration with markers and popups

#### UI Patterns
- **Radix UI + shadcn/ui**: Consistent component library
- **Framer Motion**: Page transitions and loading animations
- **Loading States**: Random WebP animations from `public/animated/`
- **Form Validation**: React Hook Form + Zod schemas

### Server Actions Architecture

#### Key Server Actions
- `discover.actions.ts` - AI trip search with batch loading
- `history.actions.ts` - Search history management
- `place.actions.ts` - Saved trips functionality
- `weather.actions.ts` - Weather forecast integration
- `map-search-to-form.actions.ts` - AI-powered form pre-filling

#### AI Integration Patterns
- **Conversation Management**: Maintains context across batch requests
- **Robust JSON Parsing**: Multiple fallback methods for AI responses
- **Error Handling**: User-friendly error messages with fallbacks
- **Authentication**: All actions validate user authentication

### Data Flow Architecture

#### Search Process
1. User submits form → `handleTripSearchBatch`
2. AI generates 4 results with conversation context
3. Results displayed with map markers
4. User can load more batches maintaining context
5. Search saved to history with all results

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

## AI Trip Search Implementation

### Batch Search System
The application uses a simplified batch-based search replacing the old progressive 3-stage system:

- **Batch Size**: 4 results per request
- **Load More**: Additional batches loaded on demand
- **Context Preservation**: AI conversation history prevents duplicates
- **Star Rating**: 1-3 stars based on relevance to user request (not popularity)

### Search Criteria Processing
- **Activity Type**: Hiking, biking, photography, etc.
- **Timing**: Weather-aware scheduling with forecast integration
- **Distance/Transport**: Realistic travel time calculations
- **Special Requirements**: Child-friendly, accessibility, dog-friendly options
- **User Intent**: Additional search info gets highest priority in AI prompts

### Weather Integration
- **OpenWeather API**: 5-day forecasts for trip planning
- **Contextual Recommendations**: Weather data fed to AI for better suggestions
- **Timing Advice**: Best/worst times to visit based on conditions

## Development Guidelines

### Code Patterns
- **Server Actions**: All backend logic in server actions with auth checks
- **Component Composition**: Small, focused components with clear interfaces
- **Error Boundaries**: Graceful error handling throughout the app
- **Loading States**: Consistent loading indicators and skeleton screens

### File Organization
- **Feature-based**: Components grouped by functionality
- **Shared Utilities**: Common functions in `lib/` and `utils/`
- **Type Definitions**: Centralized type definitions
- **Constants**: Configuration values in `constants/`

### Important Implementation Notes
- Navigation loading implemented via React Context in `NavigationLoader.tsx`
- Map style configuration in `public/assets/map-style.json`
- Animated loading states use random WebP files from `public/animated/`
- Form pre-filling uses AI to map search queries to structured form data
- Star ratings represent relevance to user request, not destination popularity

### Styling Guidelines
- **Unit Preference**: Use `rem` units for styling measurements when possible instead of `px`
- `rem` units provide better scalability and accessibility
