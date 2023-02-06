const { Client, Events, EmbedBuilder } = require("discord.js");
const axios = require("axios");

require("dotenv").config();
const cron = require("node-cron");
// Create a new client instance
const client = new Client({
  intents: [
    "Guilds",
    "GuildMessages",
    "GuildMessageReactions",
    "GuildMembers",
    "GuildPresences",
    "DirectMessages",
    "GuildIntegrations",
  ],
});

const token = process.env.discordToken;
const channelId = process.env.discordChannelId;

const stackexchangeTags = [
  "moralis",
  "nft",
  "erc-20",
  "erc-1155",
  "erc-721",
  "auth",
  "events",
];
const stackoverflowTags = ["moralis", "nft", "erc20", "erc721", "erc1155"];

client.once(Events.ClientReady, async (client) => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  const channel = client.channels.cache.get(channelId);
  const onlineEmbed = new EmbedBuilder()
    .setTitle("Bot is online")
    .setURL("https://stackoverflow.com/questions/")
    .setDescription("Looking for new questions")
    .setColor(0x00ae86)
    .setTimestamp();
  await channel.send({ embeds: [onlineEmbed] });

  const task = cron.schedule("*/120 * * * *", async () => {
    console.log("task triggered");

    const current = Math.floor(new Date().getTime() / 1000);
    const pastTime = current - 60 * 120; // 60 seconds * 120 minutes
    console.log(pastTime);
    let questions = [];

    try {
      for (let index = 0; index < stackexchangeTags.length; index++) {
        const tag = stackexchangeTags[index];
        const data = await getQuestions(pastTime, tag, "ethereum");
        if (data) questions.push(...data);
        // wait 120 seconds to not get rate-limited
        await wait(120000);
      }
    } catch (error) {
      console.log(error);
    }

    try {
      for (let index = 0; index < stackoverflowTags.length; index++) {
        const tag = stackoverflowTags[index];
        const data = await getQuestions(pastTime, tag, "stackoverflow");
        if (data) questions.push(...data);
        // wait 120 seconds to not get rate-limited
        await wait(120000);
      }
    } catch (error) {
      console.log(error);
    }

    // filter questions with the same id,
    let uniqueQuestions = questions.filter(
      (obj, index) =>
        questions.findIndex((item) => item.question_id === obj.question_id) ===
        index
    );

    if (uniqueQuestions.length > 0) {
      for (let i = 0; i < uniqueQuestions.length; i++) {
        const question = uniqueQuestions[i];
        const title = question.title;
        const link = question.link;
        const tags = question.tags;

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setURL(link)
          .setDescription(tags.join(", "))
          .setColor(0x00ae86)
          .setTimestamp();

        await channel.send({ embeds: [embed] });

        // wait 5 seconds
        await wait(5000);
      }
    }
  });
  //start the task
  task.start();
});

client.login(token).then(() => {
  console.log("logged in");
});

const getQuestions = async (time, tag, site) => {
  const api = `https://api.stackexchange.com/2.3/questions?fromdate=${time}&order=desc&sort=creation&tagged=${tag}&site=${site}`;
  const res = await axios.get(api);
  const data = res.data.items;
  return data;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
