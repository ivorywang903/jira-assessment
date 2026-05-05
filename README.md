# 季度考核分析系統

整合 Jira 與 Bitbucket 數據，分析開發成員的產出、效率與代碼品質，自動標記異常延遲票據並產生綜合排名，作為季度考核參考依據。

## 技術棧

- **Frontend**：Vue 3 (Composition API) + Tailwind CSS + Vite
- **Backend / DB**：Supabase（PostgreSQL）
- **整合**：Jira REST API v2、Bitbucket Server REST API 1.0
- **台灣工作日**：[TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar)（透過 jsDelivr CDN）

> 僅支援地端部署的 **Jira Server** 與 **Bitbucket Server / Data Center**。

---

## 功能說明

### Jira + Bitbucket 聯動分析

- 依照 JQL 抓取指定成員在特定期間內的完成票據
- 解析每張票的 Changelog，計算從 **Implement → RD TEST** 的工作天數
  - 自動排除週末與台灣國定假日
- 依 Jira Key 關聯 Bitbucket PR，統計 PR 評論數與程式碼變動量

**JQL 模板**

```
project not in (PM, TSE) AND type != Epic
AND (assignee in ({names}) OR "Implement Host" in ({names}))
AND Status in (DONE, "QA Test")
AND "End date" >= "{StartDate}" AND "End date" <= "{EndDate}"
ORDER BY cf[12000] DESC, updated ASC, cf[10502] ASC, key ASC
```

### 異常單（Delay）分析

- **定義**：Implement → RD TEST 超過 **10 個工作天**自動標記
- **原因檢索**：抓取該票的 Comments，以正則表達式比對延遲關鍵字分類：

  | 分類 | 比對關鍵字範例 |
  |------|--------------|
  | 環境等待 | 等待環境、waiting server、部署 |
  | 規格變更 | 規格變更、spec change、需求調整 |
  | 外部依賴 | 第三方、vendor、客戶回覆 |
  | 等待確認 | blocked、waiting for approval |
  | 基礎設施 | infrastructure、DB 問題、網路異常 |
  | 假期 | 假期、請假、休假 |
  | 會議佔用 | 會議延遲、meeting 佔用時間 |

- **UI 展示**：獨立列出超時票列表，標示人為 / 非人為、延遲原因分類、Comment 關鍵摘要

### 綜合排名演算法

| 面向 | 權重 | 計算方式 |
|------|------|---------|
| 產出 | 40% | 完單數（50%）+ 程式碼變動量（50%），線性正規化 |
| 效率 | 30% | 平均開發工作天（**排除非人為延遲票**），天數越短越高分 |
| 品質 | 30% | PR 平均評論數（密度越低越高分） |

> **動態修正**：若異常票的 Comment 顯示為非開發者責任（環境、規格變更等），該票不計入效率分的懲罰。

---

## 快速開始

### 1. 安裝依賴

```bash
cd jira-assessment
npm install
```

### 2. 設定環境變數（選用）

若需要持久化考核紀錄至 Supabase：

```bash
cp .env.example .env
# 填入 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON
```

> 不設定 Supabase 仍可正常使用，連線設定以 `localStorage` 暫存。

### 3. 啟動開發伺服器

```bash
npm run dev
# http://localhost:5173
```

### 4. 建置產出

```bash
npm run build
```

---

## 登入

| 帳號 | 權限 |
|------|------|
| `admin`（內建） | 只能管理系統帳號（新增 / 刪除使用者） |
| 自建帳號 | 完整功能（Dashboard、設定、帳號管理） |

- 首次使用以內建 `admin` 帳號登入，至「帳號管理」建立個人帳號後再以個人帳號登入使用
- 密碼以 SHA-256 雜湊後儲存於 Supabase

---

## 初始設定流程

1. 以自建帳號登入後，開啟 **設定** 頁面
2. 填入 **Jira** Base URL、Username、Password
3. 填入 **Bitbucket Server** Base URL、Username、Password / HTTP Access Token、Project Key
   - Project Key：Bitbucket 專案縮寫（如 `GCMS`），可在 Bitbucket 專案頁面 URL 中確認
   - Repo Slugs：填入要關聯分析的 repo 名稱（逗號分隔）
4. 點「**測試連線**」確認連線正常
5. 新增 **成員**（英文名需與 Jira assignee 完全一致）
6. 點「**儲存設定**」

---

## 使用說明

1. 至 **Dashboard** 頁面
2. 選擇查詢的**日期範圍**（起始日的年份決定台灣行事曆資料）
3. 勾選要分析的**成員**
4. 點「**開始分析**」，等待進度條跑完
5. 查看：
   - 統計卡片（總票數、超時數、非人為延遲數）
   - 綜合排名表（含各分項分數）
   - 超時票列表（可篩選人為 / 非人為）

---

## CORS 處理

地端 Jira / Bitbucket 不回 CORS header，瀏覽器直接呼叫會被擋。本系統在 `vite.config.js` 實作動態反向代理：

- 前端所有 API 請求走 `/api-proxy/<path>`，並帶 `X-Proxy-Target: http://server.local` header
- Vite dev server 在 Node.js 層轉發至目標伺服器，繞過瀏覽器限制
- 自動允許自簽憑證（`rejectUnauthorized: false`）

> 此代理僅在 `npm run dev` 開發模式下有效。若需部署為靜態站台，需另外架設後端 proxy（如 Nginx `proxy_pass`）。

---

## 資料庫 Schema（Supabase）

執行 `supabase/schema.sql` 建立以下三張表：

| 表名 | 說明 |
|------|------|
| `profiles` | 成員資料（en_name、display_name） |
| `auth_info` | 系統登入帳號（service='app_user'）與外部系統設定（service='jira'/'bitbucket'） |
| `assessment_records` | 考核紀錄，含 `avg_lead_time`、`delayed_tickets_json`、`final_score`、`rank` 等欄位 |

---

## 專案結構

```
jira-assessment/
├── supabase/
│   └── schema.sql
├── src/
│   ├── services/
│   │   ├── workday.js           # 台灣工作日計算
│   │   ├── jiraApi.js           # Jira Server API 整合
│   │   ├── bitbucketApi.js      # Bitbucket Server API 整合
│   │   ├── delayAnalyzer.js     # 延遲原因正則分析
│   │   ├── rankingCalculator.js # 綜合排名演算法
│   │   └── supabase.js          # Supabase CRUD
│   ├── composables/
│   │   ├── useAssessment.js     # 主分析流程
│   │   ├── useConfig.js         # 連線設定管理
│   │   └── useAuth.js           # 登入 / 登出 / Session
│   ├── components/
│   │   ├── RankingTable.vue
│   │   ├── DelayedTickets.vue
│   │   ├── StatCards.vue
│   │   └── ProgressOverlay.vue
│   └── views/
│       ├── Login.vue
│       ├── Dashboard.vue
│       ├── Settings.vue
│       └── UserManagement.vue
├── vite.config.js               # 含動態反向代理 middleware
├── .env.example
└── package.json
```

---

## 注意事項

- 票據量大時（>200 張）分析時間較長，進度條會即時更新目前處理狀態
- 台灣行事曆資料依起始日年份自動載入，跨年查詢會同時載入兩年資料
- Bitbucket PR 與 Jira 票據的關聯透過 `filterText`（branch / PR title 含 Jira Key）比對，命名不規範的 PR 可能無法正確關聯
