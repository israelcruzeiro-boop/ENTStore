import type { CSSProperties } from 'react';
import type { Company, Theme } from '../types';

export type EnvironmentTemplate = NonNullable<Company['landing_page_layout']>;

export const ENVIRONMENT_TEMPLATES: Array<{
  id: EnvironmentTemplate;
  label: string;
  desc: string;
}> = [
  {
    id: 'classic',
    label: 'Classico',
    desc: 'Estrutura editorial limpa, com capa e secoes horizontais equilibradas.',
  },
  {
    id: 'gradient',
    label: 'Degrade Premium',
    desc: 'Ambiente com camadas suaves da marca e maior sensacao de profundidade.',
  },
  {
    id: 'immersive',
    label: 'Imersivo',
    desc: 'Home mais cinematica, com conteudo avancando sobre a capa.',
  },
  {
    id: 'solid',
    label: 'Recorte Seco',
    desc: 'Layout objetivo, geometricamente mais forte e com divisorias nitidas.',
  },
];

export const DEFAULT_THEME: Theme = {
  primary: '#2563EB',
  secondary: '#1D4ED8',
  background: '#09090b',
  card: '#18181b',
  text: '#ffffff',
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TEMPLATE_WHITELIST: EnvironmentTemplate[] = ['classic', 'gradient', 'immersive', 'solid'];

export const normalizeThemeColor = (value: string | undefined | null, fallback: string) => {
  const normalized = value?.trim();
  return normalized && HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback;
};

export const normalizeTheme = (theme?: Partial<Theme> | null): Theme => ({
  primary: normalizeThemeColor(theme?.primary, DEFAULT_THEME.primary),
  secondary: normalizeThemeColor(theme?.secondary, DEFAULT_THEME.secondary),
  background: normalizeThemeColor(theme?.background, DEFAULT_THEME.background),
  card: normalizeThemeColor(theme?.card, normalizeThemeColor(theme?.background, DEFAULT_THEME.card)),
  text: normalizeThemeColor(theme?.text, DEFAULT_THEME.text),
});

export const normalizeEnvironmentTemplate = (
  template?: string | null,
): EnvironmentTemplate => {
  return TEMPLATE_WHITELIST.includes(template as EnvironmentTemplate)
    ? (template as EnvironmentTemplate)
    : 'classic';
};

const parseHex = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().replace('#', '');
  const hex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
};

export const hexToRgbChannel = (value?: string | null, fallback = '255 255 255') => {
  const parsed = parseHex(value);
  return parsed ? `${parsed.r} ${parsed.g} ${parsed.b}` : fallback;
};

export const isLightColor = (value?: string | null) => {
  const parsed = parseHex(value);
  if (!parsed) return false;
  const luminance = (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255;
  return luminance > 0.72;
};

export const getContrastText = (background?: string | null) =>
  isLightColor(background) ? '#111827' : '#ffffff';

export const buildThemeStyle = (themeInput?: Partial<Theme> | null): CSSProperties => {
  const theme = normalizeTheme(themeInput);

  return {
    '--c-primary': theme.primary,
    '--c-primary-rgb': hexToRgbChannel(theme.primary, '37 99 235'),
    '--c-secondary': theme.secondary,
    '--c-secondary-rgb': hexToRgbChannel(theme.secondary, '29 78 216'),
    '--c-bg': theme.background,
    '--c-bg-rgb': hexToRgbChannel(theme.background, '9 9 11'),
    '--c-card': theme.card,
    '--c-card-rgb': hexToRgbChannel(theme.card, hexToRgbChannel(theme.background, '24 24 27')),
    '--c-text': theme.text,
    '--c-text-rgb': hexToRgbChannel(theme.text, '255 255 255'),
  } as CSSProperties;
};
