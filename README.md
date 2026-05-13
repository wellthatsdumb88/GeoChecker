# GeoChecker

FastAPI prototype for the phased GEO audit flow:

- scrape a target URL and build a semantic profile of natural-language queries
- run citation tests with OpenAI web search and inspect URL citation annotations
- estimate latent authority for uncited queries
- generate GEO-LENS content recommendations and JSON-LD schema
- calculate a Generative Authority Score (GAS)

The implementation uses the OpenAI Responses API with the built-in `web_search` tool for citation tests and `text-embedding-3-small` for semantic similarity. The OpenAI docs describe web search as returning inline URL citation annotations, and list `text-embedding-3-small` as an embedding model.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
```

Add your API key to `.env`:

```env
OPENAI_API_KEY=sk-...
```

For local development the app defaults to SQLite. To use PostgreSQL, set:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/geo_audits
```

and install a PostgreSQL driver such as `psycopg[binary]`.

## Run

```powershell
uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Create An Audit

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/audits `
  -ContentType application/json `
  -Body '{"target_url":"https://example.com","max_queries":5}'
```

## Notes

- `OPENAI_MAX_CITATION_TESTS` caps citation-test calls so early runs do not fan out unexpectedly.
- `OPENAI_ENABLE_WEB_SEARCH=false` disables the web-search tool, though citation results will then normally be empty.
- `instruction_following_weight` is currently reserved in the API response because the formula provided only uses retrieval probability and semantic similarity.
