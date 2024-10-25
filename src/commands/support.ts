import { SlashCommandBuilder } from "@discordjs/builders";
import type { Command } from "../types";
import type { Env } from "..";

const command: Command = {
	data: new SlashCommandBuilder()
		.setName("support")
		.setDescription("Summon support patrol"),
	async initialize(env: Env) {
		if (!env.SUPPORT_PATROL_ID) {
			console.warn("SUPPORT_PATROL_ID is not defined");
			return false;
		}
		return true;
	},
	async execute(client) {
		const role = `<@${client.env.SUPPORT_PATROL_ID}>`;
		const message = `Houston, we have a problem... and ${role}, you’re our mission control! 🚀`;

		return client.reply({
			content: message,
		});
	},
};

export default command;
