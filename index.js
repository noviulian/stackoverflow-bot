const cron = require("node-cron");
const axios = require("axios");
const { WebClient, LogLevel } = require("@slack/web-api");
require("dotenv").config();

const client = new WebClient(process.env.token);
const channelId = process.env.channelId;

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

console.log("------ task started ------");

// cron task that runs every 30 minutes, gets the from the last hour
const task = cron.schedule("*/30 * * * *", async () => {
  console.log("task triggered");

  const current = Math.floor(new Date().getTime() / 1000);
  const pastTime = current - 60 * 30; // 60 seconds * 30 minutes
  console.log(pastTime);
  let questions = [];

  try {
    for (let index = 0; index < stackexchangeTags.length; index++) {
      const tag = stackexchangeTags[index];
      const data = await getQuestions(pastTime, tag, "ethereum");
      if (data) questions.push(...data);
      // wait 60 seconds to not get rate-limited
      await wait(60000);
    }
  } catch (error) {
    console.log(error);
  }

  try {
    for (let index = 0; index < stackoverflowTags.length; index++) {
      const tag = stackoverflowTags[index];
      const data = await getQuestions(pastTime, tag, "stackoverflow");
      if (data) questions.push(...data);
      // wait 60 seconds to not get rate-limited
      await wait(60000);
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
    console.log(uniqueQuestions);
    for (let i = 0; i < uniqueQuestions.length; i++) {
      await client.chat
        .postMessage({
          channel: channelId,
          text: "New question posted!",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*A new question has been posted*:`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${uniqueQuestions[i].title}`,
              },
              accessory: {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Go to question",
                  emoji: true,
                },
                value: "click_me_123",
                url: `${uniqueQuestions[i].link}`,
                action_id: "button-action",
              },
            },
          ],
        })
        .catch((error) => {
          console.log(error);
        });
      // wait 5 seconds
      await wait(5000);
    }
  }
});

const getQuestions = async (time, tag, site) => {
  const api = `https://api.stackexchange.com/2.3/questions?fromdate=${time}&order=desc&sort=creation&tagged=${tag}&site=${site}`;
  const res = await axios.get(api);
  const data = res.data.items;
  return data;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//start the task
task.start();

// cron task that runs every 60 minutes
