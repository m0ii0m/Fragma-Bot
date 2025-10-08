require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const app = express();
app.use(express.json());

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

const GIT_NOTIFY_SECRET = process.env.GIT_NOTIFY_SECRET;
const PUSH_CHANNEL_ID   = process.env.PUSH_CHANNEL_ID;

app.post('/git-notify', async (req, res) => {
  try {
    const auth = req.header('Authorization') || '';
    if (auth !== `Bearer ${GIT_NOTIFY_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }

    const { repo = 'inconnu', branch = '???', pusher = '???', commits = [] } = req.body;

    const ch = await client.channels.fetch(PUSH_CHANNEL_ID);
    if (!ch || !ch.isTextBased()) {
      console.error('Salon PUSH introuvable ou non textuel:', PUSH_CHANNEL_ID);
      return res.status(500).json({ ok: false, error: 'bad channel' });
    }

    let lines = [`🚀 Push sur \`${branch}\` 🚀`];
    for (const c of commits.slice(0, 10)) {
      //const sha = (c.sha || '').substring(0, 7);
      const msg = (c.message || '').split('\n')[0];
      const author = c.author || 'n/a';
      lines.push(`• ${author} — \`${msg}\``);
    }
    if (commits.length > 10) lines.push(`… et ${commits.length - 10} commits de plus.`);
    lines.push(`@everyone`);

    await ch.send(lines.join('\n'));
    return res.json({ ok: true });
  } catch (e) {
    console.error('Erreur git-notify:', e);
    return res.status(500).json({ ok: false });
  }
});

const PORT = process.env.GIT_NOTIFY_PORT || 5055;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`git-notify écoute sur 127.0.0.1:${PORT}`);
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