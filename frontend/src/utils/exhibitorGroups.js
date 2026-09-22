// 부스 단위 응답(getCustomerExpoVehicles 등)을 참가업체 단위로 합치는 공용 유틸.
// 같은 회사가 이 박람회에 부스를 여러 개 가지고 있으면(같은 신청 건이든 신청을 여러 번 나눠 넣었든)
// 화면 어디서든 하나의 참가업체로 취급해야 한다(참가업체 목록/차량 전시/후기/상담 신청 전부 동일 기준).
// applicationGroupId(같은 신청 건)로만 묶으면 같은 회사가 신청을 따로 넣은 부스는 못 묶어서 companyName을 우선 키로 쓴다.
export const boothNoValue = (boothNo) => parseInt(String(boothNo).replace(/\D/g, ''), 10) || 0;

export function mergeExhibitorGroups(groups) {
  const byKey = new Map();
  groups.forEach((g) => {
    // companyName이 없으면(예외 케이스) 신청 건 단위, 그마저 없으면 부스 하나짜리 그룹으로 독립 처리.
    const key = g.companyName ?? g.applicationGroupId ?? `booth-${g.boothId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        title: g.companyName ?? g.title,
        bannerImageUrl: g.bannerImageUrl,
        boothIds: [],
        boothNos: [],
        vehicles: [],
      });
    }
    const merged = byKey.get(key);
    merged.boothIds.push(g.boothId);
    merged.boothNos.push(g.boothNo);
    merged.vehicles.push(...(g.vehicles ?? []));
  });

  return Array.from(byKey.values()).map((e) => {
    const order = e.boothNos.map((_, i) => i).sort((a, b) => boothNoValue(e.boothNos[a]) - boothNoValue(e.boothNos[b]));
    const boothIds = order.map((i) => e.boothIds[i]);
    const boothNos = order.map((i) => e.boothNos[i]);
    return {
      ...e,
      boothId: boothIds[0], // 대표 부스(라우팅용)
      boothIds,
      boothNos,
    };
  });
}

// "A-101" 또는 여러 개면 "A-101 ~ A-103"
export const boothNoLabel = (boothNos) =>
  boothNos.length > 1 ? `${boothNos[0]} ~ ${boothNos[boothNos.length - 1]}` : boothNos[0];
