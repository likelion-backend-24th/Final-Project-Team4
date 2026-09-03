#!/usr/bin/env bash
# 데모용 시드 스크립트 - OPEN 박람회 1개 + 부스 10개 생성.
#
# 선행: gateway(8080) / identity(8081) / expo(8082) 기동, MySQL·Redis 기동.
# 사용: bash scripts/seed-demo.sh
#
# 환경변수(선택):
#   BASE_URL         기본 http://localhost:8080
#   ADMIN_EMAIL      기본 admin@admin.com   (identity 시드 계정)
#   ADMIN_PASSWORD   기본 admin
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@admin.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

command -v curl >/dev/null || { echo "필요: curl"; exit 1; }
command -v date >/dev/null || { echo "필요: date"; exit 1; }

iso() { date -d "$1" "+%Y-%m-%dT%H:%M:%S"; }

echo "▶ 관리자 로그인 ($ADMIN_EMAIL)"
ADMIN_TOKEN=$(curl -sf -X POST "$BASE/api/auth/signin" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$ADMIN_TOKEN" ] || { echo "  ✗ 로그인 실패"; exit 1; }
echo "  ✓ 토큰 획득"

# 날짜 규칙: applyStartsAt < applyEndsAt <= startsAt < endsAt
APPLY_START=$(iso "-5 days")
APPLY_END=$(iso "+10 days")
STARTS=$(iso "+30 days")
ENDS=$(iso "+33 days")

# 부스 10개: A-101~A-105 조립 300만, A-106~A-110 독립 500만
BOOTHS=""
for i in $(seq 1 10); do
  no=$((100 + i))
  if [ "$i" -le 5 ]; then
    BOOTHS="${BOOTHS}{\"boothNo\":\"A-${no}\",\"type\":\"조립 부스 (3m x 3m)\",\"fee\":3000000},"
  else
    BOOTHS="${BOOTHS}{\"boothNo\":\"A-${no}\",\"type\":\"독립 부스 (6m x 3m)\",\"fee\":5000000},"
  fi
done
BOOTHS="[${BOOTHS%,}]"

REG_FILE=$(mktemp)
trap 'rm -f "$REG_FILE"' EXIT
printf '%s' "{\"title\":\"2026 서울 모빌리티 엑스포\",\"venue\":\"COEX Hall A\",\"startsAt\":\"$STARTS\",\"endsAt\":\"$ENDS\",\"applyStartsAt\":\"$APPLY_START\",\"applyEndsAt\":\"$APPLY_END\",\"booths\":$BOOTHS}" > "$REG_FILE"

echo "▶ 박람회 등록 (부스 10개)"
REG_RES=$(curl -s -X POST "$BASE/api/admin/expos" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json; charset=UTF-8' \
  --data-binary @"$REG_FILE")
EXPO_ID=$(echo "$REG_RES" | grep -o '"expoId":[0-9]*' | grep -o '[0-9]*' || true)
[ -n "$EXPO_ID" ] || { echo "  ✗ 등록 실패. 응답: $REG_RES"; exit 1; }
echo "  ✓ expoId=$EXPO_ID (DRAFT)"

echo "▶ 박람회 공개"
curl -sf -X POST "$BASE/api/admin/expos/$EXPO_ID/open" \
  -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
echo "  ✓ OPEN"

cat <<EOF

─────────────────────────────────
데모 데이터 준비 완료
  박람회   : expoId=$EXPO_ID  "2026 서울 모빌리티 엑스포" (OPEN)
  부스     : A-101 ~ A-110 (조립 300만 / 독립 500만)
  관리자   : $ADMIN_EMAIL / $ADMIN_PASSWORD
─────────────────────────────────
EOF
