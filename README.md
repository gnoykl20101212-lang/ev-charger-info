# CPO 정보방 (ev-charger-info)

전기차충전기 **CPO** 사업을 위한 한글 용어집과 충전기 현황 검색 정보방입니다. 브라우저에서 쓰고, 홈 화면에 설치하면 앱처럼 열립니다.

## 구성

- `용어집` — 전기차&충전기 관련 용어 v0.4 엑셀 기준
- `충전기 현황` — 충전기 아파트 정보 v0.1 (단지명·시도·CPO 검색)
- `출처` — 무공해차 누리집, 공공데이터, 한전, 표준 문서

단지 목록은 엑셀 기준 검색용입니다. 실시간 가능 여부는 출처 페이지의 기관 데이터를 따르세요.

## 실행

Windows에서 프로젝트 폴더의 `serve.ps1`을 실행한 뒤 브라우저에서 <http://localhost:8080> 을 엽니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

설치(PWA)는 localhost 또는 HTTPS에서만 제안됩니다.
