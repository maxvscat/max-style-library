# MAX 風格庫

AI 剪輯、資訊動畫用的風格收集。網頁版：https://maxvscat.github.io/max-style-library/

## 每個風格怎麼存
- `styles/<代號>.json`：一個風格一個檔案（名稱、配色、字體、版面、動態語彙、範例專案…）
- `previews/<代號>/`：樣張圖（建議 jpg，寬 1280 以內）

## 新增風格
1. 打開網頁右上角「＋ 新增風格」，填表單。
2. 按「在 GitHub 建立檔案」，GitHub 會帶好檔名和內容，直接按 **Commit changes**。
3. 約 1 分鐘後網頁自動更新。

## 修改風格
- 在風格頁按「用表單修改」，複製產生的 JSON，再到 GitHub 編輯頁貼上存檔；
- 或直接按「在 GitHub 直接編輯」改 JSON。

## 加樣張圖
在風格頁按「上傳樣張圖」，把圖丟進 `previews/<代號>/`，再把路徑加到該風格 JSON 的 `previews` 欄位。

> `styles/index.json` 是備用清單（GitHub API 讀不到時才用），新增風格時可以順手把代號加進去。
