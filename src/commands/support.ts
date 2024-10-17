import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../types';
import { random } from '../utils/helpers.js';
import { Env } from '..';

const messages = [
	`@role is here to rescue us from confusion! 🦸‍♂️🦸‍♀️`,
	`🐚 @role, can you hear our desperate cries for help?`,
	`🚨 @role TO THE RESCUEEEEEE! 🚨`,
	`@role is swooping in to save the day! 🦸‍♂️🫡`,
	`🥺 Help us @role, you’re our only hope to understand this!`,
	`🪄 @role has been summoned for their magical support skills.`,
	`@role, we need your expertise! You're the 🐐 of support!`,
	`@role has been preparing their whole life to solve this ticket 💪`,
	`🔮 Long has the prophecy foretold... only @role can fix this issue now.`,
	`👋 Oh hey @role, mind giving us a hand here?`,
	`👀 @role... a little help? We’re struggling here.`,
	`Let’s solve this mystery, @role! 🧐🔍`,
	`How do you do, fellow @role members? Need some support tips? 🛹👨‍🦳`,
	`@role, it’s time to YEET this issue out of existence 💀`,
	`🐸 It’s support time, my @role-ies! Let’s do this!`,
	`@role—let us help them! 🙏`,
	`✨ Time to shine, @role! Let’s solve this issue!`,
	`We believe in your troubleshooting powers, @role 👌`,
	`@role—believe in yourself, and all problems can be solved 🧠`,
	`Has anybody seen @role? We need their support superpowers 👀`,
	`@role Now getting the attention of someone who can help directly to do the thing they volunteered to do`,
	`Vote for @role and all your wildest dreams will come true`,
	`🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨\n**THIS IS A SUPPORT EMERGENCY!**\n\n(cc @role)`,
];

const command: Command = {
	data: new SlashCommandBuilder().setName('support').setDescription('Summon support patrol'),
	async initialize(env: Env) {
		console.log(env);
		if (!env.SUPPORT_PATROL_ID) {
			console.warn('SUPPORT_PATROL_ID is not defined');
			return false;
		}
		return true;
	},
	async execute(client) {
		const role = client.env.SUPPORT_PATROL_ID;
		const message = random(messages).replaceAll('@role', role);

		return client.reply({
			content: message,
		});
	},
};

export default command;
