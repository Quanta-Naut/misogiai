'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'

export default function MessagingTestPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeTest()
  }, [])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const initializeTest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addResult('❌ Not authenticated - please sign in first')
        setIsLoading(false)
        return
      }

      setUser(session.user)
      addResult('✅ User authenticated: ' + session.user.email)

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profileError) {
        addResult('❌ Profile error: ' + profileError.message)
      } else {
        setProfile(profileData)
        addResult(`✅ Profile loaded: ${profileData.full_name} (${profileData.user_type})`)
      }

    } catch (error: any) {
      addResult('❌ Initialization error: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const testDirectMessages = async () => {
    if (!user) {
      addResult('❌ Must be authenticated to test messaging')
      return
    }

    addResult('🧪 Testing direct messages...')

    try {
      // Test reading permissions
      const { data: messages, error: readError } = await supabase
        .from('direct_messages')
        .select('*')
        .limit(5)

      if (readError) {
        addResult('❌ Cannot read direct_messages: ' + readError.message)
      } else {
        addResult(`✅ Can read direct_messages (found ${messages?.length || 0} messages)`)
      }

      // Find another user to test with
      const { data: otherUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, user_type')
        .neq('user_id', user.id)
        .limit(1)

      if (usersError || !otherUsers?.length) {
        addResult('⚠️ No other users found to test messaging with')
        return
      }

      const otherUser = otherUsers[0]
      addResult(`📝 Testing message to: ${otherUser.full_name} (${otherUser.user_type})`)

      // Test sending a message
      const { data: newMessage, error: insertError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: otherUser.user_id,
          message: `Test message from ${profile?.full_name || 'unknown'} at ${new Date().toISOString()}`,
          message_type: 'text'
        })
        .select()

      if (insertError) {
        addResult('❌ Cannot send message: ' + insertError.message)
      } else {
        addResult('✅ Message sent successfully!')
        
        // Clean up test message
        await supabase
          .from('direct_messages')
          .delete()
          .eq('id', newMessage[0].id)
        
        addResult('🧹 Test message cleaned up')
      }

    } catch (error: any) {
      addResult('❌ Direct message test error: ' + error.message)
    }
  }

  const testChatMessages = async () => {
    if (!user) {
      addResult('❌ Must be authenticated to test chat messages')
      return
    }

    addResult('🧪 Testing chat messages (pitch rooms)...')

    try {
      // Test reading chat messages
      const { data: chatMessages, error: readError } = await supabase
        .from('chat_messages')
        .select('*')
        .limit(5)

      if (readError) {
        addResult('❌ Cannot read chat_messages: ' + readError.message)
      } else {
        addResult(`✅ Can read chat_messages (found ${chatMessages?.length || 0} messages)`)
      }

      // Find a pitch session to test with
      const { data: sessions, error: sessionsError } = await supabase
        .from('pitch_sessions')
        .select('id, session_name')
        .limit(1)

      if (sessionsError || !sessions?.length) {
        addResult('⚠️ No pitch sessions found to test with')
        return
      }

      const session = sessions[0]
      addResult(`📝 Testing chat in session: ${session.session_name}`)

      // Test sending a chat message
      const { data: newChatMessage, error: chatInsertError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          user_id: user.id,
          message: `Test chat message from ${profile?.full_name || 'unknown'} at ${new Date().toISOString()}`,
          message_type: 'text'
        })
        .select()

      if (chatInsertError) {
        addResult('❌ Cannot send chat message: ' + chatInsertError.message)
      } else {
        addResult('✅ Chat message sent successfully!')
        
        // Clean up test message
        await supabase
          .from('chat_messages')
          .delete()
          .eq('id', newChatMessage[0].id)
        
        addResult('🧹 Test chat message cleaned up')
      }

    } catch (error: any) {
      addResult('❌ Chat message test error: ' + error.message)
    }
  }

  const testRealTime = async () => {
    addResult('🧪 Testing real-time subscriptions...')

    try {
      const channel = supabase
        .channel('test-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages'
          },
          (payload) => {
            addResult('📡 Real-time message received: ' + payload.new.message)
          }
        )
        .subscribe((status) => {
          addResult('📡 Real-time subscription status: ' + status)
        })

      // Clean up after 5 seconds
      setTimeout(() => {
        channel.unsubscribe()
        addResult('📡 Real-time test completed')
      }, 5000)

    } catch (error: any) {
      addResult('❌ Real-time test error: ' + error.message)
    }
  }

  const runAllTests = async () => {
    setTestResults([])
    addResult('🚀 Starting comprehensive messaging tests...')
    
    await testDirectMessages()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    
    await testChatMessages()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    
    await testRealTime()
    
    addResult('✅ All tests completed!')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="card max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Messaging System Test Console</h1>
          
          {!user ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Please sign in to test messaging functionality</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Current User</h2>
                <p>Email: {user.email}</p>
                <p>Type: {profile?.user_type || 'Unknown'}</p>
                <p>Name: {profile?.full_name || 'Unknown'}</p>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Test Actions</h2>
                <div className="space-x-4">
                  <button onClick={testDirectMessages} className="btn-primary">
                    Test Direct Messages
                  </button>
                  <button onClick={testChatMessages} className="btn-secondary">
                    Test Chat Messages
                  </button>
                  <button onClick={testRealTime} className="btn-secondary">
                    Test Real-time
                  </button>
                  <button onClick={runAllTests} className="btn-primary bg-green-600 hover:bg-green-700">
                    Run All Tests
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Test Results</h2>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
                  {testResults.length === 0 ? (
                    <p className="text-gray-500">No tests run yet. Click a test button to start.</p>
                  ) : (
                    testResults.map((result, index) => (
                      <div key={index} className="mb-1">
                        {result}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside text-blue-800 space-y-1">
                  <li>Run tests to identify messaging issues</li>
                  <li>Check for ✅ (success) or ❌ (error) indicators</li>
                  <li>If tests fail, run the SQL fix scripts in Supabase</li>
                  <li>Test with both investor and founder accounts</li>
                  <li>Check browser console for additional errors</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
