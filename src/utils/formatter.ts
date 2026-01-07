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
      text: '*地震情報*',
    },
    accessory: {
      type: 'image',
      image_url: getImageUrl('rotating_light.png'),
      alt_text: '地震情報',
    },
  });

  // Divider with color
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<!here> 地震が発生しました`,
    },
  });

  blocks.push({
    type: 'divider',
  });

  // Main earthquake information
  const earthquakeInfo = [`*発生時刻*\n${formatDateTime(quake.earthquake.time)}`];

  if (quake.earthquake.hypocenter?.name) {
    earthquakeInfo.push(`*震源地*\n${quake.earthquake.hypocenter.name}`);
  }

  if (quake.earthquake.hypocenter?.magnitude !== undefined) {
    const magnitude = quake.earthquake.hypocenter.magnitude;
    earthquakeInfo.push(`*マグニチュード*\nM${magnitude >= 0 ? magnitude.toFixed(1) : '不明'}`);
  }

  if (quake.earthquake.hypocenter?.depth !== undefined) {
    const depth = quake.earthquake.hypocenter.depth;
    earthquakeInfo.push(`*深さ*\n${depth >= 0 ? `約${depth}km` : '不明'}`);
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
        text: `*各地の震度*\n${observationText}`,
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
        text: `情報発表時刻: ${formatDateTime(quake.time)} | 提供: P2P地震情報`,
      },
    ],
  });

  // Add maximum intensity section
  blocks.splice(3, 0, {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*最大震度*\n${intensityToString(maxIntensity)}`,
    },
  });

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
      lines.push(`*${intensityStr}*: ${locations.join('、')}`);
    } else {
      const displayed = locations.slice(0, maxDisplay);
      const remaining = locations.length - maxDisplay;
      lines.push(`*${intensityStr}*: ${displayed.join('、')} 他${remaining}箇所`);
    }
  });

  return lines.join('\n');
}

/**
 * Format date time to Japanese format
 */
function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}時${minutes}分`;
}

/**
 * Get tsunami text from tsunami type
 */
function getTsunamiText(tsunamiType: string): string {
  const tsunamiMap: Record<string, string> = {
    None: 'なし',
    Unknown: '不明',
    Checking: '調査中',
    NonEffective: '若干の海面変動（被害の心配なし）',
    Watch: '津波注意報',
    Warning: '津波警報',
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
      text: '*津波情報*',
    },
    accessory: {
      type: 'image',
      image_url: getImageUrl('ocean.png'),
      alt_text: '津波情報',
    },
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<!here> 津波情報が発表されました`,
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
        text: '*この津波情報は解除されました*',
      },
    });
  }

  // Tsunami areas information
  if (tsunami.areas && tsunami.areas.length > 0) {
    const areasText = tsunami.areas
      .map((area) => {
        const grade = getTsunamiGradeText(area.grade);
        const immediate = area.immediate ? ' ⚠️ *直ちに避難*' : '';
        return `*${area.name}*: ${grade}${immediate}`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*津波予報区*\n${areasText}`,
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
        text: `情報発表時刻: ${formatDateTime(tsunami.time)} | 提供: P2P地震情報`,
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
      ? 'mega.png' // Use mega.png when no training-specific image is available
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

  // Add max predicted intensity
  if (maxPredictedIntensity > 0) {
    eewInfo.push(`*最大予測震度*\n${intensityToString(maxPredictedIntensity)}`);
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
 * Format time only (hours:minutes)
 */
function formatTime(dateTime: string): string {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
