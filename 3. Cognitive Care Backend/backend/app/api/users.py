from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..core.db import get_db
from ..models.models import ReadingSession, ReadingEvent, User

router = APIRouter(prefix="/api/user", tags=["User Data Management"])

@router.delete("/{user_id}/data")
async def delete_user_data(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    ADR-002: 익명 사용자 데이터 파기 요청 (세션 및 이벤트 일괄 삭제)
    """
    user_result = await db.execute(select(User).filter(User.id == user_id))
    user = user_result.scalars().first()
    
    if not user:
        return {"status": "success", "message": f"User {user_id} not found or already deleted."}
        
    # 세션 조회
    sessions_result = await db.execute(select(ReadingSession).filter(ReadingSession.user_id == user_id))
    sessions = sessions_result.scalars().all()
    session_ids = [s.id for s in sessions]
    
    # 해당 세션의 모든 이벤트 삭제
    if session_ids:
        for sid in session_ids:
            events_result = await db.execute(select(ReadingEvent).filter(ReadingEvent.session_id == sid))
            events = events_result.scalars().all()
            for ev in events:
                await db.delete(ev)
            
        for s in sessions:
            await db.delete(s)
            
    await db.delete(user)
    await db.commit()
    
    return {"status": "success", "message": f"Data for user {user_id} deleted successfully."}

@router.get("/{user_id}/growth")
async def get_user_growth(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the user's detailed growth report data (weekly/monthly).
    Currently returns dummy data.
    """
    return {
        "weekly": {
            "radarData": [
                {"subject": '어휘력', "before": 62, "after": 84},
                {"subject": '독해 속도', "before": 55, "after": 78},
                {"subject": '정독율', "before": 70, "after": 88},
                {"subject": '추론 능력', "before": 65, "after": 80},
                {"subject": '집중 유지', "before": 60, "after": 92},
            ],
            "activityData": [
                {"label": '월', "time": 15, "xp": 120},
                {"label": '화', "time": 22, "xp": 180},
                {"label": '수', "time": 12, "xp": 90},
                {"label": '목', "time": 28, "xp": 240},
                {"label": '금', "time": 18, "xp": 150},
                {"label": '토', "time": 35, "xp": 320},
                {"label": '일', "time": 42, "xp": 380},
            ],
            "words": [
                {"word": '인공지능 전환 (AX)', "meaning": 'AI 기술을 도입해 기존의 비즈니스 구조를 근본적으로 바꾸는 과정.', "level": '상', "status": 'completed'},
                {"word": '녹색 전환 (GX)', "meaning": '친환경적이고 지속 가능한 비즈니스 모델로의 변화.', "level": '중', "status": 'completed'},
                {"word": '카나리아 (Canary)', "meaning": '탄광의 새처럼 위험을 미리 알려주는 조기 경보 체계나 지표.', "level": '상', "status": 'review'},
                {"word": '리터러시 (Literacy)', "meaning": '글이나 정보를 읽고 비판적으로 이해하는 능력.', "level": '하', "status": 'completed'},
            ],
            "prescription": [
                "학습자의 이번 주 총 집중 독해 시간은 <strong class=\"text-[var(--color-primary)]\">164분</strong>으로, 지난주 대비 약 <strong>28% 증가</strong>했습니다.",
                "특히 'AI 기술과 일자리 변화' 같은 난도 높은 비문학 단락을 읽을 때 평균 체류(Dwell) 시간이 길어졌으나, 실시간으로 개입한 <strong class=\"text-[var(--color-nudge-soft)]\">Soft Nudge 용어 해설</strong>과 <strong class=\"text-[var(--color-nudge-medium)]\">간이 퀴즈</strong>를 거치며 독해 밸런스를 맞췄습니다. 결과적으로 <strong>어휘 능력 지표가 22점 상승</strong>하는 매우 긍정적인 성과를 냈습니다.",
                "<strong>💡 성장 챌린지:</strong> 다음 주에는 LLM, RAG 등 더 깊은 기술 원리를 다루는 지문에 도전해보세요. 단락 구조 파악(Structural scanning) 훈련을 병행하면 추론 속도가 더 빨라질 것입니다."
            ]
        },
        "monthly": {
            "radarData": [
                {"subject": '어휘력', "before": 58, "after": 89},
                {"subject": '독해 속도', "before": 50, "after": 82},
                {"subject": '정독율', "before": 65, "after": 91},
                {"subject": '추론 능력', "before": 60, "after": 85},
                {"subject": '집중 유지', "before": 55, "after": 94},
            ],
            "activityData": [
                {"label": '1주차', "time": 78, "xp": 680},
                {"label": '2주차', "time": 92, "xp": 820},
                {"label": '3주차', "time": 110, "xp": 1020},
                {"label": '4주차', "time": 145, "xp": 1350},
            ],
            "words": [
                {"word": '대규모 언어 모델 (LLM)', "meaning": '방대한 텍스트 데이터를 학습하여 사람의 언어를 이해하고 생성하는 AI 모델.', "level": '중', "status": 'completed'},
                {"word": '환각 현상 (Hallucination)', "meaning": '인공지능이 사실이 아닌 거짓 정보를 진짜처럼 생성하는 현상.', "level": '상', "status": 'completed'},
                {"word": '메타인지 (Metacognition)', "meaning": '자신의 인지 과정을 스스로 파악하고 제어하는 상위 수준의 사고 능력.', "level": '상', "status": 'review'},
                {"word": '가독성 (Readability)', "meaning": '글이 읽히는 쉽고 명확한 정도.', "level": '하', "status": 'completed'},
            ],
            "prescription": [
                "지난 4주간 총 <strong class=\"text-[var(--color-primary)]\">425분</strong>의 독해 세션을 성공적으로 수행하였으며, 총 <strong class=\"text-[var(--color-xp)]\">3,870 XP</strong>를 누적 획득하여 성장 속도가 가속화되고 있습니다.",
                "지속적인 폐루프 넛지 인터랙션을 거치면서, <strong>\"쉬운 문장으로 변환하여 읽기\"</strong>에 의존하는 비율이 <strong>초기 65%에서 15% 미만</strong>으로 극적으로 줄어들었습니다. 이는 보조 도구 없이 원문 자체를 소화할 수 있는 내재적 문해 체력이 형성되었음을 시각적으로 증명합니다.",
                "<strong>💡 성장 챌린지:</strong> 현재 리터러시 레벨은 실버 최상위 구간입니다. 집중력 유지를 위해 넛지 개입 빈도를 한 단계 낮춘 '자율 심화 모드'를 적용할 것을 권장합니다."
            ]
        }
    }
