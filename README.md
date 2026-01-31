# 🦖 Digimon Hand Gesture Battle Game

A cutting-edge, mobile-first web game that brings Digimon battles to life using your device's camera and AI.

## 🚀 Features
- **Hand Gesture Combat**: Use MediaPipe to detect Fist (Attack), Palm (Defend), Swipe (Special), and Peace (Heal).
- **AI Announcer**: Real-time battle commentary powered by **Gemini 2.5 Flash**.
- **Smart AI Opponent**: An AI that learns your patterns and tries to counter you.
- **Monetization**: Integrated **Stripe Checkout** for a $1 "Full App" unlock.
- **Collection & Evolution**: Track your wins and evolve your Digimon from Rookie to Mega.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Zustand.
- **Vision**: Google MediaPipe Hands.
- **Backend**: Supabase (Auth, DB, Edge Functions).
- **AI**: Google Gemini 2.5 (Flash, Lite, Pro).
- **Payments**: Stripe.

## 🔐 Security & Setup
To run this locally, create a `.env.local` file in the root:
```
digimon-gesture-battle/
├── .env.local              # Local secrets (NEVER COMMIT THIS)
├── .gitignore              # Ignores node_modules, .env, dist, etc.
├── index.html              # Entry HTML
├── package.json            # Dependencies and scripts
├── README.md               # Project documentation
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
│
├── public/                 # Static assets
│   ├── favicon.svg
│   └── sounds/             # Battle and UI sound effects (optional)
│
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main routing and global layout
│   ├── index.css           # Global styles and Tailwind directives
│   │
│   ├── api/                # API utility functions
│   │   ├── digimon.ts      # Fetching from Digimon API
│   │   └── gemini.ts       # AI Commentary & Opponent logic
│   │
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Buttons, Cards, Modals
│   │   ├── battle/         # HealthBar, CameraPiP, GestureGuide
│   │   └── ui/             # Animated UI elements (confetti, shake)
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useMediaPipe.ts # Logic for hand gesture detection
│   │   └── useStripe.ts    # Logic for checkout redirection
│   │
│   ├── lib/                # Third-party library initializations
│   │   └── supabase.ts     # Supabase client setup
│   │
│   ├── pages/              # Main app views
│   │   ├── TitleScreen.tsx # "Click to Start"
│   │   ├── Selection.tsx   # Choose your first Digimon
│   │   ├── Battle.tsx      # The main game arena
│   │   └── Collection.tsx  # Owned Digimon and $1 upgrade CTA
│   │
│   ├── store/              # Global state (Zustand)
│   │   └── useGameStore.ts # Battle state, HP, and XP
│   │
│   └── types/              # TypeScript interfaces
│       └── index.ts        # Digimon, User, and Battle types
│
├── supabase/               # Backend logic
│   ├── migrations/         # SQL schema files
│   │   └── 20260131_init.sql
│   └── functions/          # Serverless Edge Functions (Deno)
│       ├── stripe-checkout/
│       └── stripe-webhook/
```
