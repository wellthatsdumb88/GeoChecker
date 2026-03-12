# GenerativeRank

**Be the Answer, Not Just the Link.**

AI Visibility Audit platform that tests your website's citation likelihood across ChatGPT (OpenAI), Google Gemini, Perplexity, and Claude — using real API calls to each platform.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure API keys
Edit `.env.local` and add your Anthropic API key (the other 3 are pre-configured):

```
ANTHROPIC_API_KEY=your-anthropic-key-here
GOOGLE_GEMINI_API_KEY=AIzaSyATr1Lp3_58iC06WU1DtOXSGktGeevnhOY
OPENAI_API_KEY=sk-proj-Y6WMWSjK__RBNuRHN-...
PERPLEXITY_API_KEY=pplx-1SgQCjsckPcKAy5p...
```

### 3. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option A: GitHub + Vercel
1. Push to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard (Settings → Environment Variables)
4. Deploy

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
```

## How It Works

1. **Claude API** (`/api/claude`) — Handles web search discovery, content analysis, recommendations, and scoring
2. **Engine Test** (`/api/engine-test`) — Calls all 4 AI platforms in parallel with the same citation query, scores each response
3. **Frontend** — Displays results with interactive dashboard, expandable fix panels, competitor scatter plot, and PDF export

### Cross-Platform Engine Testing
Each scan sends the same industry query to:
- **OpenAI GPT-4o-mini** — Tests ChatGPT citation likelihood  
- **Google Gemini 2.0 Flash** — Tests Google AI citation likelihood
- **Perplexity Sonar** — Tests Perplexity citation likelihood (with web search)
- **Claude Sonnet** — Tests Claude citation likelihood

Responses are scored based on: brand mentions, position in response, recommendation framing, and detail level.

## Architecture

```
app/
  layout.jsx          — Root layout with fonts/styles
  page.jsx            — Full client-side React app
  api/
    claude/route.js   — Proxies Claude API calls (server-side)
    engine-test/route.js — Tests all 4 engines in parallel (server-side)
```

All external API calls run server-side via Next.js API routes — no CORS issues.
