# CPO 정보방 (ev-charger-info)

전기차충전기 **CPO** 사업을 위한 한글 용어집과 충전기 현황 검색 정보방입니다. 브라우저에서 쓰고, 홈 화면에 설치하면 앱처럼 열립니다.

## 구성

- `용어집` — CPO, eMSP, OCPP, 계약전력, 로밍, 가동률 등
- `충전기 현황` — 지역·사업자·속도·상태 검색 (학습용 샘플)
- `출처` — 무공해차 누리집, 공공데이터, 한전, 표준 문서

충전소 실시간 상태는 샘플입니다. 공식 숫자는 출처 페이지의 기관 데이터를 따르세요.

## 실행

Windows에서 프로젝트 폴더의 `serve.ps1`을 실행한 뒤 브라우저에서 <http://localhost:8080> 을 엽니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

설치(PWA)는 localhost 또는 HTTPS에서만 제안됩니다.
