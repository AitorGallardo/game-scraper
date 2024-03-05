import puppeteerExtra from 'puppeteer-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import chromium from '@sparticuz/chromium'
import axios from 'axios';
import cheerio from 'cheerio';

async function scrapeWithPuppeteer(url='https://www.nationalgeographic.com/'){
    try{
        puppeteerExtra.use(stealthPlugin())

        // Local Dev
        // const browser = await puppeteerExtra.launch({
        //     headless: true,
        //     executablePath: '/usr/bin/google-chrome',
        // })

        const browser = await puppeteerExtra.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage()
        await page.goto(url)

        // get the h1 text
        const h2 = await page.evaluate(() => {
            const h2 = document.querySelector('h2')
            return h2 ? h2.innerText : null
        })
        // close the instance by closing all the pages
        const pages = await browser.pages()
        await Promise.all(pages.map(page => page.close()))

        await browser.close()
        return h2

    }catch(error){
        console.log('error at scrape',error.message)
    }
}

async function scrapeWithCheerio(url='https://www.nationalgeographic.com/'){
    axios.get(url)
        .then(response => {
            const $ = cheerio.load(response.data);

            $('a.game-info-title').each((i, element) => {
                const link = $(element).attr('href');
                const title = $(element).text();
                console.log(`Title: ${title}, Link: ${link}`);
            });
        })
        .catch(error => {
            console.error(error);
        });
}
async function getGames(url='https://www.polygon.com/2020/12/14/22166004/best-games-2020-ps4-xbox-one-switch-pc-series-x'){
    axios.get(url)
        .then(response => {
            const $ = cheerio.load(response.data);
            $('h2 strong').each((i, element) => {
                const text = $(element).text();
                console.log(text);
            });
        })
        .catch(error => {
            console.error(error);
        });
}

export const handler = async (event, context) => {
    try{
        const body = JSON.parse(event.body)
        const {url} = body

        const data = await getGames(url)
        console.log('data',data);
        
        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                message: 'Success',
                requestedUrl: url,
                data: data ?? 'No data'
            })
        }
    } catch(error){
        console.log('error at index.js',error.message)
        return{
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error at index.js',
                error: error.message
            })
        }
    }
};

handler({
    body: JSON.stringify({
        url: 'https://www.polygon.com/2020/12/14/22166004/best-games-2020-ps4-xbox-one-switch-pc-series-x'
    })
},{
})



// Old Code

// const puppeteer = require("puppeteer-core");j
// const chromium = require("@sparticuz/chromium");

// console.log("Loading function");
// exports.handler = async (event, context) => {
//   const browser = await puppeteer.launch({
//     args: chromium.args,
//     defaultViewport: chromium.defaultViewport,
//     executablePath: await chromium.executablePath(
//       process.env.AWS_EXECUTION_ENV
//         ? "/opt/nodejs/node_modules/@sparticuz/chromium/bin"
//         : undefined
//     ),
//     headless: chromium.headless,
//     ignoreHTTPSErrors: true,
//   });
//   const page = await browser.newPage();
//   try {
//     const urlToRead = event.webUrl;
//     const domain = new URL(urlToRead).host;
//     const outputFilePath = `${urlToRead.split(`${domain}/`)[1]}`;
//     let now = new Date();
//     now.setHours(48);
//     const cookies = [
//       {
//         url: urlToRead,
//         domain: domain,
//         path: "/",
//         expires: new Date().getTime(),
//         "max-age": 60 * 60 * 24 * 2,
//       },
//     ];
//     await page.setCookie(...cookies);
//     await page.goto(urlToRead, {
//       timeout: 60000,
//       waitUntil: ["load", "networkidle0", "domcontentloaded"],
//     });
//     const html = await page.content();
//     console.log('Html Page ',html);

//     // db connection inside a try catch block

//   } catch (error) {
//     console.log(error);
//   } finally {
//     await page.close();
//     await browser.close();
//   }
//   return;
// };