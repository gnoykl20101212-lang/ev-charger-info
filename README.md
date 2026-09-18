# CPO 정보방 (ev-charger-info)

전기차충전기 **CPO** 사업을 위한 한글 용어집과 충전기 현황 검색 정보방입니다. 브라우저에서 쓰고, 홈 화면에 설치하면 앱처럼 열립니다.

## 구성

- `용어집` — 전기차&충전기 관련 용어 v0.4 엑셀 기준
- `충전기 정보` — 완속충전기 제품 검색·충전 요금 비교 (무공해차 통합누리집 ev.or.kr 연결)
- `충전기 자료실` — 기준정보 검색(기준자료 워드파일 기반) + 법령/지침규정/가이드라인 링크
- `충전기 현황` — 충전기 아파트 정보 v0.1 (단지명·시도·CPO 검색)
- `Q&A` — 영업 직원이 궁금한 용어·현황 변경 요청을 남기는 공간. 담당자가 확인 후 완료 표시
- `출처` — 무공해차 누리집, 공공데이터, 한전, 표준 문서

단지 목록은 엑셀 기준 검색용입니다. 실시간 가능 여부는 출처 페이지의 기관 데이터를 따르세요.

## 웹

정보방 화면: <https://gnoykl20101212-lang.github.io/ev-charger-info/>

## 실행

Windows에서 프로젝트 폴더의 `serve.ps1`을 실행한 뒤 브라우저에서 <http://127.0.0.1:8080> 을 엽니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

설치(PWA)는 localhost 또는 HTTPS에서만 제안됩니다.

## Q&A 공유 설정 (Firebase)

Q&A 글을 모든 사람이 공유하려면 무료 Firebase(Firestore)를 연결합니다. 설정이 비어 있으면 자동으로 "이 기기에만 저장(localStorage)" 모드로 동작합니다.

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만들고 **Firestore Database**를 사용 설정합니다.
2. 프로젝트 설정 → 내 앱 → 웹 앱을 추가하고 SDK 설정값을 복사해 `js/firebase-config.js`의 `window.FIREBASE_CONFIG`에 채웁니다. (이 값은 비밀이 아니며 공개되어도 됩니다.)
3. Firestore 보안 규칙을 아래처럼 설정합니다. 누구나 작성/조회/완료 처리는 가능하되 삭제는 막습니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /qa/{doc} {
      allow read, create, update: if true;
      allow delete: if false;
    }
  }
}
```

접근 제어는 위 보안 규칙으로 하며, 글은 `qa` 컬렉션에 저장됩니다.
