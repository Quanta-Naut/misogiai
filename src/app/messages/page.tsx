'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  Send, 
  User,
  ArrowLeft,
  Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import { useSearchParams } from 'next/navigation'

interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  user_name: string
  user_type: string
  message: string
  message_type: 'text' | 'ai_response' | 'system' | 'direct_message_sync'
  ai_provider?: string
  created_at: string
}

interface DirectConversation {
  id: string
  participants: string[]
  participant_names: string[]
  participant_types: string[]
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Conversation {
  user_id: string
  user_name: string
  user_type: string
  startup_name?: string
  last_message: string
  last_message_at: string
  unread_count: number
  session_id?: string
}

export default function MessagesPage() {  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [directSessionId, setDirectSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    initializePage()
  }, [])
  useEffect(() => {
    const conversationId = searchParams.get('conversation')
    if (conversationId && user) {
      setSelectedConversation(conversationId)
      loadMessages(conversationId)
      loadUserInfo(conversationId)
    }
  }, [searchParams, user])
  // Add real-time subscription for messages
  useEffect(() => {
    if (!directSessionId || !user) return

    console.log('Setting up real-time subscription for session:', directSessionId)

    const subscription = supabase
      .channel(`messages:${directSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${directSessionId}`
        },
        (payload) => {
          console.log('New message received via real-time:', payload.new)
          loadMessages(selectedConversation!)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up real-time subscription')
      subscription.unsubscribe()
    }
  }, [directSessionId, user, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializePage = async () => {
    try {
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
      await loadConversations(session.user.id)
    } catch (error) {
      console.error('Error initializing page:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserInfo = async (userId: string) => {
    try {
      // Get user profile and startup info
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) throw profileError

      // If the user is a founder, get their startup info
      let startupInfo = null
      if (userProfile.user_type === 'founder') {
        const { data: startup } = await supabase
          .from('startups')
          .select('name, tagline')
          .eq('founder_id', userId)
          .eq('status', 'active')
          .single()
        
        startupInfo = startup
      }

      setSelectedUserInfo({
        ...userProfile,
        startup: startupInfo
      })

    } catch (error) {
      console.error('Error loading user info:', error)
      setSelectedUserInfo(null)
    }
  }

  const loadConversations = async (userId: string) => {
    try {
      // For now, let's create a simple approach using pitch sessions as conversation containers
      // Get pitch sessions for startups where the user is involved
      const { data: pitchSessions, error } = await supabase
        .from('pitch_sessions')
        .select(`
          id,
          session_name,
          startup_id,
          created_at,
          startups!inner(
            id,
            name,
            founder_id,
            profiles!startups_founder_id_fkey(full_name, user_type)
          )
        `)
        .eq('status', 'active')

      if (error) throw error

      // Process sessions into conversations
      const conversationMap = new Map()
      
      for (const session of pitchSessions || []) {
        // Handle the fact that startups is returned as an array from the join
        const startup = Array.isArray(session.startups) ? session.startups[0] : session.startups
        if (!startup) continue
        
        const founderId = startup.founder_id
        // Handle the fact that profiles is returned as an array from the join  
        const founderProfile = Array.isArray(startup.profiles) ? startup.profiles[0] : startup.profiles
        if (!founderProfile) continue
        
        // Skip if this is the current user's own startup
        if (founderId === userId) continue
        
        // Get latest message from this session
        const { data: latestMessage } = await supabase
          .from('chat_messages')
          .select('message, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        // Get unread count (for now, we'll implement a simple version)
        const { data: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('session_id', session.id)
          .neq('user_id', userId) // Messages not from current user
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        
        if (!conversationMap.has(founderId)) {
          conversationMap.set(founderId, {
            user_id: founderId,
            user_name: founderProfile.full_name,
            user_type: founderProfile.user_type,
            startup_name: startup.name,
            last_message: latestMessage?.[0]?.message || 'No messages yet',
            last_message_at: latestMessage?.[0]?.created_at || session.created_at,
            unread_count: unreadMessages?.length || 0,
            session_id: session.id // We'll need this for the direct session
          })
        }
      }

      setConversations(Array.from(conversationMap.values()))
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }
  const loadMessages = async (otherUserId: string) => {
    try {
      console.log('Loading messages for user:', { currentUser: user.id, otherUser: otherUserId })
      
      // Find or create a pitch session for this conversation
      // First, get the startup for the founder
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .select('id, name')
        .eq('founder_id', otherUserId)
        .eq('status', 'active')
        .single()

      if (startupError || !startup) {
        console.error('No startup found for founder:', otherUserId)
        setMessages([])
        return
      }

      // Find existing active session for this startup
      let { data: existingSession, error: sessionError } = await supabase
        .from('pitch_sessions')
        .select('id')
        .eq('startup_id', startup.id)
        .eq('status', 'active')
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError
      }

      // If no session exists, create one
      if (!existingSession) {
        const { data: newSession, error: createError } = await supabase
          .from('pitch_sessions')
          .insert({
            startup_id: startup.id,
            session_name: `Direct Chat - ${startup.name}`,
            description: 'Auto-created session for direct investor-founder conversations',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            status: 'active'
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Error creating session:', createError)
          return
        }
        existingSession = newSession
      }

      setDirectSessionId(existingSession.id)
      
      // Load messages from the session
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(full_name, user_type)
        `)
        .eq('session_id', existingSession.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        throw error
      }

      console.log('Loaded messages:', data?.length || 0, 'messages')

      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        user_name: msg.profiles?.full_name || msg.user_name || 'Unknown',
        user_type: msg.profiles?.user_type || msg.user_type || 'unknown'
      }))

      setMessages(formattedMessages)

    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || !directSessionId) {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasConversation: !!selectedConversation, 
        hasUser: !!user,
        hasSessionId: !!directSessionId
      })
      return
    }

    setIsSending(true)
    console.log('Sending message:', {
      user_id: user.id,
      session_id: directSessionId,
      message: newMessage,
      message_type: 'text'
    })

    try {
      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        console.error('Authentication error:', authError)
        alert('You must be logged in to send messages')
        return
      }

      console.log('User authenticated, session:', session.user.id)

      // Insert message into chat_messages table
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: directSessionId,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email || 'Unknown',
          user_type: profile?.user_type || 'unknown',
          message: newMessage,
          message_type: 'text'
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Message sent successfully:', data)

      // For dual messaging: If sender is investor, sync to pitch room
      if (profile?.user_type === 'investor') {
        console.log('Investor message detected, syncing to pitch room...')
        try {
          // Create sync record in message_pitch_room_links table
          const { error: syncError } = await supabase
            .from('message_pitch_room_links')
            .insert({
              chat_message_id: data[0].id,
              pitch_session_id: directSessionId,
              sync_direction: 'dm_to_pitch'
            })

          if (syncError) {
            console.error('Error syncing message to pitch room:', syncError)
            // Don't fail the main message send for sync errors
          } else {
            console.log('Message synced to pitch room successfully')
          }

          // Create notification for founder
          const { error: notifError } = await supabase
            .from('founder_notifications')
            .insert({
              founder_id: selectedConversation,
              investor_id: user.id,
              pitch_session_id: directSessionId,
              notification_type: 'new_message',
              message: `New message from investor in ${conversations.find(c => c.user_id === selectedConversation)?.startup_name || 'your startup'}`
            })

          if (notifError) {
            console.error('Error creating founder notification:', notifError)
            // Don't fail the main message send for notification errors
          }
        } catch (syncError) {
          console.error('Error in dual messaging sync:', syncError)
          // Continue without failing the main message
        }
      }

      setNewMessage('')
      await loadMessages(selectedConversation)
      await loadConversations(user.id)

    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Provide user-friendly error messages
      if (error.code === '42501') {
        alert('Permission denied. Please refresh the page and try again.')
      } else if (error.code === '23503') {
        alert('Invalid recipient. Please refresh the page and try again.')
      } else if (error.message?.includes('RLS')) {
        alert('Security policy error. Please contact support.')
      } else {
        alert(`Failed to send message: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsSending(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isLoading) {
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
            Please sign in to access messages
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4 h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <MessageCircle className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-3 overflow-y-auto flex-1">
                {conversations.map((conversation) => (
                  <motion.button
                    key={conversation.user_id}
                    onClick={() => {
                      setSelectedConversation(conversation.user_id)
                      loadMessages(conversation.user_id)
                      loadUserInfo(conversation.user_id)
                    }}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedConversation === conversation.user_id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        conversation.user_type === 'founder' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {conversation.user_type === 'founder' ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {conversation.user_name}
                          </h3>
                          {conversation.unread_count > 0 && (
                            <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 capitalize">
                          {conversation.user_type}
                          {conversation.startup_name && (
                            <span className="text-blue-600"> • {conversation.startup_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {conversation.last_message}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}

                {conversations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">
                      Start chatting with founders or investors
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedConversation && selectedUserInfo ? (
              <div className="card h-[calc(100vh-200px)] flex flex-col">
                {/* Chat Header with User Details */}
                <div className="border-b border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                      selectedUserInfo.user_type === 'founder' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      {selectedUserInfo.user_type === 'founder' ? (
                        <Building2 className="h-6 w-6" />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {selectedUserInfo.full_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="capitalize">{selectedUserInfo.user_type}</span>
                        {selectedUserInfo.startup && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">{selectedUserInfo.startup.name}</span>
                          </>
                        )}
                      </div>
                      {selectedUserInfo.startup?.tagline && (
                        <p className="text-xs text-gray-400 mt-1">{selectedUserInfo.startup.tagline}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start your conversation with {selectedUserInfo.full_name}</p>
                      {selectedUserInfo.user_type === 'founder' && selectedUserInfo.startup && (
                        <p className="text-xs mt-1 text-blue-600">
                          Discuss investment opportunities for {selectedUserInfo.startup.name}
                        </p>
                      )}
                    </div>
                  )}
                    {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${
                        message.user_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.user_id === user.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.user_id === user.id ? 'text-primary-100' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={`Message ${selectedUserInfo.full_name}...`}
                      className="flex-1 input"
                      disabled={isSending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isSending || !newMessage.trim()}
                      className="btn-primary"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm">
                    Choose a conversation from the sidebar to start chatting
                  </p>
                  {profile?.user_type === 'investor' && (
                    <p className="text-xs text-blue-600 mt-2">
                      Browse startups and click "Chat" to connect with founders
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}