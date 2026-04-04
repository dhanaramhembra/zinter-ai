# NexusAI - AI Chat & Image Generation Platform

## Project Overview
NexusAI is a comprehensive AI chat platform built with Next.js 16, featuring real-time chat, AI-powered conversations, image generation, voice input/output, and a beautiful responsive UI with dark/light mode support.

## Current Project Status
- **Phase**: v2 - Enhanced UX/Features Complete
- **Status**: Stable, all lint passes, dev server compiles cleanly
- **Last Review**: Cron Review Round 1

## Completed Features

### 1. User Authentication
- Sign up with email, name, and password
- Login with email and password
- Session management with secure cookies
- Logout with confirmation dialog
- Password hashing with bcryptjs
- **NEW**: Password strength indicator (Weak/Fair/Good/Strong)
- **NEW**: Remember me checkbox
- **NEW**: Animated floating particles background
- **NEW**: Glass-morphism card design with gradient border
- **NEW**: Smooth tab sliding indicator animation
- **NEW**: Error messages with dismiss button

### 2. AI Chat System
- Real-time AI conversation using z-ai-web-dev-sdk (LLM)
- Multi-turn conversation with context history
- Markdown rendering with syntax highlighting for code blocks
- Smooth message animations with staggered entrance
- **NEW**: Animated typing indicator (bouncing dots) instead of "Thinking..."
- **NEW**: Code blocks with copy button
- **NEW**: Message grouping (consecutive same-sender messages grouped)
- **NEW**: Regenerate button on assistant messages
- **NEW**: Enhanced markdown: tables, blockquotes, lists, links

### 3. Image Generation
- Toggle to Image Generation mode
- Text-to-image using z-ai-web-dev-sdk
- Images displayed inline in chat
- Image prompt preserved in message metadata
- **NEW**: Image hover overlay with prompt and download button

### 4. Voice Support
- Speech-to-Text (ASR) - Record voice input, transcribe to text
- Text-to-Speech (TTS) - Listen to AI responses read aloud
- Microphone recording with visual feedback
- Audio playback controls per message

### 5. Chat History
- Conversation list in sidebar
- Create new conversations (from sidebar + header + Ctrl+N)
- Delete conversations with confirmation
- Search/filter conversations
- Auto-title from first message
- Persistent storage with SQLite/Prisma
- **NEW**: Conversation rename (double-click title to edit inline)
- **NEW**: Grouped conversations (Today/Yesterday/This Week/Older)
- **NEW**: Time-of-day user greeting in sidebar header
- **NEW**: New Chat button in sidebar

### 6. UI/UX
- Responsive design (mobile-first)
- Dark/Light mode with system preference detection
- Emerald/teal color scheme (no blue/indigo)
- Custom scrollbar styling
- Smooth animations with Framer Motion
- Mobile sidebar with overlay
- **NEW**: Glass-morphism effects
- **NEW**: Animated AI avatar with rotating gradient ring
- **NEW**: Welcome suggestion cards (4 clickable prompts)
- **NEW**: Keyboard shortcut Ctrl+N for new chat
- **NEW**: Improved scroll-to-bottom with smooth behavior
- **NEW**: Active conversation left border indicator
- **NEW**: Logout confirmation dialog

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
- `PATCH /api/chat/[id]/messages` - Update conversation title (rename)
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

---
## Task ID: 3-a - full-stack-developer
### Work Task
Rewrite conversation-sidebar.tsx with multiple UX improvements and add PATCH API endpoint for conversation renaming.

### Work Summary
Completed all 8 requested improvements to the conversation sidebar and added the PATCH API endpoint:

1. **Removed unused imports**: `DialogTrigger`, `Settings`, `MessageSquarePlus`, and `useEffect` removed from the main component (useEffect retained in ConversationItem for edit focus).

2. **New Chat button in sidebar**: Added a prominent gradient "New Chat" button at the top of the conversation list area, using the emerald-to-teal gradient. Calls `createNewChat` which POSTs to `/api/chat/conversations`.

