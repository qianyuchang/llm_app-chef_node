# ChefNote 后端 API 设计与生成指南

此文档包含用于生成后端代码的提示词（Prompt）和详细的 API 接口规范。请复制以下内容发送给 AI 助手（如 ChatGPT, Claude, Gemini）。

---

## 复制给 AI 的提示词 (Prompt)

> 我正在开发一个名为 "ChefNote" 的菜谱管理应用。前端已经开发完成，使用 React + TypeScript，并可以通过 RESTful API 与后端通信。
>
> 请根据我提供的 **API 设计规范**，为我生成后端代码。
>
> **技术栈要求：**
> 1.  **语言**：TypeScript
> 2.  **框架**：Node.js + Express
> 3.  **数据库**：为了便于本地快速运行和部署，请使用 **`lowdb`** (JSON 文件存储) 或 **`better-sqlite3`**。代码中需包含数据库初始化逻辑。
> 4.  **功能**：实现所有定义的接口，并配置 `cors` 中间件允许跨域请求。
> 5.  **图片处理**：前端上传的图片是 Base64 字符串，后端直接将其作为字符串存储在数据库中即可（无需处理 multipart/form-data 文件上传）。
> 6.  **端口**：服务器运行在 3001 端口 (前端代理会指向此端口)。
>
> **API 设计规范如下：**
> (请参考下方文档内容)

---

## API 接口规范 (Specification)

### 1. 基础信息
*   **Base URL**: `/api`
*   **数据格式**: JSON
*   **编码**: UTF-8

### 2. 通用响应结构
接口发生错误时，返回状态码 4xx 或 5xx，并返回如下 JSON：
```json
{
  "error": "错误具体描述"
}
```

### 3. 数据模型 (TypeScript 定义)

后端存储的数据结构应与前端类型保持一致：

**Recipe (菜谱)**
```typescript
interface Recipe {
  id: string;          // 唯一标识符 (UUID 或 时间戳字符串)
  title: string;       // 菜名
  category: string;    // 分类
  coverImage: string;  // Base64 字符串
  proficiency: number; // 熟练度 (1-5)
  sourceLink?: string; // 来源链接 (可选)
  ingredients: {       // 食材清单
    name: string;
    amount: string;
  }[];
  steps: string[];     // 步骤文本数组
  logs: {              // 烹饪记录
    id: string;
    date: number;      // 时间戳
    image: string;     // Base64
    note: string;
  }[];
  createdAt: number;   // 创建时间戳
}
```

**Categories (分类)**
分类是一个简单的字符串数组，例如：`['炒菜', '炖菜', '清蒸', '甜品', '凉菜', '汤羹', '其他']`。

---

### 4. 接口定义列表

#### 4.1. 获取所有菜谱
*   **URL**: `/recipes`
*   **Method**: `GET`
*   **描述**: 返回所有菜谱，按 `createdAt` 倒序排列（最新的在前面）。
*   **Response (200 OK)**: `Recipe[]`

#### 4.2. 创建新菜谱
*   **URL**: `/recipes`
*   **Method**: `POST`
*   **描述**: 保存一个新的菜谱。
*   **Request Body**: `Recipe` 对象
*   **Response (201 Created)**: 返回保存成功的 `Recipe` 对象。

#### 4.3. 更新菜谱
*   **URL**: `/recipes/:id`
*   **Method**: `PUT`
*   **描述**: 全量更新指定 ID 的菜谱（包括修改信息或添加烹饪记录）。
*   **URL Params**: `id`
*   **Request Body**: `Recipe` 对象
*   **Response (200 OK)**: 返回更新后的 `Recipe` 对象。
*   **Response (404 Not Found)**: `{ "error": "Recipe not found" }`

#### 4.4. 获取所有分类
*   **URL**: `/categories`
*   **Method**: `GET`
*   **描述**: 获取分类列表。如果数据库为空，应返回默认分类列表。
*   **Response (200 OK)**: `string[]`

#### 4.5. 更新分类列表
*   **URL**: `/categories`
*   **Method**: `PUT`
*   **描述**: 更新整个分类列表（用于排序、添加或删除）。
*   **Request Body**: `string[]` (例如 `["新分类", "旧分类"]`)
*   **Response (200 OK)**: 返回更新后的 `string[]`。

---

### 5. 目录结构建议 (给 AI 的参考)

生成的代码结构建议如下：
```text
server/
  ├── src/
  │   ├── db.ts        // 数据库连接与初始化
  │   ├── types.ts     // 类型定义
  │   └── server.ts    // Express 应用入口与路由逻辑
  ├── package.json
  └── tsconfig.json
```
