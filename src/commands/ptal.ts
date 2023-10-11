import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionReplyOptions } from "discord.js";
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

const generateReplyFromInteraction = async (description: string, github: string, deployment: string | null, other: string | null, interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions | null> => 
{

	if(!(await interaction.guild?.channels.fetch(interaction.channelId))?.name.includes("ptal"))
	{
		interaction.reply({content: "This command can only be used in PTAL channels", ephemeral: true})
		return null;
	}

	let urls: string[] = [];
	let components: any[] = [];

	let embed = getDefaultEmbed();

	const githubOption = github;
	const deploymentOption = deployment;
	const otherOption = other;

	let content = "";

	let githubURL = TryParseURL(githubOption, interaction);
	{
		if(githubURL)
		{
			const pathSections = githubURL.pathname.split("/");
			pathSections.shift();
			if(githubURL.hostname != "github.com" || pathSections.length != 4 || pathSections[2] != "pull" || !Number.parseInt(pathSections[3]))
			{
				interaction.reply({content: `Please link a pull request. Format: \`https://github.com/ORGANISATION/REPOSITORY/pull/NUMBER\``, ephemeral: true});
				return null;
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

				embed.setTitle(pr.data.title);
			}
			catch
			{
					interaction.reply({content: "Something went wrong when parsing your pull request. Are you sure the URL you submitted is correct?", ephemeral: true});
					return null;
			}
		}
		else
			return null;
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
			return null;
	}
	if(otherOption)
	{
		urls.push(...otherOption.split(","));
	}

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
		return null;

	if(content.length > 0)
	{
		embed.setDescription(content);
	}

	let actionRow = new ActionRowBuilder<ButtonBuilder>();
	actionRow.addComponents(...components);

	return {content: `**PTAL** ${description}`, embeds: [embed], components: [actionRow]};
}

export default {
	data: new SlashCommandBuilder()
		.setName("ptal")
		.setDescription("Trigger a message on questions that should be reworded")
		.addStringOption(option =>
			option.setName("description")
			.setDescription("A short description of the PTAL request")
			.setRequired(true))
		.addStringOption(option =>
				option.setName("github")
				.setDescription("A link to a github pull request")
				.setRequired(true))
		.addStringOption(option =>
				option.setName("deployment")
				.setDescription("A link to a deployment related to the PTAL")
				.setRequired(false))
		.addStringOption(option =>
				option.setName("other")
				.setDescription("Other links related to the PTAL, comma seperated")
				.setRequired(false)),
	async execute(interaction: ChatInputCommandInteraction) {

		const reply = await generateReplyFromInteraction(interaction.options.getString("description", true), interaction.options.getString("github", true), interaction.options.getString("deployment", false), interaction.options.getString("other", false), interaction);

		if(!reply)
			return;

		interaction.reply(reply);
		
	}
}