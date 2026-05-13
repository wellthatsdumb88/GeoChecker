import asyncio

from app.schemas import CompetitorCompareResponse, CompetitorResult, PageSnapshot
from app.services.openai_client import (
    create_ideal_answer,
    generate_semantic_profile,
    semantic_similarity,
)
from app.services.scraper import scrape_page


def _coverage_delta(score: float, target_score: float) -> float:
    return round(score - target_score, 4)


def rank_pages(
    pages: list[PageSnapshot],
    similarities: list[float],
    target_url: str,
) -> tuple[CompetitorResult, list[CompetitorResult]]:
    ordered = sorted(
        zip(pages, similarities, strict=True),
        key=lambda item: item[1],
        reverse=True,
    )
    target_score = next(
        score
        for page, score in zip(pages, similarities, strict=True)
        if page.url == target_url
    )

    results = [
        CompetitorResult(
            url=page.url,
            title=page.title,
            semantic_similarity=round(score, 4),
            content_length=len(page.text),
            coverage_delta=_coverage_delta(score, target_score),
            rank=index,
        )
        for index, (page, score) in enumerate(ordered, start=1)
    ]

    target = next(result for result in results if result.url == target_url)
    competitors = [result for result in results if result.url != target_url]
    return target, competitors


async def compare_competitors(
    target_url: str,
    competitor_urls: list[str],
    queries: list[str] | None = None,
    max_queries: int = 10,
) -> CompetitorCompareResponse:
    pages = await asyncio.gather(
        scrape_page(target_url),
        *(scrape_page(url) for url in competitor_urls),
    )
    target_page = pages[0]
    profile_queries = queries or await generate_semantic_profile(
        target_page,
        max_queries=max_queries,
    )
    profile_queries = profile_queries[:max_queries]

    ideal_answer = await create_ideal_answer(profile_queries, target_page)
    similarities = await asyncio.gather(
        *(semantic_similarity(page, ideal_answer) for page in pages)
    )

    target, competitors = rank_pages(list(pages), list(similarities), target_page.url)
    winner_url = min([target, *competitors], key=lambda result: result.rank).url

    return CompetitorCompareResponse(
        target=target,
        competitors=competitors,
        queries=profile_queries,
        winner_url=winner_url,
    )
