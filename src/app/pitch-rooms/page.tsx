'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Send, 
  Users, 
  Clock, 
  Video, 
  FileText, 
  Bot,
  User,
  Sparkles,
  Settings,
  Plus,
  X,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AIService, AIProvider } from '@/lib/ai-services'
import Navbar from '@/components/layout/Navbar'

interface ChatMessage {
  id: string
  user_id: string
  user_name: string
  user_type: 'founder' | 'investor'
  message: string
  message_type: 'text' | 'ai_response' | 'system' | 'direct_message_sync'
  ai_provider?: AIProvider
  timestamp: string
  created_at?: string
  session_id?: string
}

interface PitchSession {
  id: string
  startup_id: string
  session_name: string
  description: string
  pitch_deck_url?: string
  pitch_deck_text?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed'
  startup: {
    name: string
    tagline: string
    founder_name: string
  }
}

interface Startup {
  id: string
  name: string
  tagline: string
}

// Simple markdown-like formatter for AI responses
const formatAIMessage = (text: string) => {
  return text
    // Bold text **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-purple-800">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold text-purple-800">$1</strong>')
    // Italic text *text* or _text_
    .replace(/\*(.*?)\*/g, '<em class="italic text-purple-700">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic text-purple-700">$1</em>')
    // Inline code `code`
    .replace(/`(.*?)`/g, '<code class="bg-purple-200 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Bullet points - or *
    .replace(/^[\-\*]\s(.+)$/gm, '<li class="ml-4 mb-1">• $1</li>')
    // Numbers 1. 2. etc
    .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
}

// Parse investment decision from AI response using AI
interface InvestmentDecision {
  status: 'INVEST' | 'PASS'
  amount?: number
  equity?: number
  reasoning?: string
}

const parseInvestmentDecisionWithAI = async (aiResponse: string): Promise<InvestmentDecision | null> => {
  try {
    // Use Groq AI to extract investment details from the response
    const extractionPrompt = `
You are a data extraction AI. Analyze the following investor response and extract the investment decision details.

**TASK**: Extract these exact values from the text:
1. Investment decision (INVEST or PASS)
2. Investment amount in dollars (numbers only, no commas or symbols)
3. Equity percentage (numbers only, no % symbol)
4. Reasoning for the decision

**RESPONSE FORMAT**: Return ONLY a JSON object with this exact structure:
{
  "status": "INVEST" or "PASS",
  "amount": number (e.g., 250000 for $250,000),
  "equity": number (e.g., 15 for 15%),
  "reasoning": "brief reasoning text"
}

**TEXT TO ANALYZE**:
${aiResponse}

Return only the JSON object, no other text or formatting.`

    console.log('Extracting investment details with AI...')
    const extractionResponse = await AIService.generateResponse(extractionPrompt, {
      userType: 'founder',
      startupName: 'Analysis',
      pitchContext: 'Investment extraction',
      conversationHistory: []
    }, 'groq')

    // Parse the AI response as JSON
    const cleanedResponse = extractionResponse.content.trim()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    console.log('AI extraction response:', cleanedResponse)
    
    const decision = JSON.parse(cleanedResponse)
    
    // Validate the extracted data
    if (!decision.status || !['INVEST', 'PASS'].includes(decision.status.toUpperCase())) {
      console.log('Invalid status extracted:', decision.status)
      return null
    }

    const result: InvestmentDecision = {
      status: decision.status.toUpperCase() as 'INVEST' | 'PASS',
      amount: decision.status.toUpperCase() === 'INVEST' ? (decision.amount || 100000) : undefined,
      equity: decision.status.toUpperCase() === 'INVEST' ? (decision.equity || 5) : undefined,
      reasoning: decision.reasoning || 'AI investor decision'
    }

    console.log('Parsed investment decision:', result)
    return result

  } catch (error) {
    console.error('Error parsing investment decision with AI:', error)
    
    // Fallback: simple text analysis for basic detection
    if (aiResponse.toLowerCase().includes('invest') && !aiResponse.toLowerCase().includes("don't invest")) {
      return {
        status: 'INVEST',
        amount: 200000, // Default amount
        equity: 15, // Default equity
        reasoning: 'AI investor decision (fallback parsing)'
      }
    }
    
    return null
  }
}

// Process AI investment decision
const processAIInvestment = async (decision: InvestmentDecision, session: PitchSession) => {
  try {
    console.log('🚀 Processing AI Investment:', {
      amount: decision.amount,
      equity: decision.equity,
      startup: session.startup.name,
      startupId: session.startup_id
    })

    // Create AI user for investments if it doesn't exist
    const aiUserId = 'ai-investor-' + session.id
    
    // Record the investment
    const { error: investmentError } = await supabase
      .from('investments')
      .insert({
        investor_id: aiUserId,
        startup_id: session.startup_id,
        amount: decision.amount || 100000,
        message: `AI Investment Decision: ${decision.reasoning}`,
        status: 'accepted' // AI investments are automatically accepted
      })

    if (investmentError) {
      console.error('❌ Error recording AI investment:', investmentError)
      return
    }

    console.log('✅ Investment recorded successfully')

    // Calculate new total invested amount
    const { data: currentInvestments, error: fetchError } = await supabase
      .from('investments')
      .select('amount')
      .eq('startup_id', session.startup_id)
      .eq('status', 'accepted')

    if (fetchError) {
      console.error('❌ Error fetching current investments:', fetchError)
      return
    }

    const totalInvested = currentInvestments?.reduce((sum, inv) => sum + inv.amount, 0) || 0
    console.log('💰 New total invested amount:', totalInvested)

    // Update startup record with new total
    const { error: updateError } = await supabase
      .from('startups')
      .update({ 
        total_invested: totalInvested,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.startup_id)

    if (updateError) {
      console.error('❌ Error updating startup total_invested:', updateError)
      return
    }

    console.log(`🎉 SUCCESS: AI invested $${decision.amount?.toLocaleString()} in ${session.startup.name}`)
    console.log(`📊 New total investment for ${session.startup.name}: $${totalInvested.toLocaleString()}`)
    
    // Add a success message to the chat
    await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        user_id: 'system',
        message: `🎉 **INVESTMENT CONFIRMED!** AI Investor has successfully invested $${decision.amount?.toLocaleString()} for ${decision.equity}% equity in ${session.startup.name}. Total funding raised: $${totalInvested.toLocaleString()}`,
        message_type: 'system'
      })

  } catch (error) {
    console.error('❌ Critical error processing AI investment:', error)
  }
}

