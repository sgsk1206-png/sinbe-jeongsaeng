# 전생탐험 (sinbe-jeongsaeng) — CLAUDE.md

## 프로젝트 개요
- 배포 URL: https://sinbe-jeongsaeng.vercel.app
- 기술 스택: React + Vite, Vercel Serverless Functions, OpenRouter API
- 로컬 경로: /mnt/c/Users/user/usersangk/Projects/sinbe/sinbe-jeongsaeng

## 핵심 규칙
- 모든 코드 수정 후 반드시 커밋 & 푸시
- 파일 수정 전 반드시 전체 파일 읽기
- 한 번에 하나씩 수정 후 결과 확인
- 터미널 명령어는 사용자가 직접 실행

## 캐릭터 이미지/영상 시스템
- 경로: public/images/characters/
- A스타일: _1 (teal/pink, Midjourney v7)
- B스타일: _2 (gold/amber, Midjourney v7 + Kling 3.0)
- C스타일: _3 (수묵화, Midjourney v7 + Kling 3.0)
- mp4 있으면 영상 재생, 없으면 이미지 fallback
- 매 조회마다 스타일 랜덤 선택 (localStorage 캐시 저장 안 함)

## 12개 캐릭터 그