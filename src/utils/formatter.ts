import type { JMAQuake, JMATsunami, EEW, SeismicIntensity } from 'p2pquake-client';
import type { KnownBlock } from '@slack/web-api';
import { intensityToString } from './intensity';
import { config } from '../config/env';

/**
 * Get image URL from GitHub
 */
function getImageUrl(filename: string): string {
  const baseUrl = config.githubImageBaseUrl.endsWith('/')
    ? config.githubImageBaseUrl.slice(0, -1)
    : config.githubImageBaseUrl;
  return `${baseUrl}/${filename}`;
}

/**
 * Format JMA earthquake information into Slack Block Kit format
 */
export function formatQuakeMessage(quake: JMAQuake): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  // Get max intensity
  const maxIntensity = quake.earthquake.maxScale;

  // Header section with image
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Earthquake Information*',
    },
    accessory: {
      type: 'image',
      image_url: getImageUrl('rotating_light.png'),
      alt_text: 'Earthquake Information',
    },
  });

  // Divider with color
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `An earthquake occurred`,
    },
  });

  blocks.push({
    type: 'divider',
  });

  // Main earthquake information
  const earthquakeInfo = [`*Occurrence Time*\n${formatDateTime(quake.earthquake.time)}`];

  if (quake.earthquake.hypocenter?.name) {
    earthquakeInfo.push(`*Epicenter*\n${quake.earthquake.hypocenter.name}`);
  }

  if (quake.earthquake.hypocenter?.magnitude !== undefined) {
    const magnitude = quake.earthquake.hypocenter.magnitude;
    earthquakeInfo.push(`*Magnitude*\nM${magnitude >= 0 ? magnitude.toFixed(1) : 'Unknown'}`);
  }

  if (quake.earthquake.hypocenter?.depth !== undefined) {
    const depth = quake.earthquake.hypocenter.depth;
    earthquakeInfo.push(`*Depth*\n${depth >= 0 ? `Approx. ${depth}km` : 'Unknown'}`);
  }

  // Tsunami information
  if (quake.earthquake.domesticTsunami) {
    const tsunamiText = getTsunamiText(quake.earthquake.domesticTsunami);
    earthquakeInfo.push(`*津波*\n${tsunamiText}`);
  }

  blocks.push({
    type: 'section',
    fields: earthquakeInfo.map((text) => ({
      type: 'mrkdwn',
      text,
    })),
  });

  // Observation points grouped by intensity
  if (quake.points && quake.points.length > 0) {
    blocks.push({
      type: 'divider',
    });

    const observationText = formatObservationPoints(quake.points);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Intensity at Various Locations*\n${observationText}`,
      },
    });
  }

  // Footer
  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Information Release Time: ${formatDateTime(quake.time)} | Provided by: P2P Earthquake Information`,
      },
    ],
  });

  // Add intensity image as accessory before main info
  const intensityBlock: KnownBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Maximum Intensity*\n${intensityToString(maxIntensity)}`,
    },
    accessory: {
      type: 'image',
      image_url: getIntensityImageUrl(maxIntensity),
      alt_text: intensityToString(maxIntensity),
    },
  };

  // Insert intensity block before earthquake info section
  const earthquakeInfoIndex = blocks.findIndex(
    (block) => block.type === 'section' && 'fields' in block
  );
  if (earthquakeInfoIndex >= 0) {
    blocks.splice(earthquakeInfoIndex, 0, intensityBlock);
  } else {
    blocks.push(intensityBlock);
  }

  return blocks;
}

/**
 * Format observation points grouped by intensity (descending order)
 */
function formatObservationPoints(
  points: Array<{ addr: string; scale: SeismicIntensity; isArea: boolean }>
): string {
  // Group by intensity
  const grouped = new Map<SeismicIntensity, string[]>();

  points.forEach((point) => {
    const locations = grouped.get(point.scale) || [];
    locations.push(point.addr);
    grouped.set(point.scale, locations);
  });

  // Sort by intensity (descending)
  const sortedIntensities = Array.from(grouped.keys()).sort((a, b) => b - a);

  // Format each intensity group
  const lines: string[] = [];
  const maxDisplay = 10;

  sortedIntensities.forEach((intensity) => {
    const locations = grouped.get(intensity) || [];
    const intensityStr = intensityToString(intensity);

    if (locations.length <= maxDisplay) {
      lines.push(`*${intensityStr}*: ${locations.join(', ')}`);
    } else {
      const displayed = locations.slice(0, maxDisplay);
      const remaining = locations.length - maxDisplay;
      lines.push(`*${intensityStr}*: ${displayed.join(', ')} and ${remaining} other locations`);
    }
  });

  return lines.join('\n');
}

/**
 * Format date time to English format
 */
function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * Get tsunami text from tsunami type
 */
function getTsunamiText(tsunamiType: string): string {
  const tsunamiMap: Record<string, string> = {
    None: 'None',
    Unknown: 'Unknown',
    Checking: 'Under investigation',
    NonEffective: 'Minor sea level change (no damage expected)',
    Watch: 'Tsunami Advisory',
    Warning: 'Tsunami Warning',
  };

  return tsunamiMap[tsunamiType] || tsunamiType;
}

/**
 * Format JMA tsunami information into Slack Block Kit format
 */
export function formatTsunamiMessage(tsunami: JMATsunami): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  // Header section with image
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Tsunami Information*',
    },
    accessory: {
      type: 'image',
      image_url: getImageUrl('ocean.png'),
      alt_text: 'Tsunami Information',
    },
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Tsunami information has been issued`,
    },
  });

  blocks.push({
    type: 'divider',
  });

  // Check if tsunami is cancelled
  if (tsunami.cancelled) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*This tsunami information has been cancelled*',
      },
    });
  }

  // Tsunami areas information
  if (tsunami.areas && tsunami.areas.length > 0) {
    // Create a section for each area (to display images)
    tsunami.areas.forEach((area) => {
      const grade = getTsunamiGradeText(area.grade);
      const immediate = area.immediate ? ' *Evacuate immediately*' : '';
      const gradeImageUrl = getTsunamiGradeImageUrl(area.grade);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${area.name}*\n${grade}${immediate}`,
        },
        accessory: gradeImageUrl
          ? {
              type: 'image',
              image_url: gradeImageUrl,
              alt_text: grade,
            }
          : undefined,
      });
    });
  }

  // Footer
  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Information Release Time: ${formatDateTime(tsunami.time)} | Provided by: P2P Earthquake Information`,
      },
    ],
  });

  return blocks;
}

