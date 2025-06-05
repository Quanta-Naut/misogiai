'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Users, TrendingUp, Star, Award, Target } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import AuthModal from '@/components/auth/AuthModal'

export default function HomePage() {
  const [userType, setUserType] = useState<'founder' | 'investor' | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleGetStarted = (type: 'founder' | 'investor') => {
    setUserType(type)
    setShowAuthModal(true)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-6xl"
              >
                🚀
              </motion.div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
              LaunchPad
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              The ultimate startup funding simulation platform where founders pitch ideas and investors make deals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGetStarted('founder')}
                className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg"
              >
                <Rocket className="mr-2 h-5 w-5" />
                I'm a Founder
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGetStarted('investor')}
                className="btn-primary bg-secondary-500 text-white hover:bg-secondary-600 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                I'm an Investor
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Simulate Real Funding
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From pitch decks to cap tables, experience the complete startup funding journey with AI-powered insights
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card p-8 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-primary-500 mb-4">
                  <feature.icon className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Integration Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🤖 AI-Powered Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get insights from multiple AI providers to enhance your pitch and investment decisions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aiProviders.map((provider, index) => (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="card p-6 text-center"
              >
                <div className="text-4xl mb-4">{provider.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {provider.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {provider.description}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {provider.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary-600">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Launch Your Journey?
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              Join thousands of founders and investors in the most realistic funding simulation platform
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAuthModal(true)}
              className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-12 py-4 text-lg font-semibold rounded-xl shadow-lg"
            >
              Get Started Free
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </div>
  )
}

const features = [
  {
    icon: Rocket,
    title: 'Startup Profile Builder',
    description: 'Create comprehensive startup profiles with AI-powered suggestions for vision, product description, and business models.'
  },
  {
    icon: TrendingUp,
    title: 'Funding Simulation',
    description: 'Negotiate real funding rounds with cap table evolution, valuation tracking, and investor matching.'
  },
  {
    icon: Users,
    title: 'Live Pitch Rooms',
    description: 'Interactive chatrooms with AI assistance, document sharing, and time-bound pitch sessions.'
  },
  {
    icon: Star,
    title: 'AI-Powered Feedback',
    description: 'Get rated on team, product, and market fit with detailed AI-generated investor feedback and suggestions.'
  },
  {
    icon: Award,
    title: 'Dynamic Leaderboards',
    description: 'Compete with other startups and climb the rankings based on funding, valuation, and investor ratings.'
  },
  {
    icon: Target,
    title: 'Smart Challenges',
    description: 'Participate in AI-curated weekly challenges designed to boost your startup success metrics.'
  }
]

const aiProviders = [
  {
    icon: '🧠',
    name: 'OpenAI GPT-4',
    description: 'Advanced reasoning and strategic insights for complex business decisions.',
    features: ['Strategic Planning', 'Market Analysis', 'Pitch Refinement']
  },
  {
    icon: '⚡',
    name: 'Groq Lightning',
    description: 'Ultra-fast responses for real-time pitch coaching and quick decisions.',
    features: ['Real-time Chat', 'Quick Analysis', 'Instant Feedback']
  },
  {
    icon: '🌟',
    name: 'Google Gemini',
    description: 'Comprehensive research and data-driven investment insights.',
    features: ['Market Research', 'Competitive Analysis', 'Due Diligence']
  }
]

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '$2.5M+', label: 'Simulated Funding' },
  { value: '500+', label: 'Startups' },
  { value: '95%', label: 'Success Rate' }
]