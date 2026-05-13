# GenerativeRank

AI Visibility Audit — deep 8-step analysis powered by Claude.

## Setup

1. `npm install`
2. Add your Anthropic key to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
3. `npm run dev` → http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Import at vercel.com/new
3. Add `ANTHROPIC_API_KEY` in Environment Variables
4. Deploy

## What It Does

8-step audit using Claude with web search:
1. Deep web discovery
2. Brand awareness test (no search)
3. Industry detection
4. Content quality audit
5. Citation simulation (5 user queries)
6. GEO recommendations (5-7 specific fixes)
7. Scoring across all dimensions
8. Competitor mapping

Canadian .ca sites auto-detected for market-specific insights.
