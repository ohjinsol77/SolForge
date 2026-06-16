(function () {
  "use strict";

  const tools = [
    ["developer", "Q", "MySQL Query Prettier", "복잡한 SQL을 줄바꿈하고 문법을 강조합니다.", "mysql sql query prettier formatter 쿼리 정리", "mysql-query-prettier.html"],
    ["developer", "E", "MySQL EXPLAIN Visual", "실행 계획의 순서, 비용과 위험 지점을 분석합니다.", "mysql explain visual 인덱스 실행계획", "mysql-explain-visual.html"],
    ["age", "만", "나이·만나이 계산기", "만 나이, 세는 나이, 연 나이와 성년 여부를 계산합니다.", "나이 만나이 세는나이 생년월일", "../calculators/all.html#age-calculator"],
    ["age", "표", "연도별 나이표", "출생연도별 나이와 전통적인 나이 용어를 확인합니다.", "나이표 환갑 칠순 출생연도", "../calculators/all.html#age-table"],
    ["age", "띠", "띠·띠동갑 찾기", "출생연도의 띠와 같은 띠인 연도를 찾습니다.", "띠 띠동갑 출생년도", "../calculators/all.html#zodiac-tools"],
    ["age", "궁", "띠궁합·삼재", "두 띠의 전통 궁합과 연도별 삼재를 확인합니다.", "띠궁합 삼재 궁합", "../calculators/all.html#zodiac-tools"],
    ["date", "일", "날짜 정보", "요일, 윤년, 연중 순번과 남은 날을 확인합니다.", "날짜 요일 윤년 남은날", "../calculators/all.html#date-info"],
    ["date", "D", "D-Day·날짜 차이", "두 날짜 사이의 기간과 오늘 기준 D-Day를 계산합니다.", "디데이 d-day 날짜 차이", "../calculators/all.html#date-difference"],
    ["date", "평", "기간 날짜 목록·평일", "기간의 평일·주말 수와 날짜별 요일 목록을 만듭니다.", "평일 영업일 날짜 목록 요일 개수", "../calculators/all.html#date-range-list"],
    ["date", "±", "날짜 더하기·빼기", "기준일에 원하는 기간을 더하거나 뺍니다.", "날짜 더하기 빼기", "../calculators/all.html#date-move"],
    ["date", "100", "기념일·아기 100일", "100일, 200일, 첫돌과 사용자 기념일을 계산합니다.", "기념일 백일 첫돌 아기", "../calculators/all.html#anniversary"],
    ["lunar", "음", "양력 → 음력", "양력 날짜에 해당하는 한국 음력 날짜를 찾습니다.", "양력 음력 변환", "../calculators/all.html#lunar-converter"],
    ["lunar", "양", "음력 → 양력", "음력 날짜와 윤달 여부로 양력 날짜를 계산합니다.", "음력 양력 윤달", "../calculators/all.html#lunar-converter"],
    ["lunar", "年", "음력 기념일 변환", "같은 음력 기념일의 연도별 양력 날짜를 봅니다.", "음력 기념일 제사 생일", "../calculators/all.html#lunar-anniversary"],
    ["calendar", "휴", "우리나라 공휴일", "연도별 고정·음력·대체 공휴일을 확인합니다.", "대한민국 공휴일 대체공휴일", "../calculators/all.html#holidays"],
    ["calendar", "손", "손없는 날", "월별 손없는 날을 양력과 음력으로 확인합니다.", "손없는날 이사 음력", "../calculators/all.html#no-hand-days"],
    ["calendar", "학", "입학·졸업 연도", "출생연도로 초·중·고 입학과 졸업 시점을 계산합니다.", "학교 입학 졸업 학생", "../calculators/all.html#school-tools"],
    ["calendar", "수", "수능 D-Day", "다음 대학수학능력시험까지 남은 기간을 확인합니다.", "수능 디데이 시험", "../calculators/all.html#school-tools"],
    ["calendar", "명", "재미 이름짓기", "생년월일로 오락용 이름을 만듭니다.", "이름짓기 인디언 조선", "../calculators/all.html#fun-names"],
    ["text", "글", "글자수 세기", "문자, 단어, 줄과 UTF-8 바이트를 실시간 계산합니다.", "글자수 단어 줄 바이트", "utility-toolbox.html#text-counter"],
    ["text", "정", "텍스트 정리기", "공백, 빈 줄, 개행과 보이지 않는 문자를 정리합니다.", "텍스트 공백 줄바꿈 빈줄", "utility-toolbox.html#text-cleaner"],
    ["text", "한", "한영타 변환", "두벌식 자판 기준으로 한/영 입력 실수를 복구합니다.", "한영타 키보드 변환", "utility-toolbox.html#keyboard-converter"],
    ["text", "마", "개인정보 마스킹", "전화, 이메일, 주민번호와 카드번호를 가립니다.", "개인정보 마스킹 전화 이메일 카드", "utility-toolbox.html#privacy-mask"],
    ["text", "1K", "숫자 포맷", "천 단위 콤마, 소수점과 음수 표기를 변환합니다.", "숫자 콤마 소수점 포맷", "utility-toolbox.html#number-format"],
    ["text", "원", "한글 금액 변환", "숫자와 한글 원 단위 금액을 상호 변환합니다.", "한글 금액 숫자 원", "utility-toolbox.html#money-korean"],
    ["developer", "{}", "JSON 포매터", "JSON을 검증하고 정렬하거나 한 줄로 압축합니다.", "json formatter 포맷 검증 압축", "utility-toolbox.html#json-tool"],
    ["developer", "B64", "Base64 변환", "UTF-8 텍스트를 Base64로 인코딩·디코딩합니다.", "base64 인코더 디코더", "utility-toolbox.html#base64-tool"],
    ["developer", "%", "URL 인코더", "URI와 쿼리 컴포넌트를 인코딩·디코딩합니다.", "url uri 인코딩 디코딩", "utility-toolbox.html#url-codec"],
    ["developer", "URL", "URL 파서", "주소의 프로토콜, 호스트, 경로와 쿼리를 분해합니다.", "url parser query 파서", "utility-toolbox.html#url-parser"],
    ["developer", "TS", "Unix Timestamp", "초·밀리초 타임스탬프와 날짜를 변환합니다.", "unix timestamp utc kst", "utility-toolbox.html#timestamp-tool"],
    ["developer", "ID", "UUID 생성기", "암호학적 난수 기반 UUID v4를 생성합니다.", "uuid guid 생성", "utility-toolbox.html#uuid-tool"],
    ["developer", "755", "chmod 계산기", "숫자와 rwx 문자 권한을 상호 변환합니다.", "chmod linux 권한 rwx", "utility-toolbox.html#chmod-tool"],
    ["developer", "PW", "비밀번호 생성기", "조건에 맞는 안전한 랜덤 비밀번호를 생성합니다.", "비밀번호 password 랜덤 보안", "utility-toolbox.html#password-tool"],
    ["life", "↔", "단위 변환기", "길이, 무게, 온도, 면적과 속도를 변환합니다.", "단위 길이 무게 온도 면적 속도", "utility-toolbox.html#unit-tool"],
    ["life", "근", "근·관·돈 변환", "전통 무게 단위를 g과 kg으로 환산합니다.", "근 관 돈 그램 무게", "utility-toolbox.html#traditional-weight"],
    ["life", "BMI", "BMI·WHR 계산", "체질량지수와 허리·엉덩이 비율을 계산합니다.", "bmi whr 키 체중", "utility-toolbox.html#bmi-tool"],
    ["life", "45", "로또 번호 생성", "1부터 45까지 중복 없는 번호 6개를 생성합니다.", "로또 번호 랜덤", "utility-toolbox.html#lotto-tool"],
    ["text", "★", "특수문자·이모지", "자주 쓰는 기호를 검색하고 클릭해 복사합니다.", "특수문자 이모지 유니코드", "file-media-toolbox.html#character-map"],
    ["text", "ASCII", "ASCII·HTML 코드표", "인쇄 가능한 문자와 HTML 문자참조를 검색합니다.", "ascii html 코드표 문자참조", "file-media-toolbox.html#code-table"],
    ["media", "#", "색상 선택·변환", "HEX, RGB와 HSL 색상 값을 상호 확인합니다.", "색상 color hex rgb hsl", "file-media-toolbox.html#color-tool"],
    ["text", "±", "텍스트 비교", "두 문서를 줄 단위로 비교해 변경점을 표시합니다.", "텍스트 코드 비교 diff", "file-media-toolbox.html#text-diff"],
    ["text", "CC", "SMI → SRT 변환", "SMI 자막을 SRT 형식으로 바꾸고 싱크를 조정합니다.", "smi srt 자막 변환", "file-media-toolbox.html#subtitle-tool"],
    ["developer", "</>", "HTML 미리보기", "HTML 코드를 sandbox 환경에서 즉시 실행합니다.", "html 웹 에디터 미리보기", "file-media-toolbox.html#html-editor"],
    ["developer", "SHA", "파일 체크섬", "로컬 파일의 SHA-1·256·384·512 해시를 계산합니다.", "파일 checksum sha hash", "file-media-toolbox.html#checksum-tool"],
    ["media", "IMG", "이미지 압축·Data URL", "이미지를 리사이즈하고 압축해 Data URL로 변환합니다.", "이미지 압축 리사이즈 data url", "file-media-toolbox.html#image-tool"],
    ["media", "TTS", "문자 음성 변환", "브라우저 음성 합성으로 입력 문장을 읽습니다.", "tts 문자 음성 읽기", "file-media-toolbox.html#tts-tool"],
    ["media", "STT", "음성 문자 변환", "지원 브라우저에서 마이크 음성을 텍스트로 바꿉니다.", "stt 음성 문자 마이크", "file-media-toolbox.html#stt-tool"],
    ["text", "EML", "EML 뷰어", "로컬 이메일 파일의 헤더와 본문을 확인합니다.", "eml 이메일 메일 뷰어", "file-media-toolbox.html#eml-tool"],
    ["developer", "KEY", "키보드 이벤트", "JavaScript key, code와 modifier 상태를 확인합니다.", "키보드 이벤트 key code", "file-media-toolbox.html#key-event-tool"],
    ["date", "TIME", "시간 계산기", "시간 차이, 더하기·빼기, 근무시간과 단위를 계산합니다.", "시간 차이 근무시간 더하기 단위", "advanced-toolbox.html#time-tool"],
    ["developer", "{ }", "코드 정렬·압축", "JSON, CSS, JS, HTML과 SQL 코드를 정리하거나 압축합니다.", "코드 정렬 압축 beautify minify", "advanced-toolbox.html#code-tool"],
    ["developer", "KEY", "암호화 도구", "Hash, HMAC, PBKDF2와 AES-GCM을 Web Crypto로 실행합니다.", "암호화 hash hmac pbkdf2 aes", "advanced-toolbox.html#crypto-tool"],
    ["media", "QR", "QR·바코드 생성", "QR과 Code 39 바코드를 PNG 이미지로 생성합니다.", "qr barcode 바코드 생성", "advanced-toolbox.html#qr-barcode-tool"],
    ["media", "TXT", "ASCII 아트", "텍스트 배너와 로컬 이미지를 문자 그림으로 변환합니다.", "ascii art 아스키아트 이미지 텍스트", "advanced-toolbox.html#ascii-art-tool"],
    ["media", "GIF", "GIF 생성기", "여러 이미지를 애니메이션 GIF로 변환합니다.", "gif 움짤 애니메이션 이미지", "advanced-toolbox.html#gif-tool"],
    ["media", "3D", "매직아이 생성기", "텍스트를 숨긴 랜덤 도트 입체 이미지를 생성합니다.", "매직아이 stereogram 입체", "advanced-toolbox.html#magic-eye-tool"],
    ["life", "123", "숫자야구", "3·4·5자리 Bulls & Cows 게임을 즐깁니다.", "숫자야구 게임 bulls cows", "advanced-toolbox.html#baseball-tool"],
    ["media", "SCAN", "바코드 스캐너", "지원 브라우저에서 이미지와 카메라의 코드를 감지합니다.", "바코드 스캐너 qr 카메라", "advanced-toolbox.html#scanner-tool"],
    ["media", "LIGHT", "손전등", "화면 손전등과 지원 기기의 카메라 LED를 사용합니다.", "손전등 플래시 torch led", "advanced-toolbox.html#flashlight-tool"],
    ["game", "CPS", "클릭 속도 테스트", "제한 시간 동안 좌클릭 속도와 CPS를 측정합니다.", "cps click speed mouse gaming", "gaming-lab.html#cps-test"],
    ["game", "RC", "우클릭 CPS 테스트", "오른쪽 마우스 버튼 클릭 속도를 측정합니다.", "right click cps mouse", "gaming-lab.html#right-cps-test"],
    ["game", "2X", "더블클릭 테스트", "짧은 간격의 더블클릭과 클릭 튐을 감지합니다.", "double click debounce mouse", "gaming-lab.html#double-click-test"],
    ["game", "SCR", "스크롤 테스트", "휠 방향, 누적 이동량, 초당 이벤트 수를 확인합니다.", "scroll wheel mouse speed", "gaming-lab.html#scroll-test"],
    ["game", "Hz", "마우스 폴링레이트", "마우스 이동 이벤트 간격으로 폴링레이트를 추정합니다.", "polling rate hz mouse", "gaming-lab.html#polling-test"],
    ["game", "DPI", "DPI·감도 계산기", "eDPI와 cm/360 값을 계산해 게임 감도 조정을 돕습니다.", "dpi edpi sensitivity cm 360", "gaming-lab.html#dpi-tool"],
    ["game", "SPC", "스페이스바 테스트", "스페이스바 연타 횟수와 초당 입력수를 측정합니다.", "spacebar keyboard speed", "gaming-lab.html#spacebar-test"],
    ["game", "KEY", "키보드 입력 테스트", "눌린 키와 key/code, modifier 상태를 확인합니다.", "keyboard key test ghosting", "gaming-lab.html#keyboard-test"],
    ["game", "APM", "키 입력 속도", "키 입력수와 분당 입력 속도를 계산합니다.", "key speed apm kpm typing", "gaming-lab.html#key-speed-test"],
    ["game", "RT", "반응속도 테스트", "신호가 바뀐 뒤 클릭하기까지 걸린 시간을 측정합니다.", "reaction speed reflex", "gaming-lab.html#reaction-test"],
    ["game", "AIM", "에임 트레이너", "타겟 명중률과 평균 반응 시간을 측정합니다.", "aim trainer accuracy target", "gaming-lab.html#aim-trainer"],
    ["game", "LCD", "화면 테스트 패턴", "단색, 그리드, 그라데이션 패턴으로 화면을 확인합니다.", "monitor screen color dead pixel gradient", "gaming-lab.html#display-test"]
  ];

  const categoryLabels = {
    developer: "개발자",
    text: "텍스트",
    age: "나이·띠",
    date: "날짜",
    lunar: "양력·음력",
    calendar: "달력·학교",
    life: "생활",
    media: "이미지·미디어",
    game: "게임·장치"
  };

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
    if (category === "developer" || category === "text" || category === "life" || category === "media" || category === "game") return category;
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
