# Full Stack Project Blueprint

เอกสารนี้ถอดบทเรียนจาก TaskScheduler เพื่อใช้เป็นมาตรฐานตั้งต้นสำหรับโปรเจคถัดไปในทีม เป้าหมายคือทำให้ทุกโปรเจคมีโครงสร้าง วิธีคิด วิธีทำงาน และคุณภาพใกล้เคียงกัน จัดการง่าย ส่งต่องานให้คนในทีมง่าย และลดการตัดสินใจซ้ำ ๆ ตอนเริ่มระบบใหม่

ใช้เอกสารนี้คู่กับไฟล์เฉพาะโปรเจค เช่น `PRODUCT.md`, `DESIGN.md`, `.github/copilot-instructions.md`, README ของแต่ละ layer, และสคริปต์ deploy ของโปรเจคนั้น ๆ

## 1. หลักคิดระดับทีม

โปรเจคภายในองค์กรควรถูกออกแบบให้ predictable ก่อน clever เสมอ คนที่รับช่วงต่อควรเดาได้ว่า business rule อยู่ที่ไหน API ทำหน้าที่อะไร frontend รับผิดชอบแค่ไหน และ deploy ต้องตรวจอะไรบ้าง

หลักที่ควรรักษาทุกโปรเจค:

- **Architecture ชัด:** แยก domain, infrastructure, HTTP/orchestration, UI, และ tests ให้เห็นหน้าที่ชัดเจน
- **Operational safety:** ระบบภายในต้องตรวจสอบย้อนหลังได้ มี log, audit, validation, และ error visibility
- **Service-first backend:** controller บาง, business flow อยู่ใน service หรือ domain helper ที่ทดสอบได้
- **UI เป็นเครื่องมือทำงาน:** หน้าแรกควรเป็น working surface ไม่ใช่ landing page หรือ dashboard ตกแต่ง
- **Consistency beats novelty:** ใช้ pattern เดิมซ้ำอย่างตั้งใจ ดีกว่าสร้าง abstraction ใหม่ทุกงาน
- **Docs are part of delivery:** ทุกโปรเจคต้องมีเอกสาร product, design, architecture, test, deploy และ AI/team instructions

## 2. โครงสร้าง Solution มาตรฐาน

สำหรับระบบ .NET + React/MVC แบบ internal enterprise ให้เริ่มด้วยโครงสร้างนี้:

```txt
Company.Product.sln
Company.Product.Core/
Company.Product.Data/
Company.Product.API/
Company.Product.Client/
Company.Product.React/
Company.Product.Tests/
scripts/
.github/copilot-instructions.md
PRODUCT.md
DESIGN.md
PROJECT_BLUEPRINT.md
README.md
```

หน้าที่แต่ละ project:

| Project | Responsibility | Must Not Contain |
| :--- | :--- | :--- |
| `Core` | domain models, shared rules, validation, constants, domain services | EF Core, SQL Server, MVC, SignalR, DevExtreme, HTTP concerns |
| `Data` | EF Core, DbContext, migrations, repository/infrastructure services, audit/soft delete persistence | UI logic, controller orchestration, domain decisions that should be reusable |
| `API` | Web API, SignalR hubs, hosted workers, orchestration services, DTOs/contracts | large business rules inside controllers, direct UI assumptions |
| `Client` | ASP.NET Core MVC/Razor + DevExtreme admin UI when server-rendered UI is useful | persistence logic, domain rules |
| `React` | Vite + React + TypeScript admin workspace | backend authority, persistence rules, security decisions |
| `Tests` | xUnit tests for domain, services, orchestration, persistence behavior | real network dependency unless explicitly integration-tested |

Dependency direction:

```txt
React/Client -> API over HTTP
API -> Data -> Core
Tests -> API/Data/Core
Core -> no project dependency
```

อย่าสร้าง Application layer, shared mega-library, หรือ framework ใหม่ตั้งแต่ต้น ถ้า project ยังไม่ได้มี complexity ที่ต้องการจริง ให้เริ่มจาก structure ที่ชัดและค่อย extract เมื่อมี duplication หรือ rule ที่ต้อง reuse

