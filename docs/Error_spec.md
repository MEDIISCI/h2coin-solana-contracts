# Error Specification with Codes: H2Coin Vault Share Protocol

This document describes all error codes defined in the error.rs of the h2coin_vault_share Anchor program. Each error is categorized by its functional module.

|   # | Error Code (Enum)               |   Code | Description                                                                     |
|----:|:--------------------------------|-------:|:--------------------------------------------------------------------------------|
|   1 | NumericalOverflow               |   6000 | 🔴 Math overflow.                                                               |
|   2 | UnauthorizedSigner              |   6001 | 🔴 Unauthorized signer or not enough signatures.                                |
|   3 | WhitelistLengthInvalid          |   6002 | 🔴 Withdraw whitelist must be between 1 and 5 entries.                          |
|   4 | InvalidInvestmentIdLength       |   6003 | 🔴 Investment ID is too long or too short, must be 15 bytes.                    |
|   5 | InvalidStageRatioLength         |   6004 | 🔴 stage_ratio length per stage must be exactly 10 elements.                    |
|   6 | InvalidStageRatioValue          |   6005 | 🔴 Stage ratio value must be between 0 and 100.                                 |
|   7 | InvalidStageRatioSum            |   6006 | 🔴 Stage ratio sum for a single stage must not exceed 100.                      |
|   8 | NonContiguousStage              |   6007 | 🔴 Stage ratio must be contiguous once non-zero values begin.                   |
|   9 | EmptyStageRatio                 |   6008 | 🔴 All stage ratio values are zero.                                             |
|  10 | InvestmentInfoNotFound          |   6009 | 🔴 Investment info not exists.                                                  |
|  11 | InvestmentInfoNotCompleted      |   6010 | 🔴 Investment info has not completed yet.                                       |
|  12 | InvestmentInfoHasCompleted      |   6011 | 🔴 Investment info has completed already.                                       |
|  13 | InvestmentInfoDeactivated       |   6012 | 🔴 Investment info has been deactivated and can no longer be modified.          |
|  14 | InvalidInvestmentInfoPda        |   6013 | 🔴 The derived PDA does not match the expected investment info PDA.             |
|  15 | RecordIdMismatch                |   6014 | 🔴 Record ID mismatch.                                                          |
|  16 | AccountIdMismatch               |   6015 | 🔴 Account ID mismatch.                                                         |
|  17 | InvalidAccountIdLength          |   6016 | 🔴 Account ID is too long or too short, must be 15 bytes.                       |
|  18 | InvestmentRecordNotFound        |   6017 | 🔴 Investment record not found.                                                 |
|  19 | InvalidRecordPda                |   6018 | 🔴 The derived PDA does not match the expected investment record PDA.           |
|  20 | NoRecordsInRemainingAccounts    |   6019 | 🔴 There are not investment records in remainingAccounts.                       |
|  21 | RecordAlreadyRevoked            |   6020 | 🔴 This record has been revoked already.                                        |
|  22 | NoRecordsUpdated                |   6021 | 🔴 No record has been updated.                                                  |
|  23 | WhitelistMustBeFive             |   6022 | 🔴 Whitelist must contain exactly 5 members                                     |
|  24 | WhitelistAddressExists          |   6023 | 🔴 Target address already exists in whitelist                                   |
|  25 | WhitelistAddressNotFound        |   6024 | 🔴 Address to be replaced not found in whitelist                                |
|  26 | InvalidVaultPda                 |   6025 | 🔴 Invalid Vault PDA                                                            |
|  27 | InvalidTokenMint                |   6026 | 🔴 Vault token account mint is not USDT or H2coin.                              |
|  28 | InvalidVaultAta                 |   6027 | 🔴 The provided vault ATA does not match the expected associated token address. |
|  29 | InvalidRecipientMint            |   6028 | 🔴 Recipient token account mint is not USDT or H2coin.                          |
|  30 | InvalidVaultOwner               |   6029 | 🔴 Vault token account owner mismatch.                                          |
|  31 | InvalidFromOwner                |   6030 | 🔴 From token account owner mismatch.                                           |
|  32 | InvalidRecipientOwner           |   6031 | 🔴 Recipient token account owner mismatch.                                      |
|  33 | StandardOnly                    |   6032 | 🔴 Investment type must be `Standard`.                                          |
|  34 | TotalShareMismatch              |   6033 | 🔴 Total share does not match.                                                  |
|  35 | ProfitCacheNotFound             |   6034 | 🔴 Profit share cache not found.                                                |
|  36 | ProfitCacheExpired              |   6035 | 🔴 Profit share cache has expired (older than 25 days)                          |
|  37 | ProfitAlreadyExecuted           |   6036 | 🔴 Profit already executed.                                                     |
|  38 | InsufficientTokenBalance        |   6037 | 🔴 Insufficient USDT token balance in vault                                     |
|  39 | InsufficientSolBalance          |   6038 | 🔴 Insufficient SOL balance in vault to cover estimated gas cost                |
|  40 | InvalidTotalUsdt                |   6039 | 🔴 Total USDT cannot be 0 or undefined                                          |
|  41 | BatchIdMismatch                 |   6040 | 🔴 Batch id does not match expected number.                                     |
|  42 | TooManyRecordsLoaded            |   6041 | 🔴 Too many records have been loaded.                                           |
|  43 | MissingAssociatedTokenAccount   |   6042 | 🔴 Missing associated token account.                                            |
|  44 | InvalidProfitCachePda           |   6043 | 🔴 The derived PDA does not match the expected profit cache PDA.                |
|  45 | BpRatioOverflow                 |   6044 | 🔴 Bp ratio overflowed u16.                                                     |
|  46 | DuplicateRecord                 |   6045 | 🔴 Duplicate record_id detected in input records.                               |
|  47 | RefundCacheExpired              |   6046 | 🔴 Refund share cache has expired (older than 25 days)                          |
|  48 | RefundCacheNotFound             |   6047 | 🔴 Refund share cache not found.                                                |
|  49 | RefundPeriodInvalid             |   6048 | 🔴 Refund period is invalid                                                     |
|  50 | RefundAlreadyExecuted           |   6049 | 🔴 Refund share already executed.                                               |
|  51 | InvalidRecipientATA             |   6050 | 🔴 Invalid Recipient ATA                                                        |
|  52 | InvalidTotalH2coin              |   6051 | 🔴 Total H2coin cannot be 0 or undefined                                        |
|  53 | InvalidRefundCachePda           |   6052 | 🔴 The derived PDA does not match the expected refund cache PDA.                |
|  54 | EmptyWhitelist                  |   6053 | 🔴 Whitelist must contain at least one wallet.                                  |
|  55 | InvalidRecipientAddress         |   6054 | 🔴 Invalid Recipient wallet Address                                             |
|  56 | UnauthorizedRecipient           |   6055 | 🔴 Recipient wallet is not in the withdraw whitelist.                           |
|  57 | InvalidAssociatedTokenAccount   |   6056 | 🔴 Invalid associated token account.                                            |
|  58 | InvalidTokenProgramID           |   6057 | 🔴 Invalid token program ID. Must be Token 2020(Legacy).                        |
|  59 | InvalidAssociatedTokenProgramID |   6058 | 🔴 Invalid associated token program ID.                                         |