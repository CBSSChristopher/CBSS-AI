# CBSS-AI

A small, self-contained AI assistant demo built with **FastAPI** and a modern
vanilla-JS chat UI. It runs end-to-end with no external model provider or
secrets — the assistant is a rule-based engine with a few skills (arithmetic,
text utilities, and sentiment), making it ideal as a reproducible starter and
Cloud Agent environment reference.

## Features

- FastAPI backend with `/api/health` and `/api/chat` endpoints
- Rule-based assistant: math, reverse text, word/char count, sentiment, time
- Responsive single-page chat UI served at `/`
- Pytest suite covering the API end-to-end

## Requirements

- Python 3.10+

## Quick start

```bash
./scripts/install.sh          # create .venv and install dependencies
./scripts/start.sh            # run the dev server on http://localhost:8000
```

Then open http://localhost:8000 and try:

- `what is 12 * (3 + 4)`
- `reverse hello`
- `sentiment: I love this`
- `count words in the quick brown fox`
- `help`

## Running tests

```bash
.venv/bin/pytest -q
```

## Project layout

```
app/
  main.py          # FastAPI app + routes
  assistant.py     # self-contained assistant engine
  static/          # chat UI (HTML/CSS/JS)
tests/
  test_api.py      # end-to-end API tests
scripts/
  install.sh       # idempotent dependency setup
  start.sh         # run the dev server
.cursor/
  environment.json # Cloud Agent environment configuration
```

## API

`POST /api/chat`

```json
{ "message": "what is 2 + 2" }
```

Response:

```json
{ "reply": "2 + 2 = 4", "intent": "math", "meta": { "expression": "2 + 2", "result": 4 } }
```
