"""Covers: Match scores after compute_match() refactor into per-factor functions.

GET /api/student/recommendations (as ahmad) must return opportunities sorted by
match.total desc; each match has exactly 6 factors with keys
major,courses,skills,external,interests,location and weights 25,25,25,10,10,5;
total == round(sum(points),1).
"""

import httpx
import pytest

from .conftest import api_url

EXPECTED_FACTORS = {
    "major": 25,
    "courses": 25,
    "skills": 25,
    "external": 10,
    "interests": 10,
    "location": 5,
}


@pytest.fixture
def ahmad_client():
    c = httpx.Client(base_url=api_url(), timeout=30.0)
    r = c.post("/auth/login", json={"email": "ahmad@wasla.edu", "password": "Student@123"})
    assert r.status_code == 200, r.text
    yield c
    c.close()


def test_recommendations_sorted_and_factors_valid(ahmad_client):
    r = ahmad_client.get("/student/recommendations")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) > 0

    totals = [row["match"]["total"] for row in data]
    assert totals == sorted(totals, reverse=True), f"not sorted desc: {totals}"

    for row in data:
        factors = row["match"]["factors"]
        assert len(factors) == 6, f"expected 6 factors, got {len(factors)}"
        keys_weights = {f["key"]: f["weight"] for f in factors}
        assert keys_weights == EXPECTED_FACTORS, keys_weights

        points_sum = round(sum(f["points"] for f in factors), 1)
        assert points_sum == row["match"]["total"], (
            f"total {row['match']['total']} != sum(points) {points_sum}"
        )


def test_recommendations_requires_auth():
    c = httpx.Client(base_url=api_url(), timeout=30.0)
    r = c.get("/student/recommendations")
    assert r.status_code in (401, 403), r.text
    c.close()
