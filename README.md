# Slack Quake Alert

A system that automatically retrieves earthquake information from P2P Earthquake Information and sends notifications to Slack.

## Features

- **Real-time Notifications**: Uses P2PQuake WebSocket to retrieve earthquake information in real-time
- **Multiple Information Types**: Supports earthquake information (Code 551), tsunami forecasts (Code 552), and Emergency Earthquake Warnings (Code 556)
- **Slack Block Kit Support**: Visually organized and easy-to-read notification format
- **Intensity Filtering**: Configurable minimum intensity threshold for notifications (earthquake information only)
- **Environment Switching**: Switches log output and endpoints between development and production environments
- **TypeScript**: Type-safe implementation
- **Bun**: Fast package manager and runtime

## Prerequisites

- Bun 1.0 or higher
- Slack Workspace (Bot token and channel permissions required)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/minagishl/slack-quake-alert.git
cd slack-quake-alert
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file and set the required environment variables.

## Slack Bot Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Select "Create New App" → "From scratch"
3. Enter App Name and Workspace, then create
4. Navigate to "OAuth & Permissions"
5. Add the following permission to "Bot Token Scopes":
   - `chat:write` - Send messages
6. Click "Install to Workspace" to install the Bot
7. Copy the "Bot User OAuth Token" (starts with `xoxb-`) and set it as `SLACK_BOT_TOKEN` in `.env`
8. Invite the Bot to the channel where you want to send notifications (`/invite @your-bot-name`)
9. Get the channel ID and set it as `SLACK_CHANNEL_ID` in `.env`
   - Right-click the channel → "Copy Link"
   - The last part of the URL (11 characters starting with `C`) is the channel ID

## Environment Variables

Refer to `.env.example` and set the following environment variables:

| Variable Name           | Required | Default       | Description                                                                                                            |
| ----------------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`       | ✓        | -             | Slack Bot OAuth token (starts with `xoxb-`)                                                                            |
| `SLACK_CHANNEL_ID`      | ✓        | -             | Slack channel ID to send notifications to (starts with `C`)                                                            |
| `MIN_INTENSITY`         | ×        | `3`           | Minimum intensity to notify (`1`, `2`, `3`, `4`, `5-`, `5+`, `6-`, `6+`, `7`) (Applies to earthquake information only) |
| `NODE_ENV`              | ×        | `development` | Environment (`development` or `production`) (Uses production endpoint in production environment)                       |
| `GITHUB_IMAGE_BASE_URL` | ×        | (default)     | Base URL for GitHub images (default: `https://raw.githubusercontent.com/minagishl/slack-quake-alert/main/public`)      |

### Notification Information Types

#### 1. Earthquake Information (Code 551)

- Official earthquake information published by the Japan Meteorological Agency
- Notifies intensity, epicenter, magnitude, and intensity at various locations
- Only notifies earthquakes at or above the intensity set in `MIN_INTENSITY`

#### 2. Tsunami Forecast (Code 552)

- Tsunami warnings and advisories published by the Japan Meteorological Agency
- Notifies warning levels and predicted arrival times for each tsunami forecast area
- Supports Major Tsunami Warning, Tsunami Warning, and Tsunami Advisory
- Notifies all tsunami information (no filtering)

#### 3. Emergency Earthquake Warning (Code 556)

- Emergency Earthquake Warning (EEW) detection information
- Notifies predicted intensity, epicenter, and predicted arrival times for each region
- Also displays training and cancellation reports
- Notifies all Emergency Earthquake Warnings (no filtering)

**Note**: Emergency Earthquake Warnings prioritize speed, so content and delivery quality are not guaranteed.

## Usage

### Run in Development Environment

```bash
bun run dev
```

In the development environment, colorful log output and debug information are displayed.

### Run in Production Environment

```bash
bun run build
bun run start
```

Or:

```bash
NODE_ENV=production bun run src/index.ts
```

In the production environment, logs are output in JSON format.

### Running with Docker

#### Using Docker Compose (Recommended)

1. Set environment variables:

```bash
cp .env.example .env
# Edit the .env file to set environment variables
```

