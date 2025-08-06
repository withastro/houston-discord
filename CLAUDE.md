# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Houston Bot, a Discord bot for the Astro community built as a Cloudflare Worker. The bot provides various slash commands and automated features to help manage the Astro Discord server.

## Architecture

- **Runtime**: Cloudflare Workers (not a traditional Node.js server)
- **Framework**: Uses `itty-router` for HTTP routing and Discord interactions
- **Discord Integration**: Built with `discord.js` and Discord API types
- **Type System**: TypeScript with comprehensive type definitions in `src/types.d.ts`

### Core Components

- `src/index.ts` - Main worker entry point with interaction routing
- `src/discordClient.ts` - Discord API client wrapper with response helpers
- `src/commands/` - Individual command implementations
- `src/scheduled/` - Background tasks and scheduled jobs
- `src/utils/` - Shared utilities (Discord helpers, embeds, etc.)

### Command Architecture

Commands are defined with a consistent interface:
- `data`: SlashCommandBuilder configuration
- `initialize()`: Optional setup with environment validation
- `execute()`: Main command logic
- `autocomplete()`: Optional autocomplete handler
- `button()`: Optional button interaction handler

## Development Commands

```bash
# Install dependencies (enforces pnpm)
pnpm install

# Start development server
pnpm dev

# Register Discord commands after changes
pnpm register

# Format code (runs prettier and import organizing)
pnpm format

# Lint code
pnpm lint

# Collect statistics (utility command)
pnpm collect:stats
```

## Environment Setup

1. Copy `.dev.vars.example` to `.dev.vars`
2. Set required Discord bot credentials:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_PUBLIC_KEY`
3. Optional environment variables for additional features:
   - GitHub integration, Algolia search, etc.
   - `AUTO_CLOSE_SCHEDULE` - Cron expression for auto-close task (recommended: "0 0,12 * * *" = twice daily)
   - `SOLVED_REMINDER_TIME` - Time in ms before sending solved reminder (default: 24 hours)
   - `AUTO_CLOSE_TIME` - Time in ms before auto-closing threads (default: 72 hours)

## Local Development

Since this runs as a Cloudflare Worker, local development requires:
1. Run `pnpm dev` to start local instance
2. Use a tunneling service (ngrok, Cloudflare tunnels) to expose local port
3. Set the public URL as Discord's "Interactions Endpoint URL"

## Key Integration Points

- **GitHub**: Uses Octokit for issue/PR operations (requires `GITHUB_TOKEN`)
- **Algolia**: Provides documentation search (requires Algolia credentials)
- **Scheduled Tasks**: Uses cron expressions for automated features like statistics and support channel management

## Testing

No specific test framework is configured. The main verification is through:
- ESLint for code quality
- TypeScript compiler for type checking
- Manual testing via Discord interactions

## Deployment

Deployed via Cloudflare Workers using the `wrangler.toml` configuration. The production instance runs at `houstonbot.dev`.