import { useState, useRef, useEffect } from 'react'

const QUICK_ACTIONS = [
  { label: '🥩 How do I hit my protein goal?', prompt: 'How do I hit my daily protein goal consistently?' },
  { label: '🍗 Recipe with chicken & rice', prompt: 'Give me a high protein recipe using chicken and rice' },
  { label: '📦 Meal prep for the week', prompt: 'What\'s the best way to meal prep for the whole week?' },
  { label: '🔢 Explain my macros', prompt: 'Explain what macros are and how I should think about them' },
]

function buildSystemPrompt(settings) {
  const profile = settings?.profile || {}
  const goal = profile.goal || 'maintain'
  const protein = settings?.proteinTarget || 200
  const calories = settings?.calorieTarget || 2500
  const preferred = (settings?.preferredFoods || []).join(', ') || 'not specified'
  const avoided = (settings?.dislikedFoods || []).join(', ') || 'none'
  const weight = profile.weightLbs ? `${profile.weightLbs} lbs` : 'not specified'
  const age = profile.age || 'not specified'
  const gender = profile.gender || 'not specified'
  const activity = profile.activityLevel || 'moderate'

  return `You are a personal nutrition and meal prep coach built into Meal Buddy, a meal planning app.

USER PROFILE:
- Goal: ${goal} (bulk = build muscle, cut = lose fat, maintain = stay the same)
- Daily protein target: ${protein}g
- Daily calorie target: ${calories} kcal
- Weight: ${weight}
- Age: ${age}
- Gender: ${gender}
- Activity level: ${activity}
- Foods they like: ${preferred}
- Foods they avoid: ${avoided}

YOUR ROLE:
- Answer nutrition questions with practical, actionable advice
- Create recipes and meal ideas when asked, especially using ingredients the user already has
- Help with meal prep strategies, macros, and hitting protein/calorie targets
- Reference the user's profile when relevant (e.g. "for your 200g protein goal...")
- Keep responses concise and practical — this is a mobile app, not a textbook
- When giving recipes, include approximate macros (protein, carbs, fat, calories)
- Be encouraging and supportive, like a knowledgeable friend

FORMAT:
- Use short paragraphs, not walls of text
- For recipes/meal ideas, use a simple format: ingredients list then brief steps
- For lists, keep them short (3-5 items max)
- Avoid excessive markdown — this renders in a simple chat UI`
}

export default function ChatTab({ settings }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const dark = settings?.darkMode || false

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')
    setError('')

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: buildSystemPrompt(settings),
          messages: newMessages,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'API error')
      }

      const data = await response.json()
      const assistantText = data.content?.[0]?.text || ''
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  const bg = dark ? 'bg-stone-900' : 'bg-slate-50'
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub = dark ? 'text-stone-400' : 'text-stone-500'
  const inputBg = dark ? 'bg-stone-800 border-stone-700 text-white placeholder-stone-500' : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400'

  if (!apiKey) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] px-6 text-center ${bg}`}>
        <div className="text-5xl mb-4">🤖</div>
        <h2 className={`text-lg font-bold mb-2 ${text}`}>AI Coach Not Set Up</h2>
        <p className={`text-sm ${sub} mb-4`}>Add your Anthropic API key to Vercel environment variables to enable the AI coach.</p>
        <div className={`border rounded-2xl p-4 text-left text-xs font-mono ${card} ${sub} w-full max-w-sm`}>
          <p>Variable name:</p>
          <p className="text-emerald-500 font-bold mt-1">VITE_ANTHROPIC_API_KEY</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-5 pb-3 border-b ${dark ? 'border-stone-800' : 'border-stone-100'}`}>
        <div>
          <h1 className={`text-xl font-bold ${text}`}>AI Coach</h1>
          <p className={`text-xs ${sub}`}>Nutrition • Recipes • Meal Prep</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500'}`}>
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-5">
            {/* Welcome */}
            <div className={`border rounded-2xl p-4 text-center ${card}`}>
              <div className="text-3xl mb-2">🥗</div>
              <p className={`font-semibold ${text}`}>Your Personal Meal Prep Coach</p>
              <p className={`text-sm mt-1 ${sub}`}>Ask me anything about nutrition, recipes, or meal prep. I know your goals and preferences.</p>
            </div>

            {/* Quick actions */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sub}`}>Quick questions</p>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button key={i} onClick={() => sendMessage(action.prompt)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium cursor-pointer ${card} ${text}`}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredient prompt */}
            <div className={`border rounded-2xl p-4 ${card}`}>
              <p className={`text-sm font-semibold mb-1 ${text}`}>🥬 What's in your fridge?</p>
              <p className={`text-xs ${sub}`}>Tell me what ingredients you have and I'll give you recipes you can make right now.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 text-sm">🥗</div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : dark ? 'bg-stone-800 text-white rounded-bl-sm border border-stone-700' : 'bg-white text-stone-900 rounded-bl-sm border border-stone-200'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mr-2 text-sm">🥗</div>
            <div className={`rounded-2xl rounded-bl-sm px-4 py-3 border ${dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className={`px-4 py-3 border-t ${dark ? 'border-stone-800 bg-stone-900' : 'border-stone-100 bg-white'}`}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Ask anything about nutrition or recipes..."
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            className={`flex-1 px-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:border-emerald-400 resize-none overflow-hidden ${inputBg}`}
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              input.trim() && !loading ? 'bg-emerald-600 text-white' : dark ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
