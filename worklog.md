# NexusAI - AI Chat & Image Generation Platform

## Project Overview
NexusAI is a comprehensive AI chat platform built with Next.js 16, featuring real-time chat, AI-powered conversations, image generation, voice input/output, and a beautiful responsive UI with dark/light mode support.

## Current Project Status
- **Phase**: Initial Development Complete
- **Status**: Fully functional MVP ready for testing

## Completed Features

### 1. User Authentication
- Sign up with email, name, and password
- Login with email and password
- Session management with secure cookies
- Logout functionality
- Password hashing with bcryptjs

### 2. AI Chat System
- Real-time AI conversation using z-ai-web-dev-sdk (LLM)
- Multi-turn conversation with context history
- Markdown rendering with syntax highlighting for code blocks
- Smooth message animations
- "Thinking" loading state while generating responses

### 3. Image Generation
- Toggle to Image Generation mode
- Text-to-image using z-ai-web-dev-sdk
- Images displayed inline in chat
- Image prompt preserved in message metadata

### 4. Voice Support
- Speech-to-Text (ASR) - Record voice input, transcribe to text
- Text-to-Speech (TTS) - Listen to AI responses read aloud
- Microphone recording with visual feedback
- Audio playback controls per message

### 5. Chat History
- Conversation list in sidebar
- Create new conversations
- Delete conversations with confirmation
- Search/filter conversations
- Auto-title from first message
- Persistent storage with SQLite/Prisma

### 6. UI/UX
- Responsive design (mobile-first)
- Dark/Light mode with system preference detection
- Emerald/teal color scheme (no blue/indigo)
- Custom scrollbar styling
- Smooth animations with Framer Motion
- Mobile sidebar with overlay
- Empty state with feature cards

## Technical Architecture

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand (auth, chat stores)
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **API Routes**: REST endpoints under /api/
- **Database**: SQLite + Prisma ORM
- **Auth**: bcryptjs + custom session management
- **AI**: z-ai-web-dev-sdk (LLM, Image Gen, TTS, ASR)

### API Endpoints
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Check session
- `POST /api/auth/logout` - Logout
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/[id]/messages` - Get messages
- `POST /api/chat/[id]/messages` - Send message
- `DELETE /api/chat/[id]/messages` - Delete conversation
- `POST /api/ai/chat` - AI chat completion
- `POST /api/ai/image` - Generate image
- `POST /api/ai/tts` - Text to speech
- `POST /api/ai/asr` - Speech to text

## File Structure
```
src/
├── app/
│   ├── page.tsx          # Main page (auth/chat router)
│   ├── layout.tsx        # Root layout with theme provider
│   ├── globals.css       # Global styles + theme colors
│   └── api/
│       ├── auth/         # Auth endpoints
│       ├── chat/         # Chat CRUD endpoints
│       └── ai/           # AI service endpoints
├── components/
│   ├── auth/
│   │   └── auth-page.tsx # Login/Signup page
│   ├── chat/
│   │   ├── chat-area.tsx            # Main chat area
│   │   ├── chat-input.tsx           # Message input with voice/image
│   │   ├── conversation-sidebar.tsx # Sidebar with conversation list
│   │   └── message-bubble.tsx       # Individual message display
│   ├── theme-provider.tsx
│   └── ui/              # shadcn/ui components
├── store/
│   ├── auth-store.ts     # Auth state management
│   └── chat-store.ts     # Chat state management
└── lib/
    ├── auth.ts           # Password hashing
    ├── session.ts        # Session management
    ├── db.ts             # Prisma client
    └── utils.ts          # Utility functions
```

## Unresolved Issues / Risks
- None critical. Application is in stable state.

## Priority Recommendations for Next Phase
1. Add more polish to empty states and loading animations
2. Add conversation rename/edit feature
3. Add keyboard shortcuts (Ctrl+N for new chat, etc.)
4. Improve mobile responsive behavior for chat area
5. Add user profile/avatar editing
6. Add conversation export feature
7. Consider adding streaming responses for AI chat