2. Build and start the container:

```bash
docker compose up -d
```

3. Check logs:

```bash
docker compose logs -f
```

4. Stop the container:

```bash
docker compose down
```

#### Using Docker Only

```bash
# Build the image
docker build -t slack-quake-alert .

# Run the container
docker run -d \
  --name slack-quake-alert \
  --env-file .env \
  --restart unless-stopped \
  slack-quake-alert

# Check logs
docker logs -f slack-quake-alert

# Stop the container
docker stop slack-quake-alert
docker rm slack-quake-alert
```

### Other Commands

```bash
# TypeScript type checking
bun run typecheck

# Code checking with ESLint
bun run lint

# Auto-fix with ESLint
bun run lint:fix

# Format with Prettier
bun run format

# Format checking
bun run format:check
```

## Project Structure

```
slack-quake-alert/
├── src/
│   ├── index.ts                # Entry point
│   ├── config/
│   │   └── env.ts              # Environment variable validation and type definitions
│   ├── services/
│   │   ├── p2pquake.ts         # P2PQuake WebSocket integration
│   │   └── slack.ts            # Slack notification functionality
│   └── utils/
│       ├── intensity.ts        # Intensity conversion and filtering
│       ├── logger.ts           # Logging functionality
│       └── formatter.ts        # Slack Block Kit formatter
├── public/                     # Image assets for Slack notifications
├── .env.example                # Environment variable template
├── tsconfig.json               # TypeScript configuration
├── package.json                # Package configuration
└── README.md                   # This file
```

## Troubleshooting

### "Bot is not in the channel" Error

This is because the Bot is not in the channel. Go to the channel in Slack and invite the Bot with the following command:

```
/invite @your-bot-name
```

### "Channel not found" Error

`SLACK_CHANNEL_ID` may be incorrect. Check the channel ID:

1. Right-click the channel in Slack
2. Select "Copy Link"
3. The last part of the URL (11 characters starting with `C`) is the channel ID

### "Invalid authentication" Error

`SLACK_BOT_TOKEN` may be incorrect. Check the following:

1. Whether the token starts with `xoxb-`
2. Check the latest token on the Slack API page
3. Whether the Bot is installed in the workspace

### Earthquake Information Not Being Notified

Check the following:

1. Whether `MIN_INTENSITY` is set too high (only earthquake information is filtered)
2. Whether the connection to P2PQuake WebSocket is successful (check logs)
3. Whether earthquakes at or above the set threshold are occurring

**Note**: Tsunami information and Emergency Earthquake Warnings are notified regardless of intensity.

### Differences Between Development and Production Environments

- **Development Environment (`NODE_ENV=development`)**:
  - Uses P2PQuake SANDBOX endpoint
  - Colorful log output
  - Displays DEBUG level and above logs

- **Production Environment (`NODE_ENV=production`)**:
  - Uses P2PQuake PRODUCTION endpoint
  - JSON format log output
  - Displays INFO level and above logs

## Deployment

### Deployment Using Docker Compose (Recommended)

Docker Compose is the easiest way to deploy this application in production.

1. Clone the repository on your server:

```bash
git clone https://github.com/minagishl/slack-quake-alert.git
cd slack-quake-alert
```

2. Set up environment variables:

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

3. Start the application:

```bash
docker compose up -d
```

4. Check if it's running:

```bash
docker compose ps
docker compose logs -f
```

5. To update the application:

```bash
git pull
docker compose down
docker compose up -d --build
```

### Deployment Using systemd (Linux)

1. Create a service file:

```bash
sudo nano /etc/systemd/system/slack-quake-alert.service
```

2. Write the following content:

```ini
[Unit]
Description=Slack Quake Alert
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/slack-quake-alert
ExecStart=/path/to/bun run src/index.ts
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:

```bash
sudo systemctl enable slack-quake-alert
sudo systemctl start slack-quake-alert
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related Links

- [P2P Quake Information](https://www.p2pquake.net/)
- [p2pquake-client](https://github.com/p2pquake/p2pquake-client-js)
- [Slack API](https://api.slack.com/)
- [Bun](https://bun.sh/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
