📰 NEWSROOM (CredNews)

NEWSROOM is a cross-platform newsroom application built from a single Expo codebase and deployed across mobile (iOS & Android), web, and Windows desktop.

It combines real-time news, event discovery, offline-first reading, AI-powered summaries, and community fact-checking — all powered by a unified architecture.



🚀 Overview

This project demonstrates how a single React Native codebase can scale seamlessly across platforms without forks or duplication.

Core capabilities include:

Real-time news aggregation
AI-assisted article understanding
Offline-first experience
Cross-platform UI/UX adaptation
Community-driven fact-checking
🌍 Platforms
📱 Mobile (iOS & Android)
Bottom tab navigation
Gesture interactions
Native transitions and modals
🌐 Web
URL-based navigation
Keyboard shortcuts
Hover + context menu support
Persistent offline storage
🖥️ Desktop (Windows)
Built with Electron 41
Native menus (File, Edit, View, etc.)
Keyboard shortcuts + right-click menus
Resizable responsive layout
Packaged as .exe installer
🧠 Key Features
📰 News & Content
Live headlines powered by GNews
Category feeds (Business, Tech, World, Sports, Health)
Personalized interests (modal-based, non-intrusive)
Search with debounce + state handling
Offline saved articles
📍 Events
PredictHQ-powered event discovery
Filters (location, type, date)
Graceful fallback when unavailable
🤖 AI Assistant
Article summaries (“AI Brief”)
Ask-AI contextual Q&A
Streaming responses with typewriter effect
Multi-provider fallback system:
Groq
Cerebras
OpenRouter
Gemini (optional)
👥 Community Layer
Comments + voting (FACT / FAKE)
Evidence uploads (links, notes, images)
Offline queue for actions (syncs when online)
⚡ Cross-Platform UX
Adaptive layout (mobile → desktop scaling)
Hover + press states
Right-click context menus
Keyboard shortcuts:
Shortcut	Action
Ctrl/Cmd + 1–4	Navigate tabs
Ctrl/Cmd + K	Quick search
Ctrl/Cmd + R	Refresh
Ctrl/Cmd + B	Bookmark
Esc	Back
📦 Run & Build
pnpm install

# Mobile
pnpm start
pnpm android
pnpm ios

# Web
pnpm web
pnpm build:web
pnpm web:preview

# Desktop
pnpm desktop:dev
pnpm desktop:installer
🏗️ Architecture
Frontend: Expo + React Native + Expo Router
State/Data: TanStack Query (with AsyncStorage persistence)
Backend Services: Firebase (Auth, Firestore, Storage)
APIs: GNews, PredictHQ, AI providers
Desktop Layer: Electron
🔌 APIs Used
GNews (news data)
PredictHQ (events)
Groq / Cerebras / OpenRouter (AI)
Google Gemini (AI fallback)
Firebase (auth, database, storage)
🧩 Core Architecture Flow
UI → Query Hooks → Services → APIs / Firebase
        ↓
   Local Cache (AsyncStorage)

Everything flows through TanStack Query, ensuring:

caching
retries
persistence
offline support
📁 Project Structure (Simplified)
src/
  api/            # API clients
  app/            # Screens & routes
  components/     # UI components
  hooks/          # Query + app hooks
  services/       # Business logic
  utils/          # Helpers (env, network, etc.)
  config/         # Firebase setup
⚙️ Environment Setup

Create a .env file:

EXPO_PUBLIC_NEWS_API_BASE_URL=https://gnews.io/api/v4
EXPO_PUBLIC_NEWS_API_KEY=your_key_here
...

⚠️ All EXPO_PUBLIC_* variables are exposed to the client — treat them as public.

🔥 Firebase Setup

Enable:

Authentication (Email/Password)
Firestore
Storage

Used for:

user auth
comments
evidence uploads
📡 Offline-First Design
Cached data via AsyncStorage
Saved articles available offline
Actions queued and replayed when online
Network-aware UI
🧪 Quality Checks
pnpm exec tsc --noEmit
pnpm lint
pnpm web:preview
🎯 Highlights
Single codebase → 3 platforms
No platform-specific forks
AI streaming with fallback resilience
Offline-first UX
Production-ready desktop packaging
📎 Submission Links
🌐 Live App: link
🖥️ Windows Installer: (add link)
📱 Mobile Demo (Appetize): (add link)
🎥 Screen Recording: (add link)
🧵 Dev Post (LinkedIn/X): (add link)