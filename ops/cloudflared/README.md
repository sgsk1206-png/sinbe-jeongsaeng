# remote.imyeppi.com 자동 시작 런북

Windows 재부팅 후 `remote.imyeppi.com`이 죽는 문제의 **근본 원인과 영구 해결책**.

> 이 파일들은 **사용자 PC(Windows/WSL)에서 직접 실행**해야 합니다.
> Claude의 클라우드 세션에서는 사용자 로컬 머신에 접근할 수 없습니다.

## 왜 `@reboot` crontab이 안 먹었나 (근본 원인)

1. **Windows 재부팅 후 WSL 배포판은 자동으로 켜지지 않는다.** WSL 터미널을 열거나
   `wsl.exe`가 호출돼야 VM이 부팅된다. → cron 데몬 자체가 시작 안 됨 → `@reboot` 영원히 발화 안 함.
2. **기본 Ubuntu-on-WSL은 systemd가 꺼져 있어 cron 데몬을 자동 시작하지 않는다.**

→ **WSL 내부(crontab)만으로는 해결 불가. Windows 쪽 트리거가 반드시 필요하다.**

## 즉시 복구 (지금 터널 살리기)

WSL 터미널에서:
```bash
bash ops/cloudflared/diagnose.sh          # 현재 상태 확인
pgrep cloudflared || nohup bash -lc '~/start_cloudflared.sh' >/tmp/cf.log 2>&1 &
curl -sS -o /dev/null -w '%{http_code}\n' https://remote.imyeppi.com/app/
```

## 영구 해결 — 권장: 2계층 (가장 견고)

- **계층 1 (Windows):** 작업 스케줄러가 부팅/로그온 시 WSL을 깨운다.
- **계층 2 (WSL):** systemd가 cloudflared를 자동 시작/재시작한다.

### 계층 1 — Windows 작업 스케줄러 등록
1. `start-cloudflared.ps1` 상단의 `$Distro`, `$WslUser`, `$StartShIn` 3개 값을 본인 환경에 맞게 수정.
   - 배포판 이름: `wsl -l -q`
   - WSL 사용자명: WSL에서 `whoami`
2. **관리자 PowerShell**에서:
   ```powershell
   cd <repo>\ops\cloudflared
   powershell -ExecutionPolicy Bypass -File .\Register-Task.ps1
   ```
   → 로그온 시 + **1시간마다** 터널 상태를 점검해 죽어 있으면 자동 복구(idempotent).
3. 즉시 테스트: `Start-ScheduledTask -TaskName 'Cloudflared-Tunnel-Autostart'`

### 계층 2 (선택, 더 견고) — WSL systemd 서비스
```bash
bash ops/cloudflared/setup-systemd-service.sh ~/start_cloudflared.sh
# /etc/wsl.conf 에 systemd=true 가 새로 추가됐다면 Windows에서:
#   wsl --shutdown      (그 후 WSL 다시 열기)
systemctl status cloudflared-tunnel.service
```

## 가장 간단한 대안 (systemd 없이)
계층 1만 등록해도 충분히 동작한다. `Register-Task.ps1`의 1시간 반복 트리거가
재부팅·크래시 모두 커버한다. systemd는 "WSL이 켜져 있는 동안의 자동 재시작"을 추가로 보장.

## 검증
```powershell
# Windows
Get-ScheduledTask -TaskName 'Cloudflared-Tunnel-Autostart'
```
```bash
# WSL
pgrep -a cloudflared
curl -sS -o /dev/null -w 'public=%{http_code}\n' https://remote.imyeppi.com/app/
```
기대값: `public=200` (또는 앱의 정상 리다이렉트 코드).
