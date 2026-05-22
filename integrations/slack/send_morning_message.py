#!/usr/bin/env python3
"""
Утреннее вдохновляющее сообщение в Slack (Serenity).
Запуск: GitHub Actions или локально с переменными из secrets.example.env.
"""

from __future__ import annotations

import json
import os
import random
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "morning-prompt.md"
FALLBACK_PATH = ROOT / "fallback-quotes.ru.json"

WEEKDAY_RU = {
    0: "понедельник",
    1: "вторник",
    2: "среда",
    3: "четверг",
    4: "пятница",
    5: "суббота",
    6: "воскресенье",
}

# Простые даты для тона (MVP, без внешних API)
RU_HOLIDAYS = {
    "01-01": "Новый год",
    "01-07": "Рождество",
    "02-23": "День защитника Отечества",
    "03-08": "Международный женский день",
    "05-01": "Праздник Весны и Труда",
    "05-09": "День Победы",
    "06-12": "День России",
    "11-04": "День народного единства",
}


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    return value.strip()


def load_system_prompt() -> str:
    if not PROMPT_PATH.is_file():
        raise FileNotFoundError(f"Нет файла промпта: {PROMPT_PATH}")
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def load_fallback_quote() -> str:
    data = json.loads(FALLBACK_PATH.read_text(encoding="utf-8"))
    quotes = data.get("quotes") or []
    if not quotes:
        raise ValueError("fallback-quotes.ru.json: пустой список quotes")
    return random.choice(quotes)


def moscow_context() -> tuple[str, str]:
    now = datetime.now(ZoneInfo("Europe/Moscow"))
    iso_date = now.strftime("%Y-%m-%d")
    weekday = WEEKDAY_RU[now.weekday()]
    holiday = RU_HOLIDAYS.get(now.strftime("%m-%d"))
    extra = f" Сегодня в России отмечают: {holiday}." if holiday else ""
    user = (
        f"Дата: {iso_date}, день недели: {weekday}.{extra} "
        "Напиши одно утреннее сообщение для команды в Slack."
    )
    return iso_date, user


def normalize_message(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^[\"'«»]+|[\"'«»]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > 500:
        cleaned = cleaned[:497].rstrip() + "…"
    return cleaned


def call_openai(system: str, user: str) -> str:
    api_key = env("SLACK_MORNING_LLM_API_KEY")
    if not api_key:
        raise RuntimeError("SLACK_MORNING_LLM_API_KEY не задан")

    model = env("SLACK_MORNING_LLM_MODEL", "gpt-4o-mini")
    base = env("SLACK_MORNING_LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    url = f"{base}/chat/completions"

    payload = {
        "model": model,
        "temperature": 0.9,
        "max_tokens": 220,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"LLM HTTP {exc.code}: {err_body[:500]}") from exc

    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError(f"LLM: пустой ответ: {body}")

    content = choices[0].get("message", {}).get("content", "")
    if not content or not str(content).strip():
        raise RuntimeError("LLM: пустой content")

    return normalize_message(str(content))


def post_slack(text: str) -> None:
    token = env("SLACK_MORNING_BOT_TOKEN")
    channel = env("SLACK_MORNING_CHANNEL_ID")
    if not token or not channel:
        raise RuntimeError(
            "Нужны SLACK_MORNING_BOT_TOKEN и SLACK_MORNING_CHANNEL_ID"
        )

    payload = {
        "channel": channel,
        "text": text,
        "unfurl_links": False,
        "unfurl_media": False,
    }

    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Slack HTTP {exc.code}: {err_body[:500]}") from exc

    if not body.get("ok"):
        raise RuntimeError(f"Slack API error: {body.get('error', body)}")


def generate_message() -> tuple[str, str]:
    """Возвращает (текст, источник: llm|fallback)."""
    if env("SLACK_MORNING_FORCE_FALLBACK") == "1":
        return load_fallback_quote(), "fallback"

    system = load_system_prompt()
    _, user = moscow_context()

    try:
        return call_openai(system, user), "llm"
    except Exception as exc:
        print(f"::warning::LLM недоступен, fallback: {exc}", file=sys.stderr)
        return load_fallback_quote(), "fallback"


def main() -> int:
    token = env("SLACK_MORNING_BOT_TOKEN")
    channel = env("SLACK_MORNING_CHANNEL_ID")
    if not token or not channel:
        print(
            "::warning::Slack Morning: задайте SLACK_MORNING_BOT_TOKEN "
            "и SLACK_MORNING_CHANNEL_ID (GitHub Secrets или secrets.env)."
        )
        return 0

    text, source = generate_message()
    post_slack(text)
    print(f"OK Slack morning message ({source}, {len(text)} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
