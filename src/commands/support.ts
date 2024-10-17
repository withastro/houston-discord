import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../types';
import { random } from '../utils/helpers.js';


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
    `🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨\n**THIS IS A SUPPORT EMERGENCY!**\n\n(cc @role)`
];


const SUPPORT_PATROL_ROLE_ID = `<@&1129102257422610512>`
const command: Command = {
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Summon support patrol'),
	async execute(client) {
        const role = SUPPORT_PATROL_ROLE_ID;
		const message = random(messages).replaceAll('@role', role);

        return client.reply({
			content: message,
			allowed_mentions: {
				parse: ['roles'],
			},
		});
	},
};

export default command;
