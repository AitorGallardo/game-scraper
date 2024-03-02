const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

console.log("Loading function");
exports.handler = async (event, context) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(
      process.env.AWS_EXECUTION_ENV
        ? "/opt/nodejs/node_modules/@sparticuz/chromium/bin"
        : undefined
    ),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  try {
    const urlToRead = event.webUrl;
    const domain = new URL(urlToRead).host;
    const outputFilePath = `${urlToRead.split(`${domain}/`)[1]}`;
    let now = new Date();
    now.setHours(48);
    const cookies = [
      {
        url: urlToRead,
        domain: domain,
        path: "/",
        expires: new Date().getTime(),
        "max-age": 60 * 60 * 24 * 2,
      },
    ];
    await page.setCookie(...cookies);
    await page.goto(urlToRead, {
      timeout: 60000,
      waitUntil: ["load", "networkidle0", "domcontentloaded"],
    });
    const html = await page.content();
    console.log('Html Page ',html);

    // db connection inside a try catch block

  } catch (error) {
    console.log(error);
  } finally {
    await page.close();
    await browser.close();
  }
  return;
};
