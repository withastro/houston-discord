import { Client } from 'discord.js';
import { config } from 'dotenv';
import stats from './scheduled/weeklyStatistics';

config();

const client = new Client({
	intents: ['GuildMessages', 'MessageContent'],
});

await client.login(process.env.DISCORD_TOKEN);

await stats.execute(client);

await client.destroy();
