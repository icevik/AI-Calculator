// Generative Language Models (USD per 1M tokens) - for conversation/text generation
export const GENERATIVE_MODELS = {
  "GPT-4o": {
    input: 2.50 / 1_000_000,
    output: 10.00 / 1_000_000,
    provider: "OpenAI",
    type: "generative"
  },
  "GPT-4o mini": {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
    provider: "OpenAI",
    type: "generative"
  },
  "GPT-5": {
    input: 1.250 / 1_000_000,
    output: 10.000 / 1_000_000,
    provider: "OpenAI",
    type: "generative"
  },
  "GPT-5 mini": {
    input: 0.250 / 1_000_000,
    output: 2.000 / 1_000_000,
    provider: "OpenAI",
    type: "generative"
  },
  "Gemini 2.5 Pro": {
    input: 2.50 / 1_000_000,
    output: 15.00 / 1_000_000,
    provider: "Google",
    type: "generative"
  },
  "Gemini 2.5 Flash": {
    input: 0.30 / 1_000_000,
    output: 2.50 / 1_000_000,
    provider: "Google",
    type: "generative"
  },
  "Gemini 2.5 Flash-Lite": {
    input: 0.10 / 1_000_000,
    output: 0.40 / 1_000_000,
    provider: "Google",
    type: "generative"
  },
  "Claude Sonnet 4 (≤200K)": {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
    provider: "Anthropic",
    type: "generative"
  },
  "Claude Sonnet 4 (>200K)": {
    input: 6.00 / 1_000_000,
    output: 22.50 / 1_000_000,
    provider: "Anthropic",
    type: "generative"
  }
}

// Embedding Models (USD per 1M tokens) - for document/text embedding
export const EMBEDDING_MODELS = {
  "text-embedding-3-small": {
    input: 0.02 / 1_000_000,
    output: 0.0 / 1_000_000,
    provider: "OpenAI",
    type: "embedding",
    dimensions: 1536
  },
  "text-embedding-3-large": {
    input: 0.13 / 1_000_000,
    output: 0.0 / 1_000_000,
    provider: "OpenAI",
    type: "embedding",
    dimensions: 3072
  },
  "text-embedding-ada-002": {
    input: 0.10 / 1_000_000,
    output: 0.0 / 1_000_000,
    provider: "OpenAI",
    type: "embedding",
    dimensions: 1536
  }
}

// Combined models for backward compatibility
export const AI_MODELS = {
  ...GENERATIVE_MODELS,
  ...EMBEDDING_MODELS
}
