from urllib.parse import urlparse


def normalize_host(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def url_matches_target(candidate: str, target: str) -> bool:
    candidate_host = normalize_host(candidate)
    target_host = normalize_host(target)
    if not candidate_host or not target_host:
        return False
    return candidate_host == target_host or candidate.rstrip("/") == target.rstrip("/")


def extract_url_citations(response) -> list[str]:
    urls: list[str] = []

    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            for annotation in getattr(content, "annotations", []) or []:
                if getattr(annotation, "type", None) == "url_citation":
                    url = getattr(annotation, "url", None)
                    if url:
                        urls.append(url)

    return list(dict.fromkeys(urls))
