import {
  CacheType,
  ChatInputCommandInteraction,
  Collection,
  Interaction,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import { createSummaryEmbed } from './embeds.js';
import {
  APPLICATION_ID,
  fetchChannelMessages,
  GUILD_ID,
  summarizeMessages,
  validateChannel,
  ValidTextChannel,
} from './util.js';
const { DISCORD_TOKEN } = process.env;

export const commands = new Collection<string, { data: SlashCommandBuilder; execute: Function }>([
  [
    'summarize',
    {
      data: new SlashCommandBuilder().setName('summarize').setDescription('Summarize the thread/channel'),
      execute: async (interaction: ChatInputCommandInteraction) => {
        interaction.reply('Summarizing recent activity...');
        const channel = interaction.channel as ValidTextChannel;
        const messages = await fetchChannelMessages(channel);
        const summaryText = await summarizeMessages(messages);
        const embed = createSummaryEmbed(channel, summaryText);
        await interaction.editReply({ embeds: [embed] });
      },
    },
  ],
]);

export async function registerCommands() {
  // Construct and prepare an instance of the REST module
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);
  console.log(`Started refreshing ${commands.size} application (/) commands.`);
  // The put method is used to fully refresh all commands in the guild with the current set
  const apiRouteName = Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID);
  const data = await rest.put(apiRouteName, { body: commands.map((c) => c.data.toJSON()) });
  console.log(`Successfully reloaded ${(data as any).length} application (/) commands.`);
}

export async function onCommandInteraction(interaction: Interaction<CacheType>) {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  if (!validateChannel(interaction.channel)) {
    interaction.reply('This command can only be used in a text channel or thread');
    return;
  }
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
}
