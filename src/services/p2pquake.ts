import { P2PQuakeWebSocketClient, WS_ENDPOINTS } from 'p2pquake-client';
import type { JMAQuake, JMATsunami, EEW } from 'p2pquake-client';
import { logger } from '../utils/logger';
import { config } from '../config/env';

type QuakeHandler = (quake: JMAQuake) => void;
type TsunamiHandler = (tsunami: JMATsunami) => void;
type EEWHandler = (eew: EEW) => void;

export class P2PQuakeService {
  private client: P2PQuakeWebSocketClient;
  private quakeHandler?: QuakeHandler;
  private tsunamiHandler?: TsunamiHandler;
  private eewHandler?: EEWHandler;

  constructor() {
    this.client = new P2PQuakeWebSocketClient({
      url: config.nodeEnv === 'production' ? WS_ENDPOINTS.PRODUCTION : WS_ENDPOINTS.SANDBOX,
      eventCodes: [551, 552, 556],
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Connection established
    this.client.on('connect', () => {
      logger.info('Connected to P2PQuake WebSocket');
    });

    // Connection closed
    this.client.on('disconnect', () => {
      logger.warn('Disconnected from P2PQuake WebSocket');
    });

    // Error occurred
    this.client.on('error', (error) => {
      logger.error('P2PQuake WebSocket error', error);
    });

    // JMA earthquake information received (Code 551)
    this.client.on(551, (data: JMAQuake) => {
      logger.debug('Received JMA earthquake information', {
        code: data.code,
        time: data.time,
      });

      if (this.quakeHandler) {
        try {
          this.quakeHandler(data);
        } catch (error) {
          if (error instanceof Error) {
            logger.error('Error in quake handler', error);
          }
        }
      }
    });

    // JMA tsunami information received (Code 552)
    this.client.on(552, (data: JMATsunami) => {
      logger.debug('Received JMA tsunami information', {
        code: data.code,
        time: data.time,
      });

      if (this.tsunamiHandler) {
        try {
          this.tsunamiHandler(data);
        } catch (error) {
          if (error instanceof Error) {
            logger.error('Error in tsunami handler', error);
          }
        }
      }
    });

    // EEW detection received (Code 556)
    this.client.on(556, (data: EEW) => {
      logger.debug('Received EEW detection', {
        code: data.code,
        time: data.time,
      });

      if (this.eewHandler) {
        try {
          this.eewHandler(data);
        } catch (error) {
          if (error instanceof Error) {
            logger.error('Error in EEW handler', error);
          }
        }
      }
    });
  }

  /**
   * Connect to P2PQuake WebSocket
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to P2PQuake WebSocket...');
      await this.client.connect();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to connect to P2PQuake WebSocket', error);
      }
      throw error;
    }
  }

  /**
   * Disconnect from P2PQuake WebSocket
   */
  disconnect(): void {
    logger.info('Disconnecting from P2PQuake WebSocket...');
    this.client.disconnect();
  }

  /**
   * Register handler for earthquake information
   */
  onQuake(handler: QuakeHandler): void {
    this.quakeHandler = handler;
  }

  /**
   * Register handler for tsunami information
   */
  onTsunami(handler: TsunamiHandler): void {
    this.tsunamiHandler = handler;
  }

  /**
   * Register handler for EEW detection
   */
  onEEW(handler: EEWHandler): void {
    this.eewHandler = handler;
  }
}
