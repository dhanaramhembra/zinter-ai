export interface AvatarOption {
  id: string;
  label: string;
  gradient: string;
  icon: string;
  ringColor: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'emerald',
    label: 'Emerald',
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    icon: 'E',
    ringColor: 'ring-emerald-500/30',
  },
  {
    id: 'violet',
    label: 'Violet',
    gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
    icon: 'V',
    ringColor: 'ring-violet-500/30',
  },
  {
    id: 'rose',
    label: 'Rose',
    gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
    icon: 'R',
    ringColor: 'ring-rose-500/30',
  },
  {
    id: 'amber',
    label: 'Amber',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: 'A',
    ringColor: 'ring-amber-500/30',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    icon: 'C',
    ringColor: 'ring-cyan-500/30',
  },
  {
    id: 'lime',
    label: 'Lime',
    gradient: 'bg-gradient-to-br from-lime-500 to-green-600',
    icon: 'L',
    ringColor: 'ring-lime-500/30',
  },
  {
    id: 'fuchsia',
    label: 'Fuchsia',
    gradient: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
    icon: 'F',
    ringColor: 'ring-fuchsia-500/30',
  },
  {
    id: 'sky',
    label: 'Sky',
    gradient: 'bg-gradient-to-br from-sky-500 to-indigo-600',
    icon: 'S',
    ringColor: 'ring-sky-500/30',
  },
  {
    id: 'red',
    label: 'Red',
    gradient: 'bg-gradient-to-br from-red-500 to-rose-600',
    icon: 'R',
    ringColor: 'ring-red-500/30',
  },
  {
    id: 'teal',
    label: 'Teal',
    gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    icon: 'T',
    ringColor: 'ring-teal-500/30',
  },
];

export const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number]['code'];
