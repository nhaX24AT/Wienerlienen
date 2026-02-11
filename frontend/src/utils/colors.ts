export const lineColor = (line: string): string => {
  const ubahnColors: Record<string, string> = {
    U1: '#E20613',
    U2: '#A762A4',
    U3: '#F58220',
    U4: '#00A54F',
    U5: '#09B2C4',
    U6: '#8B6914'
  };

  if (ubahnColors[line]) return ubahnColors[line];
  if (line.startsWith('N')) return '#1E3A8A';
  if (/^\d+$/.test(line)) return '#B91C1C';
  return '#2563EB';
};
