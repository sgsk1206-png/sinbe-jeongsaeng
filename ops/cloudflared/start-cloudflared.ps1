# start-cloudflared.ps1
# Windows 부팅/로그온 시 WSL을 깨우고 cloudflared 터널을 (없으면) 시작한다.
# 작업 스케줄러가 이 스크립트를 호출한다.  PowerShell(관리자)에서 단독 테스트도 가능.
#
# 아래 3개 값을 본인 환경에 맞게 수정하세요:
$Distro    = "Ubuntu"                      # `wsl -l -q` 로 정확한 배포판 이름 확인
$WslUser   = "user"                        # WSL 사용자명 (whoami)
$StartShIn = "~/start_cloudflared.sh"      # WSL 안에서의 시작 스크립트 경로

# pgrep로 이미 떠 있으면 건너뛰고, 없으면 nohup 백그라운드로 시작.
$cmd = "pgrep -x cloudflared >/dev/null 2>&1 || (nohup bash -lc '$StartShIn' >/tmp/cloudflared-boot.log 2>&1 &); sleep 2; pgrep -a cloudflared"

wsl.exe -d $Distro -u $WslUser -- bash -lc "$cmd"
