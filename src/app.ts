import { AnyThreadChannel, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import { onCommandInteraction, registerCommands } from './commands.js';
import { createSummaryEmbed, createThreadListEmbed, createWelcomeEmbed } from './embeds.js';
import {
  CORE_CHANNEL_ID,
  fetchChannelMessages,
  GUILD_ID,
  IS_PROD,
  summarizeMessages,
  TRACKED_CHANNELS,
  validateActiveThread,
  ValidTextChannel,
} from './util.js';

dotenv.config();
const { DISCORD_TOKEN } = process.env;

if (IS_PROD) {
  registerCommands();
}

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  allowedMentions: { parse: ['users', 'roles'] },
});

// Register the command event handler
client.on(Events.InteractionCreate, onCommandInteraction);

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

schedule.scheduleJob('3 * * *', async () =>{
  const guild = await client.guilds.fetch(GUILD_ID);
  const postToChannel = (await client.channels.fetch(CORE_CHANNEL_ID))! as ValidTextChannel;
  const threads = await guild.channels.fetchActiveThreads();
  console.log(`There are ${threads.threads.size} threads.`);
  // Welcome Message
  await postToChannel.send({ embeds: [createWelcomeEmbed()] });
  // Channel Summaries
  for (const channelId of TRACKED_CHANNELS) {
    const channel = (await client.channels.fetch(channelId)) as ValidTextChannel;
    const messages = await fetchChannelMessages(channel);
    const summaryText = await summarizeMessages(messages);
    const embed = createSummaryEmbed(channel, summaryText);
    await postToChannel.send({ embeds: [embed] });
  }
  // Active Thread Summary
  const allActiveThreads = (await Promise.all(threads.threads.map(validateActiveThread))).filter(
    (item): item is { thread: AnyThreadChannel<boolean>; count: number } => !!item
  );
  await postToChannel.send({
    embeds: [createThreadListEmbed(postToChannel, allActiveThreads)],
  });
});

// Log in to Discord with your client's token
client.login(DISCORD_TOKEN!);
