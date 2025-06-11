# Error Specification with Codes: H2Coin Vault Share Protocol

This document lists all custom errors defined in the `ErrorCode` enum of the Solana smart contract, including their numeric codes.

| # | Error Code (Enum) | Code | Description |
| --- | --- | --- | --- |
| 1 | NumericalOverflow | 6000 | 🔴 Math overflow. |
| 2 | UnauthorizedSigner | 6001 | 🔴 Unauthorized signer or not enough signatures. |
| 3 | WhitelistLengthInvalid | 6002 | 🔴 Withdraw whitelist must be between 1 and 5 entries. |
| 4 | InvalidInvestmentIdLength | 6003 | 🔴 Investment ID is too long or too short, must be 15 bytes. |
| 5 | InvalidStageRatioLength | 6004 | 🔴 stage\_ratio length per stage must be exactly 10 elements. |
| 6 | InvalidStageRatioValue | 6005 | 🔴 Stage ratio value must be between 0 and 100. |
| 7 | InvalidStageRatioSum | 6006 | 🔴 Stage ratio sum for a single stage must not exceed 100. |
| 8 | NonContiguousStage | 6007 | 🔴 Stage ratio must be contiguous once non-zero values begin. |
| 9 | EmptyStageRatio | 6008 | 🔴 All stage ratio values are zero. |
| 10 | InvestmentInfoNotFound | 6009 | 🔴 Investment info not exists. |
| 11 | InvestmentInfoNotCompleted | 6010 | 🔴 Investment info has not completed yet. |
| 12 | InvestmentInfoHasCompleted | 6011 | 🔴 Investment info has completed already. |
| 13 | InvestmentInfoDeactivated | 6012 | 🔴 Investment info has been deactivated and can no longer be modified. |
| 14 | InvalidInvestmentInfoPda | 6013 | 🔴 The derived PDA does not match the expected investment info PDA. |
| 15 | RecordIdMismatch | 6014 | 🔴 Record ID mismatch. |
| 16 | AccountIdMismatch | 6015 | 🔴 Account ID mismatch. |
| 17 | InvalidAccountIdLength | 6016 | 🔴 Account ID is too long or too short, must be 15 bytes. |
| 18 | InvestmentRecordNotFound | 6017 | 🔴 Investment record not found. |
| 19 | InvalidRecordPda | 6018 | 🔴 The derived PDA does not match the expected investment record PDA. |
| 20 | NoRecordsInRemainingAccounts | 6019 | 🔴 There are not investment records in remainingAccounts. |
| 21 | RecordAlreadyRevoked | 6020 | 🔴 This record has been revoked already. |
| 22 | NoRecordsUpdated | 6021 | 🔴 No record has been updated. |
| 23 | WhitelistMustBeFive | 6022 | 🔴 Whitelist must contain exactly 5 members |
| 24 | WhitelistAddressExists | 6023 | 🔴 Target address already exists in whitelist |
| 25 | WhitelistAddressNotFound | 6024 | 🔴 Address to be replaced not found in whitelist |
| 26 | InvalidVaultPda | 6025 | 🔴 Invalid Vault PDA |
| 27 | InvalidTokenMint | 6026 | 🔴 Vault token account mint is not USDT |
| 28 | InvalidVaultAta | 6027 | 🔴 The provided vault ATA does not match the expected associated token address. |
| 29 | InvalidRecipientMint | 6028 | 🔴 Recipient token account mint is not USDT or H2coin |
| 30 | InvalidVaultTokenAccount | 6029 | 🔴 Vault token account owner mismatch. |
| 31 | MustStandard | 6030 | 🔴 Investment type must be `Standard`. |
| 32 | TotalShareMismatch | 6031 | 🔴 Total share does not match. |
| 33 | ProfitCacheExpired | 6032 | 🔴 Profit share cache has expired (older than 25 days) |
| 34 | ProfitAlreadyExecuted | 6033 | 🔴 Profit already executed. |
| 35 | InsufficientTokenBalance | 6034 | 🔴 Insufficient USDT token balance in vault |
| 36 | InsufficientSolBalance | 6035 | 🔴 Insufficient SOL balance in vault to cover estimated gas cost |
| 37 | InvalidTotalUsdt | 6036 | 🔴 Total USDT cannot be 0 or undefined |
| 38 | BatchIdMismatch | 6037 | 🔴 Batch id does not match expected number. |
| 39 | TooManyRecordsLoaded | 6038 | 🔴 Too many records have been loaded. |
| 40 | MissingAssociatedTokenAccount | 6039 | 🔴 Missing associated token account. |
| 41 | InvalidProfitCachePda | 6040 | 🔴 The derived PDA does not match the expected profit cache PDA. |
| 42 | BpRatioOverflow | 6041 | 🔴 Bp ratio overflowed u16. |
| 43 | DuplicateRecord | 6042 | 🔴 Duplicate record\_id detected in input records. |
| 44 | RefundCacheExpired | 6043 | 🔴 Refund share cache has expired (older than 25 days) |
| 45 | RefundPeriodInvalid | 6044 | 🔴 Refund period is invalid |
| 46 | RefundAlreadyExecuted | 6045 | 🔴 Refund share already executed. |
| 47 | InvalidRecipientATA | 6046 | 🔴 Invalid Recipient ATA |
| 48 | InvalidTotalH2coin | 6047 | 🔴 Total H2coin cannot be 0 or undefined |
| 49 | InvalidRefundCachePda | 6048 | 🔴 The derived PDA does not match the expected refund cache PDA. |
| 50 | EmptyWhitelist | 6049 | 🔴 Whitelist must contain at least one wallet. |
| 51 | InvalidRecipientAddress | 6050 | 🔴 Invalid Recipient wallet Address |
| 52 | UnauthorizedRecipient | 6051 | 🔴 Recipient wallet is not in the withdraw whitelist. |