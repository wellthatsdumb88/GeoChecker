from pydantic import BaseModel, Field, HttpUrl


class AuditRequest(BaseModel):
    target_url: HttpUrl
    queries: list[str] | None = Field(
        default=None,
        description="Optional query list. When omitted, the app generates a semantic profile.",
    )
    max_queries: int = Field(default=10, ge=1, le=50)


class CompetitorCompareRequest(BaseModel):
    target_url: HttpUrl
    competitor_urls: list[HttpUrl] = Field(min_length=1, max_length=5)
    queries: list[str] | None = Field(
        default=None,
        description="Optional query cluster to compare against.",
    )
    max_queries: int = Field(default=10, ge=1, le=50)


class PageSnapshot(BaseModel):
    url: str
    title: str | None = None
    description: str | None = None
    text: str


class SemanticProfile(BaseModel):
    queries: list[str]


class CitationResult(BaseModel):
    query: str
    cited: bool
    cited_urls: list[str]
    summary: str


class LatentAuthorityResult(BaseModel):
    query: str
    score: int = Field(ge=1, le=10)
    explanation: str


class GeoRecommendation(BaseModel):
    category: str
    finding: str
    recommendation: str


class SchemaBundle(BaseModel):
    faq_page: dict | None = None
    article: dict | None = None
    about_page: dict | None = None
    mentions: list[dict] = Field(default_factory=list)


class GasComponents(BaseModel):
    retrieval_probability: float = Field(ge=0, le=1)
    instruction_following_weight: float = Field(ge=0, le=1)
    semantic_similarity: float = Field(ge=-1, le=1)
    gas: float = Field(ge=0, le=100)


class CompetitorResult(BaseModel):
    url: str
    title: str | None = None
    semantic_similarity: float = Field(ge=-1, le=1)
    content_length: int
    coverage_delta: float
    rank: int


class CompetitorCompareResponse(BaseModel):
    target: CompetitorResult
    competitors: list[CompetitorResult]
    queries: list[str]
    winner_url: str


class AuditResponse(BaseModel):
    audit_id: int | None = None
    target: PageSnapshot
    semantic_profile: SemanticProfile
    citation_results: list[CitationResult]
    latent_authority: list[LatentAuthorityResult]
    recommendations: list[GeoRecommendation]
    schema_bundle: SchemaBundle
    gas: GasComponents