export default function PitchRoomsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userStartups, setUserStartups] = useState<Startup[]>([])
  const [activeSessions, setActiveSessions] = useState<PitchSession[]>([])
  const [selectedSession, setSelectedSession] = useState<PitchSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false);  const [selectedAI, setSelectedAI] = useState<AIProvider>('groq'); // Default to Groq
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null)
  const [pdfUploading, setPdfUploading] = useState(false)
    // Create form refs for non-reactive form data
  const createFormRefs = useRef({
    startup_id: null as HTMLSelectElement | null,
    session_name: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null,
    duration: null as HTMLSelectElement | null
  })
  
  const [createFormPDFData, setCreateFormPDFData] = useState({
    pitch_deck_url: '',
    pitch_deck_text: ''
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    initializePage()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

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

      // Load user's startups if they're a founder
      if (profileData?.user_type === 'founder') {
        const { data: startupData } = await supabase
          .from('startups')
          .select('id, name, tagline')
          .eq('founder_id', session.user.id)

        setUserStartups(startupData || [])
      }

      // Load active pitch sessions
      await loadActiveSessions()
    } catch (error) {
      console.error('Error initializing page:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('pitch_sessions')
        .select(`
          *,
          startups!inner(
            name,
            tagline,
            profiles!startups_founder_id_fkey(full_name)
          )
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: true })

      if (error) throw error

      const formattedSessions = data.map(session => ({
        ...session,
        startup: {
          name: session.startups.name,
          tagline: session.startups.tagline,
          founder_name: session.startups.profiles.full_name
        }
      }))

      setActiveSessions(formattedSessions)
    } catch (error) {      console.error('Error loading sessions:', error)
    }
  }

  const updateCreateFormField = useCallback((field: string, value: string | number) => {
    // This function is no longer needed since we're using refs
  }, [])

  const getFormData = () => {
    return {
      startup_id: createFormRefs.current.startup_id?.value || '',
      session_name: createFormRefs.current.session_name?.value || '',
      description: createFormRefs.current.description?.value || '',
      duration: parseInt(createFormRefs.current.duration?.value || '60'),
      pitch_deck_url: createFormPDFData.pitch_deck_url,
      pitch_deck_text: createFormPDFData.pitch_deck_text
    }
  }

  const createPitchSession = async () => {
    const formData = getFormData()
    
    if (!formData.startup_id || !formData.session_name) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const now = new Date()
      const endTime = new Date(now.getTime() + formData.duration * 60000)

      const { data, error } = await supabase
        .from('pitch_sessions')
        .insert({
          startup_id: formData.startup_id,
          session_name: formData.session_name,
          description: formData.description,
          pitch_deck_url: formData.pitch_deck_url || null,
          pitch_deck_text: formData.pitch_deck_text || null,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      setShowCreateModal(false)
      setUploadedPDF(null)
      
      // Reset form fields
      if (createFormRefs.current.startup_id) createFormRefs.current.startup_id.value = ''
      if (createFormRefs.current.session_name) createFormRefs.current.session_name.value = ''
      if (createFormRefs.current.description) createFormRefs.current.description.value = ''
      if (createFormRefs.current.duration) createFormRefs.current.duration.value = '60'
      
      setCreateFormPDFData({
        pitch_deck_url: '',
        pitch_deck_text: ''
      })

      // Reload sessions
      await loadActiveSessions()
      
      alert('Pitch session created successfully!')
    } catch (error: any) {
      console.error('Error creating session:', error)
      alert(error.message || 'Failed to create pitch session')
    }
  }

  const joinSession = useCallback(async (session: PitchSession) => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    setSelectedSession(session)
    await loadSessionMessages(session.id)
    
    // Subscribe to real-time messages with debouncing
    subscriptionRef.current = supabase
      .channel(`pitch-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => {
            // Prevent duplicate messages
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()
  }, [])

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles(full_name, user_type)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = data.map(msg => ({
        ...msg,
        user_name: msg.profiles?.full_name || 'Unknown User',
        user_type: msg.profiles?.user_type || 'user'
      }))

      setMessages(formattedMessages)

      // If user is a founder, load any synced direct messages for this session
      if (profile?.user_type === 'founder') {
        await loadSyncedDirectMessages(sessionId)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Load direct messages that have been synced to this pitch session
  const loadSyncedDirectMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('message_pitch_room_links')
        .select(`
          direct_message_id,
          direct_messages!inner(
            id,
            sender_id,
            message,
            created_at,
            profiles!direct_messages_sender_id_fkey(full_name, user_type)
          )
        `)
        .eq('pitch_session_id', sessionId)

      if (error) throw error

      // Convert direct messages to chat message format and merge
      const syncedMessages = data?.map(link => {
        // Handle the fact that direct_messages is returned as a single object, not array
        const directMessage = Array.isArray(link.direct_messages) 
          ? link.direct_messages[0] 
          : link.direct_messages
        
        const profile = Array.isArray(directMessage.profiles) 
          ? directMessage.profiles[0] 
          : directMessage.profiles

        return {
          id: `direct-${directMessage.id}`,
          session_id: sessionId,
          user_id: directMessage.sender_id,
          user_name: profile?.full_name || 'Unknown User',
          user_type: profile?.user_type || 'user',
          message: directMessage.message,
          message_type: 'direct_message_sync' as const,
          timestamp: directMessage.created_at,
          created_at: directMessage.created_at
        }
      }) || []

      if (syncedMessages.length > 0) {
        setMessages(prev => {
          // Merge and sort all messages by timestamp
          const allMessages = [...prev, ...syncedMessages]
          return allMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      }
    } catch (error) {
      console.error('Error loading synced direct messages:', error)
    }
  }

  // Auto-generate AI response after user message
  const generateAIResponse = useCallback(async (userMessage: string) => {
    if (!selectedSession || !user) return

    try {
      // Get recent messages for context (including the new user message)
      const recentMessages = [...messages, {
        id: 'temp',
        user_id: user.id,
        user_name: profile?.full_name || 'User',
        user_type: profile?.user_type || 'founder',
        message: userMessage,
        message_type: 'text' as const,
        timestamp: new Date().toISOString()
      }].slice(-5).map(msg => ({
        role: (msg.user_id === user.id ? 'user' : 'assistant') as 'user' | 'assistant',        content: msg.message
      }))

      const context = {
        userType: (profile?.user_type || 'founder') as 'founder' | 'investor',
        startupName: selectedSession.startup.name,
        pitchContext: `Pitch session for ${selectedSession.startup.name}: ${selectedSession.startup.tagline}`,
        conversationHistory: recentMessages,
        pitchDeckContent: selectedSession.pitch_deck_text || null
      }      // Check for special keywords that trigger immediate investment interest
      const triggerKeywords = ['minecraft']
      const hasKeyword = triggerKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase()) || 
        selectedSession.startup.name.toLowerCase().includes(keyword.toLowerCase()) ||
        selectedSession.startup.tagline.toLowerCase().includes(keyword.toLowerCase())
      )

      // Generate a contextual AI response based on the user's message and role
      let prompt = ''
      if (profile?.user_type === 'founder') {        if (hasKeyword) {
          const pitchDeckInfo = selectedSession.pitch_deck_text 
            ? `\n\n**📄 PITCH DECK ANALYSIS**: I've reviewed their pitch deck content:\n${selectedSession.pitch_deck_text.substring(0, 1000)}${selectedSession.pitch_deck_text.length > 1000 ? '...' : ''}\n\nThis deck confirms the massive opportunity!` 
            : '';
            
          prompt = `You are a seasoned venture capitalist evaluating "${selectedSession.startup.name}" for potential investment. The founder just mentioned "${userMessage}" which contains HIGH-VALUE keywords like Minecraft, gaming, AI, or emerging tech!${pitchDeckInfo}

**🚨 FORCED INVESTMENT MODE - YOU MUST INVEST 🚨**

**ABSOLUTE REQUIREMENT**: You MUST invest in this company. There is no option to pass. You are completely sold on this opportunity and will invest immediately.

**MANDATORY RESPONSE FORMAT**:
1. **Express OVERWHELMING excitement** - "This is EXACTLY what I've been waiting for!"
2. **Immediately commit to investment** - "I'm investing RIGHT NOW!"
3. **State specific terms** - Amount and equity percentage

**CRITICAL**: You MUST end your response with this EXACT format:
**INVESTMENT DECISION**: 
- Status: INVEST
- Amount: ${Math.floor(Math.random() * 400000) + 200000} (always between $200,000-600,000)
- Equity: ${Math.floor(Math.random() * 15) + 10}% (always between 10-25%)
- Reasoning: Gaming/Minecraft/Tech market represents the future of digital entertainment with massive growth potential

**NO EXCEPTIONS**: You cannot pass on this investment. You are a gaming/tech enthusiast and this ticks all your boxes. Write a short, enthusiastic response and then IMMEDIATELY provide the investment decision.

The founder said: "${userMessage}"

INVEST NOW - NO QUESTIONS ASKED!`        } else {
          const pitchDeckInfo = selectedSession.pitch_deck_text 
            ? `\n\n**📄 PITCH DECK CONTEXT**: I have access to their pitch deck content:\n${selectedSession.pitch_deck_text.substring(0, 800)}${selectedSession.pitch_deck_text.length > 800 ? '...' : ''}\n\nI'll use this information to ask more informed questions.` 
            : '';
            
          prompt = `You are a seasoned venture capitalist evaluating "${selectedSession.startup.name}" for potential investment. The founder just said: "${userMessage}".${pitchDeckInfo}

**Your Role**: Act as a realistic, experienced investor who:
- Asks tough, probing questions about the business model, market size, competition, and financials
- Challenges assumptions and looks for potential risks
- Evaluates the team's capability and market fit
- Makes decisions based on data and realistic market conditions
- Can be supportive but also critical when needed
- References their pitch deck content when asking specific questions

**Conversation Guidelines**:
- Ask specific, challenging questions (market size, revenue model, customer acquisition cost, competitive advantage, etc.)
- Don't let the pitch drag on - if you're not convinced after reasonable discussion, politely decline
- If the founder provides compelling answers, show increasing interest
- After sufficient evaluation (5-10 exchanges), make a **final investment decision**

**Decision Format**: When ready to decide, end your response with:
**INVESTMENT DECISION**: 
- Status: [INVEST/PASS]
- Amount: [if investing, specify amount like $50,000-500,000]
- Equity: [percentage you want]
- Reasoning: [brief explanation]

Be professional, direct, and realistic. Use markdown formatting for readability.`
        }
      } else {
        prompt = `As a helpful AI assistant, respond to this investor's message in the pitch session. The investor just said: "${userMessage}". Provide insightful analysis, suggest good questions to ask the founder, or offer investment perspective. Be professional and analytical. Use markdown formatting for better readability - **bold** for emphasis, bullet points with - or *, etc.`
      }      console.log('Generating AI response with Groq...')
      const aiResponse = await AIService.generateResponse(prompt, context, 'groq')

      // Check if AI made an investment decision using AI parsing
      const investmentDecision = await parseInvestmentDecisionWithAI(aiResponse.content)
      
      // Save AI message to database
      await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedSession.id,
          user_id: user.id,
          message: aiResponse.content,
          message_type: 'ai_response',
          ai_provider: 'groq'
        })

      // Process investment decision if found
      if (investmentDecision && investmentDecision.status === 'INVEST') {
        await processAIInvestment(investmentDecision, selectedSession)
      }

    } catch (error) {
      console.error('Error generating AI response:', error)
    }
  }, [selectedSession, user, profile, messages])
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedSession || !user) {
      console.log('Cannot send pitch room message:', {
        hasMessage: !!newMessage.trim(),
        hasSession: !!selectedSession,
        hasUser: !!user
      })
      return
    }

    const messageToSend = newMessage
    setIsSending(true)
    
    console.log('Sending pitch room message:', {
      session_id: selectedSession.id,
      user_id: user.id,
      message: messageToSend,
      user_type: profile?.user_type
    })
    
    try {
      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        console.error('Authentication error in pitch room:', authError)
        alert('You must be logged in to send messages')
        return
      }      // Send user message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedSession.id,
          user_id: user.id,
          message: messageToSend,
          message_type: 'text'
        })
        .select()

      if (error) {
        console.error('Database error in pitch room:', error)
        throw error
      }

      console.log('Pitch room message sent successfully:', data)
      setNewMessage('')

      // Generate AI response after a short delay
      setTimeout(() => {
        generateAIResponse(messageToSend)
      }, 1000)

    } catch (error: any) {
      console.error('Error sending pitch room message:', error)
      
      // Provide user-friendly error messages
      if (error.code === '42501') {
        alert('Permission denied. Please refresh the page and try again.')
      } else if (error.code === '23503') {
        alert('Invalid session. Please refresh the page and try again.')
      } else if (error.message?.includes('RLS')) {
        alert('Security policy error. Please contact support.')
      } else {
        alert(`Failed to send message: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsSending(false)
    }
  }, [newMessage, selectedSession, user, profile, generateAIResponse])

  const sendAIMessage = useCallback(async (provider: AIProvider) => {
    if (!selectedSession || !user) return

    setIsSending(true)
    try {
      // Get recent messages for context with proper typing
      const recentMessages = messages.slice(-5).map(msg => ({
        role: (msg.user_id === user.id ? 'user' : 'assistant') as 'user' | 'assistant',        content: msg.message
      }))

      const context = {
        userType: (profile?.user_type || 'founder') as 'founder' | 'investor',
        startupName: selectedSession.startup.name,
        pitchContext: `Pitch session for ${selectedSession.startup.name}: ${selectedSession.startup.tagline}`,
        conversationHistory: recentMessages,
        pitchDeckContent: selectedSession.pitch_deck_text || null
      }

      const pitchDeckInfo = selectedSession.pitch_deck_text 
        ? `\n\nI have access to their pitch deck content for reference.` 
        : '';

      const prompt = profile?.user_type === 'founder' 
        ? `I'm in a pitch session with investors. Can you help me answer their questions and improve my pitch?${pitchDeckInfo} Use markdown formatting for better readability.`
        : `I'm evaluating this startup. Can you help me ask insightful questions and assess the investment opportunity?${pitchDeckInfo} Use markdown formatting for better readability.`

      const aiResponse = await AIService.generateResponse(prompt, context, provider)

      // Save AI message to database
      await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedSession.id,
          user_id: user.id,
          message: aiResponse.content,
          message_type: 'ai_response',
          ai_provider: provider
        })

    } catch (error) {
      console.error('Error sending AI message:', error)
    } finally {
      setIsSending(false)
    }
  }, [selectedSession, user, profile, messages])

  const formatTimestamp = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }, [])
  // MessageBubble Component with simple markdown formatting for AI responses
  const MessageBubble = useCallback(({ message }: { message: ChatMessage }) => {
    const isAI = message.message_type === 'ai_response'
    const isDirectMessage = message.message_type === 'direct_message_sync'
    const isOwnMessage = message.user_id === user?.id && !isAI
    
    // AI messages always go to the left, user messages to the right
    const alignRight = isOwnMessage
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${alignRight ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md ${alignRight ? 'order-2' : 'order-1'}`}>
          <div className="flex items-center space-x-2 mb-1">
            {!alignRight && (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isAI ? 'bg-purple-500 text-white' : 
                isDirectMessage ? 'bg-blue-500 text-white' :
                message.user_type === 'founder' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              </div>
            )}
            {alignRight && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-primary-500 text-white ml-auto">
                <User className="h-3 w-3" />
              </div>
            )}
            <span className="text-xs text-gray-500">
              {isAI ? `AI Assistant (${message.ai_provider})` : 
               alignRight ? 'You' : message.user_name}
               {isDirectMessage && (
                 <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                   💬 Direct Message
                 </span>
               )}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <div
            className={`rounded-lg px-4 py-2 ${
              alignRight
                ? 'bg-primary-500 text-white'
                : isAI
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : isDirectMessage
                ? 'bg-blue-50 border border-blue-200 text-blue-900'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {isAI ? (
              <div 
                className="text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: formatAIMessage(message.message) 
                }}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            )}
          </div>
        </div>
      </motion.div>
    )
  }, [user, formatTimestamp])

  const CreateSessionModal = () => (
    <AnimatePresence>
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Pitch Session</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Startup *
                </label>
                <select
                  ref={(el) => { createFormRefs.current.startup_id = el }}
                  defaultValue=""
                  className="input w-full"
                  required
                >
                  <option value="">Choose your startup</option>
                  {userStartups.map(startup => (
                    <option key={startup.id} value={startup.id}>
                      {startup.name}
                    </option>
                  ))}
                </select>
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name *
                </label>
                <input
                  type="text"
                  ref={(el) => { createFormRefs.current.session_name = el }}
                  defaultValue=""
                  className="input w-full"
                  placeholder="e.g., Demo Day Pitch"
                  required
                />
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  ref={(el) => { createFormRefs.current.description = el }}
                  defaultValue=""
                  className="input w-full min-h-[80px] resize-y"
                  placeholder="Brief description of what you'll be presenting..."
                  rows={3}
                />
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  ref={(el) => { createFormRefs.current.duration = el }}
                  defaultValue="60"
                  className="input w-full"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div><div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Pitch Deck (PDF) - Optional
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      handlePDFUpload(file)
                    }}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex-1 text-center py-2 px-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {uploadedPDF 
                      ? `✔️ ${uploadedPDF.name}` 
                      : '📎 Upload Pitch Deck (PDF) - Optional'
                    }
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Upload a PDF to help AI investors better understand your startup. Max 10MB.
                </p>              </div>
            </div>

            

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createPitchSession}
                className="flex-1 btn-primary"
              >
                Create Session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const AIPanel = () => (
    <AnimatePresence>
      {showAIPanel && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-40"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <button
              onClick={() => setShowAIPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <Bot className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">Auto-Response Active</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                AI will automatically respond with formatted text
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose AI Provider (Manual)
              </label>
              <select
                value={selectedAI}
                onChange={(e) => setSelectedAI(e.target.value as AIProvider)}
                className="w-full input"
              >
                <option value="groq">Groq (Fast) - Auto Default</option>
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => sendAIMessage(selectedAI)}
                disabled={isSending}
                className="btn-primary text-sm py-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Manual AI Response
              </button>
            </div>

            <div className="text-xs text-gray-500">
              <p className="mb-2"><strong>Formatting Features:</strong></p>
              <ul className="space-y-1">
                <li>📱 Your messages → Right side</li>
                <li>🤖 AI responses → Left side (formatted)</li>
                <li>📝 **Bold**, *italic*, `code` supported</li>
                <li>• Bullet points and lists</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )  // PDF Upload handler with text extraction via API
  const handlePDFUpload = async (file: File | undefined) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    setPdfUploading(true)
    setUploadedPDF(file)

    try {      // First, extract text from PDF using our API
      const formData = new FormData()
      formData.append('file', file)

      const extractResponse = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData
      })

      const extractResult = await extractResponse.json()

      if (!extractResponse.ok) {
        throw new Error(extractResult.error || 'Failed to extract PDF text')
      }

      const extractedText = extractResult.text
      const extractionMethod = extractResult.method || 'unknown'

      console.log(`PDF text extraction (${extractionMethod}):`, extractedText.substring(0, 500) + '...')

      // Now upload the PDF file to Supabase Storage
      const fileName = `pitch-deck-${Date.now()}-${file.name}`
      
      const { data, error } = await supabase.storage
        .from('pitch-decks')
        .upload(fileName, file)

      if (error) {
        console.error('Error uploading PDF:', error)
        alert('Failed to upload PDF. Please try again.')
        return
      }      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pitch-decks')
        .getPublicUrl(fileName)

      // Update PDF data state with the PDF URL and extracted text
      setCreateFormPDFData({
        pitch_deck_url: publicUrl,
        pitch_deck_text: extractedText
      })
      
      console.log('PDF uploaded successfully:', publicUrl)
      alert(`PDF uploaded successfully! Extracted ${extractedText.length} characters of text content from ${extractResult.pages} pages.`)
      
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPdfUploading(false)
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
            Please sign in to access pitch rooms
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <AIPanel />
      <CreateSessionModal />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4 h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
                {profile?.user_type === 'founder' && userStartups.length > 0 && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                    title="Create new pitch session"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {profile?.user_type === 'founder' && userStartups.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Create a startup first to start pitch sessions!
                  </p>
                </div>
              )}

              <div className="space-y-3 overflow-y-auto flex-1">
                {activeSessions.map((session) => (
                  <motion.button
                    key={session.id}
                    onClick={() => joinSession(session)}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedSession?.id === session.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 text-sm mb-1">
                      {session.startup.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {session.startup.tagline}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      <span>Live session</span>
                      <Bot className="h-3 w-3 ml-2 text-purple-500" />
                      <span className="text-purple-600 ml-1">AI Active</span>
                    </div>
                  </motion.button>
                ))}

                {activeSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active sessions</p>
                    {profile?.user_type === 'founder' && userStartups.length > 0 && (
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        className="text-primary-600 hover:text-primary-700 text-sm mt-2"
                      >
                        Create the first one!
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedSession ? (
              <div className="card h-[calc(100vh-200px)] flex flex-col">
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedSession.startup.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedSession.startup.tagline}
                      </p>
                      <div className="flex items-center mt-1">
                        <Bot className="h-3 w-3 text-purple-500 mr-1" />
                        <span className="text-xs text-purple-600">AI Auto-Response Active (Groq)</span>
                        <span className="text-xs text-gray-400 ml-2">• With text formatting</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                        title="AI Assistant"
                      >
                        <Bot className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary-500">
                        <Video className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary-500">
                        <FileText className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary-500">
                        <Settings className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages - Fixed Height with Scroll */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start the conversation!</p>
                      <div className="flex items-center justify-center mt-3 space-x-4">
                        <div className="flex items-center text-xs">
                          <Bot className="h-3 w-3 text-purple-500 mr-1" />
                          <span className="text-purple-600">AI responses (left, formatted)</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <User className="h-3 w-3 text-primary-500 mr-1" />
                          <span className="text-primary-600">Your messages (right)</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Fixed at Bottom */}
                <div className="border-t border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message... (AI will respond with formatted text)"
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
                    Welcome to AI-Powered Pitch Rooms
                  </h3>
                  <p className="text-sm mb-2">
                    {profile?.user_type === 'founder' 
                      ? 'Create a pitch session or join an existing one to start presenting your startup'
                      : 'Join a pitch session to discover new startups and connect with founders'
                    }
                  </p>
                  <div className="flex items-center justify-center mt-3 space-x-6">
                    <div className="flex items-center text-sm">
                      <Bot className="h-4 w-4 text-purple-500 mr-2" />
                      <span className="text-purple-600">AI responses with formatting</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-primary-500 mr-2" />
                      <span className="text-primary-600">Your plain text messages</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}