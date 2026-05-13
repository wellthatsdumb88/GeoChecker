import asyncio
import json

from sqlalchemy.orm import Session

from app.config import settings
from app.schemas import (
    AuditResponse,
    GasComponents,
    SemanticProfile,
)
from app.services.openai_client import (
    create_ideal_answer,
    estimate_latent_authority,
    generate_recommendations,
    generate_schema_bundle,
    generate_semantic_profile,
    run_citation_test,
    semantic_similarity,
)
from app.services.scoring import calculate_gas
from app.services.scraper import scrape_page
from app.storage.models import AuditRecord


async def run_audit(
    target_url: str,
    db: Session,
    queries: list[str] | None = None,
    max_queries: int = 10,
) -> AuditResponse:
    page = await scrape_page(target_url)
    profile_queries = queries or await generate_semantic_profile(page, max_queries=max_queries)
    profile_queries = profile_queries[:max_queries]

    citation_limit = min(len(profile_queries), settings.openai_max_citation_tests)
    citation_results = await asyncio.gather(
        *(run_citation_test(query, page.url) for query in profile_queries[:citation_limit])
    )

    uncited_queries = [result.query for result in citation_results if not result.cited]
    latent_authority = await asyncio.gather(
        *(estimate_latent_authority(query, page.url) for query in uncited_queries[:5])
    )

    ideal_answer = await create_ideal_answer(profile_queries, page)
    similarity = await semantic_similarity(page, ideal_answer)
    retrieval_probability = (
        sum(1 for result in citation_results if result.cited) / len(citation_results)
        if citation_results
        else 0.0
    )
    gas_score = calculate_gas(retrieval_probability, similarity)

    recommendations, schema_bundle = await asyncio.gather(
        generate_recommendations(page, profile_queries),
        generate_schema_bundle(page, profile_queries),
    )

    response = AuditResponse(
        target=page,
        semantic_profile=SemanticProfile(queries=profile_queries),
        citation_results=list(citation_results),
        latent_authority=list(latent_authority),
        recommendations=recommendations,
        schema_bundle=schema_bundle,
        gas=GasComponents(
            retrieval_probability=round(retrieval_probability, 4),
            instruction_following_weight=0.0,
            semantic_similarity=round(similarity, 4),
            gas=gas_score,
        ),
    )

    record = AuditRecord(
        target_url=page.url,
        page_title=page.title,
        retrieval_probability=response.gas.retrieval_probability,
        semantic_similarity=response.gas.semantic_similarity,
        gas=response.gas.gas,
        payload_json=response.model_dump_json(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    payload = json.loads(response.model_dump_json())
    payload["audit_id"] = record.id
    return AuditResponse(**payload)
