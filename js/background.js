// 后台事件Listener
// 获取书签保存的文件夹，定义在bookmark.js文件中
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    window.open("README.md", "_blank")
    console.log("已安装Auto Mark扩展")
  }
})

// chrome.tabs.onRemoved()的回调参数removeInfo提供的信息太少，需要在此手动记录标签信息：title、url
// 注意：此事件将调用2次，只选状态为"complete"的
chrome.tabs.onUpdated.addListener((tabId, chgInfo, tab) => {
  if (chgInfo.status === "complete") {
    Bookmark.tabsInfo[tabId] = {title: tab.title, url: tab.url}
    console.log(`已记录的网址：${tab.title} => ${tab.url}`)
    // 当URL改变时，检测在当前网址已被添加进了网址前缀列表时，在扩展图标下标"✓"
    Bookmark.signIfUreHadAdded(tab.url)
  }
})

// 激活的标签改变时触发
chrome.tabs.onActivated.addListener(activeInfo => {
  // 当激活的标签改变时，检测在当前网址已被添加进了网址前缀列表时，在扩展图标下标"✓"
  Bookmark.signIfUreHadAdded(Bookmark.tabsInfo[activeInfo.tabId]?.url)
})

// 关闭标签时触发
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log("已关闭标签，开始判断是否需要保存书签")
  Bookmark.ifSaveBookmark(tabId)
})

// 按下快捷键时触发
// 只有一个保存书签的快捷键，就不判断快捷键字符串：cmd的值了
chrome.commands.onCommand.addListener(cmd => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    console.log('已按下保存书签的快捷键，开始判断是否需要保存书签：' + tabs[0].id)
    Bookmark.ifSaveBookmark(tabs[0].id, true)
  })
})

// 消息接收器
chrome.runtime.onMessage.addListener(request => {
  // 来自popup.js
  if (request.cmd === "add_url_pre") {
    console.log("收到添加网址前缀的消息，开始添加")
    Bookmark.addURLPre(request.newURLPre)
  }
})