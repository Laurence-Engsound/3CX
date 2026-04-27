# 瑛聲 Demo Lab — E.SUN Outreach Project (玉山 Phase 6) POC 環境

> **內部專用**｜給 Demo 環境管理員（DevOps + IT Ops）
>
> 配套架構圖：[POC-ENV-ARCHITECTURE.svg](./POC-ENV-ARCHITECTURE.svg)
>
> 配套執行手冊：[DEMO-RUNBOOK.md](./DEMO-RUNBOOK.md)

---

## 一、用途與時程

本環境同時服務三個目的：

1. **會議當日 demo 場域** — 4 個 demo 場景的後台（先架後維運）
2. **POC 階段供玉山 IT 遠端試用** — VPN 進來，可操作 SoftPhone + 觀察管理介面
3. **內部 Dry Run 排練平台** — Engagement Manager + 主講者用同一環境演練

**就緒時程**：
- T-14 天：硬體 / VM 就緒、3CX HA cluster 跑起來
- T-7 天：所有 mock 服務（OPEN/NAS/AD/CRM）跑通
- T-3 天：4 個 demo 全部跑過 1 次成功
- T-1 天：最後一次完整跑通 + reset 腳本驗證

---

## 二、網段規劃

```
10.0.0.0/16   Demo Lab 主網段
├── 10.0.0.0/24    管理 / VPN
│   ├── 10.0.0.1     VPN Concentrator (pfSense / Fortigate)
│   ├── 10.0.0.10-19 管理跳板 / Bastion
│   └── 10.0.0.20+   DevOps 工具 (GitLab / Vault / Backup server)
├── 10.0.1.0/24    DMZ (對外服務)
│   ├── 10.0.1.10    SBC (AudioCodes Mediant 1000B)
│   ├── 10.0.1.20    Prometheus
│   ├── 10.0.1.21    Grafana
│   └── 10.0.1.22    ELK Stack (Syslog 集中)
├── 10.0.2.0/24    PBX Tier (3CX HA Cluster)
│   ├── 10.0.2.11    pbx-ha-01 (active)
│   ├── 10.0.2.12    pbx-ha-02 (standby)
│   ├── 10.0.2.13    witness
│   └── 10.0.2.20    3CX management UI
├── 10.0.3.0/24    VOXEN Application Tier
│   ├── 10.0.3.10    VOXEN 編排層
│   ├── 10.0.3.11    致行 Voice Bot
│   ├── 10.0.3.12    3CX Adapter
│   ├── 10.0.3.13    OPEN/AD/CRM Adapter
│   └── 10.0.3.20    LLM Gateway (Demo 用 Azure OpenAI)
├── 10.0.4.0/24    玉山環境模擬 Tier
│   ├── 10.0.4.10    OPEN/TeleSA Mock (Webhook receiver)
│   ├── 10.0.4.20    NAS Mock (SMB/NFS share, 2 TB)
│   ├── 10.0.4.30    AD/SSO Mock (OpenLDAP + Keycloak)
│   ├── 10.0.4.40    CRM Mock (REST API + 客戶 360)
│   └── 10.0.4.50    錄音管理 Mock (Web UI + 稽核日誌)
└── 10.0.5.0/24    Agent / 客戶端模擬
    ├── 10.0.5.10-13 agent01-04 SoftPhone host
    ├── 10.0.5.20    supervisor01 SoftPhone host
    └── 10.0.5.30    SIP Trunk Simulator (FreeSWITCH)
```

---

## 三、硬體 / VM 規格

### 3.1 實體機（瑛聲 Lab 機房）

| # | 用途 | CPU | RAM | 磁碟 | 數量 | 備註 |
|---|------|-----|-----|------|------|------|
| 1 | 虛擬化主機 (ESXi / Proxmox) | 32 core | 128 GB | 4 TB SSD | 2 | 主備 |
| 2 | NAS（錄音 + 備份） | — | — | 8 TB RAID-10 | 1 | 含 SSD cache 1 TB |
| 3 | 邊界 firewall (pfSense) | 4 core | 8 GB | 256 GB | 1 | 含 IPsec VPN |
| 4 | SBC（AudioCodes Mediant 1000B） | — | — | — | 1 | 實體 SBC |

### 3.2 VM 規格清單（總計 14 個 VM）

