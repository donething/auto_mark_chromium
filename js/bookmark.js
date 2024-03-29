// 书签操作
class Bookmark {
  // 默认书签文件夹名
  static #FOLDER_NAME = "AutoMark";
  // 存放书签的文件夹的ID（为string类型），本扩展在每次运行时赋值，不需要指定值
  static #folderID = "";
  // 用于保存可能需要Mark的tab的部分信息：{tabid: {title: "", url: ""}}
  static tabsInfo = {};

  // 获取存放书签的文件夹的ID，在书签文件夹第一行中根据FOLDER_NAME查找
  static storedFolder() {
    chrome.bookmarks.getChildren("1", folders => {
      for (let folder of folders) {
        // folder.url为undefined表示其为书签文件夹
        if (!folder.url && this.#FOLDER_NAME === folder.title) {
          console.log(`已存在指定名字的书签文件夹："${folder.title}"(${folder.id})，无需创建`);
          this.#folderID = folder.id;
          return;
        }
      }
      console.log(`开始创建书签文件夹："${this.#FOLDER_NAME}"`);
      this.#add(this.#FOLDER_NAME, undefined, "1", newItem => {
        this.#folderID = newItem.id;
      });
    });
  }

  // 是否应该保存书签，没有添加网址前缀到设置里的网页将被抛弃
  static ifSaveBookmark(tabId, needNotifyError = false) {
    // let tab = Object.assign({}, this.tabsInfo[tabId])
    let tab = this.tabsInfo[tabId];

    // 如果没有保存tab的ID，就不需要保存书签
    if (!tab) {
      console.log("记录中没有该标签的信息，可能是在扩展安装前已打开，可以刷新页面后重试");
      // Utils.notify("操作未完成", "可能是在本扩展安装之前打开的标签，请刷新页面");
      return;
    }

    // 读取chromium storage中的网址前缀urls_pre，判断tab.url是否能匹配网址前缀
    this.readUrlsPre(urlsPre => {
      // console.log("所有的网址前缀", urlsPre);
      // existURLPre匹配到tab.url的网址前缀，若不为""则需要保存书签
      let existURLPre = "";
      for (let urlPre of urlsPre) {
        if (tab.url.indexOf(urlPre.url_pre) === 0) {
          existURLPre = urlPre.url_pre;
          break;
        }
      }
      // 不需保存到书签
      if (existURLPre === "") {
        console.log("不需要保存到书签栏，放弃保存");
        if (needNotifyError) {
          Utils.notify("操作未完成", "请先添加该网址到自动保存的列表内");
        }
        return;
      }
      // 需要保存到书签
      //　该URL用于真正添加书签函数markUrl()判断，是修改还是添加书签
      console.log(`需要保存到书签栏，开始保存："${tab.title}"`);
      Bookmark.#markUrl(tab, existURLPre);
    });
  }

  /**
   * 在当前网址已被添加进了网址前缀列表时，在扩展图标添加角标"✓"
   * @param url 当前网页地址
   */
  static signIfUreHadAdded(url) {
    chrome.browserAction.setBadgeText({text: ""});
    if (!url) {
      // console.log("当前tab的URL为空，无法设置扩展图标的角标：", url);
      return;
    }
    this.readUrlsPre(urlsPre => {
      for (let urlPre of urlsPre) {
        // 存在则直接返回
        if (url.indexOf(urlPre.url_pre) >= 0) {
          this.setBadge();
          return;
        }
      }
    });
  }

  /**
   * 当当前网址已在网址前缀列表时，在扩展图标中添加角标
   */
  static setBadge() {
    chrome.browserAction.setBadgeText({text: "✓"});
    chrome.browserAction.setBadgeBackgroundColor({color: [25, 135, 0, 250]});
  }

  /**
   * 向chromium storage中添加网址前缀
   * @param newUrlPre 将添加的网址前缀
   */
  static addURLPre(newUrlPre) {
    // 从storage中读取所有网址前缀，判断是否已存在，不存在则push进去后再保存
    this.readUrlsPre(urlsPre => {
      for (let urlPre of urlsPre) {
        // 存在则直接返回
        if (urlPre.url_pre === newUrlPre) return;
      }
      // 添加网址前缀项
      let item = Utils.Storage.newURLPreItem(newUrlPre);
      urlsPre.push(item);
      this.writeUrlsPre(urlsPre, () => {
        console.log(`网址前缀添加完成：`, item);
        this.setBadge();
      });
    });
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
      if (!bookmarks) bookmarks = [];
      for (let bookmark of bookmarks) {
        if (bookmark.url.indexOf(urlPre) === 0) {
          console.log(`已经存在书签，仅更新："${bookmark.title}"`);
          chrome.bookmarks.update(bookmark.id, {
            title: tab.title,
            url: tab.url
          }, bookmark => {
            console.log(`已更新书签："${bookmark.title}" ==> "${tab.title}"`);
            Utils.notify("已更新书签", tab.title);
          });
          return;
        }
      }
      console.log(`不存在书签，开始添加："${tab.title}"`);
      this.#add(tab.title, tab.url, this.#folderID,
        Utils.notify("已添加书签", tab.title));
    });
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
        if (fail && typeof fail === "function") fail();
        return;
      }
      console.log("创建书签（夹）成功：", bookmark.id, bookmark.title);
      if (success && typeof success === "function") success(bookmark);
    });
  }

  /**
   * 从chromium storage从读取网址前缀数组
   * @param callback (array) 读取完成的回调，回调时会传递一个网址前缀的数组
   */
  static readUrlsPre(callback) {
    Utils.Storage.get({urls_pre: []}, data => {
      callback(data.urls_pre);
    });
  }

  /**
   * 将网址前缀信息写入chromium storage
   * @param data 要写入的网址前缀数组
   * @param callback 写入成功的回调，无参
   */
  static writeUrlsPre(data, callback) {
    Utils.Storage.set({urls_pre: data}, () => {
      callback();
    });
  }
}

// 初始化
Bookmark.storedFolder();