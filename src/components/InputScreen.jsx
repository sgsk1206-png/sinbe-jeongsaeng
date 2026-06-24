import { useState } from 'react';

const HOURS = [
  { value: 'unknown', label: '모름',                   labelEn: 'Unknown' },
  { value: '자시',   label: '자시 (23:00 – 01:00)',   labelEn: 'Jasi (자시) (23:00–01:00)' },
  { value: '축시',   label: '축시 (01:00 – 03:00)',   labelEn: 'Chuksi (축시) (01:00–03:00)' },
  { value: '인시',   label: '인시 (03:00 – 05:00)',   labelEn: 'Insi (인시) (03:00–05:00)' },
  { value: '묘시',   label: '묘시 (05:00 – 07:00)',   labelEn: 'Myosi (묘시) (05:00–07:00)' },
  { value: '진시',   label: '진시 (07:00 – 09:00)',   labelEn: 'Jinsi (진시) (07:00–09:00)' },
  { value: '사시',   label: '사시 (09:00 – 11:00)',   labelEn: 'Sasi (사시) (09:00–11:00)' },
  { value: '오시',   label: '오시 (11:00 – 13:00)',   labelEn: 'Osi (오시) (11:00–13:00)' },
  { value: '미시',   label: '미시 (13:00 – 15:00)',   labelEn: 'Misi (미시) (13:00–15:00)' },
  { value: '신시',   label: '신시 (15:00 – 17:00)',   labelEn: 'Sinsi (신시) (15:00–17:00)' },
  { value: '유시',   label: '유시 (17:00 – 19:00)',   labelEn: 'Yusi (유시) (17:00–19:00)' },
  { value: '술시',   label: '술시 (19:00 – 21:00)',   labelEn: 'Sulsi (술시) (19:00–21:00)' },
  { value: '해시',   label: '해시 (21:00 – 23:00)',   labelEn: 'Haesi (해시) (21:00–23:00)' },
];

export default function InputScreen({ onSubmit, error, isEnglish }) {
  const [name, setName] = useState('');
  const [dateType, setDateType] = useState('solar');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('unknown');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !year || !month || !day) return;
    // "01" → 1 등 문자열 앞자리 0 제거 → hash 생성 시 동일 입력 보장
    onSubmit({
      name: name.trim(),
      dateType,
      year:  parseInt(year,  10),
      month: parseInt(month, 10),
      day:   parseInt(day,   10),
      hour,
    });
  };

  return (
    <div className="input-screen">
      <div className="title-area">
        <span className="title-icon">✦</span>
        <h1 className="title">{isEnglish ? 'Past Life Explorer' : '전생 탐험'}</h1>
        <p className="subtitle">{isEnglish ? 'The path your soul\'s walked' : '당신의 영혼이 걸어온 길'}</p>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="field-group">
          <label className="field-label">{isEnglish ? 'Name' : '이름'}</label>
          <input
            className="text-input"
            type="text"
            placeholder={isEnglish ? 'Enter your name' : '이름을 입력하세요'}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">{isEnglish ? 'Calendar Type' : '달력 구분'}</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn${dateType === 'solar' ? ' active' : ''}`}
              onClick={() => setDateType('solar')}
            >{isEnglish ? 'Solar (Gregorian)' : '양력'}</button>
            <button
              type="button"
              className={`toggle-btn${dateType === 'lunar' ? ' active' : ''}`}
              onClick={() => setDateType('lunar')}
            >{isEnglish ? 'Lunar (East Asian)' : '음력'}</button>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">{isEnglish ? 'Date of Birth' : '생년월일'}</label>
          <div className="date-row">
            <input
              className="text-input date-input"
              type="number"
              placeholder={isEnglish ? 'Year' : '년'}
              min="1900" max="2025"
              value={year}
              onChange={e => setYear(e.target.value)}
              required
            />
            <input
              className="text-input date-input"
              type="number"
              placeholder={isEnglish ? 'Month' : '월'}
              min="1" max="12"
              value={month}
              onChange={e => setMonth(e.target.value)}
              required
            />
            <input
              className="text-input date-input"
              type="number"
              placeholder={isEnglish ? 'Day' : '일'}
              min="1" max="31"
              value={day}
              onChange={e => setDay(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">{isEnglish ? 'Birth Time' : '태어난 시'}</label>
          <select
            className="select-input"
            value={hour}
            onChange={e => setHour(e.target.value)}
          >
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>
                {isEnglish ? h.labelEn : h.label}
              </option>
            ))}
          </select>
          <p className="hint-text">⏰ {isEnglish ? 'More accurate if you enter your birth time' : '시간을 입력하면 더 정확합니다'}</p>
          <p className="hint-text hint-text--saju">🌙 {isEnglish ? "Entering your birth time reveals a more precise past-life story reflecting your Saju's Five Elements" : '태어난 시간을 입력하면 사주 오행을 반영한 더 정확한 전생 이야기를 만나볼 수 있어요'}</p>
        </div>

        {error && <p className="error-text">⚠ {error}</p>}

        <button type="submit" className="submit-btn">
          ✦ {isEnglish ? 'Begin My Past Life Journey' : '전생 탐험 시작'}
        </button>

        <p className="disclaimer">{isEnglish ? 'Just for fun — a past-life story' : '재미로 보는 전생 이야기입니다'}</p>
      </form>
    </div>
  );
}
