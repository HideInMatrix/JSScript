/*
 * @Author: David
 * @Date: 2024-01-05 10:57:48
 * @LastEditTime: 2024-01-11 10:09:15
 * @LastEditors: David
 * @Description: 阿贝云自动续期脚本 
 * @FilePath: /JSScript/abeiyun/renew.js
 * 可以输入预定的版权声明、个性签名、空行等
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');


async function main() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let disUrl = await goToBbs(page)
  await submitToAbCloud(page, disUrl)
  await browser.close();
}
function goToBbs(page) {
  return new Promise(async (resolve) => {
    await page.goto('https://bbs.micromatrix.eu.org');
    await page.waitForSelector(`li.item-logIn`)
    const loginBtn = await page.$(`li.item-logIn`)
    await loginBtn.click()
    await page.waitForSelector(`div.ModalManager.modal`)
    const username = await page.$(`input[name=identification]`);
    await username.type(process.env.BBS_NAME, 1000);

    const password = await page.$(`input[name=password]`);
    await password.type(process.env.BBS_PASSWORD, 1000);
    const submitBtn = await page.$(`button[type=submit]`)
    await submitBtn.click()
    await page.waitForSelector(`li.item-session`)
    console.log(`开始发布`)
    let disUrl = await newDis(page, '阿贝云服务器', `## 阿贝云介绍
    最近的阿贝云 挺火的,下面来看一下， [官网地址](https://www.abeiyun.com/)
    - 1.首先安装操作系统
    ![1](https://img-blog.csdnimg.cn/20190618145028512.png)
    - 2.看一下基本信息
    ![2](https://img-blog.csdnimg.cn/20190618145103314.png)
    - 3.并且支持创建快照
    ![3](https://img-blog.csdnimg.cn/20190618145121816.png)`)

    resolve(disUrl)
  })

}

function submitToAbCloud(page, disUrl) {
  return new Promise(async (resolve) => {
    await page.goto('https://www.abeiyun.com/login/')
    const userName = await page.$(`input#userName`)
    await userName.type(process.env.ABEYUN_NAME)
    const password = await page.$(`input#passwordInput`);
    await password.type(`EZyiT2gqKZZZtUW`);
    await page.$eval(process.env.ABEYUN_PASSWORD, el => el.click())
    await page.waitForNavigation({
      waitUntil: `load`,
    })
    await page.$$eval(`li a.z-font-size-14`, lis => {
      const li_a = lis.find(li => li.innerText.includes('产品'));
      if (li_a) {
        li_a.click();
      }
    })

    await page.waitForSelector(`div.menu-item`, { visible: true })
    await page.$$eval(`div.menu-item`, divs => {
      const production = divs.find(div => div.innerText.includes('免费云服务器'))
      if (production) {
        production.click()
      }
    })
    await page.waitForSelector(`button.el-button.z-margin-top-20-precent.el-button--primary.el-button--small`)
    await page.$$eval(`button[type='button'] span`, buttons => {
      const board = buttons.find(button => button.innerText.includes('管理面板'))
      if (board) {
        board.click()
      }
    })
    await page.waitForSelector(`div.el-tabs__item.is-top`);
    await page.$$eval(`div.el-tabs__item.is-top`, buttons => {
      const board = buttons.find(button => button.innerText.includes('免费延期'))
      if (board) {
        board.click()
      }
    })
    await page.waitForSelector(`label[for='fileImg1'].choose-file`)

    const urlInput = await page.$(`input[placeholder='请输入发帖网址http://']`)
    await urlInput.type(disUrl)
    const inputFile = await page.$(`input#fileImg1`);
    await inputFile.uploadFile(path.resolve(__dirname, './example.png'));

    await page.$$eval(`button[type=button] span`, btns => {
      const submitBtn = btns.find(btn => btn.innerText.includes('提交'));
      if (submitBtn) {
        submitBtn.click()
        resolve(true)
      }
    })
  })
}

function newDis(page, title, str) {
  return new Promise(async (resolve) => {
    await page.$eval(`li.item-newDiscussion > button`, el => el.click())
    await page.waitForSelector(`div#composer`)
    const titleInput = await page.$(`h3 > input.FormControl`)
    await titleInput.type(title, { delay: 100 })
    await page.waitForTimeout(1000);
    const contentInput = await page.$(`textarea.FormControl.Composer-flexible.TextEditor-editor`)
    await contentInput.type(str)
    await page.waitForTimeout(1000);

    await page.$eval(`li.item-submit > button`, el => el.click())
    await page.waitForSelector(`ul.TagSelectionModal-list.SelectTagList`, { visible: true })
    await page.$$eval('li[data-index] span.SelectTagListItem-name', spans => {
      const serverSpan = spans.find(span => span.innerText.includes('服务器'));
      if (serverSpan) {
        serverSpan.click();
      }
    });
    await page.waitForTimeout(1000);
    await page.$eval(`button[type='submit']`, el => el.click())
    await page.waitForSelector(`h1.DiscussionHero-title`)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'example.png' });
    let url = await page.url()
    resolve(url)
  })
}


main()