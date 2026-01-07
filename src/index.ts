import { config } from './config/env';
import { logger } from './utils/logger';
import { shouldNotify } from './utils/intensity';
import { formatQuakeMessage, formatTsunamiMessage, formatEEWMessage } from './utils/formatter';
import { SlackService } from './services/slack';
import { P2PQuakeService } from './services/p2pquake';

/**
 * Initialize and start the application
 */
async function main() {
  logger.info('Starting Slack Quake Alert...', {
    nodeEnv: config.nodeEnv,
    minIntensity: config.minIntensity,
  });

  // Initialize services
  const slackService = new SlackService(config.slackBotToken, config.slackChannelId);
  const p2pquakeService = new P2PQuakeService();

  // Register earthquake information handler (Code 551)
  p2pquakeService.onQuake(async (quake) => {
    try {
      const maxIntensity = quake.earthquake.maxScale;

      logger.info('Earthquake information received', {
        maxIntensity,
        time: quake.earthquake.time,
        location: quake.earthquake.hypocenter?.name,
      });

      // Filter by minimum intensity
      if (!shouldNotify(maxIntensity, config.minIntensity)) {
        logger.debug('Earthquake intensity below threshold, skipping notification', {
          maxIntensity,
          threshold: config.minIntensity,
        });
        return;
      }

      // Format message
      const blocks = formatQuakeMessage(quake);

      // Send to Slack
      await slackService.sendMessage(blocks);

      logger.info('Earthquake notification sent successfully');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to process earthquake information', error);
      }
    }
  });

  // Register tsunami information handler (Code 552)
  p2pquakeService.onTsunami(async (tsunami) => {
    try {
      logger.info('Tsunami information received', {
        cancelled: tsunami.cancelled,
        time: tsunami.time,
        areas: tsunami.areas?.length || 0,
      });

      // Format message
      const blocks = formatTsunamiMessage(tsunami);

      // Send to Slack
      await slackService.sendMessage(blocks);

      logger.info('Tsunami notification sent successfully');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to process tsunami information', error);
      }
    }
  });

  // Register EEW handler (Code 556)
  p2pquakeService.onEEW(async (eew) => {
    try {
      const maxIntensity =
        eew.areas?.reduce((max, area) => Math.max(max, area.scaleTo || 0), 0) || 0;

      logger.info('EEW information received', {
        cancelled: eew.cancelled,
        test: eew.test,
        maxIntensity,
        serial: eew.issue.serial,
      });

      // Format message
      const blocks = formatEEWMessage(eew);

      // Send to Slack
      await slackService.sendMessage(blocks);

      logger.info('EEW notification sent successfully');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to process EEW information', error);
      }
    }
  });

  // Connect to P2PQuake WebSocket
  try {
    await p2pquakeService.connect();
    logger.info('Application started successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to start application', error);
    }
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    p2pquakeService.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Handle unhandled errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown();
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(
      'Unhandled rejection',
      reason instanceof Error ? reason : new Error(String(reason))
    );
  });
}

// Start the application
main().catch((error) => {
  logger.error('Fatal error during startup', error);
  process.exit(1);
});
