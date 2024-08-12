import { Client } from 'discord.js'
import stats from './scheduled/weeklyStatistics'
import { config } from 'dotenv'

config()

const client = new Client({
  intents: ['GuildMessages']
})

await client.login(process.env.DISCORD_TOKEN)

await stats.execute(client)

await client.destroy()
