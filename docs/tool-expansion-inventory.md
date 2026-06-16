# SolForge Tool Expansion Inventory

조사 기준일: 2026-06-12

참고 사이트:

- https://wepplication.github.io/tools/
- https://toolify.kr/

이 문서는 참고 사이트의 기능 이름과 사용자 흐름만 조사해 SolForge에서 독립적으로
구현할 작업 범위를 정리한다. 참고 사이트의 소스 코드, 문구, 디자인 자산은 복사하지
않는다.

## 분류 기준

- `기존`: SolForge에 이미 같은 목적의 기능이 있음
- `확장`: 기존 기능에 참고 사이트의 세부 계산을 추가해야 함
- `신규-정적`: HTML, CSS, JavaScript와 브라우저 API만으로 구현 가능
- `신규-장치`: 카메라, 마이크 등 사용자 권한이 필요한 브라우저 기능
- `외부연동`: 외부 데이터나 다른 서버의 응답이 없으면 정확히 구현할 수 없음

## 중복 제거 후 작업 목록

### 날짜·생활 계산

| 기능군 | 출처 | 판정 | SolForge 작업 |
| --- | --- | --- | --- |
| 날짜 차이·D-Day·날짜 더하기 | Toolify | 기존 | 현재 통합 계산기 유지 |
| 평일 수·날짜 목록·요일 개수 | Toolify | 확장 | 날짜 계산기에 추가 |
| 나이·다음 생일·살아온 일수 | Toolify | 확장 | 나이 계산기에 추가 |
| 시간 차이·시간 더하기·근무시간 | Toolify | 신규-정적 | 확장 도구 페이지 |
| 단위 변환 | Toolify | 신규-정적 | 길이·무게·온도·면적·속도 |
| 근·관·돈 변환 | Toolify | 신규-정적 | 기준 중량 프리셋 지원 |
| BMI·WHR | Toolify | 신규-정적 | 참고용 건강 계산기 |
| 로또 번호 생성 | Wepplication | 신규-정적 | 난수 생성기 |
| 숫자야구 | Toolify | 신규-정적 | 후속 미니게임 페이지 |

### 텍스트·문서

| 기능군 | 출처 | 판정 | SolForge 작업 |
| --- | --- | --- | --- |
| 글자수·단어·줄·UTF-8 바이트 | 양쪽 | 신규-정적 | 실시간 통계 |
| 한영타 변환 | 양쪽 | 신규-정적 | 영문 자판 ↔ 한글 |
| 텍스트 정리 | Toolify | 신규-정적 | 공백·빈 줄·개행 정리 |
| 개인정보 마스킹 | Toolify | 신규-정적 | 전화·이메일·주민·카드 |
| 숫자 포맷 | Toolify | 신규-정적 | 콤마·소수점·음수 표기 |
| 숫자 ↔ 한글 금액 | Toolify | 신규-정적 | 원 단위 변환 |
| SMI → SRT·싱크 조정 | Wepplication | 신규-정적 | 파일/텍스트 변환 |
| 텍스트 비교 | Wepplication | 신규-정적 | 줄 단위 차이 표시 |
| EML 뷰어 | Wepplication | 신규-정적 | 로컬 파일 헤더·본문 파싱 |
| 특수문자·이모지 표 | Wepplication | 신규-정적 | 검색·복사·최근 사용 |
| HTML 문자참조·ASCII 표 | Wepplication | 신규-정적 | 검색 가능한 코드표 |
| 웹 에디터 | Wepplication | 신규-정적 | HTML 편집·미리보기·인쇄 |

### 개발자·데이터

| 기능군 | 출처 | 판정 | SolForge 작업 |
| --- | --- | --- | --- |
| MySQL Query Prettier | SolForge | 기존 | 유지 |
| MySQL EXPLAIN Visual | SolForge | 기존 | 유지 |
| JSON 포맷·압축·검증 | Toolify | 신규-정적 | 확장 도구 페이지 |
| Base64 텍스트·파일 | 양쪽 | 신규-정적 | UTF-8 및 파일 지원 |
| URL 인코딩·디코딩 | 양쪽 | 신규-정적 | URI/컴포넌트 방식 |
| URL 파서·쿼리 편집 | Toolify | 신규-정적 | 구성요소와 파라미터 표 |
| Unix Timestamp | Toolify | 신규-정적 | 초/밀리초, KST/UTC |
| UUID 생성 | Wepplication | 신규-정적 | UUID v4 복수 생성 |
| chmod 계산 | Toolify | 신규-정적 | 숫자·문자 권한 변환 |
| 코드 정렬·압축 | Wepplication | 확장 | JSON/HTML/CSS/JS/SQL |
| 키보드 이벤트 | Wepplication | 신규-정적 | key/code/modifier 표시 |
| 파일 체크섬 | Wepplication | 신규-정적 | SHA-1/256/384/512 |
| Hash·HMAC·PBKDF2·AES | Wepplication | 신규-정적 | Web Crypto 기반 |
| 비밀번호 생성 | Toolify | 신규-정적 | 암호학적 난수 사용 |
| HTML 직접 미리보기 | Wepplication | 신규-정적 | sandbox iframe 사용 |

