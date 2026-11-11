# 安装说明（离线压缩包）

本压缩包是 DeepSeek Harness（DSH）插件 **dsh-opencode-go-quota**，只包含插件源码（JS、配置、文档与截图），
不含任何 API Key、二进制或安装脚本。把它发给同事/朋友后，对方按下面任一种方式安装即可，**全程不需要公网**。

## 系统要求

- DSH 桌面版（或 Web 版）`>= 0.2.1-rc.5`（当前官方桌面版 0.2.2-rc.1 已验证）；Node 22.19+ / 24+
  （桌面版自带运行时，无需另装）。
- macOS / Windows / Linux 均可：插件是纯 JavaScript，没有平台相关依赖。
- 对方已经有一个 **OpenCode Go** 订阅 API Key，并且已配置在 DSH 里（例如通过 DSH 的 OpenCode Go / 模型设置
  添加过，或凭据库中已有 `OPENCODE_GO_API_KEY`）。本插件**不包含** Key；运行时从 DSH 凭据库读取。

## 方式 A：用 `dsh` 命令行安装（推荐，需要终端里有 `dsh` 命令）

1. 确认 CLI 可用：`dsh --version`（应输出版本号，如 `0.2.2-rc.1`）。
2. 安装压缩包（把路径换成实际文件）：

   ```sh
   dsh plugin --profile desktop add /绝对路径/dsh-opencode-go-quota-0.2.0.tgz
   ```

   - 命令会自动把插件装进 `~/.dsh/profiles/desktop/node_modules/`，并把它加入该 profile 的 bundle 列表。
   - 如果对方用的是 Web 版，把 `--profile desktop` 换成 `--profile web`。
3. **完全退出 DSH（⌘Q），再重新打开。**（桌面版的应用自带 profile 只在启动时组合插件，所以必须重启一次。）
4. 打开任意一个已有会话：输入框下方状态行最右端、context window 之后会出现
   `● Go 5h 96% · 周 23% · 月 56%`，点击可展开额度面板。

## 方式 B：纯手动安装（不需要 CLI，不需要联网）

1. **完全退出 DSH（⌘Q）**。
2. 解压 `dsh-opencode-go-quota-0.2.0.zip`，得到 `dsh-opencode-go-quota/` 文件夹（里面应有
   `package.json`、`lib/`、`cordis.patch.yml` 等）。
3. 把整个 `dsh-opencode-go-quota` 文件夹复制到：

   ```
   ~/.dsh/profiles/desktop/node_modules/dsh-opencode-go-quota
   ```

   - `~` 是当前用户主目录；macOS 上就是 `/Users/<用户名>`。
   - Windows 上是 `%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-opencode-go-quota`。
   - 如果 `node_modules` 不存在，先创建它。注意不要复制成
     `node_modules/dsh-opencode-go-quota/dsh-opencode-go-quota`（`package.json` 应直接在这个目录下）。
   - Web 版用户把 `desktop` 换成 `web`。
4. 编辑同一 profile 目录下的 `cordis.patch.yml`：

   ```
   ~/.dsh/profiles/desktop/cordis.patch.yml
   ```

   该文件默认以一行 `[]` 结尾（空的补丁列表）。把这一行 `[]` **替换**为：

   ```yaml
   - insert:
       - id: opencode-go-quota
         name: dsh-opencode-go-quota
   ```

   如果文件里已经有其他条目（不是以 `[]` 结尾），则把上面三行**追加**到文件末尾。
5. 重新打开 DSH，打开任意已有会话。输入框下方状态行最右端（context window 之后）就会出现额度胶囊；
   点击可展开面板。

## 卸载

- 方式 A 安装的：`dsh plugin --profile desktop remove dsh-opencode-go-quota`，然后重启 DSH。
- 方式 B 安装的：删除 `~/.dsh/profiles/desktop/node_modules/dsh-opencode-go-quota` 文件夹，并删掉
  `cordis.patch.yml` 里那三行 `- insert:` 内容，然后重启 DSH。

## 功能速览

- 在 composer 状态行官方 session 统计旁边、context window 之后显示三个官方额度窗口的**剩余百分比**：
  `5h` / `周` / `月`；余量低时变琥珀色/红色。
- 点击胶囊弹出小面板：每个窗口的进度条 + 剩余百分比 + 下一次重置时间；右上角「刷新」立即拉取。
- 每 60 秒静默刷新，后台自动暂停；宿主侧缓存 15 秒；断网/Key 失效时保留上次数据并提示。
- API Key 只在 DSH 宿主进程中使用，浏览器端只会收到解析好的额度快照。

## 排错

- 看不到胶囊：
  - 确认已**完全退出并重新打开** DSH（只刷新页面不够，桌面应用需要重启组合插件）；
  - 打开 DSH 设置 →「插件」，确认 `dsh-opencode-go-quota` 已启用；
  - 额度胶囊只在**已有会话的输入框状态行**出现，新会话首页没有这一行。
- 胶囊显示「额度不可用」：检查 DSH 里是否已配置 OpenCode Go 的 Key，以及机器能否访问
  `https://opencode.ai`。
- 安装后 DSH 启动报插件错误：删除 `cordis.patch.yml` 中追加的三行（方式 B）或执行方式 A 的卸载命令，
  重启即可恢复；把报错文本发给插件作者排查。

## 校验和

压缩包发布时会附带 SHA-256 校验和（见分享目录中的 `SHA256SUMS` 或随包说明），可用
`shasum -a 256 文件名` 核对，确保文件在传输过程中没有被篡改。

## 许可

MIT License，见包内 `LICENSE`。
