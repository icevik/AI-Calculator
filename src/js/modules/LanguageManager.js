import { getTranslation, getCurrentLanguage, setCurrentLanguage } from '../utils/translations.js'

export class LanguageManager {
  constructor() {
    this.currentLanguage = getCurrentLanguage()
    this.translationElements = new Map()
    this.init()
  }

  init() {
    this.setupLanguageSelector()
    this.updateAllTranslations()
  }

  setupLanguageSelector() {
    // Create language selector container with TR/EN buttons
    const languageContainer = document.createElement('div')
    languageContainer.className = 'language-toggle'
    languageContainer.innerHTML = `
      <div class="language-group">
        <button id="langTR" class="language-btn" data-lang="tr">TR</button>
        <button id="langEN" class="language-btn" data-lang="en">EN</button>
      </div>
    `

    // Insert near the currency toggle in header
    const currencyToggle = document.querySelector('.currency-toggle')
    if (currencyToggle && currencyToggle.parentNode) {
      currencyToggle.parentNode.insertBefore(languageContainer, currencyToggle.nextSibling)
    } else {
      // Fallback: append to header
      const header = document.querySelector('.header')
      if (header) header.appendChild(languageContainer)
    }

    // Wire up events
    languageContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.language-btn')
      if (!btn) return
      const lang = btn.getAttribute('data-lang')
      this.setLanguage(lang)
    })

    // Set active state initially
    this.updateLanguageButtons()
  }

  setLanguage(lang) {
    if (!lang || (lang !== 'tr' && lang !== 'en')) return
    this.currentLanguage = lang
    setCurrentLanguage(this.currentLanguage)
    this.updateLanguageButtons()
    this.updateAllTranslations()
    // Dispatch a custom event for any listeners
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: this.currentLanguage } }))
  }

  updateLanguageButtons() {
    const trBtn = document.getElementById('langTR')
    const enBtn = document.getElementById('langEN')
    if (trBtn && enBtn) {
      trBtn.classList.toggle('active', this.currentLanguage === 'tr')
      enBtn.classList.toggle('active', this.currentLanguage === 'en')
      trBtn.setAttribute('aria-pressed', this.currentLanguage === 'tr')
      enBtn.setAttribute('aria-pressed', this.currentLanguage === 'en')
      trBtn.title = 'Türkçe'
      enBtn.title = 'English'
    }
  }

  updateAllTranslations() {
    // Update elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate')
      const translation = getTranslation(key, this.currentLanguage)

      if (element.tagName === 'INPUT' && element.type === 'placeholder') {
        element.placeholder = translation
      } else {
        element.textContent = translation
      }
    })

    // Update elements with data-translate-html attribute (for HTML content)
    document.querySelectorAll('[data-translate-html]').forEach(element => {
      const key = element.getAttribute('data-translate-html')
      const translation = getTranslation(key, this.currentLanguage)
      element.innerHTML = translation
    })

    // Update elements with data-translate-title attribute
    document.querySelectorAll('[data-translate-title]').forEach(element => {
      const key = element.getAttribute('data-translate-title')
      const translation = getTranslation(key, this.currentLanguage)
      element.title = translation
    })

    // Update specific elements that need special handling
    this.updateHeader()
    this.updateModelTabs()
    this.updateParameters()
    this.updateStats()
    this.updateComparison()
    this.updateAnalysis()
    this.updateScenarioModal()
    this.updateFooter()
  }

  updateHeader() {
    const title = document.querySelector('h1')
    const subtitle = document.querySelector('#headerSubtitle')

    if (title) {
      title.innerHTML = `<i class="fas fa-robot"></i> ${getTranslation('title', this.currentLanguage)}`
    }

    if (subtitle) {
      subtitle.textContent = getTranslation('subtitle', this.currentLanguage)
    }
  }

  updateModelTabs() {
    const generativeTab = document.querySelector('[data-mode="generative"]')
    const embeddingTab = document.querySelector('[data-mode="embedding"]')

    if (generativeTab) {
      const span = generativeTab.querySelector('span')
      const small = generativeTab.querySelector('small')
      if (span) span.textContent = getTranslation('generativeModels', this.currentLanguage)
      if (small) small.textContent = getTranslation('generativeModelsDesc', this.currentLanguage)
    }

    if (embeddingTab) {
      const span = embeddingTab.querySelector('span')
      const small = embeddingTab.querySelector('small')
      if (span) span.textContent = getTranslation('embeddingModels', this.currentLanguage)
      if (small) small.textContent = getTranslation('embeddingModelsDesc', this.currentLanguage)
    }
  }

  updateParameters() {
    const paramCards = document.querySelectorAll('.parameter-card')
    paramCards.forEach(card => {
      const label = card.querySelector('label')
      const unit = card.querySelector('.unit')

      if (label) {
        const icon = label.querySelector('i')
        const text = label.childNodes[1]?.textContent.trim()

        if (text) {
          switch (text) {
            case 'Günlük Konuşma':
              label.innerHTML = `<i class="fas fa-comments"></i> ${getTranslation('dailyConversations', this.currentLanguage)}`
              break
            case 'Konuşma Başına Mesaj':
              label.innerHTML = `<i class="fas fa-exchange-alt"></i> ${getTranslation('messagesPerConv', this.currentLanguage)}`
              break
            case 'Girdi Kelime Sayısı':
              label.innerHTML = `<i class="fas fa-keyboard"></i> ${getTranslation('inputWords', this.currentLanguage)}`
              break
            case 'Çıktı Kelime Sayısı':
              label.innerHTML = `<i class="fas fa-comment-dots"></i> ${getTranslation('outputWords', this.currentLanguage)}`
              break
            case 'USD/TL Kuru':
              label.innerHTML = `<i class="fas fa-dollar-sign"></i> ${getTranslation('usdRate', this.currentLanguage)}`
              break
            case 'Yıllık Gün Sayısı':
              label.innerHTML = `<i class="fas fa-calendar-alt"></i> ${getTranslation('daysPerYear', this.currentLanguage)}`
              break
          }
        }
      }

      if (unit) {
        const unitText = unit.textContent.trim()
        switch (unitText) {
          case 'konuşma/gün':
            unit.textContent = getTranslation('conversationsPerDay', this.currentLanguage)
            break
          case 'mesaj':
            unit.textContent = getTranslation('messages', this.currentLanguage)
            break
          case 'kelime':
            unit.textContent = getTranslation('words', this.currentLanguage)
            break
          case 'TL':
            unit.textContent = getTranslation('tl', this.currentLanguage)
            break
          case 'gün':
            unit.textContent = getTranslation('days', this.currentLanguage)
            break
        }
      }
    })
  }

  updateStats() {
    const statsSection = document.querySelector('#generativeStats, #embeddingStats')
    if (!statsSection) return

    const sectionHeader = statsSection.querySelector('.section-header h2')
    if (sectionHeader) {
      const isEmbedding = statsSection.id === 'embeddingStats'
      if (isEmbedding) {
        sectionHeader.innerHTML = `<i class="fas fa-vector-square"></i> ${getTranslation('statsTitleEmbedding', this.currentLanguage)}`
      } else {
        sectionHeader.innerHTML = `<i class="fas fa-chart-line"></i> ${getTranslation('statsTitleGenerative', this.currentLanguage)}`
      }
    }

    const statCards = statsSection.querySelectorAll('.stat-card')
    statCards.forEach(card => {
      const statLabel = card.querySelector('.stat-label')
      if (statLabel) {
        const labelText = statLabel.textContent.trim()
        switch (labelText) {
          case 'Günlük Toplam Mesaj':
            statLabel.textContent = getTranslation('totalMessages', this.currentLanguage)
            break
          case 'Günlük Konuşma':
            statLabel.textContent = getTranslation('totalConversations', this.currentLanguage)
            break
          case 'Ortalama Girdi Kelimesi':
            statLabel.textContent = getTranslation('avgInputWords', this.currentLanguage)
            break
          case 'Ortalama Çıktı Kelimesi':
            statLabel.textContent = getTranslation('avgOutputWords', this.currentLanguage)
            break
          case 'Toplam Kelime':
            statLabel.textContent = getTranslation('totalWords', this.currentLanguage)
            break
          case 'Toplam Token':
            statLabel.textContent = getTranslation('totalTokens', this.currentLanguage)
            break
          case 'Seçili Dönem':
            statLabel.textContent = getTranslation('selectedPeriod', this.currentLanguage)
            break
          case 'Günlük Token (Hesap İçin)':
            statLabel.textContent = getTranslation('dailyTokensForCalc', this.currentLanguage)
            break
        }
      }
    })
  }

  updateComparison() {
    const comparisonTitle = document.querySelector('#comparisonTitle')
    if (comparisonTitle) {
      const isGenerative = comparisonTitle.textContent.includes('Üretken') || comparisonTitle.textContent.includes('Generative')
      if (isGenerative) {
        comparisonTitle.innerHTML = `<i class="fas fa-microscope"></i> ${getTranslation('comparisonTitleGenerative', this.currentLanguage)}`
      } else {
        comparisonTitle.innerHTML = `<i class="fas fa-microscope"></i> ${getTranslation('comparisonTitleEmbedding', this.currentLanguage)}`
      }
    }

    // Update sort and filter options
    const sortBy = document.querySelector('#sortBy')
    const filterBy = document.querySelector('#filterBy')

    if (sortBy) {
      const options = sortBy.querySelectorAll('option')
      options.forEach(option => {
        const value = option.value
        switch (value) {
          case 'yearly':
            option.textContent = getTranslation('sortByYearly', this.currentLanguage)
            break
          case 'monthly':
            option.textContent = getTranslation('sortByMonthly', this.currentLanguage)
            break
          case 'perMessage':
            option.textContent = getTranslation('sortByPerMessage', this.currentLanguage)
            break
          case 'efficiency':
            option.textContent = getTranslation('sortByEfficiency', this.currentLanguage)
            break
        }
      })
    }

    if (filterBy) {
      const options = filterBy.querySelectorAll('option')
      options.forEach(option => {
        const value = option.value
        switch (value) {
          case 'all':
            option.textContent = getTranslation('filterByAll', this.currentLanguage)
            break
          case 'OpenAI':
            option.textContent = getTranslation('filterByOpenAI', this.currentLanguage)
            break
          case 'Google':
            option.textContent = getTranslation('filterByGoogle', this.currentLanguage)
            break
          case 'Anthropic':
            option.textContent = getTranslation('filterByAnthropic', this.currentLanguage)
            break
        }
      })
    }
  }

  updateAnalysis() {
    const analysisTitle = document.querySelector('.analysis-section .section-header h2')
    if (analysisTitle) {
      analysisTitle.innerHTML = `<i class="fas fa-lightbulb"></i> ${getTranslation('analysisTitle', this.currentLanguage)}`
    }

    const bestCard = document.querySelector('.analysis-card.best .card-header h3')
    const worstCard = document.querySelector('.analysis-card.worst .card-header h3')
    const savingsCard = document.querySelector('.analysis-card.savings .card-header h3')

    if (bestCard) bestCard.textContent = getTranslation('bestModelTitle', this.currentLanguage)
    if (worstCard) worstCard.textContent = getTranslation('worstModelTitle', this.currentLanguage)
    if (savingsCard) savingsCard.textContent = getTranslation('savingsTitle', this.currentLanguage)

    // Update cost labels in analysis cards
    document.querySelectorAll('.cost-label').forEach(label => {
      const text = label.textContent.trim()
      switch (text) {
        case 'Yıllık Maliyet:':
          label.textContent = `${getTranslation('yearlyCost', this.currentLanguage)}:`
          break
        case 'Konuşma Başına:':
          label.textContent = `${getTranslation('perConv', this.currentLanguage)}:`
          break
        case 'Mesaj Başına:':
          label.textContent = `${getTranslation('perMsg', this.currentLanguage)}:`
          break
      }
    })
  }

  updateScenarioModal() {
    const modalTitle = document.querySelector('#scenarioModal .modal-header h3')
    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fas fa-calculator"></i> ${getTranslation('scenarioTitle', this.currentLanguage)}`
    }

    const scenarioSubtitle = document.querySelector('.scenario-input-section h3')
    if (scenarioSubtitle) {
      scenarioSubtitle.innerHTML = `<i class="fas fa-question-circle"></i> ${getTranslation('scenarioSubtitle', this.currentLanguage)}`
    }

    // Update input labels
    const inputLabels = document.querySelectorAll('.scenario-inputs label')
    inputLabels.forEach(label => {
      const text = label.textContent.trim()
      switch (text) {
        case 'Günlük Konuşma Sayısı':
          label.textContent = getTranslation('scenarioConversations', this.currentLanguage)
          break
        case 'Konuşma Başına Mesaj':
          label.textContent = getTranslation('scenarioMessages', this.currentLanguage)
          break
        case 'Girdi Kelime Sayısı':
          label.textContent = getTranslation('scenarioInputWords', this.currentLanguage)
          break
        case 'Çıktı Kelime Sayısı':
          label.textContent = getTranslation('scenarioOutputWords', this.currentLanguage)
          break
      }
    })

    const calculateBtn = document.querySelector('#calculateScenario')
    if (calculateBtn) {
      calculateBtn.innerHTML = `<i class="fas fa-play"></i> ${getTranslation('calculate', this.currentLanguage)}`
    }

    const resultsTitle = document.querySelector('#scenarioResults h3')
    if (resultsTitle) {
      resultsTitle.innerHTML = `<i class="fas fa-chart-line"></i> ${getTranslation('scenarioResults', this.currentLanguage)}`
    }

    const insightsTitle = document.querySelector('.scenario-insights h4')
    if (insightsTitle) {
      insightsTitle.innerHTML = `<i class="fas fa-lightbulb"></i> ${getTranslation('scenarioInsights', this.currentLanguage)}`
    }
  }

  updateFooter() {
    const footer = document.querySelector('.footer p')
    if (footer) {
      footer.textContent = getTranslation('footer', this.currentLanguage)
    }
  }

  // Method to translate text dynamically
  translate(key) {
    return getTranslation(key, this.currentLanguage)
  }

  // Method to update specific element
  updateElement(element, key) {
    if (!element || !key) return

    const translation = getTranslation(key, this.currentLanguage)
    if (element.tagName === 'INPUT' && element.type === 'placeholder') {
      element.placeholder = translation
    } else {
      element.textContent = translation
    }
  }
}
