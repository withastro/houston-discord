import dotenv from 'dotenv';
import path from 'node:path';
import {Routes, RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types/v10"

dotenv.config({path: path.resolve(process.cwd(), ".dev.vars")});

if(!process.env.DISCORD_TOKEN || ! process.env.DISCORD_CLIENT_ID)
{
	console.error("The required tokens to register commands were not present")
	process.exit(1);
}

import CommandList from "./commands"
import {REST, } from "@discordjs/rest"
import { Command } from "./types";

const rest: REST = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

let commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
for(const commandName in CommandList)
{
	const command: Command = CommandList[commandName];

	commands.push(command.data.toJSON());
}

console.log(`Started refreshing ${commands.length} commands.`);

const data: any = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });

console.log(`Successfully reloaded ${data.length} commands.`);
