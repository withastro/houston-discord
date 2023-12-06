import { EmbedBuilder } from '@discordjs/builders';

export function getDefaultEmbed() {
	return new EmbedBuilder().setColor([0xff, 0x5d, 0x00]);
}
