export function isChristmas(): boolean {
  const christmas =
    (new Date().getMonth() === 11 && new Date().getDate() >= 1) || // December (month 11)
    (new Date().getMonth() === 0 && new Date().getDate() <= 6); // January (month 0)
  return christmas;
}
