# 🔍 단어 뜻 조회 실패 버그 분석 및 해결 보고서 (Handover Document)

안녕하세요! 단어 드래그 조회 시 "사전이나 AI 문맥 분석에서 단어의 뜻을 찾을 수 없습니다"라는 오류가 발생했던 원인과 해결 내역을 정리한 문서입니다. 팀원들과 공유하여 검토하실 수 있습니다.

---

## 1. 🚨 버그 현상
* **증상**: 기사 본문에서 단어를 마우스로 드래그하여 조회할 때, 백엔드(`explain_term` API)가 올바른 뜻을 반환하지 못하고 `"사전이나 AI 문맥 분석에서 단어의 뜻을 찾을 수 없습니다."`라는 기본 폴백 메시만 출력되었습니다.
* **디버그 모드 확인 결과**: 디버그 툴팁 노출 결과 `[시도된 항목]` 리스트와 `[에러 로그]`가 모두 비어 있는 채로 조기 종료되는 현상이 관측되었습니다.

---

## 2. 🕵️‍♂️ 원인 분석 (Root Cause)
백엔드 소스코드 `backend/app/agents/content_reducer/rag_engine.py` 파일의 `lookup_term` 함수 내에 잔존하던 **조기 리턴(Early Return) 버그**가 원인이었습니다.

### 코드 분석:
최근 커밋에서 로컬 사전 기반 매칭을 제거하고 오픈 API 및 LLM 중심 검색으로 구조를 변경하며 `term_dictionary.json` 파일이 비워지거나 삭제되었습니다. 하지만 `lookup_term` 진입부에 아래와 같은 예외 처리 코드가 남아 있었습니다:

```python
# backend/app/agents/content_reducer/rag_engine.py (수정 전)
def lookup_term(word: str, context: str | None = None) -> TermDict:
    ...
    if not _TERM_DICT:
        return TermDict(
            term=cleaned_word,
            definition="",
            source="not_found",
            ...
        )
```

* **문제점**: 로컬 단어장(`_TERM_DICT`)이 비어 있는 환경(배포 환경 등)에서는 **뒤이은 국립국어원 API 검색이나 Gemini LLM 실시간 유추 로직을 단 한 번도 실행해 보지 못하고** 즉시 `not_found`를 반환하며 조기 종료되었습니다.
* 이 때문에 `[시도된 항목]` 리스트에 `llm`이나 `stdict` 같은 어떤 API/AI 시도 내역도 남지 않은 채 빈 상태로 반환되었던 것입니다.

---

## 3. 🛠️ 해결 조치 (수정 완료)
로컬 단어장이 비어 있더라도 국립국어원 사전 API 및 Gemini AI 검색이 정상적으로 진행될 수 있도록 해당 조기 리턴 블록을 **완전히 제거**했습니다.

```diff
# backend/app/agents/content_reducer/rag_engine.py (수정 후)
     if cleaned_word != word_clean:
         word_candidates.append(cleaned_word)
 
-    if not _TERM_DICT:
-        return TermDict(
-            term=cleaned_word,
-            definition="",
-            source="not_found",
-            faithfulness_score=0.0,
-            chunk_id="",
-            _meta={"tried": tried, "errors": errors}
-        )
-
 
     # 1. 표준국어대사전 오픈 API 조회 시도
```

* **결과**: 로컬 사전에 단어가 없거나 사전 로딩에 실패하더라도, 정상적으로 백엔드가 2단계(국어사전 API) 및 3단계(Gemini API) 뜻 유추를 수행하게 되었습니다.

---

## 🚀 적용 및 배포 방법
1. 수정된 코드는 현재 메인 저장소(`origin/main`) 및 배포용 저장소(`personal/main`)에 모두 푸시되었습니다.
2. Render 대시보드에서 백엔드 배포가 완료(Live)되면, 즉시 모든 단어 뜻이 정상적으로 조회됩니다.
