import discordjs, {
	Collection,
	IntentsBitField,
	REST,
	RESTPostAPIApplicationCommandsJSONBody,
	Routes,
} from 'discord.js';
import { scheduleJob } from 'node-schedule';
import fs from 'node:fs';
import { Client, Command, Event, Scheduled } from '../types';

const client: Client = new discordjs.Client({ intents: [IntentsBitField.Flags.Guilds] });

client.commands = new Collection<string, any>();

const commandPath = new URL('../commands', import.meta.url);
const commandFiles = fs.readdirSync(commandPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = new URL(`../commands/${file}`, import.meta.url);
	const command: Command = (await import(filePath.toString())).default;

	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
	try {
		const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

		const commandList = Array.from<Command>(client.commands!.values());

		for (const i in commandList) {
			commands.push(commandList[i].data.toJSON());
		}

		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data: any = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();

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

const scheduledPath = new URL('../scheduled', import.meta.url);
const scheduledFiles = fs.readdirSync(scheduledPath).filter((file) => file.endsWith('.js'));

for (const file of scheduledFiles) {
	const filePath = new URL(`../scheduled/${file}`, import.meta.url).toString();

	const scheduled: Scheduled = (await import(filePath)).default;

	scheduleJob(scheduled.time, async () => {
		scheduled.execute(client);
	});
}

client.login(process.env.DISCORD_TOKEN);
