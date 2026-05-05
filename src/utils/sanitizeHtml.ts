import DOMPurify, { type Config } from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
] as const;

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'src', 'alt', 'width', 'height'],
  ALLOWED_NAMESPACES: ['http://www.w3.org/1999/xhtml'],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_ATTR: ['style'],
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'svg',
    'math',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'style',
    'link',
    'meta',
    'base',
  ],
  RETURN_TRUSTED_TYPE: false,
};

const SAFE_LINK_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);
const SAFE_IMAGE_PROTOCOLS = new Set(['http', 'https']);

function getProtocol(value: string): string | null {
  const match = value.trim().match(/^([a-z][a-z0-9+.-]*):/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function isSafeUrl(value: string | null, protocols: Set<string>): boolean {
  if (!value) return false;
  const protocol = getProtocol(value);
  return protocol !== null && protocols.has(protocol);
}

function isAllowedAttributeForTag(tagName: string, attributeName: string): boolean {
  if (attributeName === 'title') return true;
  if (tagName === 'a') return ['href', 'target', 'rel'].includes(attributeName);
  if (tagName === 'img') return ['src', 'alt', 'width', 'height'].includes(attributeName);
  return false;
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element)) return;

  const tagName = node.tagName.toLowerCase();

  for (const attribute of Array.from(node.attributes)) {
    const name = attribute.name.toLowerCase();
    if (
      name === 'style' ||
      name.startsWith('on') ||
      name === 'xlink:href' ||
      !isAllowedAttributeForTag(tagName, name)
    ) {
      node.removeAttribute(attribute.name);
    }
  }

  if (tagName === 'a') {
    if (!isSafeUrl(node.getAttribute('href'), SAFE_LINK_PROTOCOLS)) {
      node.removeAttribute('href');
    }

    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.removeAttribute('target');
    }
  }

  if (tagName === 'img' && !isSafeUrl(node.getAttribute('src'), SAFE_IMAGE_PROTOCOLS)) {
    node.removeAttribute('src');
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