### 이미지·미디어·장치

| 기능군 | 출처 | 판정 | SolForge 작업 |
| --- | --- | --- | --- |
| 색상 선택·RGB/HSL/HEX | Wepplication | 신규-정적 | 색상 변환·복사 |
| 이미지 Data URL | Wepplication | 신규-정적 | 로컬 파일 변환 |
| 이미지 압축·리사이즈 | Toolify | 신규-정적 | Canvas 기반 |
| QR·바코드 생성 | 양쪽 | 신규-정적 | 오픈소스 생성 라이브러리 검토 |
| GIF 생성·프레임 추출 | Wepplication | 신규-정적 | 로컬 파일 처리 |
| 이미지·텍스트 ASCII 아트 | Wepplication | 신규-정적 | Canvas 샘플링 |
| 매직아이 생성 | Wepplication | 신규-정적 | 깊이맵 기반 생성 |
| 문자 음성 변환 | Wepplication | 신규-장치 | SpeechSynthesis |
| 음성 문자 변환 | Wepplication | 신규-장치 | SpeechRecognition 지원 브라우저 |
| 바코드 스캐너 | Wepplication | 신규-장치 | BarcodeDetector + 카메라 |
| 손전등 | Wepplication | 신규-장치 | 카메라 torch 지원 기기 |

### 외부 데이터가 필요한 기능 (구현 범위 제외)

사용자 요청에 따라 외부 API, 원격 URL, 네트워크 응답이 필요한 아래 기능은 SolForge 구현 범위에서 제외한다.

| 기능군 | 출처 | 판정 | 처리 방침 |
| --- | --- | --- | --- |
| 공인 IP 조회 | Wepplication | 제외 | 외부 IP API 필요 |
| 우편번호 조회 | Wepplication | 제외 | 외부 주소 API 필요 |
| 짧은 URL 원주소 확인 | Wepplication | 제외 | 원격 요청과 리다이렉트 추적 필요 |
| URL 기반 HTML 소스 보기 | Wepplication | 제외 | 원격 URL 요청 필요 |
| RSS·웹 게시글 뷰어 | Wepplication | 제외 | 원격 피드 요청 필요 |

## 1차 구현 순서

1. 메인 페이지를 검색, 대표 도구, 카테고리 중심으로 단순화
2. 전체 도구 디렉터리를 별도 페이지로 이동
3. 텍스트·개발자·생활 정적 도구를 공용 워크벤치에 추가
4. 이미지·파일·브라우저 장치 도구 추가
5. 외부 데이터 연동 기능은 사용자 요청에 따라 제외

## 현재 구현 상태

### 완료

- 메인 페이지 단순화와 별도 전체 도구 디렉터리
- 기존 18개 개발·날짜·나이·양음력·학교 도구 유지
- 글자수, 텍스트 정리, 한영타, 개인정보 마스킹
- 숫자 포맷, 한글 금액, JSON, Base64, URL 인코딩·파싱
- Unix Timestamp, UUID, chmod, 비밀번호
- 단위, 근·관·돈, BMI·WHR, 로또 번호
- 특수문자, ASCII·HTML 코드표, 색상 변환
- 텍스트 비교, SMI→SRT, HTML 미리보기
- 파일 체크섬, 이미지 압축·리사이즈·Data URL
- TTS, STT, EML 뷰어, 키보드 이벤트

현재 전체 도구 디렉터리에 노출되는 항목은 59개다.

### 구현 완료 묶음

- 시간 차이·근무시간과 기존 날짜·나이 계산기의 세부 기능 확장
- 코드 정렬·압축, Hash·HMAC·PBKDF2·AES
- QR·바코드 생성, GIF 생성·프레임 추출, ASCII 아트, 매직아이
- 숫자야구, 바코드 스캐너, 손전등
- Base64 텍스트·로컬 파일 변환

외부 데이터 연동 기능은 구현 범위에서 제외했다.
