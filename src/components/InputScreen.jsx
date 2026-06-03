import { useState } from 'react';

const HOURS = [
  { value: 'unknown', label: '모름' },
  { value: '자시', label: '자시 (23:00 – 01:00)' },
  { value: '축시', label: '축시 (01:00 – 03:00)' },
  { value: '인시', label: '인시 (03:00 – 05:00)' },
  { value: '묘시', label: '묘시 (05:00 – 07:00)' },
  { value: '진시', label: '진시 (07:00 – 09:00)' },
  { value: '사시', label: '사시 (09:00 – 11:00)' },
  { value: '오시', label: '오시 (11:00 – 13:00)' },
  { value: '미시', label: '미시 (13:00 – 15:00)' },
  { value: '신시', label: '신시 (15:00 – 17:00)' },
  { value: '유시', label: '유시 (17:00 – 19:00)' },
  { value: '술시', label: '술시 (19:00 – 21:00)' },
  { value: '해시', label: '해시 (21:00 – 23:00)' },
];

export default function InputScreen({ onSubmit, error }) {
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
        <h1 className="title">전생 탐험</h1>
        <p className="subtitle">당신의 영혼이 걸어온 길</p>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="field-group">
          <label className="field-label">이름</label>
          <input
            className="text-input"
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">달력 구분</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn${dateType === 'solar' ? ' active' : ''}`}
              onClick={() => setDateType('solar')}
            >양력</button>
            <button
              type="button"
              className={`toggle-btn${dateType === 'lunar' ? ' active' : ''}`}
              onClick={() => setDateType('lunar')}
            >음력</button>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">생년월일</label>
          <div className="date-row">
            <input
              className="text-input date-input"
              type="number"
              placeholder="년"
              min="1900" max="2025"
              value={year}
              onChange={e => setYear(e.target.value)}
              required
            />
            <input
              className="text-input date-input"
              type="number"
              placeholder="월"
              min="1" max="12"
              value={month}
              onChange={e => setMonth(e.target.value)}
              required
            />
            <input
              className="text-input date-input"
              type="number"
              placeholder="일"
              min="1" max="31"
              value={day}
              onChange={e => setDay(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">태어난 시</label>
          <select
            className="select-input"
            value={hour}
            onChange={e => setHour(e.target.value)}
          >
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <p className="hint-text">⏰ 시간을 입력하면 더 정확합니다</p>
        </div>

        {error && <p className="error-text">⚠ {error}</p>}

        <button type="submit" className="submit-btn">
          ✦ 전생 탐험 시작
        </button>

        <p className="disclaimer">재미로 보는 전생 이야기입니다</p>
      </form>
    </div>
  );
}
