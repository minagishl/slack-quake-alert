import { z } from 'zod';
import type { SeismicIntensity } from 'p2pquake-client';
import { parseIntensityString } from '../utils/intensity';

// Zod schema for environment variable validation
const envSchema = z.object({
  SLACK_BOT_TOKEN: z
    .string()
    .min(1, 'SLACK_BOT_TOKEN is required')
    .startsWith('xoxb-', 'SLACK_BOT_TOKEN must start with "xoxb-"'),
  SLACK_CHANNEL_ID: z
    .string()
    .min(1, 'SLACK_CHANNEL_ID is required')
    .regex(/^C[A-Z0-9]{10}$/, 'SLACK_CHANNEL_ID must match format C[A-Z0-9]{10}'),
  MIN_INTENSITY: z.string().optional().default('3'),
  NODE_ENV: z.enum(['development', 'production']).optional().default('development'),
  GITHUB_IMAGE_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://raw.githubusercontent.com/minagishl/slack-quake-alert/main/public'),
});

export interface Config {
  slackBotToken: string;
  slackChannelId: string;
  minIntensity: SeismicIntensity;
  nodeEnv: 'development' | 'production';
  githubImageBaseUrl: string;
}

/**
 * Load and validate environment variables
 */
function loadConfig(): Readonly<Config> {
  try {
    // Parse and validate environment variables
    const env = envSchema.parse({
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
      MIN_INTENSITY: process.env.MIN_INTENSITY,
      NODE_ENV: process.env.NODE_ENV,
      GITHUB_IMAGE_BASE_URL: process.env.GITHUB_IMAGE_BASE_URL,
    });

    // Parse MIN_INTENSITY string to SeismicIntensity value
    const minIntensity = parseIntensityString(env.MIN_INTENSITY);

    return Object.freeze({
      slackBotToken: env.SLACK_BOT_TOKEN,
      slackChannelId: env.SLACK_CHANNEL_ID,
      minIntensity,
      nodeEnv: env.NODE_ENV,
      githubImageBaseUrl: env.GITHUB_IMAGE_BASE_URL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else if (error instanceof Error) {
      console.error('Configuration error:', error.message);
    }

    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');

    process.exit(1);
  }
}

export const config = loadConfig();
