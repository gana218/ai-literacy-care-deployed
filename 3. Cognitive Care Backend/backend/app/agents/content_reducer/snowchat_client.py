import os
import json
import urllib.request

# Gemini REST API 직접 호출 (SnowChat 게이트웨이 미사용)
_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

def is_snowchat_available() -> bool:
    """GEMINI_API_KEY가 설정되어 있는지 확인한다."""
    api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("SNOWCHAT_API_KEY", "")
    if not api_key or api_key.startswith("your_"):
        return False
    return True

def _call_llm_via_snowchat(model: str, prompt: str, system_instruction: str | None = None) -> str:
    """
    Gemini REST API를 직접 호출한다 (SDK 설치 불필요).
    model: gemini-2.5-flash, gemini-2.0-flash 등
    """
    api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("SNOWCHAT_API_KEY", "")
    if not api_key or api_key.startswith("your_"):
        raise ValueError("GEMINI_API_KEY is not configured.")

    url = f"{_GEMINI_API_BASE}/{model}:generateContent?key={api_key}"

    contents = []
    if system_instruction:
        contents.append({
            "role": "user",
            "parts": [{"text": f"[시스템 지시] {system_instruction}\n\n{prompt}"}]
        })
    else:
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

    payload = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 256,
            "temperature": 0.2
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=15) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        candidates = res_data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "").strip()
                # 문장이 잘리면 마지막 완성 문장 단위까지 보존
                if len(text) > 150:
                    # 마지막 마침표 위치까지 잘라냄
                    last_period = max(text.rfind('.'), text.rfind('입니다'), text.rfind('합니다'))
                    if last_period > 50:
                        text = text[:last_period+1]
                    else:
                        text = text[:150]
                return text

    raise ValueError("Empty response from Gemini API.")
