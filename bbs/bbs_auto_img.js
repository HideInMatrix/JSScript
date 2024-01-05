/*
 * @Author: David
 * @Date: 2024-01-05 15:43:33
 * @LastEditTime: 2024-01-05 15:43:36
 * @LastEditors: David
 * @Description: 
 * @FilePath: /JSScript/bbs/bbs_auto_img.js
 * 可以输入预定的版权声明、个性签名、空行等
 */
const puppeteer = require('puppeteer')
const fs = require('fs'); // 导入 fs 模块
const init = async () => {

  const browser = await puppeteer.launch({
    headless: 'new',
  })

  const page = await browser.newPage();
  await page.goto('https://buondua.com/tag/%E8%BF%87%E6%9C%9F%E7%B1%B3%E7%BA%BF%E7%BA%BF%E5%96%B5-10694').then(async () => {
    let arr = []
    const pages = await page.$$eval(`.item-link.popunder`, els => els.map(el => el.href))
    console.log(`总数${pages.length}`)
    let currIndex = 0

    for (let i = 0; i < pages.length; i++) {
      console.log(`当前是${i + 1}`)
      currIndex = i + 1
      const newPage = await browser.newPage();
      await newPage.goto(pages[i]).then(async () => {
        let _obj = await openPage(newPage)
        arr.push(_obj)
        newPage.close()
      });
    }
    const _newPage = await browser.newPage();
    await openBbs(_newPage, arr)
    if (currIndex == pages.length) {
      console.log("完成")
      _newPage.close()
      page.close();
      await page.close();
    }
  })
}

const openPage = (page) => {
  return new Promise((resolve) => {
    page.waitForSelector(`div.article-fulltext`).then(async () => {
      // 进来就是第一页
      let title = await page.$eval(`div.article-header > h1`, el => el.innerHTML)
      let tempImages = []
      let images = await page.$$eval(`p > img`, els => els.map(el => el.src))
      tempImages.push(...images)

      let aLinks = await page.$$eval(`a.pagination-link`, els => Array.from(new Set(els.map(el => el.href))))
      for (let i = 1; i < aLinks.length; i++) {
        await page.goto(aLinks[i]).then(async () => {
          let _images = await page.$$eval(`p > img`, els => els.map(el => el.src))
          tempImages.push(..._images)
        })
      }
      let str = saveImages(tempImages)
      resolve({ title, str })
    })
  })
}

const saveImages = (_images) => {

  let N = 150; // 指定每个小数组的长度
  let strArr = [];
  if (_images.length > N) {
    for (let i = 0; i < _images.length; i += N) {
      let _str = ``
      _images.slice(i, i + N).forEach(item => {
        _str += `![](${item}) \n`
      })
      strArr.push(_str)
    }
  } else {
    let str = ``
    _images.forEach(item => {
      str += `![](${item}) \n`
    })
    strArr.push(str)
  }
  return strArr
}

const openBbs = async (page, arr) => {
  await page.goto("https://bbs.micromatrix.eu.org")
  await page.waitForSelector(`li.item-logIn`)
  const loginBtn = await page.$(`li.item-logIn`)
  await loginBtn.click()
  await page.waitForSelector(`div.ModalManager.modal`)
  const username = await page.$(`input[name=identification]`);
  await username.type("");

  const password = await page.$(`input[name=password]`);
  await password.type(``);
  const submitBtn = await page.$(`button[type=submit]`)
  await submitBtn.click()
  await page.waitForSelector(`li.item-session`)
  console.log(`开始发布,total--${arr.length}`)
  for (let i = 0; i < arr.length; i++) {
    let title = arr[i].title.split('@')[1]
    for (let j = 0; j < arr[i].str.length; j++) {
      await newDis(page, `${arr[i].str.length > 1 ? title + i : title}`, arr[i].str[j])
      await page.waitForSelector('li.item-newDiscussion > button');
    }
    console.log(`当前发布${i + 1}`)
  }
}

const newDis = (page, title, str) => {
  return new Promise(async (resolve) => {
    await page.$eval(`li.item-newDiscussion > button`, el => el.click())
    await page.waitForSelector(`div#composer`)
    const titleInput = await page.$(`h3 > input.FormControl`)
    await titleInput.type(title)
    await page.waitForTimeout(1000);
    const contentInput = await page.$(`textarea.FormControl.Composer-flexible.TextEditor-editor`)
    await contentInput.type(str)

    await page.$eval(`li.item-submit > button`, el => el.click())
    await page.waitForSelector(`ul.TagSelectionModal-list.SelectTagList`, { visible: true })
    await page.$eval(`li[data-index='4']`, el => el.click())
    await page.waitForSelector(`span.TagsInput-tag`)
    await page.$eval(`button[type='submit']`, el => el.click())
    await page.waitForSelector(`h1.DiscussionHero-title`)
    await page.goBack()
    resolve(true)
  })
}

init()