const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

const origLog = console.log;
const origErr = console.error;
let logChannel;

client.once('ready', async () => {
  origLog(`Connecté en tant que ${client.user.tag}`);

  try {
    logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (!logChannel || !logChannel.isTextBased()) {
      throw new Error('Channel non textuel ou introuvable');
    }
    origLog(`Logs redirigés vers #${logChannel.name}`);
  } catch (err) {
    origErr(`⚠️ Impossible d’accéder au salon de logs ${process.env.LOG_CHANNEL_ID}`, err);
    logChannel = null;
  }

  console.log = (...args) => {
    origLog(...args);
    if (logChannel) {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('Log')
            .setDescription('```' + msg + '```')
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  };

  console.error = (...args) => {
    origErr(...args);
    if (logChannel) {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('Erreur')
            .setDescription('```' + msg + '```')
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  };
});

client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== process.env.GUILD_ID) return;

  try {
    const role = await member.guild.roles.fetch(process.env.ROLE_ID);
    if (!role) {
      console.error(`Rôle non trouvé : ${process.env.ROLE_ID}`);
      return;
    }
    await member.roles.add(role);
    console.log(`Rôle ${role.name} attribué à ${member.user.tag}`);
  } catch (err) {
    console.error('Erreur lors de l’attribution du rôle :', err);
  }
});

client.login(process.env.BOT_TOKEN);