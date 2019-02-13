import puppeteer from 'puppeteer';
import { Application } from 'express';

const Arbeidsrecht = (async () => {
    const browser = await puppeteer.launch({
        args: ['--disable-features=site-per-process'],
        headless: true
    });
    const page = await browser.newPage();
    await page.goto('https://arbeidsrecht.sdu.nl');
    // await page.screenshot({path: 'example.png'});
    // await delay(100);
    await page.waitForSelector(`#cmp-faktor-io`);
    //  console.log(page.frames().map(f => f));
    //  var faktorFrame = await page.$('#cmp-faktor-io');;
    // faktorFrame.remove();
    // console.log("wait for acceptAll")
    //  const acceptAll = await faktorFrame.$('#acceptAll');
    //   const outerHTML = await acceptAll.evaluate(e => e.parentNode.outerHTML);
    //  console.log('the outerhtml: ', outerHTML);
    // to verify we're talking about the right element.. (we are.)
    //  await acceptAll.click();

    // await faktorFrame.waitForSelector(`#acceptAll`);
    // await delay(3000);
    // const acceptAllBtn = await faktorFrame.$('#acceptAll');

    let queue = Promise.resolve();
    const entries = {};

    return function (term: string) {
        if (!term || term.length < 4) {
            return Promise.resolve([]);
        }

        const cacheKey = term.toLowerCase();

        if (entries[cacheKey]) {
            return entries[cacheKey];
        }
        return entries[cacheKey] = queue = queue.then(() => search(term));
    }

    async function search(term: string) {
        await page.evaluate(() => {
            const faktor = document.querySelector("iframe#cmp-faktor-io");
            faktor && faktor.remove();
        })

        console.log("input");
        await page.waitForSelector(`input[name='a$word0']`);
        console.log("type");
        const elementHandle = await page.$(`input[name='a$word0']`);
        var currentValue = await page.evaluate(e => e.value, elementHandle);
        if (currentValue !== term) {
            await elementHandle.click();
            await elementHandle.focus();
            // click three times to select all
            await elementHandle.click({ clickCount: 3 });
            await elementHandle.press('Backspace');
            await elementHandle.type(term);

            // await page.type(`input[name='a$word0']`, term);
            console.log("click");
            await page.click(`form.simple-search-bar-form button[type='submit']`);
            await page.waitForSelector(`.results-loading`);
        }
        await page.waitForSelector(`.results-loaded`);
        // await delay(1000);

        return await page.evaluate(() => {
            const contents = document.querySelectorAll(".result-item .result-content");
            const results = [];

            for (var i = 0; i < contents.length; i++) {
                const content = contents[i];
                const anchor = content.querySelector("a.title") as HTMLAnchorElement;

                const data = {
                    title: anchor.textContent,
                    url: anchor.href,
                    properties: []
                }

                const summary = content.querySelector(".urinfo-summary");
                if (summary) {
                    data.properties.push(summary.textContent);
                }
                // for(var i=0 ; i<labels.length ; i++) {
                // //   const childNode = labels[i];
                // //   if (childNode.nextSibling) {
                // //     data.properties.push(childNode.textContent);
                // //   }
                // }

                results.push(data);
            }

            return results;
        });
    }
})();

export function config(app: Application) {
    app.get('/api/echo/:term', async (req, res, next) => {
        res.write(JSON.stringify([req.params.term]))
        res.end();
    });

    app.get('/api/arbeidsrecht/:term', async (req, res, next) => {
        var search = await Arbeidsrecht;
        try {
            const results = await search(req.params.term);
            res.setHeader("Content-Type", "text/javascript");
            res.write(JSON.stringify(results));
            res.end();
        }
        catch (ex) {
            console.log(ex);
            res.end();
        }
    });

}