import { calculateSaju, lunarToSolar, getPillarByHangul } from '@fullstackfamily/manseryeok';

// 시 이름(지지) → calculateSaju 용 대표 시각 (정각 기준)
const HOUR_MAP = {
  '자시': 0,  '축시': 2,  '인시': 4,  '묘시': 6,
  '진시': 8,  '사시': 10, '오시': 12, '미시': 14,
  '신시': 16, '유시': 18, '술시': 20, '해시': 22,
};

// 백호살 해당 일주 id 집합
// 갑진(40) 을미(31) 병술(22) 정축(13) 무진(4) 임술(58) 계축(49)
const BAEKHO_DAY_IDS = new Set([4, 13, 22, 31, 40, 49, 58]);

// 귀문관살 지지 쌍 (양방향): 子酉 丑午 寅未 卯申 辰亥 巳戌
const GWIMUN_PAIRS = new Set([
  '0-9','9-0','1-6','6-1','2-7','7-2',
  '3-8','8-3','4-11','11-4','5-10','10-5',
]);

/**
 * 생년월일시로 사주팔자·오행·신살을 계산해 반환
 * @param {number|string} year
 * @param {number|string} month
 * @param {number|string} day
 * @param {string} hour  '자시'~'해시' 또는 'unknown'
 * @param {boolean} isLunar  true=음력, false=양력
 */
export function calculateManseryeok(year, month, day, hour, isLunar) {
  let sy = +year, sm = +month, sd = +day;

  // 음력 → 양력 변환
  if (isLunar) {
    try {
      const r = lunarToSolar(sy, sm, sd, false);
      sy = r.solar.year;
      sm = r.solar.month;
      sd = r.solar.day;
    } catch {
      // 변환 실패 시 양력으로 간주
    }
  }

  const hourNum = HOUR_MAP[hour] ?? null;

  // 사주팔자 계산 (시주 모를 때 정오 기준)
  const saju = calculateSaju(sy, sm, sd, hourNum ?? 12);
  const hasHour = hourNum !== null;

  const pillarNames = hasHour
    ? [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar]
    : [saju.yearPillar, saju.monthPillar, saju.dayPillar];

  // 오행 비율 계산 (천간+지지 각 1점)
  const ohaengCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const name of pillarNames) {
    const p = getPillarByHangul(name);
    if (p) {
      ohaengCount[p.tiangan.element]++;
      ohaengCount[p.dizhi.element]++;
    }
  }
  const total = Object.values(ohaengCount).reduce((a, b) => a + b, 0) || 1;
  const ohaeng = Object.fromEntries(
    Object.entries(ohaengCount).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );

  // 가장 강한 오행
  const dominant = Object.entries(ohaeng).sort((a, b) => b[1] - a[1])[0][0];

  // 각 기둥 데이터
  const yearPD  = getPillarByHangul(saju.yearPillar);
  const monthPD = getPillarByHangul(saju.monthPillar);
  const dayPD   = getPillarByHangul(saju.dayPillar);
  const hourPD  = hasHour ? getPillarByHangul(saju.hourPillar) : null;

  const yearDizhi       = yearPD?.dizhi.id   ?? 0;
  const monthDizhi      = monthPD?.dizhi.id  ?? 0;
  const dayDizhi        = dayPD?.dizhi.id    ?? 0;
  const hourDizhi       = hourPD?.dizhi.id   ?? null;
  const yearDizhiHangul = yearPD?.dizhi.hangul ?? '';

  // 년지 제외 나머지 지지 id 목록
  const otherDizhis = [monthDizhi, dayDizhi, ...(hourDizhi !== null ? [hourDizhi] : [])];

  const sinsal = [];

  // ─ 역마살: 년지 삼합 기준 역마지지가 나머지 기둥에 있으면 ─
  const YEOKMA = { 신:2,자:2,진:2, 인:8,오:8,술:8, 사:11,유:11,축:11, 해:5,묘:5,미:5 };
  if (YEOKMA[yearDizhiHangul] !== undefined && otherDizhis.includes(YEOKMA[yearDizhiHangul]))
    sinsal.push('역마살');

  // ─ 도화살: 년지 사왕 기준 도화지지가 나머지 기둥에 있으면 ─
  const DOHUA = { 인:3,오:3,술:3, 신:9,자:9,진:9, 사:6,유:6,축:6, 해:0,묘:0,미:0 };
  if (DOHUA[yearDizhiHangul] !== undefined && otherDizhis.includes(DOHUA[yearDizhiHangul]))
    sinsal.push('도화살');

  // ─ 백호살: 일주가 특정 간지인 경우 ─
  if (dayPD && BAEKHO_DAY_IDS.has(dayPD.id)) sinsal.push('백호살');

  // ─ 화개살: 년지 삼합 끝지지(墓) 기준 ─
  const HWAGAE = { 인:10,오:10,술:10, 사:1,유:1,축:1, 신:4,자:4,진:4, 해:7,묘:7,미:7 };
  if (HWAGAE[yearDizhiHangul] !== undefined && otherDizhis.includes(HWAGAE[yearDizhiHangul]))
    sinsal.push('화개살');

  // ─ 공망: 일주 id 기준, 년지·월지가 공망지지에 해당하면 ─
  if (dayPD) {
    const GONGMANG = { 0:[10,11], 10:[8,9], 20:[6,7], 30:[4,5], 40:[2,3], 50:[0,1] };
    const 순Start = Math.floor(dayPD.id / 10) * 10;
    const gmDizhis = GONGMANG[순Start] || [];
    if (gmDizhis.some(gd => [yearDizhi, monthDizhi].includes(gd))) sinsal.push('공망');
  }

  // ─ 귀문관살: 사주 내 두 지지가 귀문 쌍을 이루면 ─
  const allDizhis = [yearDizhi, monthDizhi, dayDizhi, ...(hourDizhi !== null ? [hourDizhi] : [])];
  outerGwimun: for (let i = 0; i < allDizhis.length; i++) {
    for (let j = i + 1; j < allDizhis.length; j++) {
      if (GWIMUN_PAIRS.has(`${allDizhis[i]}-${allDizhis[j]}`) ||
          GWIMUN_PAIRS.has(`${allDizhis[j]}-${allDizhis[i]}`)) {
        sinsal.push('귀문관살');
        break outerGwimun;
      }
    }
  }

  // ─ 원진살: 년지의 원진 지지가 나머지 기둥에 있으면 ─
  const WONJIN = [7,6,9,8,11,10,1,0,3,2,5,4];
  if (otherDizhis.includes(WONJIN[yearDizhi])) sinsal.push('원진살');

  // ─ 양인살: 일간(양 오행 천간) 기준 ─
  const YANGIN = { 갑:3, 병:6, 무:6, 경:9, 임:0 };
  const dayTiangan = dayPD?.tiangan.hangul ?? '';
  if (YANGIN[dayTiangan] !== undefined && otherDizhis.includes(YANGIN[dayTiangan]))
    sinsal.push('양인살');

  return {
    saju: {
      year:  saju.yearPillar,
      month: saju.monthPillar,
      day:   saju.dayPillar,
      hour:  hasHour ? saju.hourPillar : '모름',
    },
    ohaeng,
    dominant,
    sinsal,
    yukchinGapja: `${saju.yearPillar}년생`,
  };
}

