export const getFlagURL = (code: string): string => {
    const lowerCode = code.toLowerCase();
    return lowerCode == 'el' ? `https://flagcdn.com/w160/gr.png` : `https://flagcdn.com/w160/${lowerCode}.png`; // 160px wide, expection for greece (uses GR code)
};