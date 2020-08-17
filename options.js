new Vue({
  el: '#app',
  data() {
    return {
      storedDataStr: ""   // storedData被JSON.stringify()的数据，string类型
    }
  },
  methods: {
    // 打开选项页时初始化数据
    init() {
      Utils.Storage.get(null, (data) => {
        this.storedDataStr = JSON.stringify(data)
      })
    },
    loadStorage() {
      this.antdConfirm("确认导入输入框的数据", this.storedDataStr, () => {
        try {
          let obj = JSON.parse(this.storedDataStr);
          this.clearStorage(false);
          chrome.storage.sync.set(obj, this.$message.success("已导入数据"))
        } catch (e) {
          console.log("导入数据失败，无法解析json文本：", e)
          this.$message.error("无法解析json，未成功保存数据")
        }
      })
    },
    // 是否格式化，status为true表示格式化，为false表示恢复为格式化前的字符串
    formatDataStr(status) {
      if (status === true) {
        this.storedDataStr = JSON.stringify(JSON.parse(this.storedDataStr), null, 2)
      } else {
        this.storedDataStr = JSON.stringify(JSON.parse(this.storedDataStr))
      }
    },
    // 下载存储的数据（注意是直接从storage中获取的，若不是文本框显示的数据）
    // 参考：纯JS生成并下载各种文本文件或图片 https://juejin.im/post/5bd1b0aa6fb9a05d2c43f004
    downStorage() {
      Utils.Storage.get(null, result => {
        let eleLink = document.createElement('a');
        eleLink.download = "automark_chromium.json";
        eleLink.style.display = 'none';
        let content = JSON.stringify(result);
        // 字符内容转变成blob地址
        let blob = new Blob([content]);
        eleLink.href = URL.createObjectURL(blob);
        // 触发点击
        document.body.appendChild(eleLink);
        eleLink.click();
        // 然后移除
        document.body.removeChild(eleLink);
      });
    },
    clearStorage(needConfirm = true) {
      if (needConfirm) {
        this.antdConfirm("确认清空chrome storage的数据", "", () => {
          Utils.Storage.clear(this.init);
        });
        return;
      }
      chrome.storage.sync.clear(this.init);
    },
    /**
     * 在options.html、popup.html等弹出消息通知
     * 仅能在使用了antd vue框架的网页内调用
     * @param message 消息标题
     * @param description 消息描述
     * @param type 弹窗类型："success"、"info"、"warning"、"error"
     * @param key 消息对话框的ID
     * @param btn 设置btn中的信息：{title:'', props:{type: 'primary', size:'small'}, func:()=>{...}}
     * @param closed 被关闭
     * @param clicked 被点击
     */
    antdNotify(message, description, type = "info", key = `no${Date.now()}`,
               btn = null, closed = null, clicked = null) {
      this.$notification[type]({
        message: message,
        description: description,
        onClick: clicked,
        key: key,
        btn: btn ? (h) => {
          return h('a-button', {
            props: btn.props,
            on: {
              click: () => {
                this.$notification.close(key);
                btn.func();
              }
            }
          }, btn.title)
        } : null
      })
    },
    /**
     * 在options.html、popup.html等弹出对话框
     * 仅能在使用了antd vue框架的网页内调用
     * @param title 标题
     * @param content 内容
     * @param onOK 点击确认按钮的回调
     * @param onCancel 点击取消按钮的回调
     * @param okText 确认按钮的文本
     * @param cancelText 取消按钮的文本
     * @param okType 确认按钮的样式类型："primary"、"warn"等
     * @param isModel 是否为模态对话框
     */
    antdConfirm(title, content, onOK, onCancel = null, okText = "确认",
                cancelText = "取消", okType = "primary", isModel = false) {
      this.$confirm({
        title: title,
        content: content,
        okText: okText,
        cancelText: cancelText,
        okType: okType,
        maskClosable: !isModel,
        onOk() {
          onOK && typeof onOK === "function" ? onOK() : null;
        },
        onCancel() {
          onCancel && typeof onOK === "function" ? onCancel() : null;
        }
      })
    }
  },
  mounted() {
    // 初始化
    this.init()
  }
})