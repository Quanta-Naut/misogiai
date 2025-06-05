import { NextRequest, NextResponse } from 'next/server'
import { Groq } from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export type AIProvider = 'openai' | 'groq' | 'gemini'

interface ChatContext {
  userType: 'founder' | 'investor'
  startupName?: string
  pitchContext?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

interface AIResponse {
  content: string
  provider: AIProvider
  model: string
  tokens?: number
}

class ServerAIService {
  // Model configurations from environment variables
  private static readonly models = {
    openai: process.env.OPENAI_MODEL || 'gpt-4',
    groq: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
    gemini: process.env.GOOGLE_AI_MODEL || 'gemini-pro'
  }

  // Initialize clients
  private static openaiClient: OpenAI | null = null
  private static groqClient: Groq | null = null
  private static geminiClient: GoogleGenerativeAI | null = null

  private static getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }
      this.openaiClient = new OpenAI({ apiKey })
    }
    return this.openaiClient
  }

  private static getGroqClient(): Groq {
    if (!this.groqClient) {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey) {
        throw new Error('Groq API key not configured')
      }
      this.groqClient = new Groq({ apiKey })
    }
    return this.groqClient
  }

  private static getGeminiClient(): GoogleGenerativeAI {
    if (!this.geminiClient) {
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        throw new Error('Google AI API key not configured')
      }
      this.geminiClient = new GoogleGenerativeAI(apiKey)
    }
    return this.geminiClient
  }

  static async generateResponse(
    prompt: string,
    context: ChatContext,
    provider: AIProvider = 'openai'
  ): Promise<AIResponse> {
    try {
      console.log(`Generating response with ${provider}...`)
      console.log(`API Keys available:`, {
        openai: !!process.env.OPENAI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        gemini: !!process.env.GOOGLE_AI_API_KEY
      })

      switch (provider) {
        case 'openai':
          return await this.callOpenAI(prompt, context)
        case 'groq':
          return await this.callGroq(prompt, context)
        case 'gemini':
          return await this.callGemini(prompt, context)
        default:
          throw new Error(`Unsupported AI provider: ${provider}`)
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error)
      if (error instanceof Error) {
        console.error(`${provider} error details:`, error.message)
      }
      return {
        content: `Sorry, I'm having trouble connecting to ${provider}. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use a different AI provider.`,
        provider,
        model: this.models[provider],
        tokens: 0
      }
    }
  }

  private static async callOpenAI(prompt: string, context: ChatContext): Promise<AIResponse> {
    const openai = this.getOpenAIClient()
    const model = this.models.openai
    
    console.log(`Using OpenAI model: ${model}`)
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context, 'openai')
      },
      ...(context.conversationHistory?.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })) || []),
      {
        role: 'user',
        content: prompt
      }
    ]

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || 'No response from OpenAI'
    
    return {
      content,
      provider: 'openai',
      model,
      tokens: completion.usage?.total_tokens
    }
  }

  private static async callGroq(prompt: string, context: ChatContext): Promise<AIResponse> {
    const groq = this.getGroqClient()
    const model = this.models.groq
    
    console.log(`Using Groq model: ${model}`)
    
    const messages = [
      {
        role: 'system' as const,
        content: this.buildSystemPrompt(context, 'groq')
      },
      ...(context.conversationHistory || []),
      {
        role: 'user' as const,
        content: prompt
      }
    ]

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      stream: false
    })

    const content = chatCompletion.choices[0]?.message?.content || 'No response from Groq'
    
    return {
      content,
      provider: 'groq',
      model,
      tokens: chatCompletion.usage?.total_tokens
    }
  }

  private static async callGemini(prompt: string, context: ChatContext): Promise<AIResponse> {
    const genAI = this.getGeminiClient()
    const modelName = this.models.gemini
    
    console.log(`Using Gemini model: ${modelName}`)
    
    const model = genAI.getGenerativeModel({ model: modelName })
    
    const systemPrompt = this.buildSystemPrompt(context, 'gemini')
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`
    
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const content = response.text() || 'No response from Gemini'
    
    return {
      content,
      provider: 'gemini',
      model: modelName,
      tokens: 0 // Token count not easily available in this SDK version
    }
  }

  private static buildSystemPrompt(context: ChatContext, provider: AIProvider): string {
    const basePrompt = `You are an AI assistant in LaunchPad, a startup funding simulation platform. You're helping ${context.userType}s in pitch rooms.`
    
    const rolePrompt = context.userType === 'founder' 
      ? `You're helping a founder present their startup and answer investor questions. Be supportive, strategic, and help them showcase their strengths.`
      : `You're helping an investor evaluate startups. Provide insightful questions, due diligence guidance, and investment analysis.`
    
    const contextPrompt = context.startupName 
      ? `Context: This is about ${context.startupName}. ${context.pitchContext || ''}`
      : ''

    const providerPrompt = {
      openai: 'Provide strategic, well-reasoned responses with business insights.',
      groq: 'Give quick, actionable responses. Be concise and practical.',
      gemini: 'Focus on market analysis and comprehensive insights.'
    }[provider]

    return `${basePrompt}\n\n${rolePrompt}\n\n${contextPrompt}\n\n${providerPrompt}\n\nKeep responses helpful, professional, and under 200 words.`
  }

  static async testConnection(provider: AIProvider): Promise<boolean> {
    try {
      console.log(`Testing ${provider} connection...`)
      const response = await this.generateResponse(
        'Just say "Hello! Connection test successful." and nothing else.',
        { userType: 'founder' },
        provider
      )
      const success = response.content.length > 0 && !response.content.includes('having trouble connecting')
      console.log(`${provider} test result:`, success ? 'SUCCESS' : 'FAILED')
      console.log(`${provider} response:`, response.content.substring(0, 100))
      return success
    } catch (error) {
      console.error(`${provider} connection test failed:`, error)
      return false
    }
  }

  static async listGroqModels(): Promise<string[]> {
    try {
      const groq = this.getGroqClient()
      const models = await groq.models.list()
      return models.data?.map(model => model.id) || []
    } catch (error) {
      console.error('Error fetching Groq models:', error)
      return []
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, context, provider, action } = body

    if (action === 'test') {
      const result = await ServerAIService.testConnection(provider)
      return NextResponse.json({ success: result })
    }

    if (action === 'listModels' && provider === 'groq') {
      const models = await ServerAIService.listGroqModels()
      return NextResponse.json({ models })
    }

    if (action === 'generate') {
      const response = await ServerAIService.generateResponse(prompt, context, provider)
      return NextResponse.json(response)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}