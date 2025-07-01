# 📊 Diagrams Directory

This directory contains all diagram files for the H2Coin Vault Share Protocol.

## 📁 Directory Structure

```
diagrams/
├── mermaid/          # Mermaid source files (.mmd)
├── images/           # Generated image files (.png)
└── README.md         # This documentation file
```

## 📋 Diagram List

### 1. InvestmentRecord Class Diagram
- **File**: `mermaid/investment_record_class_diagram.mmd`
- **Image**: `images/investment_record_class_diagram.png`
- **Description**: UML class diagram of InvestmentRecord structure, showing relationships with Pubkey and InvestmentInfo

### 2. InvestmentInfo Class Diagram
- **File**: `mermaid/investment_info_class_diagram.mmd`
- **Image**: `images/investment_info_class_diagram.png`
- **Description**: UML class diagram of InvestmentInfo structure, showing relationships with InvestmentType, InvestmentState and InvestmentRecord

### 3. Profit Distribution Flow
- **File**: `mermaid/profit_distribution_flow.mmd`
- **Image**: `images/profit_distribution_flow.png`
- **Description**: Profit distribution flow diagram, showing the complete process from investment project creation to profit distribution

### 4. Annual Refund Distribution Flow
- **File**: `mermaid/annual_refund_distribution_flow.mmd`
- **Image**: `images/annual_refund_distribution_flow.png`
- **Description**: Annual refund distribution flow diagram, showing the annual H2COIN refund distribution process starting from the third year

## 🔧 How to Update Diagrams

1. Edit the corresponding `.mmd` file
2. Use mermaid-cli to regenerate the image:
   ```bash
   mmdc -i mermaid/filename.mmd -o images/filename.png
   ```

## 📦 Dependencies

- `@mermaid-js/mermaid-cli`: Used to convert Mermaid files to images
- Installation command: `npm install -g @mermaid-js/mermaid-cli` 