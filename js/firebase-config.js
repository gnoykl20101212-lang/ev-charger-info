// Firebase 공유 저장소 설정
// ------------------------------------------------------------------
// Q&A 글을 모든 사람이 공유하려면 아래 값을 Firebase 콘솔에서 받아 채워 주세요.
// (Firebase 콘솔 → 프로젝트 설정 → 내 앱 → 웹 앱 → SDK 설정 및 구성)
//
// 이 값들은 비밀이 아니며 웹에 공개되어도 됩니다. 접근 제어는 Firestore 보안 규칙으로 합니다.
// 값이 비어 있으면 Q&A는 자동으로 '이 기기에만 저장(localStorage)' 모드로 동작합니다.
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
