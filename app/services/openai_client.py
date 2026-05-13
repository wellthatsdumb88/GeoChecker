import json
from typing import Any

from openai import AsyncOpenAI

from app.config import settings
from app.schemas import (
    CitationResult,
    GeoRecommendation,
    LatentAuthorityResult,
    PageSnapshot,
    SchemaBundle,
)
from app.services.citations import extract_url_citations, url_matches_target
from app.services.scoring import cosine_similarity


def _client() -> AsyncOpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for model-backed audits.")
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _json_schema(name: str, schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "format": {
            "type": "json_schema",
            "name": name,
            "schema": schema,
            "strict": True,
        }
    }


async def generate_semantic_profile(page: PageSnapshot, max_queries: int) -> list[str]:
    client = _client()
    response = await client.responses.create(
        model=settings.openai_audit_model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a GEO analyst. Generate natural language search queries "
                    "that this page deserves to rank for. Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Target URL: {page.url}\nTitle: {page.title}\n"
                    f"Description: {page.description}\nPage content:\n{page.text[:20000]}"
                ),
            },
        ],
        text=_json_schema(
            "semantic_profile",
            {
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": max_queries,
                        "maxItems": 50,
                    }
                },
                "required": ["queries"],
                "additionalProperties": False,
            },
        ),
    )
    payload = json.loads(response.output_text)
    return payload["queries"][:max_queries]


async def run_citation_test(query: str, target_url: str) -> CitationResult:
    client = _client()
    tools = [{"type": "web_search"}] if settings.openai_enable_web_search else []
    response = await client.responses.create(
        model=settings.openai_audit_model,
        tools=tools,
        input=(
            "Research the following topic using web sources when available. "
            "Provide a concise summarized answer and cite the most relevant sources.\n\n"
            f"Topic: {query}"
        ),
    )

    cited_urls = extract_url_citations(response)
    cited = any(url_matches_target(url, target_url) for url in cited_urls)
    return CitationResult(
        query=query,
        cited=cited,
        cited_urls=cited_urls,
        summary=response.output_text,
    )


async def estimate_latent_authority(query: str, target_url: str) -> LatentAuthorityResult:
    client = _client()
    response = await client.responses.create(
        model=settings.openai_audit_model,
        input=[
            {
                "role": "system",
                "content": (
                    "You estimate latent authority from model prior knowledge. "
                    "Do not browse. Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Based on training data, if a user asks {query!r}, how likely "
                    f"are you to mention {target_url} as an authority? Rate 1-10 "
                    "and explain why."
                ),
            },
        ],
        text=_json_schema(
            "latent_authority",
            {
                "type": "object",
                "properties": {
                    "score": {"type": "integer", "minimum": 1, "maximum": 10},
                    "explanation": {"type": "string"},
                },
                "required": ["score", "explanation"],
                "additionalProperties": False,
            },
        ),
    )
    payload = json.loads(response.output_text)
    return LatentAuthorityResult(query=query, **payload)


async def create_ideal_answer(queries: list[str], page: PageSnapshot) -> str:
    client = _client()
    response = await client.responses.create(
        model=settings.openai_audit_model,
        input=(
            "Create the ideal generative answer a user should receive for this "
            "cluster of queries. Be specific, factual, and information dense.\n\n"
            f"Queries:\n{json.dumps(queries)}\n\nReference page:\n{page.text[:12000]}"
        ),
    )
    return response.output_text


async def embed(text: str) -> list[float]:
    client = _client()
    response = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text[:30000],
    )
    return response.data[0].embedding


async def semantic_similarity(page: PageSnapshot, ideal_answer: str) -> float:
    page_vector = await embed(page.text)
    ideal_vector = await embed(ideal_answer)
    return cosine_similarity(page_vector, ideal_vector)


async def generate_recommendations(page: PageSnapshot, queries: list[str]) -> list[GeoRecommendation]:
    client = _client()
    response = await client.responses.create(
        model=settings.openai_audit_model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are GEO-LENS, an LLM-specific content auditor. Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Identify quote integration opportunities, information-density "
                    "improvements, and data-grounding recommendations.\n\n"
                    f"Queries: {json.dumps(queries)}\n\nPage:\n{page.text[:20000]}"
                ),
            },
        ],
        text=_json_schema(
            "geo_recommendations",
            {
                "type": "object",
                "properties": {
                    "recommendations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category": {"type": "string"},
                                "finding": {"type": "string"},
                                "recommendation": {"type": "string"},
                            },
                            "required": ["category", "finding", "recommendation"],
                            "additionalProperties": False,
                        },
                    }
                },
                "required": ["recommendations"],
                "additionalProperties": False,
            },
        ),
    )
    payload = json.loads(response.output_text)
    return [GeoRecommendation(**item) for item in payload["recommendations"]]


async def generate_schema_bundle(page: PageSnapshot, queries: list[str]) -> SchemaBundle:
    client = _client()
    response = await client.responses.create(
        model=settings.openai_audit_model,
        input=[
            {
                "role": "system",
                "content": (
                    "Generate JSON-LD objects for GEO/SEO. Use only facts present "
                    "in the supplied page. Return only JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Create FAQPage, Article, AboutPage, and Mentions entity schema "
                    "where supportable.\n\n"
                    f"URL: {page.url}\nTitle: {page.title}\nQueries: {json.dumps(queries)}\n"
                    f"Page:\n{page.text[:20000]}"
                ),
            },
        ],
        text=_json_schema(
            "schema_bundle",
            {
                "type": "object",
                "properties": {
                    "faq_page": {"type": ["object", "null"]},
                    "article": {"type": ["object", "null"]},
                    "about_page": {"type": ["object", "null"]},
                    "mentions": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                },
                "required": ["faq_page", "article", "about_page", "mentions"],
                "additionalProperties": False,
            },
        ),
    )
    return SchemaBundle(**json.loads(response.output_text))
