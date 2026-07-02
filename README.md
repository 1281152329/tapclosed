# TapClosed

> Close tabs with a tap — middle-click to close, long-press for batch actions.

TapClosed 是一个 Chrome 浏览器扩展，让你用鼠标中键高效管理标签页：

- **快速点击中键** → 关闭当前标签页（带溶解动画）
- **长按中键 1 秒** → 弹出选项菜单：
  - 关闭同域名标签页
  - 关闭其他标签页
  - 关闭所有标签页
  - 复制当前标签页
- **键盘快捷键** → 在所有页面（包括 `chrome://` 页面）都可用
- **撤销支持** → 关闭后 3 秒内可一键撤销恢复

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+W` | 关闭当前标签页 |
| `Alt+Shift+W` | 关闭同域名标签页 |
| `Alt+Shift+O` | 关闭其他标签页 |
| `Alt+D` | 复制当前标签页 |
| `Ctrl+Shift+Z` | 撤销关闭 |

> 快捷键可在 `chrome://extensions/shortcuts` 中自定义。

## 从源码构建

```bash
# 安装依赖
npm install

# 构建
npm run build
```

构建产物输出到 `dist/` 目录。

## 安装到 Chrome / Edge

1. 运行 `npm run build`
2. 打开 `chrome://extensions`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `dist/` 目录

## 发布到 Chrome Web Store

1. 运行 `npm run build`
2. 将 `dist/` 目录打包为 ZIP 文件
3. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
4. 支付一次性 $5 开发者注册费（首次）
5. 点击「新增内容」→「扩展程序」
6. 上传 ZIP 文件，填写商店信息，提交审核

## 技术栈

- TypeScript + React 18
- Vite 6 (多入口构建)
- Tailwind CSS + Framer Motion
- Chrome Extension Manifest V3

## License

MIT
