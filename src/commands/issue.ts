import {
	ActionRowBuilder,
	ButtonBuilder,
	SlashCommandBuilder,
} from '@discordjs/builders';
import { ButtonStyle, APIChatInputApplicationCommandInteraction, APIApplicationCommandInteractionDataOption, APIApplicationCommandInteractionDataStringOption, ApplicationCommandOptionType, InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { random } from '../utils/helpers.js';
import { JsonResponse } from '../index.js';

const messages = [
	`Oh no! We'll get right on this.`,
	`Yikes—thanks for the report.`,
	`Uh oh... Thanks for reporting this!`,
	`Oh no, sorry! We appreciate your help.`,
	`Dang. Let's fix this for you!`,
	`Oof. Let's get this bug fixed.`,
	`We love to keep the web weird, but... not that weird.`,
	`Oof, we're on a fix.`,
	`Thanks for reporting—we'll get this fixed as soon as we can.`,
	`Thanks for making Astro even better!`,
	`Ouch. Guess it's time to squash some bugs.`,
	`Thank you for reporting this! We really appreciate the help!`,
	`Oh no, we'll get this fixed as soon as we can.`,
	`Thanks for reporting this issue.`,
	`Let's get this fixed.`,
];

export default {
	data: new SlashCommandBuilder()
		.setName('issue')
		.setDescription('Suggest opening an issue on one of our repositories')
		.addStringOption((option) =>
			option
				.setName('repo')
				.setDescription('The repository where the issue should be opened')
				.setRequired(false)
				.addChoices(
					{ name: 'Core', value: 'astro' },
					{ name: 'Docs', value: 'docs' },
					{ name: 'Language Tools', value: 'language-tools' },
					{ name: 'Starlight', value: 'starlight' },
					{ name: 'Compiler', value: 'compiler' },
					{ name: 'Prettier', value: 'prettier-plugin-astro' }
				)
		),
	async execute(interaction: APIChatInputApplicationCommandInteraction) {
		let repo = "astro";

		if(interaction.data.options)
		{
			let option: APIApplicationCommandInteractionDataStringOption | undefined = interaction.data.options.find(option => {
				return option.name == "repo" && option.type == ApplicationCommandOptionType.String
			}) as APIApplicationCommandInteractionDataStringOption | undefined

			if(option)
			{
				repo = option.value;
			}
		}
		const message = random(messages);
		const repoURL = new URL(`https://github.com/withastro/${repo}/`);
		const issueURL = new URL('./issues/new/choose', repoURL);
		const emoji = { id: '948999573907570768', name: 'github', animated: false };
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setLabel('Open GitHub issue')
			.setEmoji(emoji)
			.setURL(issueURL.toString());

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

		return new JsonResponse({type: InteractionResponseType.ChannelMessageWithSource, data:{
			content: `${message}\n\nPlease open an issue on the [\`withastro/${repo}\`](${repoURL}) repo.`,
			flags: MessageFlags.SuppressEmbeds,
			components: [buttonRow.toJSON()],
		}})

		// interaction.reply({
		// 	content: `${message}\n\nPlease open an issue on the [\`withastro/${repo}\`](${repoURL}) repo.`,
		// 	flags: 'SuppressEmbeds',
		// 	components: [buttonRow],
		// 	ephemeral: false,
		// });
	},
};