// 오행별 전생 그룹 매핑 (SYSTEM_PROMPT 오행 섹션과 일치)
// 목: 구미호(fantasy)/선비(scholar)
// 화: 무속인(shaman)/용사(warrior)
// 토: 선비(scholar)/귀부인(noble)  ← 토=monk 오류 수정
// 금: 무인(warrior)/암행어사(scholar)  ← 금=royal 오류 수정
// 수: 이무기(fantasy)/기생(entertainer)
export function ohaengToGroup(dominant) {
  const map = {
    목: ['fantasy', 'scholar'],
    화: ['shaman', 'warrior'],
    토: ['scholar', 'noble'],
    금: ['warrior', 'scholar'],
    수: ['fantasy', 'entertainer'],
  };
  return map[dominant] || ['commoner'];
}

// 신살별 전생 특성 매핑
export function sinsalToTrait(sinsal) {
  const map = {
    역마살:   '평생 한 곳에 정착하지 못하고 떠돌았다',
    도화살:   '타인을 매혹하는 기운을 타고났다',
    백호살:   '극적이고 강렬한 최후를 맞이했다',
    화개살:   '종교나 예술에 깊이 빠져 살았다',
    공망:     '이루려 했던 것이 번번이 허사로 돌아갔다',
    귀문관살: '기이한 영적 감각을 지니고 살았다',
    원진살:   '인연 맺은 이들과 끝내 엇갈렸다',
    양인살:   '날카롭고 과감한 기질로 한 시대를 풍미했다',
  };
  return sinsal.map(s => map[s]).filter(Boolean);
}
