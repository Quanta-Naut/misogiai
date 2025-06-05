'use client'

import { useState } from 'react'
import { AIService } from '@/lib/ai-services'
import { motion } from 'framer-motion'
import { TestTube, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function AIDebug() {
  const [isOpen, setIsOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})
  const [groqModels, setGroqModels] = useState<string[]>([])

  const testAllProviders = async () => {
    setTesting(true)
    setResults({})

    const providers = ['openai', 'groq', 'gemini'] as const
    
    for (const provider of providers) {
      try {
        console.log(`Testing ${provider}...`)
        const success = await AIService.testConnection(provider)
        setResults(prev => ({
          ...prev,
          [provider]: { success, error: null }
        }))
      } catch (error) {
        console.error(`${provider} test failed:`, error)
        setResults(prev => ({
          ...prev,
          [provider]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }))
      }
    }

    // Also fetch available Groq models
    try {
      const models = await AIService.listGroqModels()
      setGroqModels(models)
    } catch (error) {
      console.error('Failed to fetch Groq models:', error)
    }

    setTesting(false)
  }

  const testSingleMessage = async (provider: 'openai' | 'groq' | 'gemini') => {
    try {
      const response = await AIService.generateResponse(
        'Say hello and tell me which AI model you are.',
        { userType: 'founder' },
        provider
      )
      console.log(`${provider} response:`, response)
      alert(`${provider} response: ${response.content}`)
    } catch (error) {
      console.error(`${provider} single test failed:`, error)
      alert(`${provider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        title="AI Debug Panel"
      >
        <TestTube className="h-5 w-5" />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 max-h-96 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <TestTube className="h-4 w-4 mr-2" />
          AI Debug Panel
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <button
            onClick={testAllProviders}
            disabled={testing}
            className="w-full btn-primary text-sm py-2 flex items-center justify-center"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test All AI Providers'
            )}
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Test Results:</h4>
            {Object.entries(results).map(([provider, result]) => (
              <div key={provider} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium capitalize">{provider}</span>
                <div className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <button
                    onClick={() => testSingleMessage(provider as any)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Current Models:</h4>
          <div className="text-xs space-y-1">
            <div><strong>OpenAI:</strong> {process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4'}</div>
            <div><strong>Groq:</strong> {process.env.NEXT_PUBLIC_GROQ_MODEL || 'mixtral-8x7b-32768'}</div>
            <div><strong>Gemini:</strong> {process.env.NEXT_PUBLIC_GOOGLE_AI_MODEL || 'gemini-pro'}</div>
          </div>
        </div>

        {groqModels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Available Groq Models:</h4>
            <div className="text-xs bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
              {groqModels.map((model, index) => (
                <div key={index} className="py-1">
                  {model}
                  {model === (process.env.NEXT_PUBLIC_GROQ_MODEL || 'mixtral-8x7b-32768') && (
                    <span className="ml-2 text-green-600">(current)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Debug Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check browser console for detailed logs</li>
            <li>Verify API keys in .env.local</li>
            <li>Ensure model names are correct</li>
            <li>Restart dev server after .env changes</li>
          </ul>
        </div>
      </div>
    </motion.div>
  )
}