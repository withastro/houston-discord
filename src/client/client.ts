import discordjs, {
	ApplicationCommand,
	Collection,
	IntentsBitField,
	REST,
	RESTPostAPIApplicationCommandsJSONBody,
	Routes,
} from 'discord.js';
import { scheduleJob } from 'node-schedule';
import fs from 'node:fs';
import { Client, SlashCommand, Event, Scheduled, ContextMenuCommand } from '../types';

if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
	console.error('The required discord enviroment variables were not set. Unable to start the bot.');
	process.exit(1);
}

const client: Client = new discordjs.Client({ intents: [IntentsBitField.Flags.Guilds] });
client.slashCommands = new Collection<string, SlashCommand>();
client.contextMenuCommands = new Collection<string, ContextMenuCommand>();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// slash commands
{
	const commandPath = new URL('../commands/chat', import.meta.url);
	const commandFiles = fs.readdirSync(commandPath).filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = new URL(`../commands/chat/${file}`, import.meta.url);
		const command: SlashCommand = (await import(filePath.toString())).default;

		if ('data' in command && 'execute' in command) {
			if (command.initialize) {
				if (!command.initialize()) {
					console.warn(`Something went wrong while initializing the /${command.data.name} command!`);
					continue;
				}
			}
			client.slashCommands.set(command.data.name, command);
		} else {
			console.warn(`[WARNING] The slash command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// context menu commands
{
	const commandPath = new URL('../commands/contextMenu', import.meta.url);
	const commandFiles = fs.readdirSync(commandPath).filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = new URL(`../commands/contextMenu/${file}`, import.meta.url);
		const command: ContextMenuCommand = (await import(filePath.toString())).default;

		if ('data' in command && 'execute' in command) {
			client.contextMenuCommands.set(command.data.name, command);
		} else {
			console.warn(`[WARNING] The context menu command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// register all commands
{
	(async () => {
		try {
			const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

			const slashCommandList = Array.from(client.slashCommands!.values());

			for (const i in slashCommandList) {
				commands.push(slashCommandList[i].data.toJSON());
			}

			const contextMenuCommandList = Array.from(client.contextMenuCommands!.values());

			for (const i in contextMenuCommandList) {
				commands.push(contextMenuCommandList[i].data.toJSON());
			}

			console.log(`Started refreshing ${commands.length} commands.`);

			const data: any = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });

			console.log(`Successfully reloaded ${data.length} commands.`);
		} catch (error) {
			console.error(error);
		}
	})();
}

// events
{
	const eventsPath = new URL('../events', import.meta.url);
	const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

	for (const file of eventFiles) {
		const filePath = new URL(`../events/${file}`, import.meta.url).toString();

		const event: Event = (await import(filePath)).default;
		if (event.once) {
			client.once(event.event, (...args) => event.execute(...args));
		} else {
			client.on(event.event, (...args) => event.execute(...args));
		}
	}
}

// scheduled jobs
{
	const scheduledPath = new URL('../scheduled', import.meta.url);
	const scheduledFiles = fs.readdirSync(scheduledPath).filter((file) => file.endsWith('.js'));

	for (const file of scheduledFiles) {
		const filePath = new URL(`../scheduled/${file}`, import.meta.url).toString();

		const scheduled: Scheduled = (await import(filePath)).default;

		if (!scheduled.time) {
			console.warn(`No time was set for the scheduled job at: ./src/scheduled/${file}`);
			continue;
		}

		scheduleJob(scheduled.time, async () => {
			scheduled.execute(client);
		});
	}
}

client.login(process.env.DISCORD_TOKEN);
