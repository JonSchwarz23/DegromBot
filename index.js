const axios = require("axios");
const puppeteer = require("puppeteer");
const CronJob = require('cron').CronJob;
require('dotenv').config();

const log4js = require("log4js");
const logger = log4js.getLogger();

const commandLineArgs = require('command-line-args')
const options = commandLineArgs([{ name: "test", alias: "t", type: Boolean }, { name: "verbose", alias: "v", type: Boolean }]);

logger.level = options.verbose ? "debug" : "warn";

let hook = options.test ? process.env.TEST_HOOK : process.env.PROD_HOOK;

let sendMessage = async function (text) {
  try {
    logger.info(`Sending message: ${text}`);
    await axios.post(hook, { text });
    logger.info(`Sent message.`);
  } catch (error) {
    logger.error(`Failed to send message: ${error}`);
  }
};

getStartingPitchers = async function () {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let result = null;

  await page.goto('https://www.mlb.com/mets/roster/probable-pitchers');
  let matchupDivs = await page.$$(".probable-pitchers__matchup");

  for (let matchup of matchupDivs) {
    let time = await matchup.$eval("time", (element) => { return element.dateTime })
    let date = new Date(time);
    if (date.toDateString() === (new Date).toDateString()) {
      let startingPitchers = await matchup.$$eval(".probable-pitchers__pitcher-name-link", (elements) => elements.map(element => element.innerHTML));
      let message = `Mets pitching matchup today is ${startingPitchers[0]} vs ${startingPitchers[1]}`;
      date.setHours(date.getHours() - 1);
      result = { date, message };
    }
  }

  browser.close();

  return result;
}

scheduleMessage = function (message, date) {
  logger.info(`Scheduling message for ${date.toTimeString()}`)
  return new CronJob(date, () => {
    sendMessage(message);
  }, null, false, 'America/New_York');
}

test = async function () {
  let date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  let pitchers = { date, message: "This is a test message." }
  logger.info(`Pitchers: ${JSON.stringify(pitchers)}`);
  let job = scheduleMessage(pitchers.message, pitchers.date);
  job.start();
}

main = async function () {
  try {
    let pitchers = await getStartingPitchers();
    logger.info(`Pitchers: ${JSON.stringify(pitchers)}`);
    if (pitchers) {
      let job = scheduleMessage(pitchers.message, pitchers.date);
      job.start();
    }
  }
  catch (error) {
    logger.error(error);
  }
}

options.test ? test() : main();