## 3. Starter Files ที่ทุกโปรเจคควรมี

ทุก repo ควรมีไฟล์เหล่านี้ตั้งแต่ช่วงเริ่มงาน:

- `PRODUCT.md`: ผู้ใช้คือใคร, ใช้ระบบตอนไหน, product purpose, tone, anti-reference, design principles
- `DESIGN.md`: design tokens, typography, spacing, component rules, UX bans, accessibility target
- `.github/copilot-instructions.md`: architecture boundary, coding standard, test/deploy rules, domain constraints, tool rules
- `README.md`: local setup, required tools, environment variables, run/build/test commands
- `TaskScheduler.Tests/README.md` equivalent: test conventions, folder layout, baseline coverage
- `scripts/Deploy-<Product>.ps1`: repeatable deployment script with validation
- `.config/dotnet-tools.json`: pin repo-local tools such as `dotnet-ef`
- `.env.example`: frontend environment contract

เอกสารเหล่านี้ไม่ควรเป็นเอกสารสวย ๆ ที่ไม่มีใครใช้ แต่ต้องเป็น operating manual ที่คนในทีมเปิดแล้วทำงานต่อได้ทันที

## 4. Backend Architecture Standard

### Core

Core คือที่เก็บสิ่งที่เป็น business language และ rule ที่ไม่ควรผูกกับ HTTP, database, หรือ UI

แนวทาง:

- ใช้ entity/model ที่สะอาดและอ่านง่าย
- ใช้ static constants หรือ static rule class สำหรับ status/trigger type ก่อนใช้ enum ถ้า compatibility ยังสำคัญ
- ย้าย reusable validation และ state normalization เข้า Core เช่น `ScheduleRules`
- business rule ที่ frontend ต้องรู้ควร expose เป็น rule/config ได้ ไม่ควร copy logic กระจายในหลาย layer
- Core ต้องไม่ reference EF Core, MVC, SignalR, DevExtreme, SQL Server

ตัวอย่าง pattern ที่ควรทำซ้ำ:

```csharp
public static class ScheduleTriggerTypes
{
    public const string Interval = "Interval";
    public const string Daily = "Daily";
    public const string Weekly = "Weekly";
    public const string Monthly = "Monthly";

    public static readonly string[] All = [Interval, Daily, Weekly, Monthly];
}
```

### Data

Data คือ infrastructure layer ทำหน้าที่ persistence, audit, soft delete, current user, clock abstraction และ database mapping

แนวทาง:

- ใช้ EF Core + SQL Server เป็นค่าเริ่มต้นสำหรับ internal .NET apps
- DbContext รับ `IDateTime` และ `ICurrentUserService` เพื่อทำ audit deterministic และ test ได้
- ใช้ query filters สำหรับ soft-deleted records ที่ไม่ควรแสดงตามปกติ
- intercept delete เป็น soft delete ใน `SaveChanges` / `SaveChangesAsync`
- preserve `CreatedAt` / `CreatedBy` ตอน update
- อย่าผูก execution history กับ soft-deleted parent แบบที่ทำให้ history หายหรือ query ไม่ได้

Audit fields มาตรฐาน:

```txt
CreatedAt
CreatedBy
UpdatedAt
UpdatedBy
IsDeleted
DeletedAt
DeletedBy
IsActive
```

### API

API คือ orchestration boundary ไม่ใช่ที่เก็บ business rule ยาว ๆ

แนวทาง:

- Controllers thin: รับ request, เรียก service, แปลง result เป็น HTTP response
- Services own orchestration: validation flow, DB operation, scheduling, execution, notifications
- ใช้ DTO/contract สำหรับ endpoint ใหม่ที่ไม่ใช่ DevExtreme admin endpoint
- DevExtreme admin endpoints อาจใช้ `Get/Post/Put/Delete`, `DataSourceLoadOptions`, form `values`, และ PascalCase ต่อไปเพื่อ compatibility
- Standard API endpoint ใหม่ควรใช้ response envelope
- ใช้ structured logging และ cancellation token ใน I/O flow
- แยก query service สำหรับ dashboard/log/read-heavy screens

Response shape มาตรฐานสำหรับ non-DevExtreme endpoints:

