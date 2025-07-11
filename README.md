# Around Us - AI-Powered Nature Place Discovery

Around Us is a Next.js application that helps users discover amazing nature destinations using AI-powered search. The app provides personalized place recommendations based on user preferences, location, and real-time weather data.

## Features

- **AI-Powered Search**: Get personalized nature place suggestions using Google Gemini AI
- **Batch Loading**: Progressive loading of 4 results at a time with "load more" functionality
- **Interactive Maps**: Explore destinations on interactive maps with custom markers
- **Weather Integration**: Real-time weather forecasts to plan your places
- **Smart Form Pre-filling**: AI analyzes search queries to pre-fill form preferences
- **Search History**: Save and revisit your previous place searches
- **Location-Aware**: GPS-based recommendations within your specified travel distance
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4.1, Framer Motion
- **Authentication**: Supabase Auth with SSR
- **Database**: Supabase PostgreSQL
- **AI**: Google Gemini API (gemini-2.5-flash)
- **Maps**: MapLibre GL JS
- **Weather**: OpenWeather API
- **UI Components**: Radix UI + shadcn/ui
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project
- Google Gemini API key
- OpenWeather API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd around_us
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your actual values:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_PROJECT_ID=your-project-id

   # API Keys
   GEMINI_API_KEY=your-gemini-api-key
   OPENWEATHER_API_KEY=your-openweather-api-key
   ```

4. **Generate Supabase types** (optional, if you have database tables)

   ```bash
   pnpm generate-types
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

The app will be available at `http://localhost:3000`.

## Configuration

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Get your project ID from Project Settings > General
4. Enable authentication and configure providers as needed

### API Keys

- **Google Gemini API**: Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **OpenWeather API**: Sign up at [OpenWeatherMap](https://openweathermap.org/api) for a free API key

## Development

### Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint to check code quality
- `pnpm generate-types` - Generate TypeScript types from Supabase

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── (app)/             # Main authenticated routes
│   │   ├── discover/      # Place discovery page
│   │   ├── past-places/    # Search history page
│   │   └── layout.tsx     # Authenticated layout
│   ├── (auth-pages)/      # Authentication routes
│   └── layout.tsx         # Root layout
├── actions/               # Server actions
│   ├── discover.actions.ts    # AI place search logic
│   ├── history.actions.ts     # Search history management
│   ├── place.actions.ts       # Saved places functionality
│   └── weather.actions.ts     # Weather API integration
├── components/            # Reusable UI components
│   ├── discovery/         # Place discovery components
│   ├── layout/           # Layout components
│   └── ui/               # shadcn/ui components
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
│   └── supabase/         # Supabase client utilities
├── constants/            # App constants
└── public/               # Static assets
    ├── animated/         # Loading animations
    └── assets/           # Map styles and other assets
```

### Key Features

#### AI Place Search

The app uses a sophisticated batch-based search system:

- Returns 4 high-quality results per request
- Maintains conversation context to avoid duplicates
- Ranks destinations 1-3 stars based on relevance to user's specific request
- Considers activity type, timing, distance, transport method, and user intent

#### Progressive Loading

- Initial batch loads immediately
- Users can load more results on demand
- Map updates progressively with new markers
- Smooth animations and loading states

#### Smart Form Pre-filling

- AI analyzes homepage search queries
- Automatically maps natural language to structured form data
- Pre-fills activity type, timing, distance, and other preferences

### Authentication Flow

The app uses Supabase Auth with middleware-based route protection:

- Unauthenticated users are redirected to `/sign-in`
- Protected routes require authentication
- Server-side rendering with session management

### Database Integration

Supabase provides:

- User authentication and session management
- Place search history storage
- Saved places functionality
- TypeScript types auto-generated from schema

## Deployment

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_PROJECT_ID=your-project-id
GEMINI_API_KEY=your-gemini-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
```

### Build and Deploy

```bash
# Build the application
pnpm build

# Start production server (if self-hosting)
pnpm start
```

The app can be deployed to any platform that supports Next.js applications (Vercel, Netlify, Railway, etc.).

## Architecture

### AI Integration

- **Google Gemini API** powers the place search functionality
- Conversation context maintained across batch requests
- Robust JSON parsing with multiple fallback methods
- Weather data integration for contextual recommendations

### Map Integration

- **MapLibre GL JS** for interactive maps
- Custom markers based on activity and landscape types
- Real-time bounds updates as results load
- User location integration with GPS

### State Management

- React hooks for client-side state
- Server actions for all backend operations
- Form state managed with React Hook Form
- Navigation loading context for smooth UX

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.
