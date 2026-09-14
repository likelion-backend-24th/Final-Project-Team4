// TASK 11-5: 프론트 Mock 먼저 구현 — TASK 11-1~4 백엔드 API 나오면 이 파일 내부만 실제 apiClient 호출로 교체.
// 함수 시그니처는 spec.md "신규 API(초안)" 표와 맞춰둠.

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let leads = [];
let nextId = 1;

// Mock 전용 — 흔한 개조식 반말 어미를 존댓말로 치환. 실제 문맥 이해는 못 하는 규칙 기반 근사치라
// 매끄럽지 않은 문장이 나올 수 있음. 진짜 자연스러운 존댓말 재작성은 TASK 11-3 실제 Gemini 프롬프트가 맡는다.
const POLITE_REPLACEMENTS = [
  [/보이심/g, '보여주셨습니다'],
  [/확인하셨음/g, '확인해 주셨습니다'],
  [/타고 계시고/g, '타고 계신다고 하셨고'],
  [/타고 계심/g, '타고 계신다고 하셨습니다'],
  [/정도 됐다고 함/g, '정도 되었다고 말씀해 주셨습니다'],
  [/중요하게 보심/g, '중요하게 봐 주셨습니다'],
  [/넣고 싶다고 하심/g, '넣고 싶다고 요청해 주셨습니다'],
  [/받아보고 싶어하심/g, '받아보고 싶다고 요청해 주셨습니다'],
  [/맞추길 원함/g, '맞추기를 원하셨습니다'],
  [/체크하고 싶다고 함/g, '체크하고 싶다고 말씀해 주셨습니다'],
  [/면허 소지자\./g, '면허를 소지하고 계십니다.'],
  [/요청하셨음/g, '요청해 주셨습니다'],
  [/급하신 편\./g, '다소 서두르고 계신 상황이라고 말씀해 주셨습니다.'],
  [/선호\./g, '선호해 주셨습니다.'],
  [/하심\./g, '하셨습니다.'],
  [/보심\./g, '보아 주셨습니다.'],
  [/함\./g, '하셨습니다.'],
];

const toPoliteTone = (text) =>
  POLITE_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);

// POST /api/exhibitor/booths/{boothId}/leads — Body { qrToken }
export const scanLeadQr = async (boothId, qrToken) => {
  await delay(400);

  const existing = leads.find((l) => l.boothId === boothId && l.qrToken === qrToken);
  if (existing) return existing;

  if (!qrToken || qrToken.trim().length < 4) {
    const err = new Error('유효하지 않은 QR입니다.');
    err.response = { data: { error: { message: '유효하지 않은 QR입니다 (Mock: 4자 이상 입력)' } } };
    throw err;
  }

  const lead = {
    leadId: nextId++,
    boothId,
    qrToken,
    customerName: `방문객${qrToken.slice(-2)}`,
    customerEmail: `visitor${qrToken.slice(-4)}@example.com`,
    interestNote: '',
    emailSummary: null,
    status: 'SCANNED',
    createdAt: new Date().toISOString(),
  };
  leads = [lead, ...leads];
  return lead;
};

// GET /api/exhibitor/booths/{boothId}/leads
export const getLeads = async (boothId) => {
  await delay(200);
  return leads.filter((l) => l.boothId === boothId);
};

// POST /api/exhibitor/leads/{leadId}/summary — Body { consultationNote }
export const summarizeLeadEmail = async (leadId, consultationNote) => {
  await delay(900);

  const lead = leads.find((l) => l.leadId === leadId);
  if (!lead) throw new Error('리드를 찾을 수 없습니다.');

  // fail-open Mock: 항상 성공 응답이지만 실제 구현은 Gemini 실패 시 원문 그대로 반환.
  // 실제 Gemini는 문단을 의미 단위(관심 모델/구매 조건/향후 일정 등)로 재분류하지만,
  // Mock은 그 카테고리 분류 자체가 AI 몫이라 흉내내지 않고 문단 단위 불릿으로만 정리한다.
  const paragraphs = consultationNote
    .split(/\n\s*\n/)
    .map((p) => toPoliteTone(p.trim()))
    .filter(Boolean);
  const bulletList = paragraphs.map((p) => `* ${p}`).join('\n');

  const summary = `제목: 방문 상담 내용 정리 및 안내

안녕하세요, ${lead.customerName} 고객님!
오늘 저희 부스에 방문해 주셔서 진심으로 감사합니다.
상담 나누었던 내용과 요청하신 사항들을 아래와 같이 정리해 드립니다.

📋 주요 상담 및 관심 사항 요약

${bulletList}

📌 향후 안내 사항
요청해 주신 내용은 확인 후 빠르게 안내드리겠습니다. 추가로 궁금하신 점이나 변경 사항이 있으시면 언제든지 편하게 연락 주시기 바랍니다.

다시 한번 저희 부스를 찾아주셔서 감사드립니다.
감사합니다.`;

  lead.interestNote = consultationNote;
  lead.emailSummary = summary;
  lead.status = 'DRAFTED';
  return lead;
};

// POST /api/exhibitor/leads/{leadId}/send-info — Body { emailBody }
export const sendLeadInfo = async (leadId, emailBody) => {
  await delay(500);

  const lead = leads.find((l) => l.leadId === leadId);
  if (!lead) throw new Error('리드를 찾을 수 없습니다.');

  lead.emailSummary = emailBody;
  lead.status = 'SENT';
  return lead;
};
