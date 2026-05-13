from math import sqrt


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = sqrt(sum(a * a for a in left))
    right_norm = sqrt(sum(b * b for b in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot / (left_norm * right_norm)


def calculate_gas(retrieval_probability: float, semantic_similarity: float) -> float:
    normalized_similarity = max(0.0, min(1.0, semantic_similarity))
    raw_score = (retrieval_probability * 0.6) + (normalized_similarity * 0.4)
    return round(raw_score * 100, 2)
