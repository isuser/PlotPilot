// High-visibility "accent" shades rather than muted/dark ones — plot
// boundaries need to read clearly over satellite imagery, which is
// dominated by dark, desaturated greens and browns that swallow anything
// less vivid (the previous dark-green default and brown option in
// particular were nearly invisible there).
export const PLOT_COLORS: string[] = [
  '#00E676', // vivid green
  '#2979FF', // vivid blue
  '#FF9100', // vivid orange
  '#FF1744', // vivid red
  '#D500F9', // vivid purple
  '#00E5FF', // vivid cyan
  '#FFEA00', // vivid yellow
  '#F50057', // vivid pink
];

export const DEFAULT_PLOT_COLOR = PLOT_COLORS[0];
