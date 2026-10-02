"""Helper tests with a fake Gemma, so they run without Ollama or a GPU."""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from mathaka_helper import app as helper
from mathaka_helper.laya_engine import _probs_from_answer


class FakeGemma:
    model = "fake-gemma"

    def __init__(self, replies: list[str]) -> None:
        self.replies = replies
        self.calls: list[dict[str, Any]] = []

    async def generate(self, system: str, user: str, schema: dict[str, Any], max_tokens: int, images: list[str] | None = None) -> str:
        self.calls.append({"system": system, "user": user, "schema": schema, "images": images})
        return self.replies.pop(0)

    async def ready(self) -> bool:
        return True


def client_with(replies: list[str]) -> tuple[TestClient, FakeGemma]:
    fake = FakeGemma(replies)
    helper.app.dependency_overrides[helper.get_generator] = lambda: fake
    return TestClient(helper.app), fake


@pytest.fixture(autouse=True)
def _clean() -> Any:
    yield
    helper.app.dependency_overrides.clear()


def test_health() -> None:
    c, _ = client_with([])
    body = c.get("/health").json()
    assert body["ok"] is True and body["gemma_model"] == "fake-gemma"


def test_prescription_defaults_and_image_passed() -> None:
    reply = json.dumps({"rows": [{"name": "Metformin", "frequency_raw": "1 bd pc", "confidence": 0.8}]})
    c, fake = client_with([reply])
    res = c.post("/gemma/extract-prescription", json={"image_base64": "data:image/jpeg;base64,AAAA"})
    assert res.status_code == 200
    row = res.json()["rows"][0]
    assert row["dose_count"] == 1 and row["meal"] == "any" and row["times"] == []
    assert fake.calls[0]["images"] == ["AAAA"]  # data: prefix stripped


def test_one_retry_then_502() -> None:
    c, fake = client_with(["not json", '{"text": "5", "confidence": 0.9}'])
    assert c.post("/gemma/pill-imprint", json={"image_base64": "AAAA"}).json() == {"text": "5", "confidence": 0.9}
    assert len(fake.calls) == 2
    c, _ = client_with(["nope", "still nope"])
    assert c.post("/gemma/pill-imprint", json={"image_base64": "AAAA"}).status_code == 502


def test_weekly_summary_uses_language_and_facts() -> None:
    c, fake = client_with(['{"sentences": ["Ammi took most doses."]}'])
    res = c.post("/gemma/weekly-summary", json={"language": "si", "name": "Ammi", "facts": ["25 of 28 taken"]})
    assert res.json()["sentences"] == ["Ammi took most doses."]
    assert "in Sinhala for the family of Ammi" in fake.calls[0]["user"]
    assert "- 25 of 28 taken" in fake.calls[0]["user"]


def test_decide_enum_and_probs() -> None:
    c, fake = client_with(['{"label": "yes", "confidence": 0.8}'])
    res = c.post("/gemma/decide", json={"state": "s", "question": "q", "options": ["yes", "no", "unsure"]}).json()
    assert res["label"] == "yes" and abs(sum(res["probs"].values()) - 1) < 1e-9
    assert fake.calls[0]["schema"]["properties"]["label"]["enum"] == ["yes", "no", "unsure"]


def test_decide_rejects_label_outside_options() -> None:
    c, _ = client_with(['{"label": "take another pill", "confidence": 1}', '{"label": "take another pill", "confidence": 1}'])
    assert c.post("/gemma/decide", json={"state": "s", "question": "q", "options": ["yes", "no"]}).status_code == 502


def test_option_lists_stay_under_20() -> None:
    c, _ = client_with([])
    assert c.post("/gemma/decide", json={"state": "s", "question": "q", "options": [str(i) for i in range(20)]}).status_code == 422


def test_laya_missing_is_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(helper, "laya_available", lambda: False)
    c, _ = client_with([])
    assert c.post("/laya/decide", json={"state": "s", "question": "q", "options": ["yes", "no"]}).status_code == 503


def test_laya_probability_shapes() -> None:
    opts = ["did_i_take", "when_next", "other"]
    assert _probs_from_answer({"choice": "when_next", "probabilities": {"did_i_take": 0.1, "when_next": 0.8, "other": 0.1}}, opts)["when_next"] == pytest.approx(0.8)
    assert _probs_from_answer({"choice": "other", "probabilities": [0.2, 0.2, 0.6]}, opts)["other"] == pytest.approx(0.6)
    p = _probs_from_answer({"choice": "did_i_take", "answer_confidence": 0.9}, opts)
    assert p["did_i_take"] == pytest.approx(0.9) and sum(p.values()) == pytest.approx(1)


def test_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HELPER_TOKEN", "secret")
    c, _ = client_with([])
    assert c.get("/health").status_code == 401
    assert c.get("/health", headers={"X-Mathaka-Token": "secret"}).status_code == 200
