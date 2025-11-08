/**
 * Email Parser Service
 *
 * Hybrid approach:
 * 1. Pattern matching for known services (Stripe, PayPal, common SaaS)
 * 2. AI fallback (GPT-4o-mini) for unknown/complex emails
 *
 * Goal: Extract subscription details from confirmation emails
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedSubscriptionData {
  merchantName: string;
  planName?: string;
  amount: string; // "15.99" format
  currency: string; // "USD"
  billingCycle: 'monthly' | 'annual' | 'quarterly' | 'weekly';
  firstBillingDate?: Date;
  nextBillingDate?: Date;
  trialEndDate?: Date;
  status: 'active' | 'trial';
  confidence: 'high' | 'medium' | 'low';
  category?: string;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedSubscriptionData;
  error?: string;
  method: 'pattern' | 'ai' | 'failed';
}

// ============================================================================
// PATTERN MATCHERS
// ============================================================================

/**
 * Known merchant patterns
 * Key: Email sender pattern or domain
 */
const MERCHANT_PATTERNS: Record<string, {
  name: string;
  category?: string;
  amountPattern?: RegExp;
  cycleKeywords?: { monthly?: string[]; annual?: string[]; };
}> = {
  'stripe.com': {
    name: 'Stripe',
    category: 'finance',
    amountPattern: /\$?([\d,]+\.\d{2})\s*(USD|EUR|GBP)?/i,
  },
  'paypal': {
    name: 'PayPal',
    category: 'finance',
    amountPattern: /\$?([\d,]+\.\d{2})\s*(USD|EUR|GBP)?/i,
  },
  'netflix.com': {
    name: 'Netflix',
    category: 'entertainment',
    amountPattern: /\$?([\d,]+\.\d{2})/,
    cycleKeywords: { monthly: ['monthly', 'month'] }
  },
  'spotify.com': {
    name: 'Spotify',
    category: 'entertainment',
    amountPattern: /\$?([\d,]+\.\d{2})/,
    cycleKeywords: { monthly: ['monthly'], annual: ['annual', 'yearly'] }
  },
  'openai.com': {
    name: 'OpenAI',
    category: 'ai_tools',
    amountPattern: /\$?([\d,]+\.\d{2})/,
    cycleKeywords: { monthly: ['monthly'] }
  },
  'figma.com': {
    name: 'Figma',
    category: 'design',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
  'adobe.com': {
    name: 'Adobe',
    category: 'design',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
  'github.com': {
    name: 'GitHub',
    category: 'development',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
  'vercel.com': {
    name: 'Vercel',
    category: 'development',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
  'notion.so': {
    name: 'Notion',
    category: 'productivity',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
  'canva.com': {
    name: 'Canva',
    category: 'design',
    amountPattern: /\$?([\d,]+\.\d{2})/,
  },
};

/**
 * Billing cycle detection patterns
 */
const CYCLE_PATTERNS = {
  monthly: /\bmonthly\b|\bper month\b|\b\/mo\b|\bmonth\b/i,
  annual: /\bannual\b|\bper year\b|\byearly\b|\b\/yr\b|\byear\b/i,
  quarterly: /\bquarterly\b|\bper quarter\b|\b3 months\b/i,
  weekly: /\bweekly\b|\bper week\b|\b\/wk\b|\bweek\b/i,
};

/**
 * Trial detection patterns
 */
const TRIAL_PATTERNS = {
  trialStart: /\bfree trial\b|\btrial period\b|\btrial starts\b/i,
  trialEnd: /trial ends?\s+on\s+(\w+\s+\d+,?\s+\d{4})/i,
  trialDays: /(\d+)[\s-]day free trial/i,
};

// ============================================================================
// PATTERN MATCHING PARSER
// ============================================================================

/**
 * Attempt to parse email using pattern matching
 */
export async function parseWithPatterns(
  subject: string,
  from: string,
  body: string,
  snippet: string
): Promise<ParseResult> {
  const content = `${subject} ${body} ${snippet}`.toLowerCase();

  // 1. Identify merchant
  let merchantName = '';
  let category: string | undefined;
  let merchantPattern: typeof MERCHANT_PATTERNS[string] | undefined;

  for (const [pattern, config] of Object.entries(MERCHANT_PATTERNS)) {
    if (from.toLowerCase().includes(pattern) || content.includes(pattern)) {
      merchantName = config.name;
      category = config.category;
      merchantPattern = config;
      break;
    }
  }

  // If no known merchant, try to extract from "From" field
  if (!merchantName) {
    const fromMatch = from.match(/from\s+([^<@]+)/i) || from.match(/^([^<@]+)/);
    if (fromMatch) {
      merchantName = fromMatch[1].trim();
    } else {
      return {
        success: false,
        error: 'Could not identify merchant',
        method: 'pattern'
      };
    }
  }

  // 2. Extract amount
  const amountPattern = merchantPattern?.amountPattern || /\$?([\d,]+\.\d{2})\s*(USD|EUR|GBP)?/;
  const amountMatch = content.match(amountPattern);

  if (!amountMatch) {
    return {
      success: false,
      error: 'Could not extract amount',
      method: 'pattern'
    };
  }

  const amount = amountMatch[1].replace(',', '');
  const currency = amountMatch[2] || 'USD';

  // 3. Detect billing cycle
  let billingCycle: 'monthly' | 'annual' | 'quarterly' | 'weekly' = 'monthly'; // default

  if (CYCLE_PATTERNS.annual.test(content)) {
    billingCycle = 'annual';
  } else if (CYCLE_PATTERNS.quarterly.test(content)) {
    billingCycle = 'quarterly';
  } else if (CYCLE_PATTERNS.weekly.test(content)) {
    billingCycle = 'weekly';
  }

  // 4. Detect trial
  let status: 'active' | 'trial' = 'active';
  let trialEndDate: Date | undefined;

  if (TRIAL_PATTERNS.trialStart.test(content)) {
    status = 'trial';

    // Try to find trial end date
    const trialEndMatch = content.match(TRIAL_PATTERNS.trialEnd);
    if (trialEndMatch) {
      trialEndDate = new Date(trialEndMatch[1]);
    } else {
      // Try to find trial duration (e.g., "14-day free trial")
      const trialDaysMatch = content.match(TRIAL_PATTERNS.trialDays);
      if (trialDaysMatch) {
        const days = parseInt(trialDaysMatch[1]);
        trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + days);
      }
    }
  }

  // 5. Extract plan name (if present)
  const planMatch = subject.match(/\b(pro|premium|plus|basic|starter|enterprise|team)\b/i);
  const planName = planMatch ? planMatch[1] : undefined;

  // 6. Build result
  const data: ParsedSubscriptionData = {
    merchantName,
    planName,
    amount,
    currency,
    billingCycle,
    status,
    trialEndDate,
    confidence: 'high', // High confidence for pattern-matched results
    category,
  };

  return {
    success: true,
    data,
    method: 'pattern'
  };
}

// ============================================================================
// AI FALLBACK PARSER (Placeholder)
// ============================================================================

/**
 * AI-based parsing using GPT-4o-mini
 *
 * TODO: Implement in Week 3-4
 * For now, returns "low confidence" flag
 */
export async function parseWithAI(
  subject: string,
  from: string,
  body: string
): Promise<ParseResult> {
  // Placeholder: Will implement GPT-4o-mini API call
  // For now, attempt basic extraction

  try {
    // Very basic fallback extraction
    const amountMatch = body.match(/\$?([\d,]+\.\d{2})/);
    const merchantMatch = from.match(/^([^<@]+)/);

    if (!amountMatch || !merchantMatch) {
      return {
        success: false,
        error: 'AI parser not yet implemented, and basic extraction failed',
        method: 'ai'
      };
    }

    const data: ParsedSubscriptionData = {
      merchantName: merchantMatch[1].trim(),
      amount: amountMatch[1].replace(',', ''),
      currency: 'USD',
      billingCycle: 'monthly',
      status: 'active',
      confidence: 'low', // Low confidence
    };

    return {
      success: true,
      data,
      method: 'ai'
    };
  } catch (error) {
    return {
      success: false,
      error: 'AI parsing failed',
      method: 'ai'
    };
  }
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Main email parsing function
 * Tries pattern matching first, falls back to AI if needed
 */
export async function parseSubscriptionEmail(
  subject: string,
  from: string,
  body: string,
  snippet: string
): Promise<ParseResult> {
  // Try pattern matching first
  const patternResult = await parseWithPatterns(subject, from, body, snippet);

  if (patternResult.success) {
    return patternResult;
  }

  // Fall back to AI parsing
  console.log('Pattern matching failed, trying AI parser...');
  const aiResult = await parseWithAI(subject, from, body);

  return aiResult;
}

// ============================================================================
// HELPER: Category Mapping
// ============================================================================

/**
 * Map merchant name to category
 * Used for manual entries or when category is not detected
 */
export function inferCategory(merchantName: string): string | undefined {
  const name = merchantName.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    ai_tools: ['openai', 'anthropic', 'claude', 'chatgpt', 'midjourney', 'dall-e'],
    design: ['figma', 'canva', 'adobe', 'sketch', 'invision'],
    video_editing: ['adobe premiere', 'final cut', 'davinci', 'filmora'],
    productivity: ['notion', 'asana', 'trello', 'monday', 'clickup', 'airtable'],
    analytics: ['google analytics', 'mixpanel', 'amplitude', 'segment'],
    marketing: ['mailchimp', 'hubspot', 'sendgrid', 'convertkit'],
    development: ['github', 'gitlab', 'vercel', 'netlify', 'heroku', 'aws'],
    finance: ['stripe', 'paypal', 'quickbooks', 'xero'],
    entertainment: ['netflix', 'spotify', 'hulu', 'disney', 'youtube'],
    education: ['udemy', 'coursera', 'skillshare', 'masterclass'],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'other';
}
