class Utils {
  // chromium storage储存操作
  // 根据项目修改其中的属性和方法
  static Storage = {
    // 保存到chromium storage中的书签信息数据，书签URL前缀、添加的时间
    // 格式：urls_pre:[{url_pre:"",added:"2020-1-1 10:10"}]
    URLsPrefix: [],
    get(obj, callback) {
      chrome.storage.sync.get(obj, callback)
    },
    set(obj, callback) {
      chrome.storage.sync.set(obj, callback)
    },
    // 清空chromium storage存储的本扩展的所有数据
    clear(callback) {
      chrome.storage.sync.clear(callback);
    },
    // 返回指定格式的网址前缀项
    newURLPreItem(url) {
      return {
        url_pre: url,
        added: new Date().toLocaleString('chinese', {hour12: false})
      }
    }
  }

  // 弹出通知
  static notify(title, content, timeout = 3000) {
    let notificationOptions = {
      type: "basic",
      title: `Auto Mark ${title}`,
      message: content,
      iconUrl: chrome.extension.getURL("icons/bookmark_32.png")
    }
    chrome.notifications.create("", notificationOptions, id => {
      setTimeout(() => {
        chrome.notifications.clear(id)
      }, timeout)
    })
  }
}