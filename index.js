import puppeteerExtra from 'puppeteer-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import chromium from '@sparticuz/chromium'

async function scrape(url='https://www.nationalgeographic.com/'){
    try{
        console.log('url page',url);
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
        console.log('que es esttooooo', h2);
        // close the instance by closing all the pages
        const pages = await browser.pages()
        await Promise.all(pages.map(page => page.close()))

        await browser.close()
        return h2

    }catch(error){
        console.log('error at scrape',error.message)
    }
}

export const handler = async (event, context) => {
    try{
        const body = JSON.parse(event.body)
        const {url} = body

        const data = await scrape(url)
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

// handler({
//     body: JSON.stringify({
//         url: 'https://www.google.com'
//     })
// })