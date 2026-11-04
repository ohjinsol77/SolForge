const POOLS = {"ko": {"indianA": ["\uace0\uc694\ud55c", "\ud478\ub978", "\ube5b\ub098\ub294", "\uc6a9\uac10\ud55c", "\ub530\ub73b\ud55c", "\uc790\uc720\ub85c\uc6b4", "\uae4a\uc740", "\ube60\ub978", "\uc740\ube5b", "\ubd89\uc740", "\uc0c8\ubcbd\uc758", "\ubcc4\uc744 \ubcf4\ub294"], "indianB": ["\ubc14\ub78c", "\uac15", "\ub2ec", "\uc0b0", "\uad6c\ub984", "\ubd88\uaf43", "\ud638\uc218", "\uc232", "\ub178\uc744", "\ud30c\ub3c4", "\ubcc4", "\ud558\ub298"], "indianC": ["\uc758 \ub178\ub798", "\uc758 \ubc1c\uac78\uc74c", "\uc744 \uc9c0\ud0a4\ub294 \uc774", "\uacfc \uac77\ub294 \uc774", "\uc758 \uce5c\uad6c", "\uc744 \uae68\uc6b0\ub294 \uc774", "\uc758 \uc228\uacb0", "\uc744 \ud488\uc740 \uc774"], "chosunA": ["\ud55c\uc591", "\ub0a8\uc0b0", "\uccad\uacc4", "\ubd81\ucd0c", "\uc11c\ucd0c", "\uac15\ub989", "\ub2f4\uc591", "\uc804\uc8fc", "\uacbd\uc8fc", "\uc81c\uc8fc", "\ud574\uc8fc", "\ud3c9\uc591"], "chosunB": ["\uae40", "\uc774", "\ubc15", "\ucd5c", "\uc815", "\uac15", "\uc870", "\uc724", "\uc7a5", "\uc784"], "chosunC": ["\ub3c4\ub839", "\ub0ad\uc790", "\uc120\ube44", "\ub300\uac10", "\ubcc4\uac10", "\ucc38\ubd09", "\ud6c8\uc7a5", "\uac1d\uc8fc", "\ud654\uacf5", "\uc758\uc6d0"]}, "en": {"indianA": ["Quiet", "Blue", "Bright", "Brave", "Warm", "Free", "Deep", "Swift", "Silver", "Red", "Dawn", "Starry"], "indianB": ["Wind", "River", "Moon", "Peak", "Cloud", "Flame", "Lake", "Forest", "Sunset", "Wave", "Star", "Sky"], "indianC": [" Song", " Walker", " Keeper", " Companion", " Friend", " Waker", " Breath", " Guardian"], "chosunA": ["Hanyang", "Namsan", "Cheonggye", "Bukchon", "Seochon", "Gangneung", "Damyang", "Jeonju", "Gyeongju", "Jeju", "Haeju", "Pyongyang"], "chosunB": ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim"], "chosunC": ["Scholar", "Lady", "Sage", "Lord", "Officer", "Clerk", "Tutor", "Trader", "Artist", "Healer"]}};

export function funNamesForDate(date, lang = 'ko') {
 const p = POOLS[lang === 'en' ? 'en' : 'ko'];
 const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
 return {
  indian: `${p.indianA[date.getMonth()]} ${p.indianB[(date.getDate()-1)%12]}${p.indianC[seed%8]}`,
  chosun: `${p.chosunA[date.getMonth()]} ${p.chosunB[seed%10]}${p.chosunC[(date.getDate()-1)%10]}`
 };
}
export function randomFunNickname(lang = 'ko', random = Math.random) {
 const date = new Date(1980+Math.floor(random()*35),Math.floor(random()*12),1+Math.floor(random()*28));
 const names = funNamesForDate(date,lang);
 let name;
 if (lang === 'en') {
  const p=POOLS.en;
  name=p.indianA[date.getMonth()]+p.indianB[(date.getDate()-1)%12];
 } else name=(random()<0.5?names.indian:names.chosun).replaceAll(' ','');
 return name.slice(0,18)+(random()<0.3?String(Math.floor(random()*90)+10):'');
}
