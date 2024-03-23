import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import axios from "axios";
import fetch from "node-fetch";
import cheerio from "cheerio";
import pc from "picocolors";
import { config } from "dotenv";
config();
import { createRequire } from "module";

import { HttpsProxyAgent } from 'https-proxy-agent';

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const DEFAULT_CONFIG = {
  user: process.env.DB_USER ?? "",
  host: process.env.DB_HOST ?? "",
  database: process.env.DB_NAME ?? "",
  password: process.env.DB_PASSWORD ?? "",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1234,
};

const client = new Client(DEFAULT_CONFIG);

async function scrapeWithPuppeteer(
  url = "https://www.nationalgeographic.com/"
) {
  try {
    puppeteerExtra.use(stealthPlugin());

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

    const page = await browser.newPage();
    await page.goto(url);

    // get the h1 text
    const h2 = await page.evaluate(() => {
      const h2 = document.querySelector("h2");
      return h2 ? h2.innerText : null;
    });
    // close the instance by closing all the pages
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));

    await browser.close();
    return h2;
  } catch (error) {
    console.log("error at scrape", error.message);
  }
}

async function getGames(
  url = "https://www.polygon.com/2020/12/14/22166004/best-games-2020-ps4-xbox-one-switch-pc-series-x"
) {
  axios
    .get(url)
    .then((response) => {
      const $ = cheerio.load(response.data);
      $("h2 strong").each((i, element) => {
        const text = $(element).text();
        console.log(text);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

async function scrapeAndSeed({ from, to }) {
  try {
    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false, // change this to false to see the browser UI
      executablePath: "/usr/bin/google-chrome",
    });
    await seedDB(browser, { from, to });

    browser.close();
  } catch (error) {
    console.error(error);
  }
}

const seedDB = async (browser, years) => {
  let { from: year, to } = years;
  let res = [];

  await client.connect();

  while (year <= to) {
    const url = `https://www.google.com/search?q=most+popular+games+${year}&sca_esv=1fcb60ee6ef69c6a&sxsrf=ACQVn08GKSjAxHE6n94NxfthkSvZ0AOVVA%3A1709679431068&ei=R6PnZfPjA6WI9u8PoL2TmAo&ved=0ahUKEwizo6yZnN6EAxUlhP0HHaDeBKMQ4dUDCBA&uact=5&oq=most+popular+games+2002&gs_lp=Egxnd3Mtd2l6LXNlcnAiF21vc3QgcG9wdWxhciBnYW1lcyAyMDAyMgUQABiABDIGEAAYFhgeMgsQABiABBiKBRiGAzILEAAYgAQYigUYhgNIzRZQmQpYkhJwAngBkAEAmAF4oAGyA6oBAzEuM7gBA8gBAPgBAZgCBaAC3wLCAgoQABhHGNYEGLADwgINEAAYgAQYigUYQxiwA8ICDhAAGOQCGNYEGLAD2AEBwgITEC4YgAQYigUYQxjIAxiwA9gBAsICFhAuGIAEGIoFGEMY1AIYyAMYsAPYAQLCAgoQIxiABBiKBRgnwgIKEAAYgAQYigUYQ5gDAIgGAZAGEroGBggBEAEYCboGBggCEAEYCJIHAzMuMqAHzRY&sclient=gws-wiz-serp`;
    res = await getListOfGames(browser, url, year);
    const insert = await insertIntoDB(res, year);
    console.log(
      pc.cyan("INSERTED SUCCESSFULLY Year: "),
      pc.magenta(year),
      insert
    );
    year++;
  }

  await client.end();
};

const insertIntoDB = async (games, year) => {
  for (const game of games) {
    await client.query(
      "INSERT INTO games (title, release_year) VALUES ($1, $2)",
      [game, year]
    );
  }
};

const getFirst3DBGames = async () => {
  await client.connect();
  const res = await client.query(
    "SELECT * FROM games ORDER BY id DESC LIMIT 3"
  );

  await client.end();
  return res?.rows;
};

const getListOfGames = async (browser, url, year) => {
  const page = await browser.newPage();
  await page.goto(url);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const actionButton = buttons.find(
      (button) => button.innerText === "Rechazar todo"
    );
    if (actionButton) actionButton.click();
  });
  const ariaLabels = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[aria-label]"));
    return links.map((link) => link.getAttribute("aria-label"));
  });
  console.log(pc.green("Year: "), pc.magenta(year));
  console.log(ariaLabels, ariaLabels.length);

  return new Promise((resolve) => {
    setTimeout(() => {
      page.close();
      resolve(ariaLabels);
    }, 2500);
  });
};

