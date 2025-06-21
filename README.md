# Disaster Response Platform

A modern, real-time, modular platform for disaster response, situational awareness, and resource coordination.

## Features
- **Disaster CRUD:** Create, update, delete, and list disaster events with geospatial data.
- **Geocoding:** Extracts locations from user input using Gemini AI and geocodes them with Nominatim (OpenStreetMap).
- **Mapping:** Interactive maps with Leaflet for disaster locations and resources.
- **Social Media Feed:** Real-time disaster-related tweets via Twitter API, with automatic fallback to mock data if rate-limited.
- **Resource & Official Updates:** View nearby resources and official updates for each disaster.
- **Image Verification:** AI-powered image authenticity checks (Google Gemini).
- **Real-time Updates:** WebSocket-powered live updates for disasters and resources.
- **Structured Logging & Caching:** All actions logged; API responses cached for performance and rate limit protection.

## Tech Stack
- **Backend:** [Bun](https://bun.sh/) (TypeScript), Supabase (Postgres), Google Gemini API, Nominatim, Twitter API
- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons, Leaflet (react-leaflet)
- **Other:** WebSockets (Bun native), caching 

## Directory Structure
```
Disaster-Management/
  client/      # React frontend
  server/      # Bun backend (TypeScript)
  types/       # Shared type definitions
```

## Setup Instructions

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- Node.js (for some tooling, optional)
- Supabase project (with geospatial tables)
- Twitter Developer account (for live social feed)
- Google Gemini API key (for AI features)

### 1. Clone the Repository
```sh
git clone <repo-url>
cd Disaster-Management
```

### 2. Backend Setup
```sh
cd server
bun install
```

#### Environment Variables
Create a `.env` file in `server/` with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
GEMINI_API_KEY=your_gemini_api_key
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

#### Start the Backend
```sh
bun run index.ts
# or for hot reload
yarn bun --hot index.ts
```

### 3. Frontend Setup
```sh
cd ../client
bun install
bun run dev
```

### 4. Access the App
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)

## Important Notes

### Twitter API Rate Limits
- The social feed uses the Twitter API to fetch real disaster tweets.
- **If the Twitter API rate limit is reached, the app will automatically show mock social posts instead of real tweets.**
- This ensures the UI always displays relevant content, even if Twitter is unavailable or quota is exceeded.

### Geocoding & AI
- User input in the Geocoding tab is processed by Gemini AI to extract the most relevant place name, then geocoded with Nominatim.
- Leaflet map updates dynamically with the geocoded location.

### Caching
- All external API responses (Twitter, geocoding, etc.) are cached in Supabase for performance and to avoid rate limits.

## How to Use
- **Disasters Tab:** Create, update, and delete disaster events. View all active disasters.
- **Geocoding Tab:** Enter a location or description; see the extracted place and its location on a map.
- **Social Feed Tab:** View real-time tweets about disasters (or mock data if rate-limited).
- **Resources & Updates:** See nearby resources and official updates for each disaster.
- **Image Verification:** Check the authenticity of disaster images using AI.

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss major changes.

## License
[MIT](LICENSE)

