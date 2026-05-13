from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas import (
    AuditRequest,
    AuditResponse,
    CompetitorCompareRequest,
    CompetitorCompareResponse,
)
from app.services.audit import run_audit
from app.services.competitors import compare_competitors
from app.storage.database import get_session, init_db
from app.storage.models import AuditRecord

app = FastAPI(title="GEO Authority Auditor", version="0.1.0")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/audits", response_model=AuditResponse)
async def create_audit(
    request: AuditRequest,
    db: Session = Depends(get_session),
) -> AuditResponse:
    try:
        return await run_audit(
            target_url=str(request.target_url),
            db=db,
            queries=request.queries,
            max_queries=request.max_queries,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/competitors/compare", response_model=CompetitorCompareResponse)
async def create_competitor_comparison(
    request: CompetitorCompareRequest,
) -> CompetitorCompareResponse:
    try:
        return await compare_competitors(
            target_url=str(request.target_url),
            competitor_urls=[str(url) for url in request.competitor_urls],
            queries=request.queries,
            max_queries=request.max_queries,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/audits/{audit_id}", response_model=AuditResponse)
def get_audit(audit_id: int, db: Session = Depends(get_session)) -> AuditResponse:
    record = db.get(AuditRecord, audit_id)
    if not record:
        raise HTTPException(status_code=404, detail="Audit not found")
    return AuditResponse.model_validate_json(record.payload_json).model_copy(
        update={"audit_id": record.id}
    )


@app.get("/audits")
def list_audits(db: Session = Depends(get_session)) -> list[dict]:
    records = db.execute(
        select(AuditRecord).order_by(AuditRecord.created_at.desc()).limit(50)
    ).scalars()
    return [
        {
            "id": record.id,
            "target_url": record.target_url,
            "page_title": record.page_title,
            "gas": record.gas,
            "retrieval_probability": record.retrieval_probability,
            "semantic_similarity": record.semantic_similarity,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]
