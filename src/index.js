"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
const client_1 = require("@slack/client");
const html_entities_1 = require("html-entities");
const fs = __importStar(require("fs"));
const IMGS_DIRNAME = "/slack_imgs";
let token = require("../token.json").token;
let rtm = new client_1.RTMClient(token, { logLevel: client_1.LogLevel.INFO });
let web = new client_1.WebClient(token, { logLevel: client_1.LogLevel.INFO });
rtm.start();
let entities = new html_entities_1.AllHtmlEntities();
let prefix = "webshot:";
let regex = /.*?\<(.+?)[|\>].*/;
async function main() {
    console.log("Starting slack-webshot-bot");
    const browser = await puppeteer.launch();
    async function makeScreenshot(website, path) {
        const page = await browser.newPage();
        await page.goto(website);
        await page.screenshot({ path: path });
        await page.close();
    }
    rtm.on("message", async (mes) => {
        console.log(mes);
        console.log(mes.text);
        if (!mes.text)
            return;
        let url = mes.text.match(regex);
        if (url) {
            if (url[0].indexOf(prefix) != -1) {
                let urlstr = entities.decode(url[1]);
                let filePath = `${__dirname}/${IMGS_DIRNAME}/${Date.now()}.png`;
                try {
                    await makeScreenshot(urlstr, filePath);
                }
                catch (e) {
                    try {
                        await web.chat.postMessage({
                            channel: mes.channel,
                            text: `Failed to take screenshot on ${urlstr}`,
                            as_user: true
                        });
                    }
                    catch (ee) {
                        console.log(ee);
                    }
                }
                try {
                    await web.files.upload({
                        title: `Puppeteer: ${urlstr}`,
                        file: fs.createReadStream(filePath),
                        channels: mes.channel,
                        filename: `webshot: ${urlstr}`
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    });
}
main();
