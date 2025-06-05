'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Rocket, 
  Target, 
  Brain,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AIService } from '@/lib/ai-services'
import Navbar from '@/components/layout/Navbar'

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Name and tagline' },
  { id: 2, title: 'Vision & Mission', description: 'Your startup vision' },
  { id: 3, title: 'Product Details', description: 'What you are building' },
  { id: 4, title: 'Market & Business', description: 'Market and business model' },
  { id: 5, title: 'Funding Details', description: 'Investment requirements' },
]

export default function CreateStartupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Use refs to prevent re-renders
  const dataRef = useRef({
    name: '',
    tagline: '',
    description: '',
    vision: '',
    product_description: '',
    market_size: '',
    business_model: '',
    funding_ask: 0,
    equity_offered: 0,
    current_valuation: 0,
    pitch_deck_url: ''
  })

  // State only for values that need to trigger re-renders
  const [calculatedValuation, setCalculatedValuation] = useState(0)

  useEffect(() => {
    initializePage()
  }, [])

  const initializePage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/dashboard'
        return
      }
      setUser(session.user)
    } catch (error) {
      console.error('Error initializing page:', error)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: string | number) => {
    dataRef.current = {
      ...dataRef.current,
      [field]: value
    }
    
    // Update calculated valuation when funding fields change
    if (field === 'funding_ask' || field === 'equity_offered') {
      const fundingAsk = field === 'funding_ask' ? Number(value) : dataRef.current.funding_ask
      const equityOffered = field === 'equity_offered' ? Number(value) : dataRef.current.equity_offered
      
      if (equityOffered > 0) {
        setCalculatedValuation((fundingAsk / equityOffered) * 100)
      }
    }
    
    setError('')
  }

  const generateAISuggestion = async (field: string, setValueCallback: (value: string) => void) => {
    if (!dataRef.current.name) {
      setError('Please enter a startup name first')
      return
    }

    setAiLoading(true)
    try {
      let prompt = ''
      
      switch (field) {
        case 'tagline':
          prompt = `Generate a compelling tagline for a startup named "${dataRef.current.name}". Make it catchy and under 60 characters.`
          break
        case 'description':
          prompt = `Write a detailed description for "${dataRef.current.name}" startup. Include what the company does and its value proposition.`
          break
        case 'vision':
          prompt = `Create an inspiring vision statement for "${dataRef.current.name}". Focus on the long-term impact and goals.`
          break
        case 'product_description':
          prompt = `Describe the product/service that "${dataRef.current.name}" offers. Include key features and benefits.`
          break
        case 'market_size':
          prompt = `Analyze the market size and opportunity for "${dataRef.current.name}". Include target market and growth potential.`
          break
        case 'business_model':
          prompt = `Suggest a business model for "${dataRef.current.name}". Include revenue streams and monetization strategy.`
          break
        default:
          return
      }

      const response = await AIService.generateResponse(
        prompt,
        { userType: 'founder', startupName: dataRef.current.name },
        'openai'
      )

      setValueCallback(response.content)
      updateFormData(field, response.content)
    } catch (error) {
      console.error('AI suggestion error:', error)
      setError('Failed to generate AI suggestion')
    } finally {
      setAiLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveStartup = async () => {
    setSaving(true)
    setError('')

    try {
      const startupData = {
        ...dataRef.current,
        founder_id: user.id,
        current_valuation: calculatedValuation || dataRef.current.funding_ask * 10,
        status: 'active'
      }

      const { data, error } = await supabase
        .from('startups')
        .insert(startupData)
        .select()
        .single()

      if (error) throw error

      alert('Startup created successfully!')
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('Save error:', error)
      setError(error.message || 'Failed to save startup')
    } finally {
      setSaving(false)
    }
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startup Name
              </label>
              <input
                type="text"
                defaultValue={dataRef.current.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className="input"
                placeholder="Enter your startup name"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tagline
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[data-field="tagline"]') as HTMLInputElement
                    generateAISuggestion('tagline', (value) => {
                      if (input) input.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <input
                type="text"
                data-field="tagline"
                defaultValue={dataRef.current.tagline}
                onChange={(e) => updateFormData('tagline', e.target.value)}
                className="input"
                placeholder="A catchy one-liner describing your startup"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Startup Description
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[data-field="description"]') as HTMLTextAreaElement
                    generateAISuggestion('description', (value) => {
                      if (textarea) textarea.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                data-field="description"
                defaultValue={dataRef.current.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Describe what your startup does and its value proposition"
                rows={4}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Vision Statement
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[data-field="vision"]') as HTMLTextAreaElement
                    generateAISuggestion('vision', (value) => {
                      if (textarea) textarea.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                data-field="vision"
                defaultValue={dataRef.current.vision}
                onChange={(e) => updateFormData('vision', e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="What is your long-term vision and impact?"
                rows={4}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Description
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[data-field="product_description"]') as HTMLTextAreaElement
                    generateAISuggestion('product_description', (value) => {
                      if (textarea) textarea.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                data-field="product_description"
                defaultValue={dataRef.current.product_description}
                onChange={(e) => updateFormData('product_description', e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Describe your product or service in detail"
                rows={4}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Market Size & Opportunity
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[data-field="market_size"]') as HTMLTextAreaElement
                    generateAISuggestion('market_size', (value) => {
                      if (textarea) textarea.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                data-field="market_size"
                defaultValue={dataRef.current.market_size}
                onChange={(e) => updateFormData('market_size', e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Describe your target market and growth potential"
                rows={4}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Business Model
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[data-field="business_model"]') as HTMLTextAreaElement
                    generateAISuggestion('business_model', (value) => {
                      if (textarea) textarea.value = value
                    })
                  }}
                  disabled={aiLoading}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                data-field="business_model"
                defaultValue={dataRef.current.business_model}
                onChange={(e) => updateFormData('business_model', e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="How will you make money? Revenue streams, pricing strategy"
                rows={4}
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funding Ask ($)
              </label>
              <input
                type="number"
                defaultValue={dataRef.current.funding_ask}
                onChange={(e) => updateFormData('funding_ask', parseFloat(e.target.value) || 0)}
                className="input"
                placeholder="How much funding do you need?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equity Offered (%)
              </label>
              <input
                type="number"
                defaultValue={dataRef.current.equity_offered}
                onChange={(e) => updateFormData('equity_offered', parseFloat(e.target.value) || 0)}
                className="input"
                placeholder="What percentage of equity are you offering?"
              />
            </div>
            
            {calculatedValuation > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Calculated Valuation:</strong> ${calculatedValuation.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Rocket className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Startup
          </h1>
          <p className="text-xl text-gray-600">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index < STEPS.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                    step.id <= currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step.id < currentStep
                        ? 'bg-primary-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {STEPS[currentStep - 1].title}
            </h3>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-8 mb-8"
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
          
          {currentStep === STEPS.length ? (
            <button
              onClick={saveStartup}
              disabled={saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Create Startup
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="btn-primary"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}