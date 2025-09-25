import { AI_MODELS } from '../data/models.js'

export class CostCalculator {
  constructor() {
    this.WORD_TO_TOKEN_RATIO = 4/3
  }

  calculateTokens(params) {
    if (params.calcMode === 'embedding') {
      // If explicit tokens provided use them; else derive from words
      const tokensRaw = params.embeddingTokens && params.embeddingTokens > 0
        ? params.embeddingTokens
        : (params.embeddingWords || 0) * this.WORD_TO_TOKEN_RATIO

      // Normalize tokens to a daily basis using embeddingPeriod
      let dailyTokens
      switch (params.embeddingPeriod) {
        case 'yearly':
          dailyTokens = tokensRaw / Math.max(params.daysPerYear || 365, 1)
          break
        case 'monthly':
          dailyTokens = tokensRaw / 30
          break
        case 'daily':
        default:
          dailyTokens = tokensRaw
      }

      return {
        inputTokensPerMessage: 0,
        outputTokensPerMessage: 0,
        dailyInputTokens: dailyTokens,
        dailyOutputTokens: 0,
        totalDailyTokens: dailyTokens,
        totalDailyMessages: 1
      }
    }

    // Generative/chat default
    const inputTokensPerMessage = params.inputWords * this.WORD_TO_TOKEN_RATIO
    const outputTokensPerMessage = params.outputWords * this.WORD_TO_TOKEN_RATIO
    
    const inputTokensPerConv = inputTokensPerMessage * params.messagesPerConv
    const outputTokensPerConv = outputTokensPerMessage * params.messagesPerConv
    
    const dailyInputTokens = inputTokensPerConv * params.dailyConversations
    const dailyOutputTokens = outputTokensPerConv * params.dailyConversations
    
    return {
      inputTokensPerMessage,
      outputTokensPerMessage,
      dailyInputTokens,
      dailyOutputTokens,
      totalDailyTokens: dailyInputTokens + dailyOutputTokens,
      totalDailyMessages: params.dailyConversations * params.messagesPerConv
    }
  }

  calculateModelCost(modelName, pricing, tokens, params) {
    // In embedding mode there is no output pricing; treat output cost as 0
    const inputPricePerToken = pricing.input
    const outputPricePerToken = params.calcMode === 'embedding' ? 0 : pricing.output

    const dailyInputCost = tokens.dailyInputTokens * inputPricePerToken
    const dailyOutputCost = tokens.dailyOutputTokens * outputPricePerToken
    const dailyTotal = dailyInputCost + dailyOutputCost
    const yearlyTotal = dailyTotal * params.daysPerYear
    
    return {
      model: modelName,
      dailyInput: dailyInputCost,
      dailyOutput: dailyOutputCost,
      dailyTotal: dailyTotal,
      monthlyTotal: dailyTotal * 30,
      yearlyTotal: yearlyTotal,
      // For embedding mode, per-conversation and per-message do not make sense
      perConversation: params.calcMode === 'embedding' ? null : (dailyTotal / params.dailyConversations),
      perMessage: params.calcMode === 'embedding' ? null : (dailyTotal / (params.dailyConversations * params.messagesPerConv)),
      // Expose token counts for accurate efficiency calculations
      dailyInputTokens: tokens.dailyInputTokens,
      dailyOutputTokens: tokens.dailyOutputTokens,
      totalDailyTokens: tokens.dailyInputTokens + tokens.dailyOutputTokens,
      inputPrice: pricing.input * 1_000_000,
      outputPrice: (params.calcMode === 'embedding' ? 0 : pricing.output) * 1_000_000
    }
  }

  calculateAllModels(tokens, params) {
    const results = []
    
    for (const [modelName, pricing] of Object.entries(AI_MODELS)) {
      // Filter models by calculation mode using the 'type' field from pricing data
      if (params.calcMode === 'embedding' && pricing.type !== 'embedding') continue
      if (params.calcMode !== 'embedding' && pricing.type !== 'generative') continue
      const result = this.calculateModelCost(modelName, pricing, tokens, params)
      results.push(result)
    }
    
    // Sort by yearly cost (cheapest first)
    results.sort((a, b) => a.yearlyTotal - b.yearlyTotal)
    
    return results
  }

  getBestAndWorstModels(results) {
    if (results.length === 0) return { best: null, worst: null }
    
    return {
      best: results[0],
      worst: results[results.length - 1]
    }
  }

  calculateSavings(best, worst) {
    if (!best || !worst) return { amount: 0, percentage: 0 }
    
    const savings = worst.yearlyTotal - best.yearlyTotal
    const savingsPercent = (savings / worst.yearlyTotal) * 100
    
    return {
      amount: savings,
      percentage: savingsPercent
    }
  }
}