async function sPrice(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let price = 0;
    $("span.best").each((i, element) => {
      const sibling = $(element).prev("span.price");
      const text = sibling?.text();
      console.log("sibling?????", text);
      if (text) {
        price = text;
        return;
      }
    });
    return price
      ? parseFloat(price.replace(/[^\d,]/g, "").replace(",", "."))
      : null;
  } catch (error) {
    console.error(error);
  }
}

async function useProxy(proxy) {
  try {
    console.log("entering function", {
      proxy: { host: proxy.split(":")[0], port: proxy.split(":")[1] },
    });
    const agent = new HttpsProxyAgent(
        {
            host: '185.92.222.127',
            port: '9100'
        }
    )
    const options = {
        httpsAgent: agent,
    }
    const response = await axios.get("https://www.google.com",options);
    return response.data;
  } catch (error) {
    console.error(`Error getting location for proxy ${proxy}:`, error);
  }
}

export const handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { url, from, to } = body;

    // const data = await scrapeAndSeed({from,to})
    // const games = await getFirst3DBGames();
    // const gameWithPrices = await Promise.all(games.map(async(game) => {
    //     try {
    //         console.log(game);
    //         const data = await sPrice(`https://gg.deals/game/${game.slug}/`);
    //         console.log('resultado de sPRICE', data);
    //         return {...game, price: data};
    //     } catch (error) {
    //         console.error(`Error fetching price for game ${game.slug}:`, error);
    //         return game; // return the game without price if there was an error
    //     }
    // }));
    // console.log('data',gameWithPrices);

    const proxy = "75.119.200.27:23456";
    useProxy(proxy).then((location) => console.log(location));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        // requestedUrl: url,
        // data: data ?? 'No data'
      }),
    };
  } catch (error) {
    console.log("error at index.js", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error at index.js",
        error: error.message,
      }),
    };
  }
};

// handler(
//   {
//     body: JSON.stringify({
//       // url: `https://www.google.com/search?q=most+popular+games+${from}&sca_esv=1fcb60ee6ef69c6a&sxsrf=ACQVn08GKSjAxHE6n94NxfthkSvZ0AOVVA%3A1709679431068&ei=R6PnZfPjA6WI9u8PoL2TmAo&ved=0ahUKEwizo6yZnN6EAxUlhP0HHaDeBKMQ4dUDCBA&uact=5&oq=most+popular+games+2002&gs_lp=Egxnd3Mtd2l6LXNlcnAiF21vc3QgcG9wdWxhciBnYW1lcyAyMDAyMgUQABiABDIGEAAYFhgeMgsQABiABBiKBRiGAzILEAAYgAQYigUYhgNIzRZQmQpYkhJwAngBkAEAmAF4oAGyA6oBAzEuM7gBA8gBAPgBAZgCBaAC3wLCAgoQABhHGNYEGLADwgINEAAYgAQYigUYQxiwA8ICDhAAGOQCGNYEGLAD2AEBwgITEC4YgAQYigUYQxjIAxiwA9gBAsICFhAuGIAEGIoFGEMY1AIYyAMYsAPYAQLCAgoQIxiABBiKBRgnwgIKEAAYgAQYigUYQ5gDAIgGAZAGEroGBggBEAEYCboGBggCEAEYCJIHAzMuMqAHzRY&sclient=gws-wiz-serp`,
//       from: 2000,
//       to: 2022,
//     }),
//   },
//   {}
// );

import { IP_PULL } from "./ip-pull.js";

let ipIndex = 0;

async function fetchGameData(gameSlug) {
    const proxy = IP_PULL[ipIndex];
    ipIndex = (ipIndex + 1) % IP_PULL.length;  // Cycle through IP addresses
    console.log('Current Proxy => ',proxy);
    try {
        const response = await axios.get(`https://gg.deals/game/${gameSlug}/`, {
            proxy: {
                host: proxy.split(':')[0],
                port: parseInt(proxy.split(':')[1])
            },
            timeout: 3000  // Timeout of 3 seconds
        });

        return response.data;
    } catch (error) {
        console.error(`Error fetching data for game ${gameSlug}: ${error}`);
    }
}

// Use a self-invoking async function to handle the promises
(async () => {
    for (const gameSlug of IP_PULL) {
        console.log(await fetchGameData('slay-the-spirit'));
        await new Promise(resolve => setTimeout(resolve, 3000));  // Wait for 3 seconds before the next request
    }
})();