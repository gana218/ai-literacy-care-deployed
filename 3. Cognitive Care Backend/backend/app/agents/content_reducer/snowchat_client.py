import os
import json
import urllib.request

def is_snowchat_available() -> bool:
    """
    SnowChat API 키가 환경 변수에 설정되어 있는지 확인한다.
    """
    api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("SNOWCHAT_API_KEY", "")
    if not api_key or api_key.startswith("your_"):
        return False
    return True

def _call_llm_via_snowchat(model: str, prompt: str, system_instruction: str | None = None) -> str:
    """
    Mindlogic SnowChat API Gateway 또는 Google 공식 Gemini API를 호출하여 대답을 얻는다.
    """
    api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("SNOWCHAT_API_KEY", "")
    if not api_key or api_key.startswith("your_"):
        raise ValueError("API key is not configured.")

    # Google 공식 API 키 감지 시 직접 호출 (AIzaSy로 시작하는 경우)
    if api_key.startswith("AIzaSy"):
        try:
            # Google 공식 API에는 gemini-2.5-flash 모델이 없으므로 표준 gemini-1.5-flash를 사용합니다.
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            if system_instruction:
                payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
                
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res_content = response.read().decode("utf-8")
                res_data = json.loads(res_content)
                candidates = res_data.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if content:
                        return content.strip()
        except Exception as e:
            print(f"[snowchat_client] Google 공식 Gemini API 호출 실패: {e}")
            # 실패 시 아래 FactChat으로 폴백 시도

    # FactChat Gateway 호출
    url = "https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions"
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": user_agent
    }
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        choices = res_data.get("choices", [])
        if choices:
            content = choices[0].get("message", {}).get("content", "")
            return content.strip()
            
    raise ValueError("Empty response from SnowChat API.")
