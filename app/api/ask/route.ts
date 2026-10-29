export async function POST(request: Request) {
  const { question, notices } = await request.json()
  if (!question) return Response.json({ error: 'No question' }, { status: 400 })

  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean) as string[]
  console.log(`[ask] 등록된 키 수: ${apiKeys.length}`)
  if (!apiKeys.length) return Response.json({ error: 'No API key', debug: 'no keys found in env' }, { status: 500 })

  const systemPrompt = `당신은 2026 CCC 교육간사 포럼 공식 안내 AI입니다.
반드시 "안녕하세요! SLM HQ입니다 😊"로 시작하세요.
친절하고 따뜻하게, 2~4문장으로 핵심만 간결하게 답변하세요.

⚠️ 규칙 1 — 범위 제한: 오직 아래 제공된 교육간사 포럼 관련 질문에만 답하세요.
포럼과 무관한 질문에는 "저는 2026 CCC 교육간사 포럼 안내만 도와드릴 수 있어요! 포럼에 대해 궁금한 점을 물어봐주세요 😊"라고만 답하세요.
자기소개를 요청받으면 "안녕하세요! 저는 SLM HQ입니다 😊 2026 CCC 교육간사 포럼에 관한 안내를 도와드리고 있어요!"라고 답하세요.

⚠️ 규칙 2 — 개인정보 보호: 특정 참가자의 이름·연락처·주민번호·참가 여부 등 개인 정보는 절대 답하지 마세요. "개인 정보는 담당 간사님께 직접 문의해주세요"라고 안내하세요.

【 행사 기본 정보 】
- 이름: 2026 CCC SLM 교육간사 포럼
- 주제: 가르쳐 지키게 하라!!!
- 주제 말씀: 마태복음 28:20
- 대상: CCC SLM 교육간사
- 일정: 2026년 11월 23일(월) ~ 24일(화), 1박 2일
- 장소: 수원 CCC 회관 (자세한 위치는 랜딩페이지 지도 참고)
- 숙소: 홈스테이 수원 (자세한 위치는 랜딩페이지 지도 참고)
- 담당 간사: 김양연 간사 (010-9154-6113)

【 일정 】
[1일차 11월 23일(월)]
- 12:00 등록
- 14:00 축복의 시간 & 찬양
- 14:20 메시지
- 14:40 캠퍼스 학생 현황 발표
- 15:30 휴식 시간
- 15:50 지구별 교육 커리 발표
- 16:50 전국 SLM 교육 커리 요약 정리
- 17:30 저녁 식사
- 19:00 나눔 질문 및 설문 결과 발표
- 19:30 AI를 통한 교육 콘텐츠 개발
- 20:50 광고 및 마무리

[2일차 11월 24일(화)]
- 08:00 개인 경건의 시간 및 아침 식사
- 09:00 나눔 및 설문 결과 발표
- 09:40 순모임에 관한 강의
- 11:00 휴식
- 11:20 Grow DiP
- 11:50 기도 / 광고 및 마무리

【 회비 및 등록 】
- 1인 회비: 50,000원
- 납부 계좌: 카카오뱅크 · 박예찬 · 3333-29-2677428 (입금자명: 참여자 이름)
- 등록 마감: 2026년 11월 15일
- 마감 후 문의: 김양연 간사 (010-9154-6113)

【 여행자보험 】
SLMHQ에서 단체 여행자보험 가입.

위 정보에 없는 내용은 반드시 "담당 간사님(김양연 간사 010-9154-6113)께 문의해주세요 😊"라고 안내하세요.`

  const noticeBlock = notices && notices.length > 0
    ? '\n\n【 최신 공지사항 (최대 3개) 】\n' + (notices as Array<{created_at: string; title: string; content?: string}>).map((n, i) => {
        const date = new Date(n.created_at).toLocaleDateString('ko-KR')
        return `${i + 1}. [${date}] ${n.title}${n.content ? '\n   ' + n.content : ''}`
      }).join('\n')
    : notices && notices.length === 0
      ? '\n\n【 공지사항 】\n현재 게시된 공지사항이 없습니다.'
      : ''

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: systemPrompt + noticeBlock + '\n\n질문: ' + question }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
  })

  const startIdx = Math.floor(Date.now() / 1000) % apiKeys.length
  for (let j = 0; j < apiKeys.length; j++) {
    const i = (startIdx + j) % apiKeys.length
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeys[i]}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal }
      )
      clearTimeout(timer)
      const data = await response.json()
      if (data.error?.code === 429) {
        console.error(`[ask] key${i+1} 한도초과`)
        continue
      }
      if (data.error) {
        console.error(`[ask] key${i+1} 에러:`, JSON.stringify(data.error))
        continue
      }
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!answer) {
        console.error(`[ask] key${i+1} 빈 응답:`, JSON.stringify(data).slice(0, 200))
        continue
      }
      console.log(`[ask] key${i+1} 성공`)
      return Response.json({ answer })
    } catch (e) {
      clearTimeout(timer)
      const msg = (e as Error).name === 'AbortError' ? '타임아웃(7s)' : (e as Error).message
      console.error(`[ask] key${i+1} 실패: ${msg}`)
      continue
    }
  }
  console.error('[ask] 모든 키 실패')
  return Response.json({ answer: '죄송해요, 잠시 후 다시 시도해주세요.' })
}