| VM 名稱 | vCPU | RAM | Disk | 用途 |
|---------|------|-----|------|------|
| pbx-ha-01 | 8 | 16 GB | 200 GB SSD | 3CX 主節點 |
| pbx-ha-02 | 8 | 16 GB | 200 GB SSD | 3CX 備節點 |
| witness | 2 | 4 GB | 50 GB | HA witness |
| 3cx-mgmt | 4 | 8 GB | 100 GB | 3CX 管理 / Web UI |
| voxen-orch | 4 | 8 GB | 100 GB | VOXEN 編排層 |
| voxen-bot | 8 | 16 GB | 100 GB | 致行 Voice Bot（含本地 LLM mini） |
| voxen-adapter-3cx | 2 | 4 GB | 50 GB | 3CX Adapter |
| voxen-adapter-open | 2 | 4 GB | 50 GB | OPEN/AD/CRM Adapter |
| open-mock | 2 | 4 GB | 50 GB | OPEN webhook mock |
| nas-mock | 2 | 4 GB | 100 GB（系統）+ NAS mount | NAS share |
| ad-mock | 2 | 4 GB | 50 GB | OpenLDAP + Keycloak |
| crm-mock | 2 | 4 GB | 50 GB | CRM REST API |
| recording-mgmt-mock | 2 | 4 GB | 50 GB | 錄音管理 Web |
| sip-trunk-sim | 2 | 4 GB | 50 GB | FreeSWITCH SIP Trunk Sim |
| **合計** | **50** | **100 GB** | **1.2 TB SSD** | — |

留 30% buffer，建議虛擬化主機提供 64 vCPU + 128 GB 給 demo 環境（剩餘給 Agent SoftPhone host VM）。

### 3.3 軟體版本鎖定

| 元件 | 版本 | 來源 |
|------|------|------|
| 3CX V20 | Update 8（2025-09 GA） | 3CX 官方 |
| OS（PBX VM） | Debian 12 | 3CX 認證 |
| OS（其他 VM） | Ubuntu 22.04 LTS | — |
| FreeSWITCH（Trunk Sim） | 1.10.x | — |
| OpenLDAP | 2.5.x | — |
| Keycloak | 24.x | — |
| AudioCodes SBC firmware | 7.40.500.x | 原廠最新 stable |
| Grafana / Prometheus / ELK | 最新 stable | — |
| Azure OpenAI（致行 Bot） | gpt-4o-mini | Demo 用，正式部署用本地 LLM |

---

## 四、網路需求

### 4.1 對外（玉山 IT VPN 進來試用）

- IPsec VPN（PSK + 玉山 IT 個別帳號 + 2FA）
- 玉山方需要：site-to-site VPN 客戶端 / 帳號
- 流量配額：玉山 IT 試用期間預估 10-20 Mbps 持續

### 4.2 內部頻寬

- 虛擬化主機之間 vSwitch：10 Gbps（NIC bonding）
- 主機 ↔ NAS：10 Gbps 專線（避開 vSwitch 共用）
- SBC ↔ 3CX：1 Gbps 即可（demo 並發 ≤ 50 通）

### 4.3 防火牆規則（重點）

| 來源 | 目的 | Port | 用途 |
|------|------|------|------|
| 玉山 VPN | 10.0.5.10-30 | 5060/UDP, 9000-9499/UDP | SoftPhone SIP/RTP |
| 玉山 VPN | 10.0.2.20:5001 | TCP | 3CX 管理介面（read-only 帳號） |
| 玉山 VPN | 10.0.1.21:3000 | TCP | Grafana（read-only） |
| 玉山 VPN | 10.0.4.50:443 | TCP | 錄音管理介面 |
| Internet | 10.0.1.10:5060,5061 | UDP/TCP | 對外 SIP（給 Trunk Sim） |
| 拒絕 | 玉山 VPN → 10.0.0.0/24 | All | 玉山 IT 不可動管理網段 |

---

## 五、模擬資料準備

### 5.1 模擬客戶（10 筆）

存放於 CRM Mock 的 PostgreSQL：

| 號碼 | 假姓名 | 屬性 | 用途 |
|------|--------|------|------|
| 0912-XXX-001 | 王先生 | 信用卡持卡人, 上月有逾期 | Demo 1（致行轉真人） |
| 0912-XXX-002 | 李小姐 | 房貸客戶, 7 天內曾跟 agent04 通話 | Demo 4（Last-Agent） |
| 0912-XXX-003 | 張先生 | VIP 客戶, 信託商品 | 備援 demo |
| 0912-XXX-004 | 林小姐 | 新申辦, 信用卡 | Demo 4 對照組（無歷史） |
| ...（共 10 筆） | | | |

完整 SQL 種子資料：`./seed-data/customers.sql`

### 5.2 模擬通話歷史（30 筆 CDR）

存放於 3CX 內部資料庫，跑 `./seed-data/cdr.sql` 灌入。
含 7 天 / 30 天分布，提供 Last-Agent Routing 的歷史依據。

### 5.3 模擬錄音（5 筆）

存放於 NAS Mock 的 `/recording/2026/04/`：
- 5 筆預錄通話（瑛聲員工錄製，匿名假對話）
- 涵蓋：一般查詢、客訴、PCI Pause、Whisper 介入、3 方通話

