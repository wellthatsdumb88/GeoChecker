from app.schemas import PageSnapshot
from app.services.competitors import rank_pages


def test_rank_pages_orders_by_similarity_and_marks_target() -> None:
    target = PageSnapshot(url="https://target.test", title="Target", text="short")
    competitor = PageSnapshot(
        url="https://competitor.test",
        title="Competitor",
        text="longer text",
    )

    target_result, competitors = rank_pages(
        pages=[target, competitor],
        similarities=[0.62, 0.81],
        target_url=target.url,
    )

    assert target_result.rank == 2
    assert target_result.coverage_delta == 0.0
    assert competitors[0].rank == 1
    assert competitors[0].coverage_delta == 0.19
