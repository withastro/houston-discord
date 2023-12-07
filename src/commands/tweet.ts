import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../types';
import { random } from '../utils/helpers.js';

const messages = [
    `@role is here to save the day! 🫡`,
    `🐚 @role... assemble!`,
	`🚨 @role ASSEMBLEEEEEEEEEEE! 🚨`,
	`@role is here to save the day! 🫡`,
	`🥺 Help us @role, you're our only hope`,
	`🪄 @role has been summoned.`,
	`@role—the platform formerly known as Twitter beckons! 🐦`,
	`🦣 The fediverse calls, @role! I guess we're still doing Twitter, too...`,
	`@role, your superior posting abilities are required! 🏆🐐`,
	`@role has been training for this moment their entire life 💪`,
	`🔮 Long has the prophecy foretold such a day... only @role can save us now.`,
	`👋 heyyyyy @role`,
	`👀 @role... help?`,
	`Let's Get That Money, @role! 💰🤑🫰`,
	`How do you do, fellow @role members? 🛹👨‍🦳`,
	`@role time to _yeet a tweet_ 💀`,
	`🐸 It is tweet time, my @role-ies.`,
	`@role—let us post 🙏`,
	`✨ Your time to shine, @role!`,
	`We believe in you, @role 👌`,
	`@role—believe in yourself and all posts are possible 🧠`,
	`Has anybody seen @role around here? 👀`,
	`🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨 \`ALERT!\` 🚨\n**THIS IS A POSTING EMERGENCY!**\n\n(cc @role)`,
	`No pressure @role, but **THIS** is the **MOST IMPORTANT POST** of **ALL TIME**! 😅`,
];

const ROLE_TWEET_SQUAD = `<@&1130995247523049522>`;
// const PERMISSION_MENTION_EVERYONE = 1 << 17;

// TODO: this must be scoped to core!
const command: Command = {
	data: new SlashCommandBuilder().setName('tweet').setDescription(`🪄 Summon the tweet squad!`),
	async execute(client) {
		const role = ROLE_TWEET_SQUAD;
		const message = random(messages).replaceAll('@role', role);

		return client.reply({
			content: message,
		});
	},
};

export default command;
