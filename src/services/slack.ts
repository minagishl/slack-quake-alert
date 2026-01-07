import { WebClient } from '@slack/web-api';
import type { KnownBlock } from '@slack/web-api';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export class SlackService {
  private client: WebClient;
  private channelId: string;

  constructor(token: string, channelId: string) {
    this.client = new WebClient(token);
    this.channelId = channelId;
  }

  /**
   * Send a message to Slack using Block Kit format
   */
  async sendMessage(blocks: KnownBlock[]): Promise<void> {
    try {
      // Log message in development environment
      if (config.nodeEnv === 'development') {
        logger.debug('Sending Slack message', {
          channelId: this.channelId,
          blockCount: blocks.length,
        });
      }

      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        blocks,
        text: 'Earthquake information', // Fallback text for notifications
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      logger.info('Slack message sent successfully', {
        channel: this.channelId,
        timestamp: result.ts,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to send Slack message', error);

        // Check for common error types
        if (error.message.includes('not_in_channel')) {
          logger.error('Bot is not in the channel. Please invite the bot to the channel first.');
        } else if (error.message.includes('channel_not_found')) {
          logger.error('Channel not found. Please check SLACK_CHANNEL_ID.');
        } else if (error.message.includes('invalid_auth')) {
          logger.error('Invalid authentication. Please check SLACK_BOT_TOKEN.');
        } else if (error.message.includes('rate_limited')) {
          logger.warn('Rate limited by Slack API. Message will be retried automatically.');
        }
      }

      throw error;
    }
  }
}
