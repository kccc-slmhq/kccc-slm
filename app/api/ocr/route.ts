export async function POST(request: Request) {
  const { imageBase64, mimeType } = await request.json()
  if (!imageBase64) return Response.json({ error: 'No image' }, { status: 400 })

  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean) as string[]
  if (!apiKeys.length) return Response.json({ error: 'No API key' }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]

  const startIdx = Math.floor(Date.now() / 1000) % apiKeys.length
  for (let j = 0; j < apiKeys.length; j++) {
    const ki = (startIdx + j) % apiKeys.length
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeys[ki]}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `당신은 한국 영수증 전문 분석가입니다. 이 영수증 이미지에서 세 가지 정보를 추출하세요.

[금액 추출 방법]
영수증에는 다양한 표현이 있습니다. 아래 중 보이는 항목에서 최종 결제 금액을 찾으세요:
- 결제금액, 승인금액, 결제하신금액
- 합계, 총합계, 총액, 총 금액
- 최종금액, 실결제금액, 청구금액, 이용금액
- TOTAL, Total Amount
- 영수증 상단에 크게 표시된 금액 (예: 27,550원)
숫자에서 쉼표와 '원' 글자를 제외한 순수 정수로 반환하세요.

[날짜 추출 방법]
아래 중 보이는 항목에서 거래 날짜를 찾으세요:
- 거래일시, 거래날짜, 거래일자, 결제일시, 승인일시
- 영수증 어디에든 있는 날짜 표기 (26.06.05 → 2026-06-05, 2025.06.10 등)
- 두 자리 연도(26)는 2026년으로 해석
날짜만 추출해서 YYYY-MM-DD 형식으로 변환. 없으면 ${today}.

[업체명 추출 방법]
- 영수증 맨 위에 크게 적힌 상호명, 브랜드명, 가맹점명
- '가맹점:' 또는 '상호:' 뒤에 오는 이름
- 없으면 빈 문자열

결과는 반드시 아래 JSON 형식으로만 답하세요. 설명 없이 JSON만:
{"amount": 숫자, "vendor": "업체명", "date": "YYYY-MM-DD", "description": "품목 요약(20자 이내)"}`,
                },
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: { temperature: 0.1 }
          })
        }
      )

      const data = await response.json()
      if (data.error?.code === 429) {
        console.error(`[OCR] key${ki+1} 한도초과, 다음 키 시도`)
        continue
      }
      console.log('[OCR] HTTP status:', response.status)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        result.amount = parseInt(String(result.amount || 0).replace(/[^0-9]/g, '')) || 0
        return Response.json(result)
      }
      return Response.json({ amount: 0, vendor: '', date: today, description: '' })
    } catch (e) {
      console.error(`[OCR] key${ki+1} 오류:`, (e as Error).message)
    }
  }
  return Response.json({ error: 'All keys exhausted' }, { status: 500 })
}
