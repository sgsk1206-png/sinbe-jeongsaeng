#!/usr/bin/env bash
# remote.imyeppi.com 진단 스크립트 — WSL 안에서 직접 실행하세요.
#   bash ops/cloudflared/diagnose.sh
# (사용자님 PC의 WSL에서 실행해야 의미가 있습니다. 클라우드 세션에서는 의미 없음)

set -u
echo "================ 1) WSL / 커널 정보 ================"
uname -a
echo "WSL_DISTRO_NAME=${WSL_DISTRO_NAME:-<unset>}"
echo "WSL_INTEROP=${WSL_INTEROP:-<unset>}"

echo
echo "================ 2) systemd 사용 여부 ================"
if [ -d /run/systemd/system ]; then
  echo "systemd: ENABLED"
else
  echo "systemd: DISABLED (기본값) — @reboot cron 신뢰 불가"
fi

echo
echo "================ 3) cloudflared 프로세스 ================"
if pgrep -a cloudflared >/dev/null 2>&1; then
  echo "RUNNING:"
  pgrep -a cloudflared
else
  echo "NOT RUNNING — 복구 필요"
fi

echo
echo "================ 4) cloudflared 설치/버전 ================"
command -v cloudflared && cloudflared --version 2>/dev/null || echo "cloudflared 미설치 또는 PATH에 없음"

echo
echo "================ 5) 터널 헬스 (로컬에서) ================"
# 터널이 가리키는 로컬 서비스 포트로 바꾸세요 (예: 8080).
LOCAL_URL="${1:-http://localhost:8080/}"
echo "로컬 서비스 확인: $LOCAL_URL"
curl -sS -o /dev/null -w "  local http_code=%{http_code} time=%{time_total}s\n" --max-time 10 "$LOCAL_URL" || echo "  로컬 서비스 응답 없음"

echo
echo "공개 URL 확인:"
curl -sS -o /dev/null -w "  public http_code=%{http_code} time=%{time_total}s\n" --max-time 20 https://remote.imyeppi.com/app/ \
  || echo "  공개 URL 응답 없음 (터널 다운 가능성)"