```json
{
  "success": true,
  "message": "optional summary",
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "human-readable summary",
  "errors": [
    {
      "code": "validation_error",
      "message": "Detailed error message"
    }
  ],
  "correlationId": "optional-trace-id"
}
```

### Authentication And Authorization

สำหรับ internal Windows-hosted apps ให้ใช้ Windows Authentication / Negotiate เป็นค่าเริ่มต้น ถ้าองค์กรยังไม่มี role mapping ชัดเจน ห้ามเดา group/policy เอง

Rules:

- no custom login page, no JWT, no OAuth unless explicitly required
- enforce authorization server-side, not only hiding UI
- capture current Windows user for manual actions and audit fields when available
- document missing AD group/policy decisions as open product/security questions

### Background Work And Execution Flow

ถ้าระบบมี scheduler, worker, queue, หรือ long-running work ให้ตั้ง rule เหล่านี้แต่แรก:

- execution gating ต้องชัด เช่น active-only execution
- ห้าม duplicate in-flight execution ของ schedule/work item เดียวกัน
- ทุก execution ต้องมี parent log และ child/detail log ถ้ามีขั้นตอนย่อย
- failure ต้อง persist พร้อม message ที่ operator ใช้วิเคราะห์ได้
- manual run และ scheduled run ควรผ่าน validation/logging path เดียวกันเท่าที่ทำได้
- ถ้า deploy หลาย instance ต้องมี distributed lock, leader election, หรือ queue ownership ที่ชัดเจน

## 5. Frontend Architecture Standard

### React App Structure

React admin app ควรใช้ Vite + React + TypeScript และจัดโครงสร้างแบบ feature-oriented:

```txt
src/
  api/
    adminApi.ts
    dataSources.ts
    TaskUpdatesProvider.tsx
  components/
    grid/
      dataGridConfig.ts
    StatusText.tsx
    FieldRow.tsx
  config/
    appConfig.ts
    devExtremeSetup.ts
    theme.ts
  features/
    dashboard/
    tasks/
    steps/
    schedules/
    logs/
    requestTests/
  types/
    entities.ts
  App.tsx
  main.tsx
```

Rules:

- route orchestration อยู่ใน `App.tsx`
- global shell อยู่ใน feature shell component เช่น `TaskAppShell.tsx`
- workspace/detail route อยู่ใน dedicated page เช่น `TaskWorkspacePage.tsx`
- shared API/config/types อยู่ใต้ `src/api`, `src/config`, `src/types`
- feature components ไม่ hardcode API host, hub URL, หรือ environment
- UI validation ทำได้ แต่ backend authoritative เสมอ
- อย่าใช้ `any` ถ้าไม่ใช่ third-party boundary และต้อง narrow ทันที

### React API Pattern

ใช้ wrapper กลางสำหรับ API/data source:

- `appConfig.ts` resolve API base URL, hub URL, app base path จาก env
- `adminApi.ts` รวม `createStore`, form `values`, credentials, error parsing
- `dataSources.ts` สร้าง task-scoped/log-scoped DataSource
- SignalR อยู่ใน provider/context และส่งเฉพาะ event ที่ UI ต้อง react

### DevExtreme React DataGrid Baseline

สำหรับ DataGrid ที่ผูกกับ remote data หรือ CustomStore ให้ตั้งค่า shared config แทน copy option กระจาย:

```ts
export const baseDataGridProps = {
  width: '100%',
  showBorders: true,
  rowAlternationEnabled: true,
  renderAsync: true,
  repaintChangesOnly: true,
  paging: {
    enabled: false,
  },
} as const
```

Docs-backed rules:

- `remoteOperations: 'auto'` ไม่เปิด remote operations ให้ CustomStore ทั่วไป ต้องตั้ง `remoteOperations: true` ชัดเจน
- remote operations ช่วยให้ filtering/sorting/paging/data shaping ไปที่ server สำหรับ large datasets
- เมื่อใช้ remote operations ห้ามให้ calculated columns ที่ใช้ `calculateCellValue` หรือ `calculateDisplayValue` ถูก sort/filter/group
- `calculateSortValue` และ `calculateGroupValue` ภายใต้ remote operations ควรเป็น string selector ไม่ใช่ function
- virtual row/column rendering เหมาะกับ paging disabled หรือ column จำนวนมาก
- `renderAsync` ช่วย render simple cells ก่อน complex content เช่น filter row, command columns, editors
- `repaintChangesOnly` เหมาะกับ real-time updates, refresh, หรือ editing-heavy grids

