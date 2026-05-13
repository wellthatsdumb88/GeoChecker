from bs4 import BeautifulSoup
import httpx

from app.config import settings
from app.schemas import PageSnapshot


async def scrape_page(url: str) -> PageSnapshot:
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=settings.request_timeout_seconds,
        headers={"User-Agent": "GEOAuthorityAuditor/0.1"},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else None
    description_tag = soup.find("meta", attrs={"name": "description"})
    description = (
        description_tag.get("content", "").strip()
        if description_tag and description_tag.get("content")
        else None
    )

    text = " ".join(soup.get_text(separator=" ").split())
    return PageSnapshot(
        url=str(response.url),
        title=title,
        description=description,
        text=text[:50000],
    )
