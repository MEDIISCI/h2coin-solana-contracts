# 主要業務執行流程
0. Smart Contract title: H2Coin Vault Share Protocol 
1. 當新投資項目產生時，會使用下面的資訊產生對應的 Smart Contract (initialize_investment_info, initialize_investment_summary)
	- 寫入資訊
		- investment_id: 投資項目 ID，為最大長度為 15 bytes 的字串
		- investment_type: 投資項目類型，為最大長度為 16 bytes 的字串, 數值會是 standard 與 csr
		- stage_ratio: 階段分配比例表，3 個階段，每個階段 10 個比例值，每個值為 1 byte
		- version: 版本號，長度為 4 bytes 的固定長度字串
		- start_at: 開始時間，64 位元整數，Unix timestamp
		- end_at: 結束時間，64 位元整數，Unix timestamp
		- investment_upper_limit: 投資上限，64 位元無符號整數
		- execute_whitelist: 執行白名單，為 5 個公鑰地址的動態陣列
		- update_whitelist: 更新白名單，為 5 個公鑰地址的動態陣列
		- withdraw_whitelist: 提現白名單，最多 5 個公鑰地址的動態陣列

2. 使用者投資的資訊會記錄在線下系統中，累積達到 100 筆，會新增投資紀錄進系統
	- 執行權限
		- update_whitelist (3/5)
		- add_investor_account
		- add_investment_record
	- 寫入資訊

3. 投資項目結束後，每個月固定時間會進行項目收益分帳計算 ()
	- 執行權限
		- completed_investment_info()
		- estimate_profit_share()
		- execute_whitelist, update_whitelist (任一)
		- ?deposit_sol_to_vault()
		- ?deposit_token_to_vault()

4. 投資項目收益分帳計算後，執行分帳轉帳
	- 執行權限
		- execute_whitelist (3/5)

5. 投資項目結束後第四年起，每年固定時間會進行項目投資返還分帳計算
	- 執行權限
		- estimate_refund_share()
		- execute_whitelist, update_whitelist (任一)
		- ?deposit_sol_to_vault()
		- ?deposit_token_to_vault()

5. 投資項目結束後第四年起，每年固定時間會進行項目投資返還分帳計算
	- 執行權限
		- execute_whitelist (3/5)

6. 合約到期不再分潤 
    - deactivate_investment_info()
# 其他流程
## 更新投資資訊

## 剩餘餘額出金
## 變更 執行白名單
## 變更 更新白名單
## 變更 出金白名單