/**
 * Format EEW information into Slack Block Kit format
 */
export function formatEEWMessage(eew: EEW): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  // Determine alert level and emoji
  const isCancelled = eew.cancelled;
  const isTest = eew.test;

  // Determine if warning based on predicted intensity in areas
  const maxPredictedIntensity = (eew.areas?.reduce<number>((max, area) => {
    return Math.max(max, area.scaleTo || 0);
  }, 0) || 0) as SeismicIntensity;
  const isWarning = maxPredictedIntensity >= 50; // Intensity 5-strong or higher

  const imageFilename = isCancelled
    ? 'no.png'
    : isTest
      ? 'mega.png' // 訓練用の画像がない場合はmega.pngを使用
      : isWarning
        ? 'warning.png'
        : 'mega.png';
  const title = isCancelled
    ? '緊急地震速報（キャンセル）'
    : isTest
      ? '緊急地震速報（訓練）'
      : '緊急地震速報';

  // Header section with image
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${title}*`,
    },
    accessory: {
      type: 'image',
      image_url: getImageUrl(imageFilename),
      alt_text: title,
    },
  });

  // Alert message
  const alertText = isCancelled
    ? '緊急地震速報がキャンセルされました'
    : isTest
      ? '**これは訓練です**'
      : isWarning
        ? '**強い揺れに警戒してください**'
        : '緊急地震速報を受信しました';

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: alertText,
    },
    accessory: isWarning
      ? {
          type: 'image',
          image_url: getImageUrl('warning.png'),
          alt_text: '警告',
        }
      : undefined,
  });

  blocks.push({
    type: 'divider',
  });

  // EEW information
  const eewInfo = [];

  if (eew.earthquake?.originTime) {
    eewInfo.push(`*発生時刻*\n${formatDateTime(eew.earthquake.originTime)}`);
  }

  if (eew.earthquake?.hypocenter?.name) {
    eewInfo.push(`*震源地*\n${eew.earthquake.hypocenter.name}`);
  }

  if (
    eew.earthquake?.hypocenter?.magnitude !== undefined &&
    eew.earthquake.hypocenter.magnitude >= 0
  ) {
    eewInfo.push(`*マグニチュード*\nM${eew.earthquake.hypocenter.magnitude.toFixed(1)}`);
  }

  if (eew.earthquake?.hypocenter?.depth !== undefined && eew.earthquake.hypocenter.depth >= 0) {
    eewInfo.push(`*深さ*\n約${eew.earthquake.hypocenter.depth}km`);
  }

  // Add max predicted intensity with image
  if (maxPredictedIntensity > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*最大予測震度*\n${intensityToString(maxPredictedIntensity)}`,
      },
      accessory: {
        type: 'image',
        image_url: getIntensityImageUrl(maxPredictedIntensity),
        alt_text: intensityToString(maxPredictedIntensity),
      },
    });
  }

  if (eewInfo.length > 0) {
    blocks.push({
      type: 'section',
      fields: eewInfo.map((text) => ({
        type: 'mrkdwn',
        text,
      })),
    });
  }

  // Areas information
  if (eew.areas && eew.areas.length > 0 && !isCancelled) {
    blocks.push({
      type: 'divider',
    });

    const areasText = eew.areas
      .slice(0, 15) // Limit to 15 areas
      .map((area) => {
        const intensityFrom = area.scaleFrom ? intensityToString(area.scaleFrom) : '予測震度不明';
        const intensityTo =
          area.scaleTo && area.scaleTo !== area.scaleFrom
            ? `〜${intensityToString(area.scaleTo)}`
            : '';
        const arrivalTime = area.arrivalTime ? ` (${formatTime(area.arrivalTime)})` : '';
        return `*${area.name}*: ${intensityFrom}${intensityTo}${arrivalTime}`;
      })
      .join('\n');

    const remaining = eew.areas.length > 15 ? ` 他${eew.areas.length - 15}地域` : '';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*予測震度*\n${areasText}${remaining}`,
      },
    });
  }

  // Footer
  blocks.push({
    type: 'divider',
  });

  const issueType = isTest ? '訓練' : `第${eew.issue.serial}報`;

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${issueType} | 情報発表時刻: ${formatDateTime(eew.time)}`,
      },
    ],
  });

  return blocks;
}

