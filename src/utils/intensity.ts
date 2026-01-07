import type { SeismicIntensity } from 'p2pquake-client';

// Mapping from p2pquake-client SeismicIntensity values to display strings
const INTENSITY_MAP: Record<SeismicIntensity, string> = {
  [-1]: '不明',
  0: '震度0',
  10: '震度1',
  20: '震度2',
  30: '震度3',
  40: '震度4',
  45: '震度5弱',
  50: '震度5強',
  55: '震度6弱',
  60: '震度6強',
  70: '震度7',
  99: '異常',
};

// Mapping from string to SeismicIntensity for environment variable parsing
const STRING_TO_INTENSITY: Record<string, SeismicIntensity> = {
  '1': 10,
  '2': 20,
  '3': 30,
  '4': 40,
  '5-': 45,
  '5弱': 45,
  '5+': 50,
  '5強': 50,
  '6-': 55,
  '6弱': 55,
  '6+': 60,
  '6強': 60,
  '7': 70,
};

// Color mapping for Slack Block Kit based on intensity
const INTENSITY_COLORS: Record<string, string> = {
  low: '#3AA3E3', // Blue - intensity <= 30
  moderate: '#F2C744', // Yellow - intensity 40
  high: '#F18D00', // Orange - intensity 45-50
  severe: '#E2231A', // Red - intensity >= 55
};

/**
 * Convert SeismicIntensity value to human-readable string
 */
export function intensityToString(intensity: SeismicIntensity): string {
  return INTENSITY_MAP[intensity] || '不明';
}

/**
 * Parse intensity string from environment variable to SeismicIntensity
 */
export function parseIntensityString(str: string): SeismicIntensity {
  const intensity = STRING_TO_INTENSITY[str];
  if (intensity === undefined) {
    throw new Error(
      `Invalid intensity string: ${str}. Valid values: 1, 2, 3, 4, 5-, 5+, 6-, 6+, 7`
    );
  }
  return intensity;
}

/**
 * Check if the intensity meets or exceeds the threshold for notification
 */
export function shouldNotify(intensity: SeismicIntensity, threshold: SeismicIntensity): boolean {
  // Handle unknown or abnormal intensities
  if (intensity < 0 || intensity === 99) {
    return false;
  }

  return intensity >= threshold;
}

/**
 * Get color code for Slack Block Kit based on intensity
 */
export function getIntensityColor(intensity: SeismicIntensity): string {
  if (intensity <= 30) {
    return INTENSITY_COLORS.low;
  } else if (intensity === 40) {
    return INTENSITY_COLORS.moderate;
  } else if (intensity >= 45 && intensity <= 50) {
    return INTENSITY_COLORS.high;
  } else {
    return INTENSITY_COLORS.severe;
  }
}
