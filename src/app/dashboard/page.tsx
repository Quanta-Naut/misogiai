'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Star, 
  Clock,
  Rocket,
  Target,
  Award,
  MessageCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'

interface DashboardStats {
  totalStartups: number
  totalFunding: number
  averageRating: number
  activeSessions: number
}

interface RecentActivity {
  id: string
  type: 'funding' | 'rating' | 'pitch' | 'message'
  title: string
  description: string
  timestamp: string
  amount?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalStartups: 0,
    totalFunding: 0,
    averageRating: 0,
    activeSessions: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setUser(session.user)

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      setProfile(profileData)

      // Load dashboard data based on user type
      if (profileData?.user_type === 'founder') {
        await loadFounderDashboard(session.user.id)
      } else {
        await loadInvestorDashboard(session.user.id)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFounderDashboard = async (userId: string) => {
    // Load founder-specific data
    const { data: startups } = await supabase
      .from('startups')
      .select('*')
      .eq('founder_id', userId)

    const { data: ratings } = await supabase
      .from('ratings')
      .select('overall_score')
      .in('startup_id', startups?.map(s => s.id) || [])

    const { data: sessions } = await supabase
      .from('pitch_sessions')
      .select('*')
      .in('startup_id', startups?.map(s => s.id) || [])
      .eq('status', 'active')

    const totalFunding = startups?.reduce((sum, startup) => sum + (startup.current_valuation || 0), 0) || 0
    const averageRating = ratings?.length ? 
      ratings.reduce((sum, r) => sum + r.overall_score, 0) / ratings.length : 0

    setStats({
      totalStartups: startups?.length || 0,
      totalFunding,
      averageRating,
      activeSessions: sessions?.length || 0
    })

    // Mock recent activity for founders
    setRecentActivity([
      {
        id: '1',
        type: 'funding',
        title: 'New Investment Offer',
        description: 'Angel Investor offered $50K for 8% equity',
        timestamp: '2 hours ago',
        amount: 50000
      },
      {
        id: '2',
        type: 'rating',
        title: 'Startup Rated',
        description: 'Your startup received a 4.5/5 rating',
        timestamp: '1 day ago'
      },
      {
        id: '3',
        type: 'pitch',
        title: 'Pitch Session Scheduled',
        description: 'Upcoming session with VentureCorp',
        timestamp: '2 days ago'
      }
    ])
  }

  const loadInvestorDashboard = async (userId: string) => {
    // Load investor-specific data
    const { data: investments } = await supabase
      .from('funding_rounds')
      .select('*')
      .eq('investor_id', userId)

    const { data: ratings } = await supabase
      .from('ratings')
      .select('*')
      .eq('investor_id', userId)

    const totalInvested = investments?.reduce((sum, inv) => sum + inv.amount, 0) || 0

    setStats({
      totalStartups: ratings?.length || 0,
      totalFunding: totalInvested,
      averageRating: 0,
      activeSessions: 0
    })

    // Mock recent activity for investors
    setRecentActivity([
      {
        id: '1',
        type: 'funding',
        title: 'Investment Completed',
        description: 'Successfully invested in TechStart Inc.',
        timestamp: '3 hours ago',
        amount: 100000
      },
      {
        id: '2',
        type: 'rating',
        title: 'Startup Evaluated',
        description: 'Rated GreenTech Solutions',
        timestamp: '1 day ago'
      },
      {
        id: '3',
        type: 'message',
        title: 'New Message',
        description: 'Founder replied to your questions',
        timestamp: '2 days ago'
      }
    ])
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in to access your dashboard
          </h1>
        </div>
      </div>
    )
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'primary' }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  )

  const ActivityItem = ({ activity }: { activity: RecentActivity }) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'funding': return DollarSign
        case 'rating': return Star
        case 'pitch': return MessageCircle
        default: return Clock
      }
    }

    const Icon = getIcon()

    return (
      <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Icon className="h-4 w-4 text-primary-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
          <p className="text-sm text-gray-600">{activity.description}</p>
          {activity.amount && (
            <p className="text-sm font-medium text-green-600">
              ${activity.amount.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {profile?.full_name}! 👋
              </h1>
              <p className="text-gray-600 mt-2">
                {profile?.user_type === 'founder' 
                  ? 'Track your startup\'s progress and funding journey'
                  : 'Discover and invest in the next big startup'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              {profile?.user_type === 'founder' ? (
                <motion.a
                  href="/startup/create"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Startup
                </motion.a>
              ) : (
                <motion.a
                  href="/startups"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Browse Startups
                </motion.a>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {profile?.user_type === 'founder' ? (
            <>
              <StatCard
                icon={Rocket}
                title="Active Startups"
                value={stats.totalStartups}
                subtitle="Total projects"
              />
              <StatCard
                icon={DollarSign}
                title="Total Valuation"
                value={`$${(stats.totalFunding / 1000000).toFixed(1)}M`}
                subtitle="Combined value"
                color="success"
              />
              <StatCard
                icon={Star}
                title="Average Rating"
                value={stats.averageRating.toFixed(1)}
                subtitle="Out of 5.0"
                color="secondary"
              />
              <StatCard
                icon={Users}
                title="Active Sessions"
                value={stats.activeSessions}
                subtitle="Pitch meetings"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Target}
                title="Startups Reviewed"
                value={stats.totalStartups}
                subtitle="Total evaluations"
              />
              <StatCard
                icon={DollarSign}
                title="Total Invested"
                value={`$${(stats.totalFunding / 1000000).toFixed(1)}M`}
                subtitle="Portfolio value"
                color="success"
              />
              <StatCard
                icon={Award}
                title="Success Rate"
                value="85%"
                subtitle="Investment accuracy"
                color="secondary"
              />
              <StatCard
                icon={TrendingUp}
                title="ROI"
                value="2.4x"
                subtitle="Average return"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {profile?.user_type === 'founder' ? (
                  <>
                    <a
                      href="/pitch-rooms"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 text-primary-600 mr-3" />
                      <span className="text-sm font-medium">Join Pitch Room</span>
                    </a>
                    <a
                      href="/funding"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <DollarSign className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-sm font-medium">Request Funding</span>
                    </a>
                    <a
                      href="/analytics"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <TrendingUp className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-sm font-medium">View Analytics</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="/startups"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Rocket className="h-5 w-5 text-primary-600 mr-3" />
                      <span className="text-sm font-medium">Browse Startups</span>
                    </a>
                    <a
                      href="/portfolio"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Award className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-sm font-medium">My Portfolio</span>
                    </a>
                    <a
                      href="/pitch-rooms"
                      className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Users className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-sm font-medium">Active Sessions</span>
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}