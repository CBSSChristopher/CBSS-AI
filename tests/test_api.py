"""End-to-end API tests for CBSS-AI using FastAPI's TestClient."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_index_served():
    res = client.get("/")
    assert res.status_code == 200
    assert "CBSS-AI" in res.text


def test_chat_math():
    res = client.post("/api/chat", json={"message": "what is 12 * (3 + 4)"})
    assert res.status_code == 200
    body = res.json()
    assert body["intent"] == "math"
    assert body["meta"]["result"] == 84


def test_chat_reverse():
    res = client.post("/api/chat", json={"message": "reverse hello"})
    assert res.json()["reply"] == "olleh"


def test_chat_sentiment():
    res = client.post("/api/chat", json={"message": "sentiment: I love this, it is great"})
    body = res.json()
    assert body["intent"] == "sentiment"
    assert body["meta"]["label"] == "positive"


def test_chat_greeting():
    res = client.post("/api/chat", json={"message": "hello"})
    assert res.json()["intent"] == "greeting"


def test_chat_word_count():
    res = client.post("/api/chat", json={"message": "count words in the quick brown fox"})
    body = res.json()
    assert body["intent"] == "count"
    assert body["meta"]["words"] == 4
