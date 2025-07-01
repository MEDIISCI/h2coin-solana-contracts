#!/bin/bash

# 檢查是否安裝了 mmdc
if ! command -v mmdc &> /dev/null; then
    echo "錯誤: 未找到 mmdc 命令"
    echo "請先安裝 Mermaid CLI:"
    echo "npm install -g @mermaid-js/mermaid-cli"
    exit 1
fi

# 設定目錄路徑
MERMAID_DIR="docs/diagrams/mermaid"
IMAGES_DIR="docs/diagrams/images"

# 確保 images 目錄存在
mkdir -p "$IMAGES_DIR"

echo "開始生成圖表..."

# 遍歷所有 .mmd 檔案並生成對應的 PNG 與 SVG
for mmd_file in "$MERMAID_DIR"/*.mmd; do
    if [ -f "$mmd_file" ]; then
        # 取得檔案名稱（不含副檔名）
        filename=$(basename "$mmd_file" .mmd)
        output_png="$IMAGES_DIR/${filename}.png"
        output_svg="$IMAGES_DIR/${filename}.svg"
        
        echo "正在處理: $filename.mmd -> $filename.png $filename.svg"
        
        # 使用 mmdc 生成 PNG
        mmdc -i "$mmd_file" -o "$output_png" -b white
        if [ $? -eq 0 ]; then
            echo "✓ 成功生成: $output_png"
        else
            echo "✗ 生成失敗: $mmd_file (PNG)"
        fi
        # 使用 mmdc 生成 SVG
        mmdc -i "$mmd_file" -o "$output_svg" -b white
        if [ $? -eq 0 ]; then
            echo "✓ 成功生成: $output_svg"
        else
            echo "✗ 生成失敗: $mmd_file (SVG)"
        fi
    fi
done

echo "圖表生成完成！"
echo "生成的圖片位於: $IMAGES_DIR"