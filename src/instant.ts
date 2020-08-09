export function instant() {
  const [s, ns] = process.hrtime();
  return s * 1e3 + ns / 1e6;
}
