# 📊 Diagrams Directory

這個目錄包含了 H2Coin Vault Share Protocol 的所有圖表文件。

## 📁 目錄結構

```
diagrams/
├── mermaid/          # Mermaid 原始文件 (.mmd)
├── images/           # 生成的圖片文件 (.png)
└── README.md         # 本說明文件
```

## 📋 圖表列表

### 1. InvestmentRecord Class Diagram
- **文件**: `mermaid/investment_record_class_diagram.mmd`
- **圖片**: `images/investment_record_class_diagram.png`
- **描述**: InvestmentRecord 結構的 UML 類圖，顯示與 Pubkey 和 InvestmentInfo 的關係

### 2. InvestmentInfo Class Diagram
- **文件**: `mermaid/investment_info_class_diagram.mmd`
- **圖片**: `images/investment_info_class_diagram.png`
- **描述**: InvestmentInfo 結構的 UML 類圖，顯示與 InvestmentType、InvestmentState 和 InvestmentRecord 的關係

### 3. Profit Distribution Flow
- **文件**: `mermaid/profit_distribution_flow.mmd`
- **圖片**: `images/profit_distribution_flow.png`
- **描述**: 利潤分配流程圖，顯示從投資項目創建到利潤分配的完整流程

### 4. Annual Refund Distribution Flow
- **文件**: `mermaid/annual_refund_distribution_flow.mmd`
- **圖片**: `images/annual_refund_distribution_flow.png`
- **描述**: 年度退款分配流程圖，顯示從第三年開始的年度 H2COIN 退款分配流程

## 🔧 如何更新圖表

1. 編輯對應的 `.mmd` 文件
2. 使用 mermaid-cli 重新生成圖片：
   ```bash
   mmdc -i mermaid/filename.mmd -o images/filename.png
   ```

## 📦 依賴工具

- `@mermaid-js/mermaid-cli`: 用於將 Mermaid 文件轉換為圖片
- 安裝命令: `npm install -g @mermaid-js/mermaid-cli` 