TaskScheduler operational preference:

- ปิด paging และไม่ใช้ pager controls เว้นแต่ user ขอชัดเจน
- ใช้ virtual scrolling เป็น navigation model หลัก
- Actions column fixed-right, compact, center-aligned และ reusable จาก shared config
- ไม่ใช้ adaptive column hiding ถ้าผู้ใช้ต้องเห็นทุก column และเข้าถึง Actions ได้บนจอแคบ

### DevExtreme Form And Editor Rules

- เมื่อใช้ `devextreme-react/form` กับ `editorType` ต้อง import widget ที่ตรงกัน เช่น `devextreme/ui/text_box`, `select_box`, `number_box`, `tag_box`
- อย่า conditionally mount/unmount editor ต่างชนิดในตำแหน่งเดิม ให้ใช้ stable item tree และ `visible` toggle
- time-only editor ต้องใช้ `dateSerializationFormat: "HH:mm:ss"`
- TagBox ที่ bind array ต้องคง array ใน editor state อย่าแปลงเป็น comma string ระหว่าง edit
- recurrence-specific fields ให้แสดงเฉพาะเมื่อ trigger type ใช้ field นั้น

### MVC / Razor Client Pattern

MVC client เหมาะกับ admin screen ที่ต้อง server-rendered, DevExtreme grid/form, และ workflow เดิมขององค์กร

Rules:

- Razor view เป็น initialization glue ไม่ใช่ที่รวม JS ขนาดใหญ่
- ย้าย complex grid/form behavior ไป `wwwroot/js/<feature>.js`
- ใช้ DevExtreme `createStore` หรือ MVC data source pattern ที่เข้ากับ API
- เปิด `xhrFields.withCredentials` เมื่อใช้ Windows Authentication ข้าม app/subfolder
- ทำ recurrence/editor helper แยกจาก grid wiring เพื่อ reuse และ test ทางพฤติกรรมง่ายขึ้น

## 6. UX/UI Standard

ใช้แนวทาง **Modern Sharp Minimal Operations** สำหรับ internal admin tools

Design principles:

- หน้าแรกเป็น working surface ไม่ใช่ marketing/hero page
- users ใช้ระบบซ้ำ ๆ เพื่อ scan, edit, troubleshoot ดังนั้นต้อง compact, readable, stable
- ให้ typography, alignment, spacing, borders ทำหน้าที่สร้าง hierarchy
- ใช้สีเป็น signal เล็ก ๆ ไม่ใช่โครงสร้างหลักของหน้า
- status เป็น text-led ไม่ใช่ badge/chip/dot/counter

Visual rules:

- 8px grid
- 13px typography เป็นค่าเริ่มต้นสำหรับ UI
- neutral surfaces อย่างน้อย 90% ของหน้าจอ
- border 1px, radius ต่ำ เช่น 2px controls, 4px panels
- no hero sections, no decorative gradients, no blobs, no shadows, no glass effects
- no nested cards, no card-in-card, no large rounded dashboard chrome
- no hover movement, scale, glow, หรือ animation ที่ไม่ช่วย workflow

Admin layout rules:

- page header อยู่ outside cards
- toolbar/search/filter อยู่เหนือ table
- tables remain tables; อย่ายัด mini-card ลงใน row
- dense details, audit, destructive action ควรอยู่ใน drawer, modal, side panel, หรือ dedicated route
- loading/empty/error states ต้องไม่ทำให้ layout jump
- responsive behavior ต้องออกแบบจริง ไม่ใช่บีบ desktop ลงมือถือ

Accessibility baseline:

- target WCAG AA
- keyboard-friendly navigation
- visible focus states
- contrast อ่านได้ทั้ง light/dark
- อย่าพึ่งสีอย่างเดียวเพื่อสื่อสถานะ
- long IDs, URLs, paths ต้องไม่ overlap หรือทำ layout แตก

