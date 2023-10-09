import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { URL } from "url";

export default {
	data: new SlashCommandBuilder()
		.setName("ptal")
		.setDescription("Trigger a message on questions that should be reworded")
		.addStringOption(option =>
			option.setName("title")
			.setDescription("The title of the PTAL request")
			.setRequired(true))
		.addStringOption(option =>
				option.setName("description")
				.setDescription("An extended description of the PTAL request")
				.setRequired(false))
		.addStringOption(option =>
				option.setName("github")
				.setDescription("A link to a github issue or pull request")
				.setRequired(false))
		.addStringOption(option =>
				option.setName("deployment")
				.setDescription("A link to a deployment related to the PTAL")
				.setRequired(false))
		.addStringOption(option =>
				option.setName("other")
				.setDescription("Other links related to the PTAL, comma seperated")
				.setRequired(false)),
	async execute(interaction: ChatInputCommandInteraction) {

		if(!(await interaction.guild?.channels.fetch(interaction.channelId))?.name.includes("ptal"))
		{
			interaction.reply({content: "This command can only be used in PTAL channels", ephemeral: true})
			return;
		}

		let urls: string[] = [];

		const githubOption = interaction.options.getString("github", false);
		const deploymentOption = interaction.options.getString("deployment", false);
		const otherOption = interaction.options.getString("other", false);

		if(!githubOption && !deploymentOption)
		{
			interaction.reply({content: "Please enter either a github or deployment URL", ephemeral: true});
			return;
		}
		
		if(githubOption)
		{
			urls.push(githubOption);
		}
		if(deploymentOption)
		{
			urls.push(deploymentOption);
		}
		if(otherOption)
		{
			urls.push(...otherOption.split(","));
		}
		

		let content = `**ptal** ${interaction.options.getString("title", true)}\n`;

		// required since return from foreach doesn't return out of full function
		let parsedURLs = true;

		urls.forEach(url =>
			{
				let urlObject: URL;

				url = url.trim();

				try
				{
					urlObject = new URL(url);
				}
				catch (exception)
				{
					if(exception instanceof TypeError)
					{
						interaction.reply({content: `The following URL is invalid: ${url}`, ephemeral: true});
						parsedURLs = false;
						return;
					}
					interaction.reply({content: "Something went wrong while parsing your URL's", ephemeral: true});
					parsedURLs = false;
					return;
				}

				let apexDomain = urlObject.hostname.split(".").at(-2);
				let emoji = interaction.guild?.emojis.cache.find(emoji => emoji.name == apexDomain);

				if(emoji)
				{
					content += `<:${emoji.name}:${emoji.id}> `;
				}
				else
				{
					content += "❓ ";
				}

				content += `<${urlObject.href}>\n`;
			})

		if(!parsedURLs)
			return;

		const description = interaction.options.getString("description", false);
		if(description)
		{
			content += `\n${description}`;
		}

		interaction.reply(content);
		
	}
}