3. **Conversation rename via double-click**: Double-click on a conversation title activates inline editing. An input field replaces the title, with Enter to save and Escape to cancel. On blur/submit, calls PATCH `/api/chat/[conversationId]/messages` with the new title.

4. **Grouped conversations**: Conversations are grouped into "Today", "Yesterday", "This Week", and "Older" sections using `getTimeGroup()` helper. Each group has a styled section header. Empty groups are hidden.

5. **User greeting**: Added a time-of-day greeting ("Good morning/afternoon/evening, {user.name}") in the sidebar header using `getGreeting()` helper based on current hour.

6. **Styling improvements**:
   - Subtle gradient on sidebar header (`from-emerald-600/5 via-transparent to-teal-600/5`)
   - Gradient logo icon with shadow
   - Hover effects with smooth transitions (`duration-200`)
   - Active conversation has a 3px emerald left border indicator with shadow
   - Empty state has gradient icon container with light/dark mode variants
   - Search input has clean look with transparent border that shows emerald on focus
   - User avatar uses gradient background

7. **Logout confirmation dialog**: Added a new Dialog that appears when clicking "Sign Out", asking "Are you sure you want to sign out? You will need to log in again to access your conversations."

8. **Fixed mounted hack**: Removed `const mounted = true` entirely. The theme toggle Button is always rendered with `suppressHydrationWarning` on both the button and the text span. Uses overlapping Sun/Moon icons with CSS rotation/scale transitions for smooth theme toggle animation.

**API Changes**: Added `PATCH` handler to `/api/chat/[conversationId]/messages/route.ts` that accepts `{ title: string }` in the request body, validates it (non-empty, max 100 chars), verifies ownership, and updates the conversation title via Prisma.

Files modified:
- `src/components/chat/conversation-sidebar.tsx` (complete rewrite)
- `src/app/api/chat/[conversationId]/messages/route.ts` (added PATCH handler)

Lint passes with zero errors.

---
## Task ID: 3-c - full-stack-developer
### Work Task
Enhance MessageBubble and AuthPage components with comprehensive UI/UX improvements including code copy buttons, animated AI avatar, message grouping, markdown improvements, floating particles, password strength indicator, and more.

### Work Summary
Completed all requested enhancements to both components and updated chat-area.tsx to pass new props.

#### MessageBubble (`src/components/chat/message-bubble.tsx`):

1. **Code copy button**: Added a "Copy code" button in the top-right corner of code block headers. For code blocks without a language match, the button appears on hover at the top-right of the block. Uses clipboard API with a "Copied!" confirmation state.

2. **Animated AI avatar**: Added a rotating conic gradient border (emerald/teal) around the AI avatar using CSS `conic-gradient` with `mask: radial-gradient` for a ring effect. The animation only triggers when `isGenerating` is true, using a 3-second spin duration.

3. **Regenerate button**: Added a `RefreshCw` icon button next to Copy and TTS in the actions row for assistant messages. Calls `onRegenerate(message.id)` prop when clicked. Only renders when `onRegenerate` is provided.

4. **Image hover overlay**: When hovering over generated images, a backdrop-blurred overlay appears with the image prompt text (italicized, line-clamped to 2 lines) and a "Download" button. Uses Framer Motion for smooth opacity transition.

5. **Audio cleanup fix**: Replaced `useState` for `currentAudio` with `useRef<HTMLAudioElement | null>`. The cleanup `useEffect` now has an empty dependency array and accesses `audioRef.current` directly, eliminating re-render dependency issues. Also added `onerror` handler for robustness.

6. **Message grouping**: Added `isFirstInGroup` and `isLastInGroup` props. When `isFirstInGroup` is false, the name/timestamp row is hidden and top padding is reduced. When `isLastInGroup` is false, the avatar is replaced with an empty spacer and action buttons are hidden.

