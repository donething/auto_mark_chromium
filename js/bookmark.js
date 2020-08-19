// 书签操作
class Bookmark {
  // 默认书签文件夹名
  static #FOLDER_NAME = "AutoMark"
  // 存放书签的文件夹的ID（为string类型），本扩展在每次运行时赋值，不需要指定值
  static #folderID = ""
  // 用于保存可能需要Mark的tab的部分信息：{tabid: {title: "", url: ""}}
  static tabsInfo = {};

  // 获取存放书签的文件夹的ID，在书签文件夹第一行中根据FOLDER_NAME查找
  static storedFolder() {
    chrome.bookmarks.getChildren("1", folders => {
      for (let folder of folders) {
        // folder.url为undefined表示其为书签文件夹
        if (!folder.url && this.#FOLDER_NAME === folder.title) {
          console.log("已存在指定名字的书签文件夹：", folder.id, folder.title)
          this.#folderID = folder.id
          return
        }
      }
      console.log("不存在指定名字的书签文件夹，开始创建：", this.#FOLDER_NAME)
      this.#add(this.#FOLDER_NAME, undefined, "1", newItem => {
        this.#folderID = newItem.id
      })
    })
  }

  // 是否应该保存书签，没有添加网址前缀到设置里的网页将被抛弃
  static ifSaveBookmark(tabId, needNotifyError = false) {
    // let tab = Object.assign({}, this.tabsInfo[tabId])
    let tab = this.tabsInfo[tabId]
    // 标签页已关闭，移除保存的标签信息
    delete this.tabsInfo[tabId]
    // 如果没有保存tab的ID，就不需要保存书签
    if (!tab) {
      console.log("tabs记录中没有当前tab，可能是在本扩展安装之前才打开的tab")
      Utils.notify("操作未完成", "可能是在本扩展安装之前打开的标签，请刷新页面");
      return
    }

    // 读取chromium storage中的网址前缀urls_pre，判断tab.url是否能匹配网址前缀
    Utils.Storage.get({urls_pre: []}, data => {
      console.log("所有的网址前缀", data.urls_pre)
      let urlsPre = data.urls_pre
      // existURLPre匹配到tab.url的网址前缀，若不为""则需要保存书签
      let existURLPre = ""
      for (let urlPre of urlsPre) {
        if (tab.url.indexOf(urlPre.url_pre) === 0) {
          existURLPre = urlPre.url_pre
          break
        }
      }
      // 不需保存到书签
      if (existURLPre === "") {
        console.log("不需要保存到书签栏，放弃保存");
        if (needNotifyError) {
          Utils.notify("操作未完成", "请先添加该网址到自动保存的列表内");
        }
        return
      }
      // 需要保存到书签
      //　该URL用于真正添加书签函数markUrl()判断，是修改还是添加书签
      console.log("需要保存到书签栏，开始保存");
      Bookmark.#markUrl(tab, existURLPre);
    })
  }

  /**
   * 向chromium storage中添加网址前缀
   * @param url 网址前缀
   */
  static addURLPre(url) {
    // 从storage中读取所有网址前缀，判断是否已存在，不存在则push进去后再保存
    Utils.Storage.get({urls_pre: []}, data => {
      let urlsPre = data.urls_pre
      for (let urlPre of urlsPre) {
        // 存在则直接返回
        if (urlPre.url_pre === url) return
      }
      // 添加网址前缀项
      let item = Utils.Storage.newURLPreItem(url)
      urlsPre.push(item)
      Utils.Storage.set({urls_pre: urlsPre}, () => {
        console.log(`网址前缀添加完成：`, item)
      })
    })
  }

  /**
   * 判断在指定文件夹下是否存在书签，如果有就更新网址，如果没有就添加
   * @param tab 标签信息
   * @param urlPre 网址前缀
   */
  static #markUrl(tab, urlPre) {
    // 判断文件夹下是否存在前缀下的书签，若无则新建；若有则更新
    chrome.bookmarks.getChildren(this.#folderID, bookmarks => {
      // 没有找到书签时不能return，要在后面添加新书签
      if (!bookmarks) bookmarks = []
      for (let bookmark of bookmarks) {
        if (bookmark.url.indexOf(urlPre) === 0) {
          console.log("书签文件夹下，已经存在指定网站前缀的书签，更新：", bookmark.title);
          chrome.bookmarks.update(bookmark.id, {
            title: tab["title"],
            url: tab["url"]
          }, bookmark => {
            console.log("书签更新成功：", bookmark.title)
            Utils.notify("操作成功", "更新书签完成");
          })
          return
        }
      }
      console.log("书签文件夹下，不存在指定网址前缀的书签，添加")
      this.#add(tab["title"], tab["url"], this.#folderID,
        Utils.notify("操作成功", "创建书签完成"))
    })
  }

  /**
   * 添加书签或文件夹。若只指定title参数，则表示创建的时文件夹
   * @param title 标题
   * @param url 书签地址，可为空
   * @param parentId 书签（夹）的父文件夹ID
   * @param success 创建成功时的回调，参数为创建的书签（夹）的对象
   * @param fail 创建失败时的回调，无参数
   */
  static #add(title, url = undefined, parentId, success, fail) {
    let data = {
      parentId: parentId,
      title: title,
      url: url
    };
    // console.log("开始创建书签（夹）：", data)
    chrome.bookmarks.create(data, bookmark => {
      if (!bookmark) {
        Utils.notify("操作失败", "创建书签（夹）失败");
        if (fail && typeof fail === "function") fail()
        return
      }
      console.log("创建书签（夹）成功：", bookmark.id, bookmark.title);
      if (success && typeof success === "function") success(bookmark)
    })
  }
}

// 初始化
Bookmark.storedFolder()