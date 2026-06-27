#!/usr/bin/env bash
# (선택, 더 견고함) WSL 안에서 cloudflared를 systemd 서비스로 등록.
# 한 번 등록하면 WSL이 부팅될 때마다 systemd가 cloudflared를 자동 시작/재시작한다.
# 전제: WSL에서 systemd가 켜져 있어야 함 (아래 1단계).
set -euo pipefail

echo "[1/3] /etc/wsl.conf 에 systemd 활성화 (sudo 필요)"
if ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
  sudo tee -a /etc/wsl.conf >/dev/null <<'EOF'

[boot]
systemd=true
EOF
  echo "  -> 추가됨. 적용하려면 Windows에서 'wsl --shutdown' 후 WSL 재시작 필요."
else
  echo "  -> 이미 활성화됨."
fi

echo "[2/3] cloudflared systemd 유닛 작성"
# 시작 스크립트 경로를 본인 환경에 맞게 수정하세요.
START_CMD="${1:-$HOME/start_cloudflared.sh}"
sudo tee /etc/systemd/system/cloudflared-tunnel.service >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel (remote.imyeppi.com)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/env bash -lc '$START_CMD'
Restart=always
RestartSec=5
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF

echo "[3/3] 서비스 활성화"
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-tunnel.service || \
  echo "  (systemd 미적용 상태면 'wsl --shutdown' 후 재시도)"
echo "상태 확인: systemctl status cloudflared-tunnel.service"
