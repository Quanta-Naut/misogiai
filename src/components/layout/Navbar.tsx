'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Rocket, User, LogOut, Menu, X, Bell, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/auth/AuthModal'

interface Profile {
  id: string
  full_name: string
  user_type: 'founder' | 'investor'
  avatar_url?: string
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [unreadInvestorMessages, setUnreadInvestorMessages] = useState(0)
  const [investorNotifications, setInvestorNotifications] = useState<any[]>([])
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setUnreadInvestorMessages(0)
          setInvestorNotifications([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])  // Load investor message notifications for founders
  useEffect(() => {
    if (user && profile?.user_type === 'founder') {
      loadInvestorNotifications()
      
      // Set up real-time subscription for new investor messages
      const subscription = supabase
        .channel(`founder-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'founder_notifications',
            filter: `founder_id=eq.${user.id}`
          },
          () => {
            loadInvestorNotifications()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, profile])

  const loadInvestorNotifications = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('founder_notifications')
        .select(`
          *,
          profiles!founder_notifications_investor_id_fkey(full_name)
        `)
        .eq('founder_id', user.id)
        .eq('is_read', false)
        .eq('notification_type', 'new_message')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      
      setInvestorNotifications(data || [])
      setUnreadInvestorMessages(data?.length || 0)
    } catch (error) {
      console.error('Error loading investor notifications:', error)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowUserMenu(false)
  }
  const handleNotificationClick = async () => {
    if (profile?.user_type === 'founder' && unreadInvestorMessages > 0) {
      // Navigate to pitch rooms to see investor messages
      window.location.href = '/pitch-rooms'
      
      // Mark notifications as read
      try {
        await supabase
          .from('founder_notifications')
          .update({ is_read: true })
          .eq('founder_id', user.id)
          .eq('is_read', false)
          .eq('notification_type', 'new_message')
          
        setUnreadInvestorMessages(0)
        setInvestorNotifications([])
      } catch (error) {
        console.error('Error marking messages as read:', error)
      }
    } else {
      // For investors or no messages, just go to messages
      window.location.href = '/messages'
    }
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Startups', href: '/startups' },
    { name: 'Pitch Rooms', href: '/pitch-rooms' },
    { name: 'Leaderboard', href: '/leaderboard' },
  ]

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
              >
                🚀
              </motion.div>
              <div className="text-xl font-bold text-gray-900">LaunchPad</div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {user && (
                <>
                  {navItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {item.name}
                    </a>
                  ))}
                </>
              )}
            </div>

            {/* User Actions */}            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Notifications */}
                  <div className="relative">
                    <button 
                      onClick={handleNotificationClick}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title={
                        profile?.user_type === 'founder' && unreadInvestorMessages > 0
                          ? `${unreadInvestorMessages} new message${unreadInvestorMessages > 1 ? 's' : ''} from investor${unreadInvestorMessages > 1 ? 's' : ''}`
                          : 'View messages'
                      }
                    >
                      <Bell className="h-5 w-5" />
                      {profile?.user_type === 'founder' && unreadInvestorMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadInvestorMessages > 9 ? '9+' : unreadInvestorMessages}
                        </span>
                      )}
                    </button>
                    
                    {/* Notification Preview Dropdown */}
                    {profile?.user_type === 'founder' && unreadInvestorMessages > 0 && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">
                            New Messages from Investors
                          </h3>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {investorNotifications.slice(0, 3).map((notification) => (
                            <div key={notification.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">
                                    {notification.investor_name?.[0]?.toUpperCase() || 'I'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.investor_name}
                                  </p>
                                  <p className="text-xs text-blue-600 mb-1">
                                    about {notification.startup_name}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {notification.message_preview}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-gray-50 text-center">
                          <button 
                            onClick={() => window.location.href = '/pitch-rooms'}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View all in Pitch Rooms →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {profile?.full_name || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {profile?.user_type}
                        </div>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                      >
                        <a
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </a>
                        <a
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </a>
                        <hr className="my-1" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-primary"
                  >
                    Get Started
                  </button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showMobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 py-4"
            >
              <div className="space-y-1">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}