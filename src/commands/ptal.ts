import { SlashCommandBuilder, ChatInputCommandInteraction, Component, ComponentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { URL } from "url";
import { getDefaultEmbed } from "../utils/embeds.js";
import {Octokit} from "octokit";

function TryParseURL(url: string, interaction: ChatInputCommandInteraction)
{
	try
	{
		return new URL(url.trim());
	}
	catch (exception)
	{
		if(exception instanceof TypeError)
		{
			interaction.reply({content: `The following URL is invalid: ${url}`});
			return null;
		}
		interaction.reply({content: "Something went wrong while parsing your URL's"});
		return null;
	}
}

function GetEmojiFromURL(url: URL, interaction: ChatInputCommandInteraction)
{
	let apexDomain = url.hostname.split(".").at(-2);
	let emoji = interaction.guild?.emojis.cache.find(emoji => emoji.name == apexDomain);

	if(emoji)
	{
		return `<:${emoji.name}:${emoji.id}>`;
	}
	else
	{
		return "❓";
	}
}

const octokit = new Octokit();

export default {
	data: new SlashCommandBuilder()
		.setName("ptal")
		.setDescription("Trigger a message on questions that should be reworded")
		.addStringOption(option =>
			option.setName("title")
			.setDescription("The title of the PTAL request")
			.setRequired(true))
		.addStringOption(option =>
				option.setName("github")
				.setDescription("A link to a github pull request")
				.setRequired(true))
		.addStringOption(option =>
				option.setName("description")
				.setDescription("An extended description of the PTAL request")
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

		// if(!(await interaction.guild?.channels.fetch(interaction.channelId))?.name.includes("ptal"))
		// {
		// 	interaction.reply({content: "This command can only be used in PTAL channels", ephemeral: true})
		// 	return;
		// }

		let urls: string[] = [];
		let components: any[] = [];

		let embed = getDefaultEmbed();

		const githubOption = interaction.options.getString("github", true);
		const deploymentOption = interaction.options.getString("deployment", false);
		const otherOption = interaction.options.getString("other", false);

		let githubURL = TryParseURL(githubOption, interaction);
		{
			if(githubURL)
			{
				const pathSections = githubURL.pathname.split("/");
				pathSections.shift();
				if(githubURL.hostname != "github.com" || pathSections.length != 4 || pathSections[2] != "pull" || !Number.parseInt(pathSections[3]))
				{
					interaction.reply({content: `Please link a pull request. Format: \`https://github.com/ORGANISATION/REPOSITORY/pull/NUMBER\``, ephemeral: true});
					return;
				}

				embed.addFields({name: "Repository", value: `[${pathSections[0]}/${pathSections[1]}](https://github.com/${pathSections[0]}/${pathSections[1]})`, inline: true});

				let githubLink = new ButtonBuilder()
					.setEmoji(GetEmojiFromURL(githubURL, interaction))
					.setLabel("View on Github")
					.setStyle(ButtonStyle.Link)
					.setURL(githubURL.href);

				components.push(githubLink);

				try
				{
					let pr = await octokit.rest.pulls.get({owner: pathSections[0], repo: pathSections[1], pull_number: Number.parseInt(pathSections[3])});
					console.log(pr);
				}
				catch
				{
					 interaction.reply({content: "Something went wrong when parsing your pull request. Are you sure the URL you submitted is correct?", ephemeral: true});
					 return;
				}
			}
			else
				return;
		}

		if(deploymentOption)
		{
			let deployment = TryParseURL(deploymentOption, interaction);
			if(deployment)
			{
				let deploymentLink = new ButtonBuilder()
					.setEmoji(GetEmojiFromURL(deployment, interaction))
					.setLabel("View as Preview")
					.setStyle(ButtonStyle.Link)
					.setURL(deployment.href);

				components.push(deploymentLink);
			}
			else
				return;
		}
		if(otherOption)
		{
			urls.push(...otherOption.split(","));
		}
		

		let content = "";

		embed.setTitle(`**ptal** ${interaction.options.getString("title", true)}\n`);
		embed.setAuthor({name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL()})

		// required since return from foreach doesn't return out of full function
		let parsedURLs = true;

		urls.forEach(url =>
			{
				let urlObject = TryParseURL(url, interaction);

				if(!urlObject)
				{
					parsedURLs = false;
					return;
				}

				content += `${GetEmojiFromURL(urlObject, interaction)} `

				content += `<${urlObject.href}>\n`;
			})

		if(!parsedURLs)
			return;

		const description = interaction.options.getString("description", false);
		if(description)
		{
			content += `\n${description}`;
		}

		if(content.length > 0)
		{
			embed.setDescription(content);
		}

		let actionRow = new ActionRowBuilder<ButtonBuilder>();
		actionRow.addComponents(...components);

		interaction.reply({embeds: [embed], components: [actionRow]});
		
	}
}