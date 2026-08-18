"""Self-contained assistant engine for CBSS-AI.

This module implements a small, dependency-free "AI" assistant. It intentionally
avoids any external model provider so the app runs end-to-end without secrets or
network access. The routing is rule-based with a few useful skills (math,
text utilities, sentiment) and a reflective fallback.
"""

from __future__ import annotations

import ast
import operator
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

_ALLOWED_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

_POSITIVE_WORDS = {
    "good", "great", "love", "excellent", "amazing", "happy", "awesome",
    "wonderful", "fantastic", "nice", "cool", "like", "best", "brilliant",
}
_NEGATIVE_WORDS = {
    "bad", "terrible", "hate", "awful", "sad", "angry", "worst", "horrible",
    "broken", "bug", "fail", "failing", "annoying", "slow", "ugly",
}


def _safe_eval(node: ast.AST) -> float:
    """Evaluate a restricted arithmetic AST node.

    Only numeric literals and a small set of binary/unary operators are allowed,
    which prevents arbitrary code execution via the math skill.
    """
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numeric constants are allowed.")
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_safe_eval(node.operand))
    raise ValueError("Unsupported expression.")


def evaluate_math(expression: str) -> float:
    """Safely evaluate a simple arithmetic expression string."""
    parsed = ast.parse(expression, mode="eval")
    return _safe_eval(parsed)


def analyze_sentiment(text: str) -> str:
    """Return a coarse sentiment label for the given text."""
    words = re.findall(r"[a-z']+", text.lower())
    score = sum(w in _POSITIVE_WORDS for w in words) - sum(w in _NEGATIVE_WORDS for w in words)
    if score > 0:
        return "positive"
    if score < 0:
        return "negative"
    return "neutral"


@dataclass
class AssistantReply:
    """A structured reply produced by the assistant."""

    reply: str
    intent: str
    meta: dict = field(default_factory=dict)


class Assistant:
    """A tiny rule-based assistant with a handful of skills."""

    SKILLS = (
        "greet you",
        "solve arithmetic (e.g. 'what is 12 * (3 + 4)')",
        "count words and characters ('count words in ...')",
        "reverse text ('reverse ...')",
        "gauge sentiment ('sentiment: I love this')",
        "tell the current UTC time ('time')",
    )

    def respond(self, message: str) -> AssistantReply:
        text = (message or "").strip()
        if not text:
            return AssistantReply(
                reply="Say something and I'll do my best to help!",
                intent="empty",
            )

        lowered = text.lower()

        if re.fullmatch(r"(hi|hello|hey|yo|howdy)[!. ]*", lowered):
            return AssistantReply(
                reply="Hello! I'm CBSS-AI. Ask me to do math, count words, reverse text, or check sentiment.",
                intent="greeting",
            )

        if lowered in {"help", "?", "what can you do", "what can you do?"}:
            skills = "\n".join(f"- I can {skill}." for skill in self.SKILLS)
            return AssistantReply(reply=f"Here's what I can do:\n{skills}", intent="help")

        if lowered in {"time", "what time is it", "what time is it?", "date"}:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            return AssistantReply(reply=f"It is currently {now}.", intent="time", meta={"utc": now})

        if lowered.startswith("reverse "):
            payload = text[len("reverse "):]
            return AssistantReply(reply=payload[::-1], intent="reverse")

        if lowered.startswith("sentiment:") or lowered.startswith("sentiment "):
            payload = text.split(":", 1)[1] if ":" in text else text[len("sentiment "):]
            label = analyze_sentiment(payload)
            return AssistantReply(
                reply=f"That reads as {label}.",
                intent="sentiment",
                meta={"label": label},
            )

        if "count words" in lowered or "word count" in lowered:
            payload = re.sub(r".*(count words( in)?|word count)[:\s]*", "", text, flags=re.IGNORECASE)
            words = len(re.findall(r"\S+", payload))
            chars = len(payload)
            return AssistantReply(
                reply=f"That has {words} word(s) and {chars} character(s).",
                intent="count",
                meta={"words": words, "chars": chars},
            )

        math_expr = self._extract_math(text)
        if math_expr is not None:
            try:
                result = evaluate_math(math_expr)
                pretty = int(result) if isinstance(result, float) and result.is_integer() else result
                return AssistantReply(
                    reply=f"{math_expr.strip()} = {pretty}",
                    intent="math",
                    meta={"expression": math_expr.strip(), "result": result},
                )
            except (ValueError, SyntaxError, ZeroDivisionError):
                pass

        label = analyze_sentiment(text)
        return AssistantReply(
            reply=(
                "I don't have a specialized skill for that yet, but I'm listening. "
                f"(For reference, your message reads as {label}.) Type 'help' to see what I can do."
            ),
            intent="fallback",
            meta={"label": label},
        )

    @staticmethod
    def _extract_math(text: str) -> str | None:
        """Pull a candidate arithmetic expression out of a message, if present."""
        candidate = re.sub(r"(?i)^(what\s+is|whats|calculate|compute|eval(uate)?)\b", "", text).strip()
        candidate = candidate.rstrip("?.! ")
        if candidate and re.fullmatch(r"[0-9\.\s+\-*/%()]+", candidate) and re.search(r"[0-9]", candidate):
            return candidate
        return None