/**
 * Get tsunami grade text
 */
function getTsunamiGradeText(grade: string): string {
  const gradeMap: Record<string, string> = {
    MajorWarning: '大津波警報',
    Warning: '津波警報',
    Watch: '津波注意報',
    Unknown: '不明',
  };

  return gradeMap[grade] || grade;
}

/**
 * Get tsunami grade image URL
 */
function getTsunamiGradeImageUrl(grade: string): string {
  const imageMap: Record<string, string> = {
    MajorWarning: 'circle_red.png',
    Warning: 'circle_orange.png',
    Watch: 'circle_yellow.png',
  };

  return imageMap[grade] ? getImageUrl(imageMap[grade]) : '';
}

/**
 * Get intensity image URL
 */
function getIntensityImageUrl(intensity: SeismicIntensity): string {
  // 震度に応じた画像ファイル名を返す
  // 現在は震度の画像がないため、警告レベルの画像を使用
  if (intensity >= 55) {
    return getImageUrl('circle_red.png'); // 震度6弱以上
  } else if (intensity >= 45) {
    return getImageUrl('circle_orange.png'); // 震度5弱以上
  } else if (intensity >= 30) {
    return getImageUrl('circle_yellow.png'); // 震度3以上
  }
  return getImageUrl('mega.png'); // その他
}

/**
 * Format time only (hours:minutes)
 */
function formatTime(dateTime: string): string {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
