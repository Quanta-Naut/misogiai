export type AIProvider = 'openai' | 'groq' | 'gemini'

export interface ChatContext {
  userType: 'founder' | 'investor'
  startupName?: string
  pitchContext?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  pitchDeckContent?: string | null
}

export interface AIResponse {
  content: string
  provider: AIProvider
  model: string
  tokens?: number
}

export class AIService {
  // Client-side AI service that calls the API route
  static async generateResponse(
    prompt: string,
    context: ChatContext,
    provider: AIProvider = 'openai'
  ): Promise<AIResponse> {
    try {
      console.log(`Calling AI API with provider: ${provider}`)
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          context,
          provider
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result = await response.json()
      console.log(`${provider} response received:`, result.content?.substring(0, 100))
      
      return result
    } catch (error) {
      console.error(`Error with ${provider}:`, error)
      return {
        content: `Sorry, I'm having trouble connecting to ${provider}. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use a different AI provider.`,
        provider,
        model: 'unknown',
        tokens: 0
      }
    }
  }

  // Method to test API connections
  static async testConnection(provider: AIProvider): Promise<boolean> {
    try {
      console.log(`Testing ${provider} connection via API...`)
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test',
          provider
        }),
      })

      if (!response.ok) {
        console.error(`API test failed for ${provider}: ${response.status}`)
        return false
      }

      const result = await response.json()
      console.log(`${provider} test result:`, result.success ? 'SUCCESS' : 'FAILED')
      return result.success
    } catch (error) {
      console.error(`${provider} connection test failed:`, error)
      return false
    }
  }

  // Method to list available Groq models
  static async listGroqModels(): Promise<string[]> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'listModels',
          provider: 'groq'
        }),
      })

      if (!response.ok) {
        console.error('Failed to fetch Groq models')
        return []
      }

      const result = await response.json()
      return result.models || []
    } catch (error) {
      console.error('Error fetching Groq models:', error)
      return []
    }
  }

  // Utility method to get current model configurations
  static getModelConfig() {
    return {
      openai: {
        model: 'gpt-4', // Default, actual value comes from server
        description: 'Strategic business advice and complex reasoning'
      },
      groq: {
        model: 'mixtral-8x7b-32768', // Default, actual value comes from server
        description: 'Ultra-fast responses for real-time chat'
      },
      gemini: {
        model: 'gemini-pro', // Default, actual value comes from server
        description: 'Market research and comprehensive analysis'
      }
    }
  }

  // Simple test method for debugging
  static async quickTest(): Promise<void> {
    console.log('=== AI Services Quick Test (via API) ===')
    
    const providers: AIProvider[] = ['openai', 'groq', 'gemini']
    
    for (const provider of providers) {
      try {
        console.log(`\n--- Testing ${provider.toUpperCase()} ---`)
        const start = Date.now()
        
        const response = await this.generateResponse(
          'Say hello and tell me your model name.',
          { userType: 'founder' },
          provider
        )
        
        const time = Date.now() - start
        console.log(`✅ ${provider}: ${time}ms`)
        console.log(`Response: ${response.content.substring(0, 100)}...`)
        console.log(`Model: ${response.model}`)
        console.log(`Tokens: ${response.tokens || 'N/A'}`)
        
      } catch (error) {
        console.log(`❌ ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    console.log('\n=== Test Complete ===')
  }

  // Test all providers at once
  static async testAllProviders(): Promise<Record<string, boolean>> {
    console.log('Testing all AI providers...')
    
    const providers: AIProvider[] = ['openai', 'groq', 'gemini']
    const results: Record<string, boolean> = {}
    
    for (const provider of providers) {
      results[provider] = await this.testConnection(provider)
    }
    
    console.log('Test results:', results)
    return results
  }

  // Get environment info (for debugging)
  static getEnvironmentInfo() {
    return {
      isClient: typeof window !== 'undefined',
      isDevelopment: process.env.NODE_ENV === 'development',
      hasNextPublicVars: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }
  }
}