export const getFlagURL = (code: string): string => {
    const lowerCode = code.toLowerCase();
    return lowerCode == 'el' ? `https://flagcdn.com/w160/gr.png` : `https://flagcdn.com/w160/${lowerCode}.png`; // 160px wide, expection for greece (uses GR code)
};
export function countryCodeToEmoji(code: string) {
  if (!code || code.length !== 2) return '';
  // convert 'US' -> 🇺🇸
  const OFFSET = 0x1f1e6 - 65;
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) + OFFSET,
    code.toUpperCase().charCodeAt(1) + OFFSET
  );
}