new Vue({
  el: '#app',
  data() {
    return {
      urlPrefix: ""
    }
  },
  methods: {
    // 点击actions bar后弹出popup.html时初始化数据
    // 查看popup.html的调试信息，需要在弹窗上右键后选择“检查”
    init() {
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        let url = tabs[0].url
        this.urlPrefix = url.substring(0, url.lastIndexOf("/"));
      })
    },
    // 发送消息，需要添加网址前缀到chromium storage
    sendMsgAddURLPre() {
      let urlPre = this.urlPrefix
      if (urlPre === "") return
      if (urlPre[urlPre.length - 1] === "/") {
        urlPre = urlPre.substring(0, urlPre.length - 1)
      }
      // 因为点击“添加”按钮后需要close弹窗，但是这样的话没进行的任务就会终止
      // 所以只好选择项background脚本发送消息来添加网址前缀
      let msg = {cmd: "add_url_pre", newURLPre: urlPre}
      console.log("发送需要添加网址前缀的消息：", msg)
      chrome.runtime.sendMessage(msg)
      window.close()
    }
  },
  mounted() {
    this.init()
  }
})