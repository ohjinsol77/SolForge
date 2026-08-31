(function () {
  "use strict";

  const getUrlTool = document.documentElement.lang === "en"
    ? ["developer", "GET", "GET URL Analyzer", "Separates query keys and values and classifies duplicates, arrays, flags, and empty values.", "get url query parameter key value duplicate array parser", "utility-toolbox#url-parser"]
    : ["developer", "GET", "GET URL 분석기", "쿼리 키·값을 분리하고 중복, 배열, 플래그와 빈 값을 분류합니다.", "get url query parameter key value 파라미터 키 값 중복 배열 파서", "utility-toolbox#url-parser"];
  const exchangeRateTool = document.documentElement.lang === "en"
    ? ["finance", "FX", "Currency Converter", "Convert an amount across major currencies using the latest available reference rates.", "currency converter exchange rate fx won dollar yen euro", "exchange-rates"]
    : ["finance", "FX", "환율 계산기", "최근 기준환율로 금액을 주요 국가 통화로 한 번에 환산합니다.", "환율 계산기 환전 원 달러 엔 유로 위안 외화", "exchange-rates"];
  const tempDbTool = document.documentElement.lang === "en"
    ? ["developer", "DB", "Database Test Data Generator", "Detect columns from database schemas and generate configurable SQL, JSON, CSV, MongoDB, or Redis test data.", "tempdb temp db temporary data dummy data dummydata fake data test data testdata mock data mockdata database schema mysql postgresql postgres mongodb mongo oracle mssql redis sql json csv", "../tempdb"]
    : ["developer", "DB", "DB 임시·더미 데이터 생성기", "DB 생성문에서 컬럼을 인식하고 규칙에 맞는 SQL, JSON, CSV, MongoDB, Redis 테스트 데이터를 만듭니다.", "tempdb temp db 임시데이터 임시 데이터 더미데이터 더미 데이터 가짜데이터 가짜 데이터 테스트데이터 테스트 데이터 목데이터 목 데이터 mock data mockdata dummy data dummydata test data testdata 스키마 테이블 생성문 mysql postgresql postgres mongodb mongo oracle mssql redis sql json csv", "../tempdb"];
  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const categoryOrder = [
    "developer", "text", "media", "vehicle", "pip", "boss", "gameplay", "game-calculator",
    "device", "display", "input", "performance", "finance", "life", "age",
    "date", "lunar", "calendar"
  ];
  const categoryCopy = {
    ko: {
      developer: ["DEV", "개발자 도구", "SQL, JSON, URL, 패키지 조회와 테스트 데이터 생성 기능을 각각의 페이지에서 사용합니다."],
      text: ["TXT", "텍스트 도구", "글자 수, 텍스트 정리, 한영타 변환과 개인정보 마스킹 기능을 개별 도구로 제공합니다."],
      media: ["MEDIA", "파일·미디어 도구", "이미지, 자막, 체크섬, 음성, EML 등 로컬 파일 작업을 기능별로 선택합니다."],
      vehicle: ["CAR", "차량 도구", "차량에서 활용할 수 있는 보조 기능을 차종과 목적에 따라 선택합니다."],
      pip: ["PIP", "PIP 작업 도구", "시계, 타이머, 메모와 이미지 도구를 각각 독립된 PIP 기능으로 실행합니다."],
      boss: ["BOSS", "게임 타이머", "게임 진행 중 필요한 패턴과 재사용 시간을 별도의 타이머로 관리합니다."],
      gameplay: ["GAME", "게임 플레이 테스트", "클릭, 반응속도, 에임과 기본 입력 상태를 목적에 맞는 개별 테스트로 확인합니다."],
      "game-calculator": ["CALC", "게임 계산 도구", "감도, FOV, TTK, 화면 비율과 하드웨어 수치를 각각 계산합니다."],
      device: ["DEVICE", "장치 진단", "오디오, 카메라, 게임패드와 센서 상태를 장치별 진단 도구에서 확인합니다."],
      display: ["DISPLAY", "화면 진단", "색상, 명암, 불량 화소와 화면 움직임을 패턴별 독립 테스트로 점검합니다."],
      input: ["INPUT", "입력 장치 테스트", "키보드와 마우스의 속도, 지연, 고스팅과 이동 상태를 항목별로 측정합니다."],
      performance: ["PERF", "성능·네트워크 점검", "CPU, GPU, 메모리, 대역폭과 화면 환경을 목적별 점검 도구로 확인합니다."],
      finance: ["FIN", "금융·시장 도구", "환율, 국내외 주식과 암호화폐 시장 정보를 기능별 페이지에서 조회합니다."],
      life: ["LIFE", "생활 도구", "단위, 전통 무게, BMI와 일상에서 필요한 수치를 개별 계산기로 확인합니다."],
      age: ["AGE", "나이·띠 도구", "만 나이, 연도별 나이표와 띠 관련 정보를 목적별 계산기로 확인합니다."],
      date: ["DATE", "날짜 계산 도구", "날짜 정보, D-Day, 기간, 날짜 이동과 기념일을 각각 계산합니다."],
      lunar: ["LUNAR", "양력·음력 도구", "양력과 음력 변환 및 음력 기념일 날짜를 기능별로 확인합니다."],
      calendar: ["CAL", "달력·학교 도구", "공휴일, 손없는 날, 학교 일정과 생활 달력 정보를 각각 확인합니다."]
    },
    en: {
      developer: ["DEV", "Developer Tools", "Use focused pages for SQL, JSON, URLs, package lookup, and test data generation."],
      text: ["TXT", "Text Tools", "Choose a dedicated tool for counting, cleaning, keyboard conversion, or personal-data masking."],
      media: ["MEDIA", "File & Media Tools", "Work with images, subtitles, checksums, speech, EML, and other local files one task at a time."],
      vehicle: ["CAR", "Vehicle Tools", "Choose vehicle-specific helper tools by model and purpose."],
      pip: ["PIP", "PIP Workflow Tools", "Run clocks, timers, notes, and image helpers as separate Picture-in-Picture tools."],
      boss: ["BOSS", "Game Timers", "Track game patterns and cooldowns with a dedicated timer."],
      gameplay: ["GAME", "Gameplay Tests", "Check clicking, reaction time, aim, and basic input behavior with focused tests."],
      "game-calculator": ["CALC", "Gaming Calculators", "Calculate sensitivity, FOV, TTK, aspect ratios, and hardware values with separate tools."],
      device: ["DEVICE", "Device Diagnostics", "Check audio, cameras, gamepads, and sensors with a diagnostic for each device."],
      display: ["DISPLAY", "Display Diagnostics", "Inspect color, contrast, pixels, and motion with separate display test patterns."],
      input: ["INPUT", "Input Device Tests", "Measure keyboard and mouse speed, latency, ghosting, and movement with focused tests."],
      performance: ["PERF", "Performance & Network Checks", "Review CPU, GPU, memory, bandwidth, and display environment with purpose-built checks."],
      finance: ["FIN", "Finance & Market Tools", "Open separate pages for exchange rates, Korean and global stocks, and crypto market data."],
      life: ["LIFE", "Everyday Tools", "Use individual calculators for units, traditional weights, BMI, and everyday reference values."],
      age: ["AGE", "Age & Zodiac Tools", "Calculate age tables and zodiac information with a tool for each task."],
      date: ["DATE", "Date Calculators", "Calculate date facts, D-Days, ranges, date shifts, and anniversaries separately."],
      lunar: ["LUNAR", "Solar & Lunar Tools", "Convert solar and lunar dates or review lunar anniversaries on focused pages."],
      calendar: ["CAL", "Calendar & School Tools", "Check holidays, no-hand days, school timelines, and calendar references separately."]
    }
  };

  const sourceTools = [
    ["pip", "CLK", "PIP 시계", "현재 시간을 작은 PIP 창으로 띄워둡니다.", "pip 시계 clock 시간 always on top", "pip-toolbox#pip-clock"],
    ["pip", "TMR", "PIP 타이머", "카운트다운 타이머를 페이지와 PIP 창에서 실행합니다.", "pip 타이머 timer countdown", "pip-toolbox#pip-timer"],
    ["pip", "POM", "PIP 뽀모도로 타이머", "집중·휴식 시간을 반복하는 뽀모도로 타이머입니다.", "pip 뽀모도로 pomodoro 집중 휴식", "pip-toolbox#pip-pomodoro"],
    ["pip", "HEX", "PIP 색상 선택", "색상을 고르고 HEX, RGB, HSL 값을 확인합니다.", "pip color picker 색상 hex rgb hsl", "pip-toolbox#pip-color"],
    ["pip", "IMG", "PIP 이미지 리사이즈", "로컬 이미지를 원하는 크기와 형식으로 다시 저장합니다.", "pip image resize 이미지 리사이즈", "pip-toolbox#pip-image"],
    ["pip", "MEM", "PIP 메모", "브라우저에 저장되는 간단한 메모를 PIP 창으로 띄웁니다.", "pip memo note 메모 노트", "pip-toolbox#pip-memo"],
    ["boss", "BOSS", "메이플랜드 보스타이머", "메이플랜드 보스 패턴과 스킬 쿨타임을 PIP 창으로 관리합니다.", "메이플랜드 보스 타이머 pip 혼테일 자쿰 피아누스 유혹 공무", "mapleland-boss-timer"],
    ["developer", "Q", "MySQL Query Prettier", "복잡한 SQL을 줄바꿈하고 문법을 강조합니다.", "mysql sql query prettier formatter 쿼리 정리", "mysql-query-prettier"],
    ["developer", "E", "MySQL EXPLAIN Visual", "실행 계획의 순서, 비용과 위험 지점을 분석합니다.", "mysql explain visual 인덱스 실행계획", "mysql-explain-visual"],
    ["developer", "DB", "MySQL 버전별 설정·변수 비교", "버전별 서버 옵션과 시스템 변수의 추가·삭제·변경을 나란히 비교합니다.", "mysql version parameter variable compare mysqld system status 설정 변수 파라미터 비교", "mysql-parameter-compare"],
    tempDbTool,
    ["developer", "npm", "npm 패키지 정보 조회", "npm Registry와 jsDelivr API로 설치, 의존성, CDN 정보를 확인합니다.", "npm package registry jsdelivr cdn dependencies downloads", "npm-package-info"],
    ["vehicle", "CAR", "그랑 콜레오스 터치 키보드", "480×272 터치 버튼에 아이콘과 키 조합을 지정하고 ESP32-S3 보드에 직접 적용합니다.", "르노 그랑 콜레오스 그랑콜레오스 grand koleos 차량 터치 키보드 esp32 아이콘 볼륨 펌웨어", "grand-koleos-touch-keyboard"],
    ["life", "MAP", "뽈뽈", "Google Timeline 파일을 검증하고 이동 경로, 방문지, 이동수단과 통계를 지도에서 확인합니다.", "구글 타임라인 지도 이동 경로 방문지 이동수단 통계 위치 기록", "google-timeline"],
    ["age", "BDAY", "나와 생일이 같은 유명인", "월과 일을 선택해 같은 날 태어난 대한민국 유명인과 연예인을 최대 50명 찾습니다.", "생일 같은 유명인 연예인 배우 가수 아이돌 wikidata", "birthday-celebrities"],
    ["age", "만", "나이·만나이 계산기", "만 나이, 세는 나이, 연 나이와 성년 여부를 계산합니다.", "나이 만나이 세는나이 생년월일", "../calculators/all#age-calculator"],
    ["age", "표", "연도별 나이표", "출생연도별 나이와 전통적인 나이 용어를 확인합니다.", "나이표 환갑 칠순 출생연도", "../calculators/all#age-table"],
    ["age", "띠", "띠·띠동갑 찾기", "출생연도의 띠와 같은 띠인 연도를 찾습니다.", "띠 띠동갑 출생년도", "../calculators/all#zodiac-tools"],
    ["age", "궁", "띠궁합·삼재", "두 띠의 전통 궁합과 연도별 삼재를 확인합니다.", "띠궁합 삼재 궁합", "../calculators/all#zodiac-tools"],
    ["date", "일", "날짜 정보", "요일, 윤년, 연중 순번과 남은 날을 확인합니다.", "날짜 요일 윤년 남은날", "../calculators/all#date-info"],
    ["date", "D", "D-Day·날짜 차이", "두 날짜 사이의 기간과 오늘 기준 D-Day를 계산합니다.", "디데이 d-day 날짜 차이", "../calculators/all#date-difference"],
    ["date", "평", "기간 날짜 목록·평일", "기간의 평일·주말 수와 날짜별 요일 목록을 만듭니다.", "평일 영업일 날짜 목록 요일 개수", "../calculators/all#date-range-list"],
    ["date", "±", "날짜 더하기·빼기", "기준일에 원하는 기간을 더하거나 뺍니다.", "날짜 더하기 빼기", "../calculators/all#date-move"],
    ["date", "100", "기념일·아기 100일", "100일, 200일, 첫돌과 사용자 기념일을 계산합니다.", "기념일 백일 첫돌 아기", "../calculators/all#anniversary"],
    ["lunar", "음", "양력 → 음력", "양력 날짜에 해당하는 한국 음력 날짜를 찾습니다.", "양력 음력 변환", "../calculators/all#lunar-converter"],
    ["lunar", "양", "음력 → 양력", "음력 날짜와 윤달 여부로 양력 날짜를 계산합니다.", "음력 양력 윤달", "../calculators/all#lunar-converter"],
    ["lunar", "年", "음력 기념일 변환", "같은 음력 기념일의 연도별 양력 날짜를 봅니다.", "음력 기념일 제사 생일", "../calculators/all#lunar-anniversary"],
    ["calendar", "휴", "우리나라 공휴일", "연도별 고정·음력·대체 공휴일을 확인합니다.", "대한민국 공휴일 대체공휴일", "../calculators/all#holidays"],
    ["calendar", "WORLD", "세계 공휴일 달력", "Nager.Date 공개 API로 국가별 공휴일 달력과 영업일을 조회합니다.", "세계 공휴일 국가 holiday calendar nager 영업일", "world-holidays"],
    exchangeRateTool,
    ["finance", "KR", "국내 주식 조회", "종목코드로 국내 주식 현재가, 등락률, 거래량과 최근 가격 흐름을 확인합니다.", "국내 주식 코스피 코스닥 삼성전자 하이닉스 stock korea quote chart", "korea-stocks"],
    ["finance", "US", "해외 주식 조회", "티커로 해외 주식 현재가, 등락률, 거래량과 최근 가격 흐름을 확인합니다.", "해외 주식 미국주식 나스닥 애플 엔비디아 stock global quote chart", "global-stocks"],
    ["finance", "COIN", "코인 공포탐욕 지표", "공포탐욕 지수와 주요 암호화폐 거래량 상위 20개의 KRW·USD 시세를 조회합니다.", "코인 암호화폐 비트코인 공포탐욕 fear greed coingecko price volume", "crypto-sentiment"],
    ["calendar", "손", "손없는 날", "월별 손없는 날을 양력과 음력으로 확인합니다.", "손없는날 이사 음력", "../calculators/all#no-hand-days"],
    ["calendar", "학", "입학·졸업 연도", "출생연도로 초·중·고 입학과 졸업 시점을 계산합니다.", "학교 입학 졸업 학생", "../calculators/all#school-tools"],
    ["calendar", "수", "수능 D-Day", "다음 대학수학능력시험까지 남은 기간을 확인합니다.", "수능 디데이 시험", "../calculators/all#school-tools"],
    ["calendar", "명", "재미 이름짓기", "생년월일로 오락용 이름을 만듭니다.", "이름짓기 인디언 조선", "../calculators/all#fun-names"],
    ["text", "글", "글자수 세기", "문자, 단어, 줄과 UTF-8 바이트를 실시간 계산합니다.", "글자수 단어 줄 바이트", "utility-toolbox#text-counter"],
    ["text", "정", "텍스트 정리기", "공백, 빈 줄, 개행과 보이지 않는 문자를 정리합니다.", "텍스트 공백 줄바꿈 빈줄", "utility-toolbox#text-cleaner"],
    ["text", "한", "한영타 변환", "두벌식 자판 기준으로 한/영 입력 실수를 복구합니다.", "한영타 키보드 변환", "utility-toolbox#keyboard-converter"],
    ["text", "마", "개인정보 마스킹", "전화, 이메일, 주민번호와 카드번호를 가립니다.", "개인정보 마스킹 전화 이메일 카드", "utility-toolbox#privacy-mask"],
    ["text", "1K", "숫자 포맷", "천 단위 콤마, 소수점과 음수 표기를 변환합니다.", "숫자 콤마 소수점 포맷", "utility-toolbox#number-format"],
    ["text", "원", "한글 금액 변환", "숫자와 한글 원 단위 금액을 상호 변환합니다.", "한글 금액 숫자 원", "utility-toolbox#money-korean"],
    ["developer", "{}", "JSON 포매터", "JSON을 검증하고 정렬하거나 한 줄로 압축합니다.", "json formatter 포맷 검증 압축", "utility-toolbox#json-tool"],
    ["developer", "B64", "Base64 변환", "UTF-8 텍스트를 Base64로 인코딩·디코딩합니다.", "base64 인코더 디코더", "utility-toolbox#base64-tool"],
    ["developer", "%", "URL 인코더", "URI와 쿼리 컴포넌트를 인코딩·디코딩합니다.", "url uri 인코딩 디코딩", "utility-toolbox#url-codec"],
    getUrlTool,
    ["developer", "TS", "Unix Timestamp", "초·밀리초 타임스탬프와 날짜를 변환합니다.", "unix timestamp utc kst", "utility-toolbox#timestamp-tool"],
    ["developer", "TZ", "서버 시간대 추정", "서버 주소에서 시간대 후보와 현재 시각을 확인합니다.", "서버 시간대 timezone host domain utc", "utility-toolbox#server-timezone"],
    ["developer", "ID", "UUID 생성기", "암호학적 난수 기반 UUID v4를 생성합니다.", "uuid guid 생성", "utility-toolbox#uuid-tool"],
    ["developer", "755", "chmod 계산기", "숫자와 rwx 문자 권한을 상호 변환합니다.", "chmod linux 권한 rwx", "utility-toolbox#chmod-tool"],
    ["developer", "PW", "비밀번호 생성기", "조건에 맞는 안전한 랜덤 비밀번호를 생성합니다.", "비밀번호 password 랜덤 보안", "utility-toolbox#password-tool"],
    ["life", "↔", "단위 변환기", "길이, 무게, 온도, 면적과 속도를 변환합니다.", "단위 길이 무게 온도 면적 속도", "utility-toolbox#unit-tool"],
    ["life", "근", "근·관·돈 변환", "전통 무게 단위를 g과 kg으로 환산합니다.", "근 관 돈 그램 무게", "utility-toolbox#traditional-weight"],
    ["life", "BMI", "BMI·WHR 계산", "체질량지수와 허리·엉덩이 비율을 계산합니다.", "bmi whr 키 체중", "utility-toolbox#bmi-tool"],
    ["life", "45", "로또 번호 생성", "1부터 45까지 중복 없는 번호 6개를 생성합니다.", "로또 번호 랜덤", "utility-toolbox#lotto-tool"],
    ["text", "★", "특수문자·이모지", "자주 쓰는 기호를 검색하고 클릭해 복사합니다.", "특수문자 이모지 유니코드", "file-media-toolbox#character-map"],
    ["text", "ASCII", "ASCII·HTML 코드표", "인쇄 가능한 문자와 HTML 문자참조를 검색합니다.", "ascii html 코드표 문자참조", "file-media-toolbox#code-table"],
    ["media", "#", "색상 선택·변환", "HEX, RGB와 HSL 색상 값을 상호 확인합니다.", "색상 color hex rgb hsl", "file-media-toolbox#color-tool"],
    ["text", "±", "텍스트 비교", "두 문서를 줄 단위로 비교해 변경점을 표시합니다.", "텍스트 코드 비교 diff", "file-media-toolbox#text-diff"],
    ["text", "CC", "SMI → SRT 변환", "SMI 자막을 SRT 형식으로 바꾸고 싱크를 조정합니다.", "smi srt 자막 변환", "file-media-toolbox#subtitle-tool"],
    ["developer", "</>", "HTML 미리보기", "HTML 코드를 sandbox 환경에서 즉시 실행합니다.", "html 웹 에디터 미리보기", "file-media-toolbox#html-editor"],
    ["developer", "SHA", "파일 체크섬", "로컬 파일의 SHA-1·256·384·512 해시를 계산합니다.", "파일 checksum sha hash", "file-media-toolbox#checksum-tool"],
    ["media", "IMG", "이미지 압축·리사이즈", "이미지 크기와 형식을 바꾸고, 압축 결과를 파일이나 Data URL로 저장합니다.", "이미지 압축 리사이즈 data url", "file-media-toolbox#image-tool"],
    ["media", "TTS", "문자 음성 변환", "브라우저 음성 합성으로 입력 문장을 읽습니다.", "tts 문자 음성 읽기", "file-media-toolbox#tts-tool"],
    ["media", "STT", "음성 문자 변환", "지원 브라우저에서 마이크 음성을 텍스트로 바꿉니다.", "stt 음성 문자 마이크", "file-media-toolbox#stt-tool"],
    ["text", "EML", "EML 뷰어", "로컬 이메일 파일의 헤더와 본문을 확인합니다.", "eml 이메일 메일 뷰어", "file-media-toolbox#eml-tool"],
    ["developer", "KEY", "키보드 이벤트", "JavaScript key, code와 modifier 상태를 확인합니다.", "키보드 이벤트 key code", "file-media-toolbox#key-event-tool"],
    ["date", "TIME", "시간 계산기", "시간 차이, 더하기·빼기, 근무시간과 단위를 계산합니다.", "시간 차이 근무시간 더하기 단위", "advanced-toolbox#time-tool"],
    ["developer", "{ }", "코드 정렬·압축", "JSON, CSS, JS, HTML과 SQL 코드를 정리하거나 압축합니다.", "코드 정렬 압축 beautify minify", "advanced-toolbox#code-tool"],
    ["developer", "KEY", "암호화 도구", "Hash, HMAC, PBKDF2와 AES-GCM을 Web Crypto로 실행합니다.", "암호화 hash hmac pbkdf2 aes", "advanced-toolbox#crypto-tool"],
    ["media", "QR", "QR·바코드 생성", "QR과 Code 39 바코드를 PNG 이미지로 생성합니다.", "qr barcode 바코드 생성", "advanced-toolbox#qr-barcode-tool"],
    ["media", "TXT", "ASCII 아트", "텍스트 배너와 로컬 이미지를 문자 그림으로 변환합니다.", "ascii art 아스키아트 이미지 텍스트", "advanced-toolbox#ascii-art-tool"],
    ["media", "GIF", "GIF 생성기", "여러 이미지를 애니메이션 GIF로 변환합니다.", "gif 움짤 애니메이션 이미지", "advanced-toolbox#gif-tool"],
    ["media", "3D", "매직아이 생성기", "텍스트를 숨긴 랜덤 도트 입체 이미지를 생성합니다.", "매직아이 stereogram 입체", "advanced-toolbox#magic-eye-tool"],
    ["life", "123", "숫자야구", "3·4·5자리 Bulls & Cows 게임을 즐깁니다.", "숫자야구 게임 bulls cows", "advanced-toolbox#baseball-tool"],
    ["media", "SCAN", "바코드 스캐너", "지원 브라우저에서 이미지와 카메라의 코드를 감지합니다.", "바코드 스캐너 qr 카메라", "advanced-toolbox#scanner-tool"],
    ["media", "LIGHT", "손전등", "화면 손전등과 지원 기기의 카메라 LED를 사용합니다.", "손전등 플래시 torch led", "advanced-toolbox#flashlight-tool"],
    ["game", "CPS", "클릭 속도 테스트", "제한 시간 동안 좌클릭 속도와 CPS를 측정합니다.", "cps click speed mouse gaming", "gaming-lab#cps-test"],
    ["game", "RC", "우클릭 CPS 테스트", "오른쪽 마우스 버튼 클릭 속도를 측정합니다.", "right click cps mouse", "gaming-lab#right-cps-test"],
    ["game", "2X", "더블클릭 테스트", "짧은 간격의 더블클릭과 클릭 튐을 감지합니다.", "double click debounce mouse", "gaming-lab#double-click-test"],
    ["game", "SCR", "스크롤 테스트", "휠 방향, 누적 이동량, 초당 이벤트 수를 확인합니다.", "scroll wheel mouse speed", "gaming-lab#scroll-test"],
    ["game", "Hz", "마우스 폴링레이트", "마우스 이동 이벤트 간격으로 폴링레이트를 추정합니다.", "polling rate hz mouse", "gaming-lab#polling-test"],
    ["game", "DPI", "DPI·감도 계산기", "eDPI와 cm/360 값을 계산해 게임 감도 조정을 돕습니다.", "dpi edpi sensitivity cm 360", "gaming-lab#dpi-tool"],
    ["game", "SPC", "스페이스바 테스트", "스페이스바 연타 횟수와 초당 입력수를 측정합니다.", "spacebar keyboard speed", "gaming-lab#spacebar-test"],
    ["game", "KEY", "키보드 입력 테스트", "눌린 키와 key/code, modifier 상태를 확인합니다.", "keyboard key test ghosting", "gaming-lab#keyboard-test"],
    ["game", "APM", "키 입력 속도", "키 입력수와 분당 입력 속도를 계산합니다.", "key speed apm kpm typing", "gaming-lab#key-speed-test"],
    ["game", "RT", "반응속도 테스트", "신호가 바뀐 뒤 클릭하기까지 걸린 시간을 측정합니다.", "reaction speed reflex", "gaming-lab#reaction-test"],
    ["game", "AIM", "에임 트레이너", "타겟 명중률과 평균 반응 시간을 측정합니다.", "aim trainer accuracy target", "gaming-lab#aim-trainer"],
    ["game", "LCD", "화면 테스트 패턴", "단색, 그리드, 그라데이션 패턴으로 화면을 확인합니다.", "monitor screen color dead pixel gradient", "gaming-lab#display-test"],
    ["game", "SENS", "감도 변환", "DPI 변경 후 같은 eDPI가 되도록 새 감도를 계산합니다.", "sensitivity converter dpi edpi", "gaming-calculators#sensitivity-converter"],
    ["game", "FOV", "FOV 계산기", "종횡비 기준으로 수평·수직 시야각을 변환합니다.", "fov field of view", "gaming-calculators#fov-calculator"],
    ["game", "TTK", "TTK 계산기", "피해량, 체력, 연사속도로 처치 시간을 추정합니다.", "ttk damage fire rate", "gaming-calculators#ttk-calculator"],
    ["game", "+", "크로스헤어 생성기", "색상과 간격을 정해 조준점 PNG를 만듭니다.", "crosshair generator", "gaming-calculators#crosshair-generator"],
    ["game", "ID", "게이머태그·한글 아이디 생성기", "다양한 테마의 영문 게이머태그와 2~10자 한글 무작위 아이디를 생성합니다.", "gamertag korean id nickname guild name generator 한글 아이디 닉네임 생성", "gaming-calculators#gamertag-generator"],
    ["game", "MC", "마인크래프트 원 생성기", "블록 단위 원 설계도를 문자 그리드로 만듭니다.", "minecraft circle generator", "gaming-calculators#minecraft-circle"],
    ["game", "16:9", "화면 비율 계산", "원본 비율을 유지하는 새 크기를 계산합니다.", "aspect ratio calculator", "gaming-calculators#aspect-ratio"],
    ["game", "PPI", "PPI 계산기", "해상도와 대각선으로 픽셀 밀도를 계산합니다.", "ppi pixel density", "gaming-calculators#ppi-calculator"],
    ["game", "TV", "화면 크기·시청거리", "대각선 기준 실제 크기와 권장 거리를 계산합니다.", "screen size viewing distance", "gaming-calculators#screen-size"],
    ["game", "NET", "다운로드 시간", "파일 크기와 대역폭으로 다운로드 시간을 추정합니다.", "download time bandwidth", "gaming-calculators#download-time"],
    ["game", "RAID", "RAID 용량 계산기", "RAID 0·1·5·6·10의 사용 가능 용량을 계산합니다.", "raid calculator storage", "gaming-calculators#raid-calculator"],
    ["game", "RAM", "RAM 지연시간", "메모리 속도와 CL로 실제 지연시간을 계산합니다.", "ram latency calculator", "gaming-calculators#ram-latency"],
    ["game", "SND", "사운드 테스트", "좌·우·중앙 채널로 테스트 톤을 재생합니다.", "sound speaker tone", "device-diagnostics#sound-test"],
    ["game", "BASS", "저음 테스트", "낮은 주파수 톤으로 저음 응답을 확인합니다.", "bass low frequency", "device-diagnostics#bass-test"],
    ["game", "Hz", "주파수 응답", "고정 톤과 주파수 스윕을 재생합니다.", "frequency response sweep", "device-diagnostics#frequency-test"],
    ["game", "L/R", "헤드폰 채널", "좌우 채널 분리와 방향을 확인합니다.", "headphone left right channel", "device-diagnostics#headphone-test"],
    ["game", "360", "서라운드 이동감", "스테레오 팬 이동으로 공간감을 확인합니다.", "surround stereo panner", "device-diagnostics#surround-test"],
    ["game", "MIC", "마이크·데시벨", "마이크 입력 레벨과 상대 dBFS를 측정합니다.", "microphone decibel meter", "device-diagnostics#microphone-test"],
    ["game", "CAM", "웹캠 테스트", "브라우저 카메라 미리보기와 캡처를 실행합니다.", "webcam camera test", "device-diagnostics#webcam-test"],
    ["game", "PAD", "게임패드 테스트", "컨트롤러 버튼과 축 상태를 확인합니다.", "gamepad controller tester", "device-diagnostics#gamepad-test"],
    ["game", "TOUCH", "터치스크린 테스트", "터치와 포인터 입력 위치를 캔버스에 기록합니다.", "touchscreen pointer test", "device-diagnostics#touchscreen-test"],
    ["game", "ACC", "가속도계 테스트", "DeviceMotion 값을 표시합니다.", "accelerometer motion sensor", "device-diagnostics#accelerometer-test"],
    ["game", "GYRO", "자이로스코프 테스트", "DeviceOrientation 값을 표시합니다.", "gyroscope orientation sensor", "device-diagnostics#gyroscope-test"],
    ["game", "VIB", "진동 테스트", "지원 기기의 Vibration API를 테스트합니다.", "vibration haptic test", "device-diagnostics#vibration-test"],
    ["game", "PIX", "불량화소 테스트", "단색 화면으로 픽셀 이상을 확인합니다.", "dead pixel color screen", "display-diagnostics#dead-pixel"],
    ["game", "BLB", "백라이트 블리드", "검정 화면으로 빛샘을 확인합니다.", "backlight bleed black", "display-diagnostics#backlight-bleed"],
    ["game", "BLK", "블랙 레벨", "어두운 단계 구분을 확인합니다.", "black level monitor", "display-diagnostics#black-level"],
    ["game", "WHT", "화이트 레벨", "밝은 단계가 뭉개지지 않는지 확인합니다.", "white level monitor", "display-diagnostics#white-level"],
    ["game", "BRI", "밝기 테스트", "그레이스케일 단계로 밝기 설정을 확인합니다.", "brightness grayscale", "display-diagnostics#brightness-test"],
    ["game", "CON", "명암비 테스트", "체커와 중간 회색으로 명암을 확인합니다.", "contrast checker", "display-diagnostics#contrast-test"],
    ["game", "GAM", "감마 테스트", "줄무늬와 중간 회색 패턴으로 감마를 확인합니다.", "gamma stripes", "display-diagnostics#gamma-test"],
    ["game", "RGB", "색상 범위", "RGB 램프가 부드럽게 이어지는지 확인합니다.", "color range rgb", "display-diagnostics#color-range"],
    ["game", "UNI", "화면 균일도", "분할 패턴으로 밝기와 색온도 편차를 확인합니다.", "screen uniformity", "display-diagnostics#uniformity-test"],
    ["game", "GHO", "고스팅 테스트", "움직이는 블록으로 잔상을 확인합니다.", "monitor ghosting motion", "display-diagnostics#ghosting-test"],
    ["game", "FRM", "프레임 스키핑", "프레임 점 간격으로 스킵을 확인합니다.", "frame skipping", "display-diagnostics#frame-skipping"],
    ["game", "FPS", "FPS·Hz·해상도", "requestAnimationFrame으로 갱신률을 추정합니다.", "fps monitor hz refresh rate resolution", "display-diagnostics#fps-hz"],
    ["game", "EAR", "청각 반응 테스트", "소리를 들은 뒤 클릭하기까지의 시간을 측정합니다.", "auditory reaction sound", "input-training#auditory-reaction"],
    ["game", "MEM", "기억력 테스트", "색상 순서를 기억해 같은 순서로 입력합니다.", "memory sequence game", "input-training#memory-test"],
    ["game", "TYPE", "타자 연습", "제시문 기준 WPM과 정확도를 계산합니다.", "typing speed wpm cpm", "input-training#typing-practice"],
    ["game", "WASD", "WASD 트레이너", "표시되는 이동 키에 빠르게 반응합니다.", "wasd trainer movement", "input-training#wasd-trainer"],
    ["game", "KPS", "키보드 클리커", "키 입력 속도와 초당 입력수를 측정합니다.", "keyboard clicker counter", "input-training#keyboard-clicker"],
    ["game", "K2", "키보드 더블클릭", "같은 키가 짧은 간격으로 반복 입력되는지 감지합니다.", "keyboard double click bounce", "input-training#keyboard-double"],
    ["game", "GHOST", "키보드 고스팅", "동시에 눌린 키 목록을 확인합니다.", "keyboard ghosting rollover", "input-training#keyboard-ghosting"],
    ["game", "KL", "키보드 지연", "신호 후 키 입력까지의 지연을 측정합니다.", "keyboard latency reaction", "input-training#keyboard-latency"],
    ["game", "KHz", "키보드 폴링 추정", "연속 키 이벤트 간격으로 입력 주기를 추정합니다.", "keyboard polling rate", "input-training#keyboard-polling"],
    ["game", "ACC", "마우스 정확도", "작은 타겟 명중률로 마우스 정확도를 봅니다.", "mouse accuracy target", "input-training#mouse-accuracy"],
    ["game", "DRAG", "마우스 드래그", "드래그 경로를 그려 끊김을 확인합니다.", "mouse drag test", "input-training#mouse-drag"],
    ["game", "DRIFT", "마우스 드리프트", "정지 중 발생하는 미세 이동 이벤트를 봅니다.", "mouse drift idle", "input-training#mouse-drift"],
    ["game", "SPD", "마우스 속도·가속", "포인터 이동 속도와 최대 속도를 추정합니다.", "mouse speed acceleration", "input-training#mouse-speed"],
    ["game", "ML", "마우스 지연", "신호 후 클릭까지의 시간을 측정합니다.", "mouse latency reaction", "input-training#mouse-latency"],
    ["game", "SPIN", "마우스 스핀", "원형 움직임의 누적 각도와 회전량을 표시합니다.", "mouse spin test", "input-training#mouse-spin"],
    ["game", "MOUSE", "마우스 종합 테스트", "버튼, 좌표, 휠 입력 상태를 한 번에 확인합니다.", "mouse tester buttons position", "input-training#mouse-tester"],
    ["game", "CPU", "CPU 짧은 벤치", "짧은 계산 루프로 CPU 연산량을 추정합니다.", "cpu stress benchmark", "performance-lab#cpu-test"],
    ["game", "GPU", "GPU·Canvas 부하", "Canvas 입자 렌더링으로 프레임 성능을 봅니다.", "gpu stress canvas", "performance-lab#gpu-test"],
    ["game", "RAM", "RAM 메모리 테스트", "메모리 할당과 간단한 쓰기 검증을 수행합니다.", "ram memory test", "performance-lab#ram-test"],
    ["game", "BW", "대역폭 계산기", "전송량, 시간, 속도 관계를 계산합니다.", "bandwidth calculator transfer", "performance-lab#bandwidth-calculator"],
    ["game", "mDPI", "마우스 DPI 실측", "실제 이동 거리 대비 픽셀 이동량으로 DPI를 추정합니다.", "mouse dpi test distance", "performance-lab#mouse-dpi-test"],
    ["game", "BURN", "번인 패턴", "색상 순환 패턴으로 화면 잔상 확인을 돕습니다.", "burn in screen pattern", "performance-lab#burn-in-test"],
    ["game", "RES", "해상도 테스트", "뷰포트, 화면 크기, DPR과 색심도를 표시합니다.", "resolution screen dpr", "performance-lab#resolution-test"],
    ["game", "RTC", "WebRTC 후보 확인", "외부 STUN 없이 로컬 ICE 후보 노출 여부를 확인합니다.", "webrtc leak candidate", "performance-lab#webrtc-test"]
  ];

  const categoryBySource = {
    "gaming-lab": "gameplay",
    "gaming-calculators": "game-calculator",
    "device-diagnostics": "device",
    "display-diagnostics": "display",
    "input-training": "input",
    "performance-lab": "performance"
  };
  const categorizedTools = sourceTools.map((tool) => {
    const sourcePage = tool[5].split("#")[0];
    return categoryBySource[sourcePage] ? [categoryBySource[sourcePage], ...tool.slice(1)] : tool;
  });
  const duplicateDetailSlugs = {
    "zodiac-tools": ["zodiac-year-finder", "zodiac-compatibility-samjae"],
    "lunar-converter": ["solar-to-lunar", "lunar-to-solar"],
    "school-tools": ["school-years", "csat-dday"]
  };
  const duplicateDetailIndexes = {};
  const routedTools = categorizedTools.map((tool) => {
    const sourceHref = tool[5];
    const hashIndex = sourceHref.indexOf("#");
    if (hashIndex < 0) return [...tool, sourceHref];
    const fragment = sourceHref.slice(hashIndex + 1);
    const alternatives = duplicateDetailSlugs[fragment];
    const detailSlug = alternatives
      ? alternatives[duplicateDetailIndexes[fragment] = (duplicateDetailIndexes[fragment] || 0)] || fragment
      : fragment;
    duplicateDetailIndexes[fragment] += alternatives ? 1 : 0;
    return [...tool.slice(0, 5), detailSlug, sourceHref];
  });
  const tools = routedTools.map((tool) => {
    if (document.documentElement.lang !== "en") return tool;
    const copy = window.SF_TOOL_COPY?.[tool[5]];
    return copy
      ? [tool[0], copy.icon || tool[1], copy.title || tool[2], copy.description || tool[3], tool[4], tool[5], tool[6]]
      : tool;
  });

  window.SF_TOOL_CATALOG = tools.map(([category, icon, title, description, keywords, href, sourceHref]) => ({
    category,
    icon,
    title,
    description,
    keywords,
    href,
    sourceHref
  }));
  window.SF_TOOL_CATEGORIES = categoryOrder.map((id) => {
    const [code, label, description] = categoryCopy[lang][id];
    return { id, code, label, description, href: id };
  });

  const categoryLabels = Object.fromEntries(window.SF_TOOL_CATEGORIES.map((category) => [category.id, category.label]));

  function init() {
    const catalog = document.querySelector("#toolCatalog");
    if (!catalog) return;
    catalog.innerHTML = tools.map(([category, icon, title, description, keywords, href]) => [
      `<a class="catalog-card" href="${href}" data-tool-card data-category="${category}" data-keywords="${escapeHtml(keywords)}">`,
      `<span class="catalog-icon icon-${iconClass(category)}">${escapeHtml(icon)}</span>`,
      '<span class="catalog-copy">',
      `<span class="catalog-meta">${categoryLabels[category]}</span>`,
      `<strong>${escapeHtml(title)}</strong>`,
      `<small>${escapeHtml(description)}</small>`,
      "</span>",
      '<span class="catalog-arrow" aria-hidden="true">→</span>',
      "</a>"
    ].join("")).join("");

    const count = document.querySelector("#catalogTotal");
    if (count) count.textContent = String(tools.length);
    const visible = document.querySelector("#visibleToolCount");
    if (visible) visible.textContent = String(tools.length);
    document.querySelectorAll("[data-category-count]").forEach((element) => {
      const category = element.dataset.categoryCount;
      element.textContent = String(category === "all" ? tools.length : tools.filter((tool) => tool[0] === category).length);
    });
  }

  function iconClass(category) {
    if (category === "gameplay" || category === "game-calculator" || category === "device" || category === "display" || category === "input" || category === "performance") return "game";
    if (category === "pip" || category === "boss" || category === "developer" || category === "text" || category === "life" || category === "media" || category === "vehicle" || category === "finance") return category;
    if (category === "date") return "date";
    if (category === "lunar") return "lunar";
    if (category === "age") return "age";
    return "calendar";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
