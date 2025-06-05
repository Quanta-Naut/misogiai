'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Star, 
  DollarSign, 
  Users, 
  TrendingUp,
  Heart,
  MessageCircle,
  Eye,
  Target,
  X,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AIService } from '@/lib/ai-services'
import Navbar from '@/components/layout/Navbar'
import { useRouter } from 'next/navigation'

interface Startup {
  id: string
  name: string
  tagline: string
  description: string
  funding_ask: number
  equity_offered: number
  current_valuation: number
  founder_id: string
  founder_name: string
  status: string
  created_at: string
}

interface Investment {
  amount: number
  message: string
}

export default function StartupsPage() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [filteredStartups, setFilteredStartups] = useState<Startup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterCategory, setFilterCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showInvestModal, setShowInvestModal] = useState(false)
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null)
  const [investment, setInvestment] = useState<Investment>({ amount: 0, message: '' })
  const [isInvesting, setIsInvesting] = useState(false)
  const [isCreatingChat, setIsCreatingChat] = useState<string | null>(null) // Track which startup chat is being created
  const router = useRouter()

  useEffect(() => {
    initializePage()
  }, [])

  useEffect(() => {
    filterAndSortStartups()
  }, [startups, searchTerm, sortBy, filterCategory])

  const initializePage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        // Get user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        setProfile(profileData)
      }
      
      await loadStartups()
    } catch (error) {
      console.error('Error initializing page:', error)
    } finally {
      setLoading(false)
    }
  }
  const loadStartups = async () => {
    try {
      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          total_invested,
          profiles!startups_founder_id_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedStartups = data?.map(startup => ({
        ...startup,
        founder_name: startup.profiles?.full_name || 'Unknown'
      })) || []

      setStartups(formattedStartups)
    } catch (error) {
      console.error('Error loading startups:', error)
      setStartups([])
    }
  }

  const filterAndSortStartups = () => {
    let filtered = [...startups]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(startup => 
        startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'funding':
        filtered.sort((a, b) => b.funding_ask - a.funding_ask)
        break
      case 'valuation':
        filtered.sort((a, b) => b.current_valuation - a.current_valuation)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    setFilteredStartups(filtered)
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  const handleChatWithFounder = async (startup: Startup) => {
    if (!user) {
      alert('Please sign in to chat with founders')
      return
    }

    if (profile?.user_type !== 'investor') {
      alert('Only investors can chat with founders')
      return
    }

    setIsCreatingChat(startup.id)
    
    try {
      console.log(`Creating 1-on-1 chat with ${startup.founder_name} (${startup.founder_id})`)
      
      // Create a direct message to start the conversation
      const { data: newMessage, error: messageError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: startup.founder_id,
          message: `Hi ${startup.founder_name}! I'm interested in ${startup.name} and would like to discuss potential investment opportunities. Could we chat about your startup?`,
          message_type: 'text'
        })
        .select()
        .single()

      if (messageError) {
        console.error('Error creating direct message:', messageError)
        throw messageError
      }

      console.log('Direct message created successfully:', newMessage)
      
      // Navigate to messages page with the founder ID as conversation parameter
      router.push(`/messages?conversation=${startup.founder_id}`)
      
      // Show success message
      alert(`Started private chat with ${startup.founder_name}! Redirecting to your messages...`)

    } catch (error: any) {
      console.error('Error creating chat with founder:', error)
      
      // More specific error handling
      if (error.code === '42P01') {
        alert('Direct messaging feature not available yet. Please run the SQL setup first.')
      } else if (error.code === '23503') {
        alert('Unable to create conversation. Please ensure both users exist.')
      } else {
        alert(`Failed to start chat: ${error.message}. Please try again.`)
      }
    } finally {
      setIsCreatingChat(null)
    }
  }

  const handleInvestClick = (startup: Startup) => {
    if (!user) {
      alert('Please sign in to invest in startups')
      return
    }

    if (profile?.user_type !== 'investor') {
      alert('Only investors can invest in startups')
      return
    }

    setSelectedStartup(startup)
    setShowInvestModal(true)
  }

  const handleInvestment = async () => {
    if (!selectedStartup || !user || investment.amount <= 0) return

    setIsInvesting(true)
    try {
      // Record the investment
      const { error } = await supabase
        .from('investments')
        .insert({
          investor_id: user.id,
          startup_id: selectedStartup.id,
          amount: investment.amount,
          message: investment.message || null,
          status: 'pending'
        })

      if (error) {
        console.error('Investment error:', error)
        if (error.code === '42P01') {
          alert('Investment feature not available yet. Please run the SQL setup first.')
        } else {
          throw error
        }
        return
      }

      // Send notification to founder (you could implement this)
      alert('Investment submitted successfully! The founder will be notified.')
      
      // Reset and close modal
      setShowInvestModal(false)
      setSelectedStartup(null)
      setInvestment({ amount: 0, message: '' })

    } catch (error: any) {
      console.error('Error submitting investment:', error)
      alert(`Failed to submit investment: ${error.message}. Please try again.`)
    } finally {
      setIsInvesting(false)
    }
  }

  const InvestmentModal = () => (
    <AnimatePresence>
      {showInvestModal && selectedStartup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInvestModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invest in {selectedStartup.name}</h2>
              <button
                onClick={() => setShowInvestModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Investment Details</p>
                  <p>• Seeking: {formatCurrency(selectedStartup.funding_ask)}</p>
                  <p>• Offering: {selectedStartup.equity_offered}% equity</p>
                  <p>• Valuation: {formatCurrency(selectedStartup.current_valuation)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investment Amount ($) *
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={investment.amount || ''}
                  onChange={(e) => setInvestment(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                  placeholder="e.g., 25000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum investment: $1,000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Founder (Optional)
                </label>
                <textarea
                  value={investment.message}
                  onChange={(e) => setInvestment(prev => ({ ...prev, message: e.target.value }))}
                  className="input w-full min-h-[80px] resize-y"
                  placeholder="Tell the founder why you're interested in investing..."
                  rows={3}
                />
              </div>

              {investment.amount > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Your investment:</strong> ${investment.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-700">
                    Estimated equity: ~{((investment.amount / selectedStartup.current_valuation) * 100).toFixed(2)}%
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowInvestModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInvestment}
                disabled={isInvesting || investment.amount < 1000}
                className="flex-1 btn-primary"
              >
                {isInvesting ? 'Submitting...' : 'Submit Investment'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const StartupCard = ({ startup }: { startup: Startup }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="card p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {startup.name}
          </h3>
          <p className="text-gray-600 text-sm mb-3">
            {startup.tagline}
          </p>
          <p className="text-gray-700 text-sm line-clamp-2">
            {startup.description}
          </p>
        </div>
        <div className="ml-4">
          <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div>
          <div className="text-lg font-semibold text-primary-600">
            {formatCurrency(startup.funding_ask)}
          </div>
          <div className="text-xs text-gray-500">Seeking</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-green-600">
            {startup.equity_offered}%
          </div>
          <div className="text-xs text-gray-500">Equity</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(startup.current_valuation)}
          </div>
          <div className="text-xs text-gray-500">Valuation</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          by {startup.founder_name}
        </div>
        {user && profile?.user_type === 'investor' ? (
          <div className="flex space-x-2">
            <button 
              onClick={() => handleChatWithFounder(startup)}
              disabled={isCreatingChat === startup.id}
              className="btn-secondary text-sm py-2 px-4"
              title={`Start private chat with ${startup.founder_name}`}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {isCreatingChat === startup.id ? 'Starting...' : 'Chat'}
            </button>
            <button 
              onClick={() => handleInvestClick(startup)}
              className="btn-primary text-sm py-2 px-4"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Invest
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-400">
            {!user ? 'Sign in to invest' : profile?.user_type === 'founder' ? 'Investor access only' : 'Loading...'}
          </div>
        )}
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <InvestmentModal />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Discover Startups
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore innovative startups seeking funding. Connect with founders and make your next investment.
          </p>
          {profile?.user_type === 'investor' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-green-800">
                ✅ <strong>Investor Access:</strong> Click "Chat" to start private 1-on-1 conversations with founders
              </p>
            </div>
          )}
          {!user && (
            <p className="text-sm text-orange-600 mt-2">
              🔑 Sign in as an investor to chat and invest
            </p>
          )}
        </motion.div>

        {/* Filters and Search */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search startups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input min-w-[200px]"
            >
              <option value="newest">Newest First</option>
              <option value="funding">Highest Funding Ask</option>
              <option value="valuation">Highest Valuation</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Startups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((startup) => (
            <StartupCard key={startup.id} startup={startup} />
          ))}
        </div>

        {/* Empty State */}
        {filteredStartups.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {startups.length === 0 ? 'No startups yet' : 'No startups found'}
            </h3>
            <p className="text-gray-600">
              {startups.length === 0 
                ? 'Be the first to create a startup on our platform!'
                : 'Try adjusting your search to find more startups.'
              }
            </p>
          </div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="card p-8 bg-gradient-to-r from-primary-50 to-secondary-50">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Have a Startup Idea?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join our platform and connect with investors who are looking for the next big thing.
            </p>
            <motion.a
              href="/startup/create"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
            >
              <Target className="h-4 w-4 mr-2" />
              Create Your Startup
            </motion.a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}