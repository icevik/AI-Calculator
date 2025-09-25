// Utility functions for formatting numbers and currencies

export function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR').format(num)
}

export function formatTokens(tokens) {
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1) + 'M'
  } else if (tokens >= 1_000) {
    return (tokens / 1_000).toFixed(1) + 'K'
  }
  return Math.round(tokens).toString()
}

export function formatCurrency(amount, decimals = 2) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)
}

// Convert numbers to Turkish words (supports up to katrilyon)
function threeDigitsToTurkish(num) {
  const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
  const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']

  const hundred = Math.floor(num / 100)
  const rest = num % 100
  const ten = Math.floor(rest / 10)
  const one = rest % 10

  const parts = []
  if (hundred > 0) {
    if (hundred === 1) parts.push('yüz')
    else parts.push(ones[hundred] + ' yüz')
  }
  if (ten > 0) parts.push(tens[ten])
  if (one > 0) parts.push(ones[one])
  return parts.join(' ').trim()
}

export function numberToTurkish(n) {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'sıfır'

  const scales = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon']
  const parts = []
  let idx = 0
  while (n > 0 && idx < scales.length) {
    const group = n % 1000
    if (group > 0) {
      let words = threeDigitsToTurkish(group)
      const scale = scales[idx]
      if (idx === 1 && group === 1) {
        // 1 bin -> 'bin'
        parts.unshift(scale)
      } else {
        const segment = [words, scale].filter(Boolean).join(' ').trim()
        parts.unshift(segment)
      }
    }
    n = Math.floor(n / 1000)
    idx++
  }
  return parts.join(' ').trim()
}

export function numberToTurkishCurrencyText(amount, currency = 'TL') {
  const unit = currency === 'TL' ? 'lira' : 'dolar'
  const subunit = currency === 'TL' ? 'kuruş' : 'sent'
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100
  const intPart = Math.floor(Math.abs(rounded))
  const fracPart = Math.round((Math.abs(rounded) - intPart) * 100)

  const intText = numberToTurkish(intPart)
  const fracText = fracPart > 0 ? numberToTurkish(fracPart) : ''

  if (fracPart > 0) {
    return `${intText} ${unit} ${fracText} ${subunit}`
  }
  return `${intText} ${unit}`
}
