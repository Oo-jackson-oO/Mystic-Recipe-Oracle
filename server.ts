import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Initialize SQLite DB
const dbFile = path.resolve(process.cwd(), "recipes.db");
const db = new Database(dbFile);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    reason TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    precautions TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertRecipe = db.prepare(
  "INSERT INTO recipes (name, reason, ingredients, instructions, precautions, imageUrl) VALUES (?, ?, ?, ?, ?, ?)"
);
const getRecipes = db.prepare("SELECT * FROM recipes ORDER BY createdAt DESC");
const deleteRecipe = db.prepare("DELETE FROM recipes WHERE id = ?");

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

  app.use(express.json({ limit: "50mb" }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // API constraints
  const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || "sk-qvpckopchrgnkpronkzwxbvzwaebzwltdgzamzaupucuddvu";
  
  app.post("/api/recommend", async (req, res) => {
    try {
      const { imageBase64, taste, mood, zodiac, constellation, luckyNumber } = req.body;
      
      const promptText = `## Input Data
- 用户的属相：${zodiac}
- 用户的星座：${constellation}
- 用户今天的心情：${mood}
- 用户的口味偏好：${taste}
- 用户的本元法数（幸运数字）：${luckyNumber}
- 视觉能量场描述：图片中呈现了用户当前喜爱的一张照片（可能是美景、佳肴或任意事物），代表用户当下的能量场。请深入解析其视觉元素（色彩、构图、氛围），并将其转化为风水/星象语言。
`;

      // Call SiliconFlow Chat API
      const chatResponse = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: JSON.stringify({
          model: "nex-agi/Nex-N2-Pro",
          temperature: 0.8,
          stream: false,
          messages: [
            {
              role: "system",
              content: `# Role: 玄灵膳道·首席大师

## Profile
- **身份**：深谙东方风水周易、西方星象学与神秘学的灵膳大师。
- **专长**：能量场匹配、五行生克调理、星轨运势推演。
- **风格**：神秘、高深莫测、古雅、积极充满能量。
- **语言**：中文输出，除 imagePrompt 外均为中文。

## Task
结合输入数据，进行能量共振分析，为用户推荐一道专属神秘菜谱。菜谱需完美契合用户的命理磁场，旨在带来好运、提升能量。

## Constraints & Guidelines
1. **JSON 输出强制**：
   - 必须且只能输出一个合法的 JSON 对象。
   - **严禁**包含 markdown 代码块标记。
   - **严禁**包含任何前缀、后缀、解释性文字。
   - 字符串内的换行符必须使用 \n 转义，确保可直接被 JSON.parse() 解析。
   - 确保所有双引号内部字符正确转义。

2. **语气与内容**：
   - 保持神秘、高深莫测但充满积极色彩的语气。
   - 高频使用玄学术语，如：“吸纳天地紫气”、“星轨交汇”、“阴阳调和”、“命理契合”、“五行生克”、“磁场共振”等。
   - reason 字段需逻辑严密，将视觉图像、用户偏好与菜品寓意串联，解释为何此菜能带来风水运势。
   - imagePrompt 必须为**英文**，强调神秘感、视觉冲击力，需包含菜品的核心视觉元素及光影氛围。

3. **食材格式**：
   - 必须在每项食材前加上一个合适的 emoji；食材只展示名称，无用量提示；同种食材用斜线给出，如“土豆/马铃薯”。

## Output Schema
请以严格的 JSON 格式输出，不要包含任何额外的多余文字，也不要使用 markdown 语法包裹，确保能够直接 JSON.parse()：
{
  "name": "菜肴的神仙名字",
  "reason": "推荐原因（详细介绍用户偏好、图片意境和这道菜是如何搭配的，用户为什么适合吃这道菜，为什么能带来绝佳的风水运势，语气神秘、积极，分为 2-3 个段落，段落间用换行符分隔）",
  "ingredients": ["🍅 番茄", "🥦 西兰花"], // 必须在每项食材前加上一个合适的emoji
  "instructions": ["步骤 1", "步骤 2"],
  "precautions": ["注意事项 1", "注意事项 2"],
  "imagePrompt": "为这道菜生成一张极具神秘感、视觉冲击力的照片的英文 prompt，必须包含这道菜的核心视觉元素"
}`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                },
                {
                  type: "text",
                  text: promptText
                }
              ]
            }
          ]
        })
      });

      let chatData;
      if (!chatResponse.ok) {
        // Fallback to text-only if multimodal implies an error (some models don't support image_url)
        console.warn("First attempt failed, trying text-only fallback...");
        const textOnlyResponse = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SILICONFLOW_API_KEY}`,
          },
          body: JSON.stringify({
            model: "nex-agi/Nex-N2-Pro",
            temperature: 1.2,
            stream: false,
            messages: [
              {
                role: "system",
                content: `# Role: 玄灵膳道·首席大师

## Profile
- **身份**：深谙东方风水周易、西方星象学与神秘学的灵膳大师。
- **专长**：能量场匹配、五行生克调理、星轨运势推演。
- **风格**：神秘、高深莫测、古雅、积极充满能量。
- **语言**：中文输出，除 imagePrompt 外均为中文。

## Task
结合输入数据，进行能量共振分析，为用户推荐一道专属神秘菜谱。菜谱需完美契合用户的命理磁场，旨在带来好运、提升能量。

## Constraints & Guidelines
1. **JSON 输出强制**：
   - 必须且只能输出一个合法的 JSON 对象。
   - **严禁**包含 markdown 代码块标记。
   - **严禁**包含任何前缀、后缀、解释性文字。
   - 字符串内的换行符必须使用 \n 转义，确保可直接被 JSON.parse() 解析。
   - 确保所有双引号内部字符正确转义。

2. **语气与内容**：
   - 保持神秘、高深莫测但充满积极色彩的语气。
   - 高频使用玄学术语，如：“吸纳天地紫气”、“星轨交汇”、“阴阳调和”、“命理契合”、“五行生克”、“磁场共振”等。
   - reason 字段需逻辑严密，将视觉图像、用户偏好与菜品寓意串联，解释为何此菜能带来风水运势。
   - imagePrompt 必须为**英文**，强调神秘感、视觉冲击力，需包含菜品的核心视觉元素及光影氛围。

3. **食材格式**：
   - 必须在每项食材前加上一个合适的 emoji；食材只展示名称，无用量提示；同种食材用斜线给出，如“土豆/马铃薯”。

## Output Schema
请以严格的 JSON 格式输出，不要包含任何额外的多余文字，也不要使用 markdown 语法包裹，确保能够直接 JSON.parse()：
{
  "name": "菜肴的神仙名字",
  "reason": "推荐原因（详细介绍用户偏好、图片意境和这道菜是如何搭配的，用户为什么适合吃这道菜，为什么能带来绝佳的风水运势，语气神秘、积极，分为 2-3 个段落，段落间用换行符分隔）",
  "ingredients": ["🍅 番茄", "🥦 西兰花"], // 必须在每项食材前加上一个合适的emoji
  "instructions": ["步骤 1", "步骤 2"],
  "precautions": ["注意事项 1", "注意事项 2"],
  "imagePrompt": "为这道菜生成一张极具神秘感、视觉冲击力的照片的英文 prompt，必须包含这道菜的核心视觉元素"
}`
              },
              {
                role: "user",
                content: promptText
              }
            ]
          })
        });

        if (!textOnlyResponse.ok) {
          throw new Error(`Chat API error: ${await textOnlyResponse.text()}`);
        }
        chatData = await textOnlyResponse.json();
      } else {
        chatData = await chatResponse.json();
      }

      let recipeJsonStr = chatData.choices[0].message.content;
      recipeJsonStr = recipeJsonStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (recipeJsonStr.startsWith("\`\`\`json")) recipeJsonStr = recipeJsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
      else if (recipeJsonStr.startsWith("\`\`\`")) recipeJsonStr = recipeJsonStr.replace(/^```/, "").replace(/```$/, "").trim();
      
      let recipe;
      try {
        recipe = JSON.parse(recipeJsonStr);
      } catch (e) {
        throw new Error(`Failed to parse JSON: ${recipeJsonStr}`);
      }
      
      recipe.originalImageUrl = `data:image/jpeg;base64,${imageBase64}`;

      // Start Image Generation sequentially using generated prompt
      const ARK_API_KEY = "5ba3ef10-df27-4ac2-bc8e-07f3ab86de79"; // hardcoded for task
      const constructedImagePrompt = recipe.imagePrompt || "星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，动感，对比色，oc渲染，光线追踪，动态模糊，景深，超现实主义，深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，质感真实，暗黑风背景的光影效果营造出氛围，整体兼具艺术幻想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬";
      
      try {
        const imageResponse = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ARK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "ep-20260531002257-flngb",
            prompt: constructedImagePrompt,
            sequential_image_generation: "disabled",
            response_format: "url",
            size: "2K",
            stream: false,
            watermark: true
          })
        });
        
        if (imageResponse.ok) {
          const data = await imageResponse.json();
          const imgUrl = data.data?.[0]?.url;
          if (imgUrl) {
            try {
              const imgRes = await fetch(imgUrl);
              const imgBuffer = await imgRes.arrayBuffer();
              const base64Img = Buffer.from(imgBuffer).toString('base64');
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              recipe.imageUrl = `data:${contentType};base64,${base64Img}`;
            } catch (e) {
              console.error('Failed to proxy image', e);
              recipe.imageUrl = imgUrl; // fallback to url
            }
          } else {
            recipe.imageUrl = recipe.originalImageUrl;
          }
        } else {
          console.error("Image API error:", await imageResponse.text());
          recipe.imageUrl = recipe.originalImageUrl;
        }
      } catch(err) {
        console.error("Failed to generate image", err);
        recipe.imageUrl = recipe.originalImageUrl;
      }
      
      res.json(recipe);

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Something went wrong" });
    }
  });

  app.get("/api/recipes", (req, res) => {
    try {
      const recipes = getRecipes.all();
      res.json(recipes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/recipes", (req, res) => {
    try {
      const { name, reason, ingredients, instructions, precautions, imageUrl } = req.body;
      const result = insertRecipe.run(
        name,
        reason,
        JSON.stringify(ingredients),
        JSON.stringify(instructions),
        JSON.stringify(precautions),
        imageUrl
      );
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/recipes/:id", (req, res) => {
    try {
      deleteRecipe.run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api", (req, res) => {
    res.status(404).json({
      error: "API route not found",
      path: req.path,
      method: req.method,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
