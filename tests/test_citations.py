from app.services.citations import normalize_host, url_matches_target


def test_normalize_host_removes_www() -> None:
    assert normalize_host("https://www.example.com/article") == "example.com"


def test_url_matches_target_by_host() -> None:
    assert url_matches_target(
        "https://example.com/another-page",
        "https://www.example.com/source-page",
    )


def test_url_matches_target_rejects_other_hosts() -> None:
    assert not url_matches_target("https://other.test", "https://example.com")