### 5.4 模擬 AD 帳號

| 帳號 | 角色 | 用途 |
|------|------|------|
| agent01-04 | 一般座席 | SoftPhone + OPEN |
| supervisor01 | 主管 | Whisper / Barge / Take 權限 |
| admin | 系統管理員 | 全權，僅瑛聲使用 |
| audit | 法遵稽核 | 唯讀錄音 + 稽核日誌 |
| test_玉山_yi | 玉山測試帳號 | 玉山 IT 試用 |

---

## 六、自動化腳本

所有腳本放在 `~/demo-lab-scripts/`：

| 腳本 | 用途 |
|------|------|
| `bootstrap.sh` | 從零開始 provision 整個 demo lab（一次性） |
| `health-check.sh` | 跑全環境 health check，回報每個元件狀態 |
| `reset-demo-1.sh` | Reset Demo 1（致行 + 轉真人）的環境狀態 |
| `reset-demo-2.sh` | Reset Demo 2（HA Failover）的環境狀態 |
| `reset-demo-3.sh` | Reset Demo 3（主管介入）的環境狀態 |
| `reset-demo-4.sh` | Reset Demo 4（Last-Agent）的環境狀態 |
| `reset-all.sh` | 全環境 reset（保留資料，只清通話 / session） |
| `nuke-and-rebuild.sh` | 玉米級重置 — 整環境重建（dangerous, only DR） |
| `backup-snapshot.sh` | VM snapshot + 設定備份到 NAS |

---

## 七、預估成本（瑛聲內部投資）

| 項目 | 金額 (NTD) | 備註 |
|------|------------|------|
| 虛擬化主機 × 2 | 240,000 | Dell R740 等級，採購可分攤其他案 |
| NAS（含 SSD cache） | 180,000 | Synology / QNAP Enterprise |
| AudioCodes SBC | 180,000 | 採購可長期沿用 |
| 3CX V20 Pro 50-Seat License（demo 用） | 60,000 | 一次性，非主案授權 |
| OpenAI / Azure（demo 期間 LLM API） | 8,000 / 月 | 預估 demo 期間用 3 個月 = 24K |
| 內部人月（架設 + 維運） | 360,000 | 1 工程師 × 1.5 個月 fully-loaded |
| **總計** | **約 NT$ 1,068,000** | 含一次性硬體 + 3 個月 demo 期 |

**ROI 評估**：若E.SUN Outreach Project成交（年合約金額 ≥ NT$ 500 萬），demo lab 投資 6 個月內回收。Lab 後續可服務其他案（Teams + 3CX UC、其他金融客戶 demo）。

---

## 八、安全與法遵

### 8.1 玉山資料隔離

- 玉山 IT 試用期間，所有「玉山 mock 環境」用的是**模擬資料**，不接玉山真實資料
- 玉山 IT 在 demo lab 上的操作不會回流到玉山環境
- VPN 雙向防火牆禁止 demo lab 主動連回玉山網路

### 8.2 錄音管理

- Demo lab 錄音保留 30 天後自動刪除（POC 期）
- 模擬錄音不含真實客戶資料
- 玉山 IT 試用通話不錄音（在登入頁明確告知）

### 8.3 Demo lab 資安

- 對外只開 VPN port + 必要 demo port
- 內部 SSH 走 bastion + key-based auth
- 所有管理動作走 Vault（密碼不留 plain text）
- 每月一次 vulnerability scan（Nessus）

---

## 九、Demo Lab 對應到玉山正式環境的差異

| 維度 | Demo Lab | 玉山正式 |
|------|---------|---------|
| 規模 | 50 SoftPhone 並發 | 450 並發 |
| HA | 2 節點 + witness | 同 |
| SBC | 1 台 demo | HA Pair |
| NAS | 8 TB Synology | 玉山現有 NAS（規格依玉山） |
| OPEN | Mock | 玉山真實 OPEN |
| AD/SSO | Mock | 玉山真實 AD（接 PingFederate） |
| 網路 | 10G 內部 + VPN | 內網專線 + IP-VPN Trunk |
| 災備 | 單機房 | 雙資料中心 |
| LLM | Azure（demo 用） | 本地 LLM 或玉山私有 GPT |
| 監控 | Grafana / ELK | 同 + 接玉山 Splunk |

正式部署時，所有「Mock」元件都會替換為玉山真實服務，且 sizing 放大 9-10 倍。

---

## 文件版本

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-04-25 | 初版 |

**下次更新觸發**：玉山約定具體 POC 時間後，需依玉山方需求調整 mock 元件（例如玉山真的給 OPEN test endpoint 後，Mock 可拔除）。
