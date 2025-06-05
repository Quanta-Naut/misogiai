'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Star,
  Target,
  Crown,
  Flame
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'

interface LeaderboardEntry {
  id: string
  name: string
  tagline: string
  founder_name: string
  total_invested: number
  valuation: number
  average_rating: number
  total_investors: number
  rank: number
  badge?: string
}

const TABS = [
  { id: 'invested', name: 'Investment Raised', icon: DollarSign },
  { id: 'valuation', name: 'Valuation', icon: TrendingUp },
  { id: 'rating', name: 'Investor Rating', icon: Star },
  { id: 'popularity', name: 'Popularity', icon: Users },
]

const BADGES = {
  'unicorn': { icon: Crown, color: 'text-purple-500', label: 'Unicorn' },
  'rising_star': { icon: Flame, color: 'text-orange-500', label: 'Rising Star' },
  'top_rated': { icon: Star, color: 'text-yellow-500', label: 'Top Rated' },
  'investor_favorite': { icon: Trophy, color: 'text-blue-500', label: 'Investor Favorite' },
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('invested')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    initializePage()
  }, [])

  useEffect(() => {
    loadLeaderboard(activeTab)
  }, [activeTab])

  const initializePage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      await loadLeaderboard(activeTab)
    } catch (error) {
      console.error('Error initializing page:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async (sortBy: string) => {
    try {
      setLoading(true)
      
      const { data: startups, error } = await supabase
        .from('startups')
        .select(`
          *,
          total_invested,
          profiles!startups_founder_id_fkey(full_name),
          investments(
            amount,
            status,
            investor_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading startups:', error)
        return
      }

      if (!startups) {
        console.log('No startups found')
        setLeaderboard([])
        return
      }

      const processedData: LeaderboardEntry[] = startups.map((startup, index) => {
        const acceptedInvestments = startup.investments?.filter((inv: any) => inv.status === 'accepted') || []
        const uniqueInvestors = new Set(acceptedInvestments.map((inv: any) => inv.investor_id))
        const totalInvestors = uniqueInvestors.size

        const averageRating = 4.0 + Math.random() * 1.0 // Mock rating

        let badge = undefined
        if (startup.total_invested >= 1000000) {
          badge = 'unicorn'
        } else if (startup.total_invested >= 500000 && totalInvestors >= 5) {
          badge = 'rising_star'
        } else if (averageRating >= 4.7) {
          badge = 'top_rated'
        } else if (totalInvestors >= 8) {
          badge = 'investor_favorite'
        }

        return {
          id: startup.id,
          name: startup.name,
          tagline: startup.tagline || '',
          founder_name: startup.profiles?.full_name || 'Unknown Founder',
          total_invested: startup.total_invested || 0,
          valuation: startup.valuation || 0,
          average_rating: Math.round(averageRating * 10) / 10,
          total_investors: totalInvestors,
          rank: index + 1,
          badge
        }
      })

      const sortedData = [...processedData].sort((a, b) => {
        switch (sortBy) {
          case 'invested':
            return b.total_invested - a.total_invested
          case 'valuation':
            return b.valuation - a.valuation
          case 'rating':
            return b.average_rating - a.average_rating
          case 'popularity':
            return b.total_investors - a.total_investors
          default:
            return b.total_invested - a.total_invested
        }
      })

      const rankedData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))

      setLeaderboard(rankedData)
      
      if (user) {
        const userStartup = rankedData.find(entry => entry.founder_name === user.user_metadata?.full_name)
        setUserRank(userStartup?.rank || null)
      }
      
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  const getValueByTab = (entry: LeaderboardEntry, tab: string) => {
    switch (tab) {
      case 'invested':
        return formatCurrency(entry.total_invested)
      case 'valuation':
        return formatCurrency(entry.valuation)
      case 'rating':
        return `${entry.average_rating.toFixed(1)}/5.0`
      case 'popularity':
        return `${entry.total_investors} investors`
      default:
        return ''
    }
  }

  const LeaderboardCard = ({ entry, index }: { entry: LeaderboardEntry; index: number }) => {
    const badge = entry.badge && entry.badge in BADGES ? BADGES[entry.badge as keyof typeof BADGES] : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`card p-6 hover:shadow-lg transition-all duration-300 ${
          entry.rank <= 3 ? 'ring-2 ring-primary-200' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
              {getRankIcon(entry.rank)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {entry.name}
                </h3>
                {badge && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full">
                    <badge.icon className={`h-3 w-3 ${badge.color}`} />
                    <span className="text-xs font-medium text-gray-600">
                      {badge.label}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{entry.tagline}</p>
              <p className="text-xs text-gray-500">Founded by {entry.founder_name}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">
              {getValueByTab(entry, activeTab)}
            </div>
            <div className="text-sm text-gray-500">
              {activeTab === 'invested' && `${formatCurrency(entry.valuation)} valuation`}
              {activeTab === 'valuation' && `${formatCurrency(entry.total_invested)} raised`}
              {activeTab === 'rating' && `${entry.total_investors} investors`}
              {activeTab === 'popularity' && `${entry.average_rating.toFixed(1)}/5.0 rating`}
            </div>
          </div>
        </div>

        {entry.rank <= 10 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(10, 100 - (entry.rank - 1) * 10)}%`
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    )
  }

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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Trophy className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏆 Startup Leaderboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the top-performing startups on LaunchPad. Track funding, valuations, and investor ratings.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Startups', value: '150+', icon: Target },
            { label: 'Total Funding', value: '$45M+', icon: DollarSign },
            { label: 'Active Investors', value: '500+', icon: Users },
            { label: 'Average Rating', value: '4.3/5', icon: Star },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="card p-4 text-center"
            >
              <stat.icon className="h-6 w-6 text-primary-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="space-y-4">
          {leaderboard.map((entry, index) => (
            <LeaderboardCard key={entry.id} entry={entry} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="card p-8 bg-gradient-to-r from-primary-50 to-secondary-50">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Join the Leaderboard?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Create your startup profile and start your journey to the top. 
              Connect with investors and build the next big thing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/startup/create"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
              >
                <Target className="h-4 w-4 mr-2" />
                Create Startup
              </motion.a>
              <motion.a
                href="/startups"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary"
              >
                <Users className="h-4 w-4 mr-2" />
                Browse Startups
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
