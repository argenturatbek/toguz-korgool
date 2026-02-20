export type Lang = 'en' | 'ru' | 'ky';

const STORAGE_KEY = 'toguz_lang';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Toguz Korgool',
    playLocally: 'Play locally',
    createOnline: 'Create online game',
    copyLink: 'Copy link',
    copied: 'Copied!',
    waitingForOpponent: 'Waiting for opponent… Share the link below.',
    kazans: 'Kazans',
    kazanP1: 'P1 Kazan',
    kazanP2: 'P2 Kazan',
    yourTurn: 'Your turn',
    opponentTurn: "Opponent's turn",
    newGame: 'New game',
    player1Wins: 'Player 1 wins',
    player2Wins: 'Player 2 wins',
    draw: 'Draw',
    capturedFrom: 'Captured',
    fromOpponentHole: "from opponent's hole",
    errorCreateGame: 'Could not create game. Is the server running?',
    langEn: 'English',
    langRu: 'Русский',
    langKy: 'Кыргызча',
  },
  ru: {
    title: 'Тогуз коргоол',
    playLocally: 'Играть вдвоём',
    createOnline: 'Создать игру по ссылке',
    copyLink: 'Скопировать ссылку',
    copied: 'Скопировано!',
    waitingForOpponent: 'Ожидание соперника… Отправьте ссылку ниже.',
    kazans: 'Казаны',
    kazanP1: 'Казан 1',
    kazanP2: 'Казан 2',
    yourTurn: 'Ваш ход',
    opponentTurn: 'Ход соперника',
    newGame: 'Новая игра',
    player1Wins: 'Игрок 1 победил',
    player2Wins: 'Игрок 2 победил',
    draw: 'Ничья',
    capturedFrom: 'Захвачено',
    fromOpponentHole: 'из лунки соперника',
    errorCreateGame: 'Не удалось создать игру. Запущен ли сервер?',
    langEn: 'English',
    langRu: 'Русский',
    langKy: 'Кыргызча',
  },
  ky: {
    title: 'Тогуз коргоол',
    playLocally: 'Жергиликтүү ойноо',
    createOnline: 'Онлайн ойун түзүү',
    copyLink: 'Шилтемени көчүрүү',
    copied: 'Көчүрүлдү!',
    waitingForOpponent: 'Каршы тарапты күтүү… Төмөнкү шилтемени жөнөтүңүз.',
    kazans: 'Казандар',
    kazanP1: '1-казан',
    kazanP2: '2-казан',
    yourTurn: 'Сиздин кезегиңиз',
    opponentTurn: 'Каршы тараптын кезеги',
    newGame: 'Жаңы ойун',
    player1Wins: '1-ойунчу утту',
    player2Wins: '2-ойунчу утту',
    draw: 'Тен',
    capturedFrom: 'Тутту',
    fromOpponentHole: 'каршы тараптын тешиги',
    errorCreateGame: 'Ойун түзүлбөдү. Сервер иштеп жатабы?',
    langEn: 'English',
    langRu: 'Русский',
    langKy: 'Кыргызча',
  },
};

let current: Lang = (localStorage.getItem(STORAGE_KEY) as Lang) || 'en';
if (!translations[current]) current = 'en';

const listeners: Array<() => void> = [];

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current || !translations[lang]) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach((f) => f());
}

export function t(key: keyof typeof translations.en): string {
  return translations[current][key] ?? translations.en[key] ?? key;
}

export function onLangChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export const LANGUAGES: { code: Lang; labelKey: 'langEn' | 'langRu' | 'langKy' }[] = [
  { code: 'en', labelKey: 'langEn' },
  { code: 'ru', labelKey: 'langRu' },
  { code: 'ky', labelKey: 'langKy' },
];
