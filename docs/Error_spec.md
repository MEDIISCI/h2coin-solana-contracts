# Error Specification with Codes: H2Coin Vault Share Protocol

This document lists all custom errors defined in the `ErrorCode` enum of the Solana smart contract, including their numeric codes.

| # | Error Code (Enum) | Code | Description |
| --- | --- | --- | --- |
| 1 | `NumericalOverflow` | `6000` | 🔴 Math overflow. |
| 2 | `UnauthorizedSigner` | `6001` | 🔴 Unauthorized signer or not enough signatures. |
| 3 | `WhitelistLengthInvalid` | `6002` | 🔴 Withdraw whitelist must be between 1 and 5 entries. |
| 4 | `InvalidInvestmentIdLength` | `6003` | 🔴 Investment ID is too long or too short, must be 15 bytes. |
| 5 | `InvalidStageRatioLength` | `6004` | 🔴 stage\_ratio length per stage must be exactly 10 elements. |
| 6 | `InvalidStageRatioValue` | `6005` | 🔴 Stage ratio value must be between 0 and 100. |
| 7 | `InvalidStageRatioSum` | `6006` | 🔴 Stage ratio sum for a single stage must not exceed 100. |
| 8 | `NonContiguousStage` | `6007` | 🔴 Stage ratio must be contiguous once non-zero values begin. |
| 9 | `EmptyStageRatio` | `6008` | 🔴 All stage ratio values are zero. |
| 10 | `InvestmentInfoNotFound` | `6009` | 🔴 Investment info not exists. |
| 11 | `InvestmentInfoNotCompleted` | `6010` | 🔴 Investment info has not completed yet. |
| 12 | `InvestmentInfoHasCompleted` | `6011` | 🔴 Investment info has completed already. |
| 13 | `InvestmentInfoDeactivated` | `6012` | 🔴 Investment info has been deactivated and can no longer be modified. |
| 14 | `InvalidInvestmentInfoPda` | `6013` | 🔴 The derived PDA does not match the expected investment info PDA. |
| 15 | `RecordIdMismatch` | `6014` | 🔴 Record ID mismatch. |
| 16 | `AccountIdMismatch` | `6015` | 🔴 Account ID mismatch. |
| 17 | `InvalidAccountIdLength` | `6016` | 🔴 Account ID is too long or too short, must be 15 bytes. |
| 18 | `InvestmentRecordNotFound` | `6017` | 🔴 Investment record not found. |
| 19 | `InvalidRecordPda` | `6018` | 🔴 The derived PDA does not match the expected investment record PDA. |
| 20 | `NoRecordsInRemainingAccounts` | `6019` | 🔴 There are not investment records in remainingAccounts. |
| 21 | `RecordAlreadyRevoked` | `6020` | 🔴 This record has been revoked already. |
| 22 | `NoRecordsUpdated` | `6021` | 🔴 No record has been updated. |
| 23 | `WhitelistMustBeFive` | `6022` | 🔴 Whitelist must contain exactly 5 members |
| 24 | `WhitelistAddressExists` | `6023` | 🔴 Target address already exists in whitelist |
| 25 | `WhitelistAddressNotFound` | `6024` | 🔴 Address to be replaced not found in whitelist |
| 26 | `InvalidVaultPda` | `6025` | 🔴 Invalid Vault PDA |
| 27 | `InvalidTokenMint` | `6026` | 🔴 Vault token account mint is not USDT |
| 28 | `InvalidVaultAta` | `6027` | 🔴 The provided vault ATA does not match the expected associated token address. |
| 29 | `InvalidRecipientMint` | `6028` | 🔴 Recipient token account mint is not USDT or H2coin |
| 30 | `InvalidVaultTokenAccount` | `6029` | 🔴 Vault token account owner mismatch. |
| 31 | `TotalShareMismatch` | `6030` | 🔴 Total share does not match. |
| 32 | `ProfitCacheExpired` | `6031` | 🔴 Profit share cache has expired (older than 25 days) |
| 33 | `ProfitAlreadyExecuted` | `6032` | 🔴 Profit already executed. |
| 34 | `InsufficientTokenBalance` | `6033` | 🔴 Insufficient USDT token balance in vault |
| 35 | `InsufficientSolBalance` | `6034` | 🔴 Insufficient SOL balance in vault to cover estimated gas cost |
| 36 | `InvalidTotalUsdt` | `6035` | 🔴 Total USDT cannot be 0 or undefined |
| 37 | `BatchIdMismatch` | `6036` | 🔴 Batch id does not match expected number. |
| 38 | `TooManyRecordsLoaded` | `6037` | 🔴 Too many records have been loaded. |
| 39 | `MissingAssociatedTokenAccount` | `6038` | 🔴 Missing associated token account. |
| 40 | `InvalidProfitCachePda` | `6039` | 🔴 The derived PDA does not match the expected profit cache PDA. |
| 41 | `BpRatioOverflow` | `6040` | 🔴 Bp ratio overflowed u16. |
| 42 | `DuplicateRecord` | `6041` | 🔴 Duplicate record\_id detected in input records. |
| 43 | `RefundCacheExpired` | `6042` | 🔴 Refund share cache has expired (older than 25 days) |
| 44 | `RefundPeriodInvalid` | `6043` | 🔴 Refund period is invalid |
| 45 | `RefundAlreadyExecuted` | `6044` | 🔴 Refund share already executed. |
| 46 | `InvalidRecipientATA` | `6045` | 🔴 Invalid Recipient ATA |
| 47 | `InvalidTotalH2coin` | `6046` | 🔴 Total H2coin cannot be 0 or undefined |
| 48 | `InvalidRefundCachePda` | `6047` | 🔴 The derived PDA does not match the expected refund cache PDA. |
| 49 | `EmptyWhitelist` | `6048` | 🔴 Whitelist must contain at least one wallet. |
| 50 | `InvalidRecipientAddress` | `6049` | 🔴 Invalid Recipient wallet Address |
| 51 | `UnauthorizedRecipient` | `6050` | 🔴 Recipient wallet is not in the withdraw whitelist. |