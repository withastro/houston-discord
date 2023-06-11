import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getDefaultEmbed } from "../utils/embeds.js";
import TagStatistics from "../scheduled/weeklyStatistics.js"

export default {
	data: new SlashCommandBuilder()
		.setName("retrigger-statistics")
		.setDescription("Trigger the support statistics outside of it's default schedule"),
	async execute(interaction: ChatInputCommandInteraction) {

		TagStatistics.execute(interaction.client);

		const embed = getDefaultEmbed().setTitle("Successfully retriggered statistics");

		interaction.reply({embeds: [embed], ephemeral: true});
	}
}