7. **Entrance animation stagger**: Messages now accept an `index` prop. The animation delay is calculated as `Math.min(index * 0.05, 0.5)` seconds, capped at 0.5s to prevent excessive delays.

8. **Improved markdown rendering**: Tables with borders and muted headers, blockquotes with emerald left-border accent, lists with emerald markers and proper spacing, links with emerald-500 color and hover underline.

9. **Removed unused import**: `ImageIcon` removed. Added `RefreshCw`, `Download`, and `useCallback` imports.

#### AuthPage (`src/components/auth/auth-page.tsx`):

1. **Animated background particles**: Created `FloatingDots` component with 20 randomly positioned dots that float upward using CSS animation. Each dot has randomized size, position, delay, duration, and opacity.

2. **Card design improvements**: Wrapped Card in a container with a 1px gradient border (emerald/teal). Card uses `backdrop-blur-xl` for glass-morphism.

3. **Password strength indicator**: Scores password on 5 criteria. Renders 4 color-coded bars (red/orange/yellow/emerald) with labels (Weak/Fair/Good/Strong).

4. **Remember me checkbox**: Added below login password field using shadcn/ui Checkbox with emerald checked styling.

5. **Smooth tab transition**: Sliding motion.div indicator that moves between tabs using Framer Motion spring animation.

6. **Error display improvement**: Extracted ErrorMessage component with close button (X icon) to dismiss errors.

7. **Loading animation on logo**: Added `isCheckingSession` state. While true, logo has pulse animation, glowing box-shadow, and Sparkles icon has a glow-pulse CSS animation.

#### ChatArea (`src/components/chat/chat-area.tsx`):
Updated to compute message grouping props by comparing adjacent messages' roles and passes `index`, `isFirstInGroup`, and `isLastInGroup` to MessageBubble.

Files modified:
- `src/components/chat/message-bubble.tsx` (complete rewrite)
- `src/components/auth/auth-page.tsx` (complete rewrite)
- `src/components/chat/chat-area.tsx` (updated MessageBubble props)

Lint passes with zero errors. Dev server running with no compilation issues.

---
## Task ID: 3-b - full-stack-developer
### Work Task
Enhance chat-area.tsx with welcome suggestion cards, fix auto-create conversation flow, add typing indicator, improve empty states, add keyboard shortcut, fix scroll behavior, and remove unused imports. Update chat-input.tsx to accept initialMessage/initialImageMode props.

### Work Summary
Completed all 7 requested improvements to chat-area.tsx and corresponding updates to chat-input.tsx:

#### ChatArea (`src/components/chat/chat-area.tsx`):

1. **Welcome suggestion cards**: Replaced the old "Start New Chat" button + 3 emoji feature cards with 4 clickable suggestion cards in a 2x2 responsive grid:
   - "Explain quantum computing" (Lightbulb icon, amber)
   - "Write Python code" (Code icon, emerald)
   - "Draft a professional email" (Mail icon, teal)
   - "Generate an image" (ImageIcon icon, rose)
   Each card has an icon with colored background, title text, and a subtle description. Cards use staggered entrance animations and hover effects with `active:scale-[0.98]` feedback.

2. **Fixed auto-create conversation flow**: `createNewChat()` now returns `Promise<string | null>` with the new conversation ID. It calls `addConversation()` and `setActiveConversationId()` synchronously after the API response, then returns the ID. Both `sendMessage()` and `generateImage()` now `await createNewChat()` inline instead of using the unreliable `setTimeout(() => ..., 500)` hack.

3. **Typing indicator**: Replaced the old `isGenerating` MessageBubble (which showed "Thinking..." with spinner) with a subtle inline typing indicator below the last message. Shows "NexusAI is typing" followed by 3 emerald bouncing dots with staggered animation delays (0ms, 150ms, 300ms). Wrapped in `AnimatePresence` for smooth fade-in/out.

