// import * as puppeteer from "puppeteer"
const puppeteer = require('puppeteer')
import { RTMClient, WebClient, LogLevel } from "@slack/client"
import { AllHtmlEntities } from "html-entities"
import * as fs from "fs"

const IMGS_DIRNAME = "/slack_imgs"
let token = require("../token.json").token
let rtm = new RTMClient(token, {logLevel: LogLevel.INFO})
let web = new WebClient(token, {logLevel: LogLevel.INFO})
rtm.start()

let entities = new AllHtmlEntities()

let prefix = "webshot:"
let regex = /.*?\<(.+?)[|\>].*/

async function main() {
    console.log("Starting slack-webshot-bot")
    const browser = await puppeteer.launch({executablePath: "/usr/bin/google-chrome-stable"})

    async function makeScreenshot(website: string, path: string) {
        const page = await browser.newPage()
        await page.goto(website)
        await page.waitFor(3000)
        await page.screenshot({
            path: path,
            fullPage: true
        })
        await page.close()
    }

    rtm.on("message", async mes => {
        console.log(mes)
        console.log(mes.text)
        if(!mes.text) return
        let url = mes.text.match(regex)
        if(url) {
            if(url[0].indexOf(prefix) != -1) {
                let urlstr = entities.decode(url[1])
                let filePath = `${__dirname}/${IMGS_DIRNAME}/${Date.now()}.png`
                console.log(filePath)
                try {
                    await makeScreenshot(urlstr, filePath)
                } catch (e) {
                    try {
                        await web.chat.postMessage({
                            channel: mes.channel,
                            text: `Failed to take screenshot on ${urlstr}`,
                            as_user: true
                        })
                    } catch(ee) {
                        console.log(ee)
                    }
                }
                try {
                    await web.files.upload({
                        title: `Puppeteer: ${urlstr}`,
                        file: fs.createReadStream(filePath),
                        channels: mes.channel,
                        filename: `webshot: ${urlstr}`
                    })
                } catch(e) {
                    console.log(e)
                }
            }
        }
    })
}

main()
