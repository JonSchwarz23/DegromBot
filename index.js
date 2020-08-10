const axios = require("axios");
const puppeteer = require("puppeteer");
var CronJob = require('cron').CronJob;
const commandLineArgs = require('command-line-args')
const options = commandLineArgs([{ name: "debug", alias: "d", type: Boolean }]);
require('dotenv').config();

let hook = options.debug ? process.env.TEST_HOOK : process.env.PROD_HOOK;

let sendMessage = async function (text) {
  try {
    await axios.post(hook, { text });
  } catch (error) {
    console.log(error);
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

test = async function () {
  let date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  let pitchers = { date, message: "This is a test message." }
  console.log(pitchers);
  let job = new CronJob(pitchers.date, async () => {
    console.log("Sending message");
    await sendMessage(pitchers.message);
    console.log("Message sent");
  }, null, false, 'America/New_York')
  job.start();
}

main = async function () {
  let pitchers = await getStartingPitchers();
  if (pitchers) {
    let job = new CronJob(pitchers.date, () => {
      sendMessage(pitchers.message);
    }, null, false, 'America/New_York')
    job.start();
  }
}

options.debug ? test() : main();