4. **Improved empty conversation state**: When a conversation is selected but has no messages, shows a centered prompt area with a gradient Sparkles icon, "How can I help you today?" heading, and the same 4 suggestion cards in a 2x2 grid. Distinct from the no-conversation welcome screen which shows the full branding.

5. **Keyboard shortcut**: Added `Ctrl+N` / `Cmd+N` listener at the component level to create a new chat. Uses `e.preventDefault()` to block browser's default new-window behavior. Hook properly includes `createNewChat` in dependency array.

6. **Fixed scroll behavior**: Replaced the broken `scrollRef.current.scrollTop = scrollRef.current.scrollHeight` approach (which doesn't work with Radix ScrollArea's viewport) with a sentinel div (`bottomRef`) placed at the bottom of the messages list. Uses `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` with a 50ms timeout to ensure DOM has updated after render.

7. **Removed unused imports**: Removed `updateMessage` from chat store destructuring, removed `useAuthStore` import and `user` destructuring (not used in this component), removed `isLoadingMessages` state.

#### ChatInput (`src/components/chat/chat-input.tsx`):

Added two new props:
- `initialMessage?: string | null` - Text to pre-fill the input when a suggestion card is clicked
- `initialImageMode?: boolean` - Whether to enable image generation mode when initialMessage is set

Uses a `lastAppliedInitialRef` to track which initial message has already been applied, preventing re-application on re-renders. When `initialMessage` is null, the ref resets. When a new value arrives, the input is set, textarea is focused, and (if `initialImageMode` is true) image mode is enabled.

Files modified:
- `src/components/chat/chat-area.tsx` (complete rewrite)
- `src/components/chat/chat-input.tsx` (added initialMessage/initialImageMode props)

Lint passes with zero errors. Dev server running with no compilation issues.

---
## Cron Review Round 1 - Overall Assessment

### Verification Results
- **Lint**: ✅ Zero errors (verified after all changes)
- **Dev server**: ✅ Compiles cleanly, serves 200 OK
- **Code quality**: All unused imports removed, proper TypeScript typing
- **No runtime errors** detected in compilation

### Changes Made This Review (22 improvements)
1. Fixed unused imports across all components
2. Added PATCH API for conversation renaming
3. Added password strength indicator to signup
4. Added glass-morphism effects to auth page
5. Added floating particles background to auth page
6. Added welcome suggestion cards (4 clickable prompts)
7. Added conversation rename (double-click title)
8. Added conversation grouping (Today/Yesterday/This Week/Older)
9. Added time-of-day greeting in sidebar
10. Added New Chat button in sidebar
11. Added logout confirmation dialog
12. Added animated AI avatar with gradient ring
13. Added code copy button to code blocks
14. Added regenerate button for assistant messages
15. Added message grouping for consecutive same-sender messages
16. Added typing indicator with bouncing dots
17. Fixed auto-create conversation flow (removed setTimeout hack)
18. Fixed scroll-to-bottom with proper scrollIntoView
19. Fixed audio cleanup with useRef instead of useState
20. Added Ctrl+N keyboard shortcut for new chat
21. Improved markdown rendering (tables, blockquotes, lists, links)
22. Improved image display with hover overlay

### Unresolved Issues / Risks
- **Dev server stability**: Process can be killed by system during long tasks (env issue)
- **Session management**: In-memory store lost on restart; consider DB-backed sessions
- **`onRegenerate` callback**: UI wired but parent does not provide implementation yet
- **`allowedDevOrigins`**: Set to `["*"]`; restrict for production

### Priority Recommendations for Next Phase
1. Implement regenerate logic - Wire up `onRegenerate` callback
2. Add streaming responses for more responsive AI chat
3. User profile page - Edit name and avatar
4. Conversation export - Export as markdown/PDF
5. Toast notifications - For copy, save, delete feedback
6. Accessibility audit - ARIA labels, screen reader, keyboard nav
