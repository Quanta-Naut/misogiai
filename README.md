# 🚀 LaunchPad - Startup Funding Simulation Platform

> A gamified platform where users take on the role of startup founders or investors. Founders craft compelling business ideas, pitch decks, and financial models, while investors simulate funding decisions, valuations, and negotiations.

## ✨ Features

### 🧱 Core Features

- **Startup Profile Builder** - Create comprehensive startup profiles with AI-powered suggestions
- **Funding Simulation** - Negotiate funding rounds with real-time cap table evolution
- **Live Pitch Rooms** - Interactive chatrooms with AI assistance and document sharing
- **AI-Powered Feedback** - Get insights from OpenAI, Groq, and Google Gemini
- **Dynamic Leaderboards** - Compete based on funding, valuation, and ratings
- **Smart Challenges** - Weekly AI-curated challenges to boost success

### 🤖 AI Integration

- **OpenAI GPT-4** - Strategic planning and advanced reasoning
- **Groq Lightning** - Ultra-fast real-time responses
- **Google Gemini** - Comprehensive research and market analysis

### 👥 User Roles

- **Founders** - Create startups, pitch to investors, manage funding rounds
- **Investors** - Evaluate startups, make investment decisions, provide feedback

## 🛠️ Tech Stack

| Layer         | Technology                         |
|---------------|-------------------------------------|
| Frontend      | [Next.js 14](https://nextjs.org/) with App Router |
| Backend       | [Supabase](https://supabase.com/)  |
| Styling       | [Tailwind CSS](https://tailwindcss.com/) |
| Animations    | [Framer Motion](https://www.framer.com/motion/) |
| Auth & DB     | Supabase Auth + PostgreSQL         |
| File Storage  | Supabase Storage                   |
| Real-time     | Supabase Realtime                  |
| AI Services   | OpenAI, Groq, Google Gemini       |
| Icons         | [Lucide React](https://lucide.dev/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- AI API keys (OpenAI, Groq, Google AI)

### 1. Clone and Install

```bash
git clone <repository-url>
cd launchpad-platform
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the database setup script:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Execute the script

### 4. API Keys Setup

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to `.env.local` as `OPENAI_API_KEY`

#### Groq API Key
1. Visit [Groq Console](https://console.groq.com/)
2. Create an API key
3. Add to `.env.local` as `GROQ_API_KEY`

#### Google AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create an API key
3. Add to `.env.local` as `GOOGLE_AI_API_KEY`

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
launchpad-platform/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── startup/           # Startup management
│   │   ├── pitch-rooms/       # Live pitch sessions
│   │   ├── leaderboard/       # Rankings and competition
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Homepage
│   ├── components/            # Reusable components
│   │   ├── auth/             # Authentication components
│   │   └── layout/           # Layout components
│   └── lib/                  # Utility libraries
│       ├── supabase.ts       # Supabase configuration
│       └── ai-services.ts    # AI integration
├── public/                   # Static assets
├── supabase-setup.sql       # Database schema
└── README.md               # This file
```

## 🔧 Configuration

### Supabase Configuration

The application uses Supabase for:
- **Authentication** - User registration and login
- **Database** - PostgreSQL with Row Level Security
- **Real-time** - Live chat in pitch rooms
- **Storage** - File uploads for pitch decks

### AI Services Configuration

The platform integrates with three AI providers:

1. **OpenAI GPT-4** - For strategic insights and detailed analysis
2. **Groq** - For fast, real-time responses in chat
3. **Google Gemini** - For comprehensive market research

## 📊 Database Schema

### Core Tables

- **profiles** - User profiles and roles
- **startups** - Startup information and details
- **funding_rounds** - Investment rounds and negotiations
- **ratings** - Investor ratings and feedback
- **pitch_sessions** - Live pitch session management
- **chat_messages** - Real-time chat with AI integration

See `supabase-setup.sql` for complete schema details.

## 🎨 UI/UX Features

- **Modern Design** - Clean, vibrant interface with smooth animations
- **Mobile-First** - Responsive design for all devices
- **Dark Mode Ready** - Built with theme support
- **Accessibility** - WCAG compliant components
- **Gamification** - Badges, leaderboards, and progress tracking

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment

```bash
npm run build
npm start
```

## 🔐 Security Features

- **Row Level Security** - Database-level access control
- **Authentication** - Secure user authentication via Supabase
- **Environment Variables** - Secure API key management
- **HTTPS Only** - Secure data transmission
- **Input Validation** - Client and server-side validation

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Style

- **TypeScript** - Fully typed codebase
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting (configure as needed)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](issues) section
2. Review the setup steps in this README
3. Verify your environment variables
4. Check Supabase and AI service configurations

## 🌟 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [OpenAI](https://openai.com/), [Groq](https://groq.com/), and [Google](https://ai.google/) for AI capabilities

---

**Built with ❤️ for the startup community**