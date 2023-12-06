Astro's own Houston, a bot made to make the life of everyone within the Astro community easier.

# Setting up locally
Setting up Houston Bot locally might require some work depending on your experience with Discord's developer platform.

```
git clone https://github.com/withastro/houston-discord
pnpm install
```

After having cloned the repository and having all dependencies installed, you'll want to create a file for your enviroment variables. To do this, make a copy of `.dev.vars.example` and rename that to `.dev.vars`. To run the bot locally, you will need to create a discord bot. There are plent of guides online on how to do this.

After you have created your bot, set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` and `DISCORD_PUBLIC_KEY` in your newly created `.dev.vars` file. If you want to use commands that require any other enviroment variables, remove the comment and set those values too.

## Registering commands
If this is your first time setting up the bot, or you have modified any of the commands, you will need to signal discord that changes were made to the commands. To do this, it's as easy as running the command `pnpm register`.

## Running the bot
Since this bot is running as a cloudflare worker instead of on a server, getting the bot connected to discord is slightly more difficult.

First, you will want to run the command `pnpm dev`. This will start a local instance of the bot. Take note of the port logged to the console.

After you have your bot running, you will need a service to forward that port to the internet. You could use ngrok, cloudflare tunnels or any other port forwarding utility for this.

Finally, after you have a publically accessible URL for your local instance, go to the developer portal and set the `INTERACTIONS ENDPOINT URL`. If Discord successfully allows you to save the URL, you are good to go.

Depending on your port forwarding utility, you may need to repeat the last step every time you stop it or restart your computer.
