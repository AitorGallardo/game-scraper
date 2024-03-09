import puppeteerExtra from 'puppeteer-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import chromium from '@sparticuz/chromium'
import axios from 'axios';
import cheerio from 'cheerio';
import pc from 'picocolors';

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


async function getListOfGames(){
    try{
        puppeteerExtra.use(stealthPlugin())

        const browser = await puppeteerExtra.launch({
            headless: false, // change this to false to see the browser UI
            executablePath: '/usr/bin/google-chrome',
        })
        let year = 2022;
        while(year <= 2023){
            const url = `https://www.google.com/search?q=most+popular+games+${year}&sca_esv=1fcb60ee6ef69c6a&sxsrf=ACQVn08GKSjAxHE6n94NxfthkSvZ0AOVVA%3A1709679431068&ei=R6PnZfPjA6WI9u8PoL2TmAo&ved=0ahUKEwizo6yZnN6EAxUlhP0HHaDeBKMQ4dUDCBA&uact=5&oq=most+popular+games+2002&gs_lp=Egxnd3Mtd2l6LXNlcnAiF21vc3QgcG9wdWxhciBnYW1lcyAyMDAyMgUQABiABDIGEAAYFhgeMgsQABiABBiKBRiGAzILEAAYgAQYigUYhgNIzRZQmQpYkhJwAngBkAEAmAF4oAGyA6oBAzEuM7gBA8gBAPgBAZgCBaAC3wLCAgoQABhHGNYEGLADwgINEAAYgAQYigUYQxiwA8ICDhAAGOQCGNYEGLAD2AEBwgITEC4YgAQYigUYQxjIAxiwA9gBAsICFhAuGIAEGIoFGEMY1AIYyAMYsAPYAQLCAgoQIxiABBiKBRgnwgIKEAAYgAQYigUYQ5gDAIgGAZAGEroGBggBEAEYCboGBggCEAEYCJIHAzMuMqAHzRY&sclient=gws-wiz-serp`
            await main(browser,url,year)
            year++;
        }
        browser.close()

        // const pages = await browser.pages()
        // await Promise.all(pages.map(page => page.close()))

        // await browser.close()

    } catch (error) {
        console.error(error);
    }
}

const main = async(browser,url,year) => {
    const page = await browser.newPage()
    await page.goto(url)

    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const actionButton = buttons.find(button => button.innerText === 'Rechazar todo');
        if(actionButton) actionButton.click();
    })
    const ariaLabels = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[aria-label]'));
        return links.map(link => link.getAttribute('aria-label'));
    });
    console.log(pc.green('Year: '),pc.magenta(year));
    console.log(ariaLabels, ariaLabels.length);

    return new Promise(resolve => {
        setTimeout(() => {
            page.close()
            resolve(ariaLabels);
        }, 2500); 
    });
}


export const handler = async (event, context) => {
    try{
        const body = JSON.parse(event.body)
        const {url} = body

        const data = await getListOfGames()
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
let from = 2023;
const to = 2023;

while(from <= to){
    setTimeout(() => {
        handler({
            body: JSON.stringify({
                url: `https://www.google.com/search?q=most+popular+games+${from}&sca_esv=1fcb60ee6ef69c6a&sxsrf=ACQVn08GKSjAxHE6n94NxfthkSvZ0AOVVA%3A1709679431068&ei=R6PnZfPjA6WI9u8PoL2TmAo&ved=0ahUKEwizo6yZnN6EAxUlhP0HHaDeBKMQ4dUDCBA&uact=5&oq=most+popular+games+2002&gs_lp=Egxnd3Mtd2l6LXNlcnAiF21vc3QgcG9wdWxhciBnYW1lcyAyMDAyMgUQABiABDIGEAAYFhgeMgsQABiABBiKBRiGAzILEAAYgAQYigUYhgNIzRZQmQpYkhJwAngBkAEAmAF4oAGyA6oBAzEuM7gBA8gBAPgBAZgCBaAC3wLCAgoQABhHGNYEGLADwgINEAAYgAQYigUYQxiwA8ICDhAAGOQCGNYEGLAD2AEBwgITEC4YgAQYigUYQxjIAxiwA9gBAsICFhAuGIAEGIoFGEMY1AIYyAMYsAPYAQLCAgoQIxiABBiKBRgnwgIKEAAYgAQYigUYQ5gDAIgGAZAGEroGBggBEAEYCboGBggCEAEYCJIHAzMuMqAHzRY&sclient=gws-wiz-serp`,
                year:from
            })
        },{
        })
    }, 1000);
    from++;
}





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