## 7. Skills และ AI Workflow ที่ควรใช้ซ้ำ

ใน repo นี้มี skill/instruction assets ที่ควรนำไปใช้กับโปรเจคใหม่ ให้แยกให้ชัดว่าอะไรเป็น project standard, อะไรเป็น user-level helper, และอะไรเป็น VS Code built-in helper

Skill inventory จาก workspace/session นี้:

| Skill | Scope | Use When | Notes For Future Projects |
| :--- | :--- | :--- | :--- |
| `impeccable` | repo-installed via `skills-lock.json` | frontend design, UX/UI polish, design system, accessibility, performance hardening | ต้องมี `PRODUCT.md`; ควรมี `DESIGN.md`; เหมาะกับงาน React/admin UI ที่ต้อง craft จริง |
| `clean-enterprise-console-ui` | user skill | admin tools, CRUD pages, settings consoles, app shell, tables, forms | ใช้เป็น default mental model สำหรับ internal enterprise UI |
| `windows-iis-deploy` | user skill | deploy .NET/API/MVC/React/SignalR ไป IIS ผ่าน UNC/file share | ใช้สร้างหรือแก้ deploy scripts, IIS subfolder SPA fallback, 503/API 500 triage |
| `find-skills` | user skill | ค้นหา/ติดตั้ง skill ใหม่เมื่อทีมต้องการ capability เฉพาะทาง | ใช้ `npx skills find`, `npx skills add`, และตรวจคุณภาพ skill ก่อนแนะนำ |
| `agent-customization` | VS Code workflow skill | สร้าง/แก้ `.instructions.md`, `.prompt.md`, `.agent.md`, `SKILL.md`, `copilot-instructions.md`, `AGENTS.md` | ใช้เมื่อทีมต้อง package workflow หรือ coding standard ให้ agent ทำซ้ำได้ |
| `get-search-view-results` | VS Code helper skill | ต้องการอ่านผลลัพธ์จาก Search view ปัจจุบันใน VS Code | ใช้เฉพาะกรณีผู้ใช้มี search results เปิดไว้แล้ว |

Project-level AI assets ที่ควรมีในโปรเจคใหม่:

- `.github/copilot-instructions.md` สำหรับ always-on engineering guide
- `PRODUCT.md` และ `DESIGN.md` สำหรับ frontend/design context
- `skills-lock.json` ถ้า repo ต้อง pin skill ที่ทีมใช้ร่วมกัน
- custom `.github/instructions/*.instructions.md` เมื่อมี rule เฉพาะ path หรือ technology
- custom `.github/prompts/*.prompt.md` เมื่อมี task ซ้ำ ๆ ที่ควรเรียกด้วย prompt
- custom `.github/agents/*.agent.md` เมื่อ workflow ต้องใช้ subagent หรือ tool restrictions เฉพาะ

### `.github/copilot-instructions.md`

ใช้เป็น operating contract สำหรับ AI และทีม:

- project overview และ business context
- architecture boundaries
- layer-specific rules
- stack และ environment
- current implementation snapshot
- business/security/API/UI/testing conventions
- tool rules เช่น DevExtreme docs, Azure docs, deploy rules

ทุกโปรเจคใหม่ควรมีไฟล์นี้ และต้องอัปเดตเมื่อ architecture หรือ baseline เปลี่ยน

### `impeccable`

ใช้เมื่อทำ frontend design, polish, UX audit, theming, layout, responsiveness, accessibility, performance, หรือ design system extraction

Required context:

- ต้องมี `PRODUCT.md`
- ควรมี `DESIGN.md`
- design work ต้องยึด product context ไม่ใช่ generic UI

### `clean-enterprise-console-ui`

ใช้สำหรับ admin tools, CRUD pages, settings consoles, app shell, sidebars, navbars, forms, tables และ internal enterprise UI

Key principles:

- practical settings-console interface
- compact shell and stable scroll behavior
- page header outside cards
- filters above table
- neutral surfaces, crisp borders, modest radius
- complete empty/loading/error/disabled states

### `windows-iis-deploy`

