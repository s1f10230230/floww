'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import { Search, CreditCard, Check } from 'lucide-react'

interface CardIssuer {
  id: string
  name: string
  logo_url?: string
  email_domain: string
  filter_template: {
    from?: string
    subject?: string
  }
}

const POPULAR_CARDS: CardIssuer[] = [
  {
    id: 'rakuten',
    name: '楽天カード',
    email_domain: 'rakuten-card.co.jp',
    filter_template: {
      from: '@rakuten-card.co.jp',
      subject: 'ご利用のお知らせ'
    }
  },
  {
    id: 'smbc',
    name: '三井住友カード',
    email_domain: 'vpass.ne.jp',
    filter_template: {
      from: '@vpass.ne.jp',
      subject: 'ご利用の確認'
    }
  },
  {
    id: 'jcb',
    name: 'JCBカード',
    email_domain: 'jcb.co.jp',
    filter_template: {
      from: '@jcb.co.jp',
      subject: 'ご利用内容確認'
    }
  },
  {
    id: 'aeon',
    name: 'イオンカード',
    email_domain: 'aeon.co.jp',
    filter_template: {
      from: '@aeon.co.jp',
      subject: 'ご利用明細'
    }
  },
  {
    id: 'saison',
    name: 'セゾンカード',
    email_domain: 'saisoncard.co.jp',
    filter_template: {
      from: '@saisoncard.co.jp',
      subject: 'ご利用明細'
    }
  },
  {
    id: 'epos',
    name: 'エポスカード',
    email_domain: 'eposcard.co.jp',
    filter_template: {
      from: '@eposcard.co.jp',
      subject: 'ご利用のお知らせ'
    }
  }
]

export default function OnboardingStep1() {
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [allIssuers, setAllIssuers] = useState<CardIssuer[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadIssuers()
  }, [])

  const loadIssuers = async () => {
    const { data } = await supabase
      .from('card_issuers')
      .select('*')
      .order('name')

    if (data) {
      setAllIssuers(data)
    }
  }

  const toggleCard = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  const handleNext = async () => {
    if (selectedCards.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save selected cards to user_card_issuers
    for (const cardId of selectedCards) {
      await supabase
        .from('user_card_issuers')
        .upsert({
          user_id: user.id,
          issuer_id: cardId
        })
    }

    // Save filter templates to session storage for next step
    const selectedTemplates = POPULAR_CARDS
      .filter(card => selectedCards.includes(card.id))
      .map(card => card.filter_template)

    sessionStorage.setItem('selected_card_filters', JSON.stringify(selectedTemplates))

    router.push('/onboarding/step2')
  }

  const filteredCards = POPULAR_CARDS.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">1</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">2</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">3</div>
          </div>
          <p className="text-center text-sm text-gray-600">STEP 1 / 3</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            使っているカードを選んでください
          </h1>
          <p className="text-gray-600 mb-8">
            選んだカードの通知だけ自動で取り込みます
          </p>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="カード名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {filteredCards.map((card) => (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                className={`relative p-6 border-2 rounded-xl transition-all ${
                  selectedCards.includes(card.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {selectedCards.includes(card.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <CreditCard className={`w-8 h-8 mb-3 ${
                  selectedCards.includes(card.id) ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-sm">{card.name}</p>
              </button>
            ))}
          </div>

          {/* Selected Count */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              {selectedCards.length > 0
                ? `${selectedCards.length}枚のカードを選択中`
                : 'カードを選択してください'}
            </p>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={selectedCards.length === 0}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ：メール転送設定
          </button>
        </div>
      </div>
    </div>
  )
}