import { ko } from './locales/ko';

export type Language = 'en' | 'ko';

// The names are in their own language, so a player can find theirs whatever language is on.
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
];

// The text in the code is English and is its own key. A language lists the text it translates, and
// the text without a translation stays English.
const DICTIONARIES: Record<Language, Record<string, string>> = { en: {}, ko };

let language: Language = 'en';

export const getLanguage = () => language;

export function setLanguage(next: Language) {
  language = next;
  document.documentElement.lang = next;
}

// The final consonant of the last Hangul syllable of a text, as its index among the 28 finals of
// Unicode, where 0 is none and 8 is ㄹ. Text that does not end in Hangul counts as having none.
function finalConsonant(text: string): number {
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
}

const RIEUL = 8;

// Puts the values into the {name} places of a text. A place may carry the two forms of a Korean
// particle, as {name|을|를}: the first goes after a value that ends in a consonant, and the second
// after any other. 으로 also gives way to 로 after ㄹ.
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(
    /\{(\w+)(?:\|([^|}]*)\|([^|}]*))?\}/g,
    (place, name: string, afterConsonant?: string, afterVowel?: string) => {
      if (!(name in values)) {
        return place;
      }
      const value = String(values[name]);
      if (afterConsonant === undefined) {
        return value;
      }
      const final = finalConsonant(value);
      const takesFirst = final !== 0 && !(afterConsonant === '으로' && final === RIEUL);
      return value + (takesFirst ? afterConsonant : afterVowel);
    },
  );
}

// The text in the language now on, with the values in its {name} places.
export function t(text: string, values?: Record<string, string | number>): string {
  const template = DICTIONARIES[language][text] ?? text;
  return values ? fill(template, values) : template;
}

// Text that is translated when it is shown, not when it is made, so that text kept for later, such
// as the log, follows a change of language. A value is a number, a phrase, or a list of phrases,
// which are joined by commas. A key without a translation is shown as it is, so a key such as
// '{a} {b}' joins phrases.
export interface Phrase {
  key: string;
  values?: Record<string, PhraseValue>;
  // Set for a name in the middle of an English sentence. Korean has no case, so it changes nothing.
  isLowerCase?: boolean;
}

type PhraseValue = number | Phrase | Phrase[];

export const phrase = (key: string, values?: Record<string, PhraseValue>): Phrase => ({
  key,
  values,
});

export const lowerCase = (text: Phrase): Phrase => ({ ...text, isLowerCase: true });

const translateValue = (value: PhraseValue): string | number =>
  typeof value === 'number'
    ? value
    : Array.isArray(value)
      ? value.map(translate).join(', ')
      : translate(value);

// The phrase in the language now on.
export function translate({ key, values, isLowerCase }: Phrase): string {
  const filled =
    values &&
    Object.fromEntries(Object.entries(values).map(([name, value]) => [name, translateValue(value)]));
  const text = t(key, filled);
  return isLowerCase ? text.toLowerCase() : text;
}

// Sets the text of the elements of the page that carry a key, in the language now on. The key is
// the English text, as written in the page.
export function translatePage(root: ParentNode = document) {
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n!);
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nAria!));
  }
}

// The language a player's browser asks for, among those the game has.
export function browserLanguage(): Language {
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