ใช้เมื่อ deploy .NET, MVC, Web API, SignalR, Vite/React หรือ static SPA ไป Windows Server IIS ผ่าน UNC/file share

Key principles:

- identify deployment surfaces ก่อน build: API, MVC, React, SignalR, root landing, database, auth
- แยก physical target path กับ public URL ให้ชัด
- Vite build ต้อง set env vars ชัดเจนใน process
- ใช้ `dotnet publish -c Release -o <artifact>` และ `robocopy /MIR`
- ใช้ `app_offline.htm` ระหว่าง copy ASP.NET apps
- validate root, React root, MVC client, API endpoint, Swagger, SignalR, และ deep links
- ถ้าเจอ plain IIS 503 ให้แยก app-pool/IIS failure ออกจาก application bug ก่อนแก้ code

### DevExtreme MCP Docs

ใช้ทุกครั้งก่อนแก้ DevExtreme behavior โดยเฉพาะ DataGrid, Form, remoteOperations, virtual scrolling, editor lifecycle และ ASP.NET Core wrappers

Rules to carry forward:

- use latest docs for current package behavior
- use version-specific docs when project pins older DevExtreme major/minor
- do not rely on memory for tricky DevExtreme constraints

### Azure Tools Rule

ถ้า request เกี่ยวกับ Azure ต้องใช้ Azure tools และ best-practices tool ก่อน ถ้าไม่มี tool ต้องขอให้ enable ก่อนดำเนินการ

## 8. Deployment Standard

สำหรับ IIS + UNC deployment ให้สร้าง script เดียวที่ทำงานซ้ำได้ end-to-end

Script responsibilities:

- resolve repository root, target root, public base URL
- publish MVC client
- rewrite deployed client config ให้ชี้ API public URL
- publish API service
- write safe appsettings override เฉพาะที่จำเป็น
- build React ด้วย explicit env vars:
  - `VITE_<APP>_APP_BASE_PATH`
  - `VITE_<APP>_API_BASE_URL`
  - `VITE_<APP>_HUB_URL`
- run React lint unless explicitly skipped
- copy React dist
- write root landing page
- optionally apply guarded additive DB patch only with explicit switch
- validate deployed endpoints

IIS SPA subfolder rules:

- BrowserRouter deep link ต้องมี fallback ที่ IIS เช่น `httpErrors ExecuteURL`, URL Rewrite, ASP.NET fallback, หรือ HashRouter
- physical fallback folders ใช้ได้แค่ workaround แคบ ๆ ไม่ใช่ solution ระยะยาว
- React asset base path ต้องตรงกับ virtual directory เช่น `/Tools/Product/React/`

Validation checklist:

- root landing returns 200
- React root returns 200
- MVC client returns 200
- API grid/data endpoint returns 200
- Swagger opens when intended
- React deep link returns 200
- SignalR negotiate/connect verified
- deployed config ไม่ชี้ localhost หรือ stale host
- temporary stdout logging ถูกปิดหลัง diagnosis

## 9. Testing Standard

ใช้ xUnit สำหรับ .NET tests และเน้น behavior ที่มี business risk ก่อน

Folder layout:

```txt
Tests/
  API/
    Services/
  Data/
    Services/
  Support/
```

Naming:

```txt
MethodName_Scenario_ExpectedBehavior
```

Priorities:

- service orchestration
- validation and response contracts
- schedule/timing calculations
- duplicate-run prevention
- execution logging and failure visibility
- audit stamping and soft delete behavior
- current-user resolution

Testing rules:

- use deterministic fakes for clock/current user/network/SignalR
- use EF Core InMemory only for behavior-focused tests, not SQL translation proof
- add integration tests when EF mapping/query behavior matters
- do not call real external APIs in unit tests

Frontend validation:

```powershell
Push-Location Company.Product.React
npm run lint
npm run build
Pop-Location
```

.NET validation:

```powershell
dotnet test
```

ระวัง local build/test ที่ rebuild API หรือ Client อาจ fail ถ้า app กำลังรันอยู่และ executable ถูก lock

## 10. New Project Checklist

ใช้ checklist นี้ตอนเริ่มโปรเจคใหม่:

