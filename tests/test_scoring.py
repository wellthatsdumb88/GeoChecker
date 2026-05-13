from app.services.scoring import calculate_gas, cosine_similarity


def test_cosine_similarity_identical_vectors() -> None:
    assert cosine_similarity([1, 2, 3], [1, 2, 3]) == 1.0


def test_cosine_similarity_mismatched_vectors_returns_zero() -> None:
    assert cosine_similarity([1, 2], [1, 2, 3]) == 0.0


def test_calculate_gas_weights_retrieval_and_similarity() -> None:
    assert calculate_gas(0.5, 0.75) == 60.0
