import { EmbedBuilder } from '@discordjs/builders';

export function getDefaultEmbed() {
	return new EmbedBuilder().setColor([0xFF, 0x5D, 0x00]);
}
