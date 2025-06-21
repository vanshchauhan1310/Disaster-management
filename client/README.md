# Disaster Response Platform - Frontend

A modern, minimalistic React frontend for testing all backend APIs of the Disaster Response Platform.

## Features

- **Disaster Management**: Create, view, and delete disasters
- **Social Media Feed**: View real-time social media posts
- **Geocoding**: Test location extraction and geocoding
- **Image Verification**: Test Gemini API image verification
- **Real-time Updates**: WebSocket connection for live updates
- **Resource Management**: View disaster-specific resources
- **Official Updates**: View official disaster updates

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## API Testing

The frontend is configured to proxy API requests to your Bun backend at `http://localhost:5000`. Make sure your backend is running before testing the frontend.

### Available API Tests:

1. **Disasters Tab:**
   - Create new disasters
   - View all disasters
   - Delete disasters
   - View disaster-specific resources and updates

2. **Social Media Tab:**
   - View mock social media posts
   - See priority indicators
   - View verification status

3. **Geocoding Tab:**
   - Test location extraction from descriptions
   - View geocoded coordinates

4. **Image Verification Tab:**
   - Test Gemini API image verification
   - View authenticity scores and analysis

## WebSocket Connection

The frontend automatically connects to the WebSocket server for real-time updates. The connection status is displayed in the header.

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Axios for API calls
- Lucide React for icons
- Vite for build tooling

## Development

- **Hot reload**: Changes are automatically reflected in the browser
- **TypeScript**: Full type safety for all components
- **Responsive design**: Works on desktop and mobile devices
- **Modern UI**: Clean, minimalistic design with Tailwind CSS 