- [ ] เขียน `PRODUCT.md` ก่อนเลือก UI pattern
- [ ] เขียน `DESIGN.md` ก่อนสร้าง component จำนวนมาก
- [ ] สร้าง `.github/copilot-instructions.md` จาก business/architecture จริงของโปรเจค
- [ ] ตั้ง solution เป็น `Core/Data/API/Client/React/Tests` หรือเลือก subset พร้อมอธิบายเหตุผล
- [ ] ตั้ง dependency direction ให้ Core clean
- [ ] ใส่ audit/current-user/clock abstraction ตั้งแต่แรกถ้าระบบมี admin action
- [ ] ตัดสินใจ auth model และ document role/group mapping ที่ยังไม่ชัด
- [ ] แยก DevExtreme admin endpoints กับ standard API endpoints
- [ ] ตั้ง frontend config ผ่าน env/helper ไม่ hardcode host
- [ ] ตั้ง shared DataGrid config ถ้าใช้ DevExtreme
- [ ] ตั้ง test folder conventions และ baseline tests
- [ ] สร้าง deploy script ที่ validate endpoint หลัง deploy
- [ ] สร้าง README local setup + deploy notes

## 11. Definition Of Done

งานหนึ่งชิ้นถือว่าเสร็จเมื่อ:

- behavior ถูกแก้ที่ root cause
- layer boundaries ยังถูกต้อง
- security decision enforce ที่ server-side
- validation/error state ชัดเจนสำหรับ operator
- execution/audit/logging rules ไม่เสีย
- frontend ไม่ย้าย business authority ไป client
- UI อยู่ใน design system และไม่เพิ่ม visual noise
- DevExtreme behavior ตรวจ docs แล้วเมื่อแก้ option/lifecycle สำคัญ
- tests ถูกเพิ่มหรืออธิบายเหตุผลที่ไม่เพิ่ม
- lint/build/test ที่เกี่ยวข้องผ่าน
- deploy/config impact ถูกระบุถ้ามี
- docs/instructions ถูก update เมื่อ baseline เปลี่ยน

## 12. Anti-Patterns ที่ต้องห้ามตั้งแต่ต้น

- controller ที่มี business logic ยาว ๆ
- React component ที่เรียก endpoint หลายแบบและ normalize business rules เอง
- Core reference EF/MVC/SignalR/DevExtreme
- soft delete ที่ทำให้ history หาย
- hidden UI แทน authorization
- magic strings กระจายหลาย layer โดยไม่มี constants/rules
- DevExtreme calculated column ที่ยังเปิด sort/filter/header filter ภายใต้ remote operations
- time-only editor ที่ส่ง ISO datetime แล้ว timezone drift
- deploy manual copy โดยไม่มี validation
- README/instructions ที่ไม่ตรงกับ reality ของ repo
- dashboard/admin UI ที่เป็น hero/cards/gradients มากกว่า working surface

## 13. วิธีส่งต่อให้ลูกน้องในทีม

สำหรับ developer ใหม่ ให้เดินตามลำดับนี้:

1. อ่าน `PRODUCT.md` เพื่อเข้าใจผู้ใช้และงานจริง
2. อ่าน `PROJECT_BLUEPRINT.md` เพื่อเข้าใจมาตรฐานทีม
3. อ่าน `.github/copilot-instructions.md` เพื่อเข้าใจข้อห้ามของ repo นั้น
4. เปิด solution map แล้วระบุว่า feature ที่จะแก้อยู่ layer ไหน
5. หา existing pattern ก่อนเขียน pattern ใหม่
6. เขียนหรือแก้ test ที่ใกล้ behavior ก่อนหรือพร้อม implementation
7. ใช้ shared config/helper ที่มีอยู่ เช่น DataGrid config, appConfig, theme, API wrappers
8. รัน validation ที่แคบที่สุดก่อน แล้ว broaden เมื่อแตะ shared component หรือ contract
9. update docs ถ้าเปลี่ยน convention

หลัก coaching ที่ควรใช้: ให้ junior อธิบายก่อนว่า “rule นี้ควรอยู่ layer ไหน และทำไม” ถ้าตอบได้ การ implement มักจะไม่หลุด architecture
