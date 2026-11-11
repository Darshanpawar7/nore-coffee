/**
 * The only Kannada the brand uses. Each word means exactly what it says here; a repository test fails
 * if any other Kannada appears anywhere in the source.
 */
export const KANNADA = {
  nore: { text: 'ನೊರೆ', meaning: 'Nore: froth' },
  kaapi: { text: 'ಕಾಫಿ', meaning: 'Coffee' },
  bengaluru: { text: 'ಬೆಂಗಳೂರು', meaning: 'Bengaluru' },
} as const;
