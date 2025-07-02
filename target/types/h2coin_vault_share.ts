/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/h2coin_vault_share.json`.
 */
export type H2coinVaultShare = {
  "address": "ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B",
  "metadata": {
    "name": "h2coinVaultShare",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "docs": [
    "Main program module containing all instruction handlers",
    "",
    "AUDIT NOTES:",
    "- Each instruction has specific access control requirements",
    "- Critical operations require 3-of-5 multisig validation",
    "- Input validation is performed at instruction level",
    "- Error handling follows consistent patterns"
  ],
  "instructions": [
    {
      "name": "addInvestmentRecord",
      "docs": [
        "Add a new investment record",
        "",
        "AUDIT CRITICAL:",
        "- Creates individual investment records",
        "- Transfers tokens from recipient to vault",
        "- Records investment amounts and stage information",
        "- Generates unique record identifiers",
        "",
        "SECURITY CHECKS:",
        "- Investment info validation",
        "- Token transfer validation",
        "- Record ID uniqueness",
        "- Account ID validation"
      ],
      "discriminator": [
        56,
        180,
        174,
        107,
        72,
        91,
        57,
        220
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters",
            "- PDA validation prevents spoofing"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "investmentRecord",
          "docs": [
            "InvestmentRecord account to be created",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id, version, batch_id, record_id, account_id",
            "- Fixed size allocation prevents overflow",
            "- Stores individual investment details"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              },
              {
                "kind": "arg",
                "path": "recordId"
              },
              {
                "kind": "arg",
                "path": "accountId"
              }
            ]
          }
        },
        {
          "name": "usdtMint",
          "docs": [
            "USDT mint account for validation",
            "",
            "AUDIT: Must match expected USDT mint address"
          ]
        },
        {
          "name": "hcoinMint",
          "docs": [
            "H2COIN mint account for validation",
            "",
            "AUDIT: Must match expected H2COIN mint address"
          ]
        },
        {
          "name": "recipientAccount",
          "docs": [
            "Recipient account for token transfers",
            "",
            "AUDIT CRITICAL:",
            "- Source of token transfers to vault",
            "- Manually validated in instruction"
          ]
        },
        {
          "name": "recipientUsdtAccount",
          "docs": [
            "Recipient associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- Source of USDT transfers",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientHcoinAccount",
          "docs": [
            "Recipient associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- Source of H2COIN transfers",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "hcoinMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for account creation and token transfers"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for account initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation",
            "",
            "AUDIT: Required for account initialization"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token operations",
            "",
            "AUDIT: Required for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA creation",
            "",
            "AUDIT: Required for ATA creation"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        },
        {
          "name": "recordId",
          "type": "u64"
        },
        {
          "name": "accountId",
          "type": {
            "array": [
              "u8",
              15
            ]
          }
        },
        {
          "name": "amountUsdt",
          "type": "u64"
        },
        {
          "name": "amountHcoin",
          "type": "u64"
        },
        {
          "name": "investmentStage",
          "type": "u8"
        }
      ]
    },
    {
      "name": "completedInvestmentInfo",
      "docs": [
        "Mark investment as completed",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from update_whitelist",
        "- Changes investment state to Completed",
        "- Prevents further modifications to investment info",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Investment state validation",
        "- PDA verification"
      ],
      "discriminator": [
        114,
        153,
        166,
        238,
        189,
        185,
        23,
        235
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account to be completed",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for state change",
            "- PDA validation prevents spoofing",
            "- State validation prevents invalid completion"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "deactivateInvestmentInfo",
      "docs": [
        "Deactivate investment info",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from update_whitelist",
        "- Only allowed when investment is completed",
        "- Prevents all further operations on this investment",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Investment state validation (must be completed)"
      ],
      "discriminator": [
        98,
        39,
        23,
        213,
        24,
        38,
        205,
        102
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account to be deactivated",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for deactivation",
            "- PDA validation prevents spoofing",
            "- State validation prevents invalid deactivation"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "depositSolToVault",
      "docs": [
        "Deposit SOL to vault",
        "",
        "AUDIT CRITICAL:",
        "- Transfers SOL from signer to vault",
        "- Updates vault SOL balance",
        "- Requires proper vault account validation",
        "",
        "SECURITY CHECKS:",
        "- Vault account validation",
        "- Amount validation",
        "- SOL transfer validation"
      ],
      "discriminator": [
        26,
        166,
        68,
        81,
        149,
        26,
        147,
        175
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters",
            "- Used for vault PDA derivation"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for SOL storage",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Destination for SOL transfers",
            "- No deserialization needed (AccountInfo)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for SOL transfer and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for SOL transfers",
            "",
            "AUDIT: Required for SOL transfers"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositTokenToVault",
      "docs": [
        "Deposit tokens to vault",
        "",
        "AUDIT CRITICAL:",
        "- Transfers tokens from signer to vault",
        "- Updates vault token balance",
        "- Requires proper vault and token account validation",
        "",
        "SECURITY CHECKS:",
        "- Vault account validation",
        "- Token account validation",
        "- Amount validation",
        "- Token transfer validation"
      ],
      "discriminator": [
        233,
        109,
        113,
        240,
        162,
        104,
        108,
        221
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters",
            "- Used for vault PDA derivation"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "Token mint account for validation",
            "",
            "AUDIT: Must be USDT or H2COIN mint"
          ]
        },
        {
          "name": "from",
          "docs": [
            "Source token account for transfers",
            "",
            "AUDIT CRITICAL:",
            "- Source of token transfers to vault",
            "- Must be mutable for transfers",
            "- Ownership validated in instruction"
          ],
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for token storage",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Used as token account authority",
            "- No deserialization needed (AccountInfo)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault associated token account for destination",
            "",
            "AUDIT CRITICAL:",
            "- Destination for token transfers",
            "- Ownership validated against vault PDA",
            "- Must be mutable for transfers"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for token transfers and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account operations",
            "",
            "AUDIT: Required for account operations"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token transfers",
            "",
            "AUDIT: Required for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA operations",
            "",
            "AUDIT: Required for ATA operations"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "estimateProfitShare",
      "docs": [
        "Estimate profit share distribution",
        "",
        "AUDIT CRITICAL:",
        "- Calculates profit distribution for all valid records",
        "- Creates profit share cache for batch processing",
        "- Requires 3-of-5 multisig from execute_whitelist",
        "- Affects actual profit distribution amounts",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Investment state validation",
        "- Profit amount validation",
        "- Cache existence validation"
      ],
      "discriminator": [
        120,
        71,
        81,
        137,
        216,
        96,
        59,
        161
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is completed",
            "- Provides investment parameters",
            "- Investment type validation (Standard only)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "cache",
          "docs": [
            "ProfitShareCache account to be created",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id, version, and batch_id",
            "- Fixed size allocation prevents overflow",
            "- Stores profit distribution calculations"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  116,
                  95,
                  99,
                  97,
                  99,
                  104,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for cache creation and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for cache initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation",
            "",
            "AUDIT: Required for cache initialization"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        },
        {
          "name": "totalProfitUsdt",
          "type": "u64"
        },
        {
          "name": "totalInvestUsdt",
          "type": "u64"
        }
      ]
    },
    {
      "name": "estimateRefundShare",
      "docs": [
        "Estimate refund share distribution",
        "",
        "AUDIT CRITICAL:",
        "- Calculates annual refund distribution for all valid records",
        "- Creates refund share cache for batch processing",
        "- Requires 3-of-5 multisig from execute_whitelist",
        "- Affects actual refund distribution amounts",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Investment state validation",
        "- Year index validation",
        "- Cache existence validation"
      ],
      "discriminator": [
        248,
        198,
        135,
        165,
        66,
        100,
        184,
        47
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is completed",
            "- Provides investment parameters and stage ratios",
            "- Used for refund percentage calculations"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "cache",
          "docs": [
            "RefundShareCache account to be created",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id, version, batch_id, and year_index",
            "- Fixed size allocation prevents overflow",
            "- Stores refund distribution calculations"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  117,
                  110,
                  100,
                  95,
                  99,
                  97,
                  99,
                  104,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              },
              {
                "kind": "arg",
                "path": "yearIndex"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for cache creation and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for cache initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation",
            "",
            "AUDIT: Required for cache initialization"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        },
        {
          "name": "yearIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "executeProfitShare",
      "docs": [
        "Execute profit share distribution",
        "",
        "AUDIT CRITICAL:",
        "- Transfers actual profit tokens to recipients",
        "- Requires 3-of-5 multisig from execute_whitelist",
        "- Uses pre-calculated profit share cache",
        "- Critical financial operation",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Cache existence and validation",
        "- Token balance validation",
        "- Transfer amount validation"
      ],
      "discriminator": [
        93,
        234,
        117,
        96,
        117,
        200,
        118,
        236
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is completed",
            "- Provides investment parameters",
            "- Used for vault PDA derivation"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "cache",
          "docs": [
            "ProfitShareCache account for execution",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for execution tracking",
            "- PDA validation prevents spoofing",
            "- Contains profit distribution data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  116,
                  95,
                  99,
                  97,
                  99,
                  104,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "USDT mint account for validation",
            "",
            "AUDIT: Must match expected USDT mint address"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for token transfers",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Used as token transfer authority",
            "- No deserialization needed (AccountInfo)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- Source of USDT transfers",
            "- Ownership validated against vault PDA",
            "- Must have sufficient balance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account operations",
            "",
            "AUDIT: Required for account operations"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token transfers",
            "",
            "AUDIT: Required for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA operations",
            "",
            "AUDIT: Required for ATA operations"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        }
      ]
    },
    {
      "name": "executeRefundShare",
      "docs": [
        "Execute refund share distribution",
        "",
        "AUDIT CRITICAL:",
        "- Transfers actual refund tokens to recipients",
        "- Requires 3-of-5 multisig from execute_whitelist",
        "- Uses pre-calculated refund share cache",
        "- Critical financial operation",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Cache existence and validation",
        "- Token balance validation",
        "- Transfer amount validation"
      ],
      "discriminator": [
        90,
        53,
        105,
        128,
        242,
        58,
        201,
        57
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is completed",
            "- Provides investment parameters",
            "- Used for vault PDA derivation"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "cache",
          "docs": [
            "RefundShareCache account for execution",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for execution tracking",
            "- PDA validation prevents spoofing",
            "- Contains refund distribution data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  117,
                  110,
                  100,
                  95,
                  99,
                  97,
                  99,
                  104,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              },
              {
                "kind": "arg",
                "path": "yearIndex"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "H2COIN mint account for validation",
            "",
            "AUDIT: Must match expected H2COIN mint address"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for token transfers",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Used as token transfer authority",
            "- No deserialization needed (AccountInfo)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- Source of H2COIN transfers",
            "- Ownership validated against vault PDA",
            "- Must have sufficient balance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account operations",
            "",
            "AUDIT: Required for account operations"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token transfers",
            "",
            "AUDIT: Required for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA operations",
            "",
            "AUDIT: Required for ATA operations"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        },
        {
          "name": "yearIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeInvestmentInfo",
      "docs": [
        "Initialize a new investment info account",
        "",
        "AUDIT CRITICAL:",
        "- Creates the main investment configuration",
        "- Sets up vault PDA and associated token accounts",
        "- Validates stage ratios and whitelist configurations",
        "- Establishes investment parameters and limits",
        "",
        "SECURITY CHECKS:",
        "- Investment ID length validation (15 bytes)",
        "- Whitelist size validation (exactly 5 members)",
        "- Stage ratio validation (0-100%, contiguous non-zero values)",
        "- PDA derivation verification",
        "- Token mint validation"
      ],
      "discriminator": [
        57,
        181,
        126,
        186,
        69,
        208,
        249,
        231
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo PDA account to be created",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Fixed size allocation prevents overflow",
            "- Initialized with investment parameters"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "investmentId"
              },
              {
                "kind": "arg",
                "path": "version"
              }
            ]
          }
        },
        {
          "name": "usdtMint",
          "docs": [
            "USDT mint account for validation",
            "",
            "AUDIT: Must match expected USDT mint address"
          ]
        },
        {
          "name": "hcoinMint",
          "docs": [
            "H2COIN mint account for validation",
            "",
            "AUDIT: Must match expected H2COIN mint address"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for SOL storage",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Holds SOL for transaction fees",
            "- No deserialization needed (UncheckedAccount)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "investmentId"
              },
              {
                "kind": "arg",
                "path": "version"
              }
            ]
          }
        },
        {
          "name": "vaultUsdtAccount",
          "docs": [
            "Vault associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- Derived from vault PDA and USDT mint",
            "- Holds USDT for profit distributions",
            "- Ownership validated against vault PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vaultHcoinAccount",
          "docs": [
            "Vault associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- Derived from vault PDA and H2COIN mint",
            "- Holds H2COIN for refund distributions",
            "- Ownership validated against vault PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "hcoinMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for account creation and rent"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for account initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation",
            "",
            "AUDIT: Required for account initialization"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token account creation",
            "",
            "AUDIT: Required for ATA creation"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA creation",
            "",
            "AUDIT: Required for ATA creation"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "investmentId",
          "type": {
            "array": [
              "u8",
              15
            ]
          }
        },
        {
          "name": "version",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        },
        {
          "name": "investmentType",
          "type": {
            "defined": {
              "name": "investmentType"
            }
          }
        },
        {
          "name": "stageRatio",
          "type": {
            "array": [
              {
                "array": [
                  "u8",
                  10
                ]
              },
              3
            ]
          }
        },
        {
          "name": "startAt",
          "type": "i64"
        },
        {
          "name": "endAt",
          "type": "i64"
        },
        {
          "name": "investmentUpperLimit",
          "type": "u64"
        },
        {
          "name": "executeWhitelist",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "updateWhitelist",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "withdrawWhitelist",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "patchExecuteWhitelist",
      "docs": [
        "Update execute whitelist members",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from current execute_whitelist",
        "- Can replace whitelist members one at a time",
        "- Affects authorization for profit/refund execution",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Whitelist member validation",
        "- Duplicate address prevention"
      ],
      "discriminator": [
        120,
        128,
        186,
        96,
        113,
        71,
        74,
        112
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account containing whitelist",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for whitelist updates",
            "- PDA validation prevents spoofing",
            "- Contains execute_whitelist to be updated"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "patchUpdateWhitelist",
      "docs": [
        "Update update whitelist members",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from current update_whitelist",
        "- Can replace whitelist members one at a time",
        "- Affects authorization for investment info updates",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Whitelist member validation",
        "- Duplicate address prevention"
      ],
      "discriminator": [
        245,
        245,
        153,
        175,
        158,
        7,
        176,
        182
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account containing whitelist",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for whitelist updates",
            "- PDA validation prevents spoofing",
            "- Contains update_whitelist to be updated"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "patchWithdrawWhitelist",
      "docs": [
        "Update withdraw whitelist members",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from current withdraw_whitelist",
        "- Can replace whitelist members one at a time",
        "- Affects authorization for vault withdrawals",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Whitelist member validation",
        "- Duplicate address prevention"
      ],
      "discriminator": [
        142,
        5,
        147,
        237,
        115,
        252,
        27,
        160
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account containing whitelist",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for whitelist updates",
            "- PDA validation prevents spoofing",
            "- Contains withdraw_whitelist to be updated"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "revokedInvestmentRecord",
      "docs": [
        "Revoke an investment record",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from update_whitelist",
        "- Marks record as revoked, preventing further operations",
        "- Affects profit/refund calculations",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Record existence validation",
        "- Record state validation (not already revoked)"
      ],
      "discriminator": [
        242,
        138,
        219,
        122,
        199,
        171,
        96,
        18
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters",
            "- PDA validation prevents spoofing"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "investmentRecord",
          "docs": [
            "InvestmentRecord account to be revoked",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for revocation",
            "- PDA validation prevents spoofing",
            "- State validation prevents double revocation"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              },
              {
                "kind": "arg",
                "path": "batchId"
              },
              {
                "kind": "arg",
                "path": "recordId"
              },
              {
                "kind": "arg",
                "path": "accountId"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u16"
        },
        {
          "name": "recordId",
          "type": "u64"
        },
        {
          "name": "accountId",
          "type": {
            "array": [
              "u8",
              15
            ]
          }
        }
      ]
    },
    {
      "name": "updateInvestmentInfo",
      "docs": [
        "Update investment info parameters",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from update_whitelist",
        "- Can modify stage ratios and investment limits",
        "- Only allowed when investment is active and not completed",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Investment state validation",
        "- Input parameter validation"
      ],
      "discriminator": [
        85,
        152,
        68,
        250,
        108,
        115,
        59,
        108
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account to be updated",
            "",
            "AUDIT CRITICAL:",
            "- Must be mutable for updates",
            "- PDA validation prevents spoofing",
            "- State validation prevents invalid updates"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for transaction fees"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newStageRatio",
          "type": {
            "option": {
              "array": [
                {
                  "array": [
                    "u8",
                    10
                  ]
                },
                3
              ]
            }
          }
        },
        {
          "name": "newUpperLimit",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "updateInvestmentRecordWallets",
      "docs": [
        "Update wallet address for investment records",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from update_whitelist",
        "- Updates wallet addresses for existing records",
        "- Affects future profit/refund distributions",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Record existence validation",
        "- Account ID validation"
      ],
      "discriminator": [
        136,
        97,
        216,
        168,
        140,
        162,
        212,
        168
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters",
            "- PDA validation prevents spoofing"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "usdtMint",
          "docs": [
            "USDT mint account for validation",
            "",
            "AUDIT: Must match expected USDT mint address"
          ]
        },
        {
          "name": "hcoinMint",
          "docs": [
            "H2COIN mint account for validation",
            "",
            "AUDIT: Must match expected H2COIN mint address"
          ]
        },
        {
          "name": "recipientAccount",
          "docs": [
            "New recipient account for token transfers",
            "",
            "AUDIT CRITICAL:",
            "- New destination for future distributions",
            "- Manually validated in instruction"
          ]
        },
        {
          "name": "recipientUsdtAccount",
          "docs": [
            "New recipient associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- New destination for USDT distributions",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientHcoinAccount",
          "docs": [
            "New recipient associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- New destination for H2COIN distributions",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "hcoinMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for ATA creation and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for ATA initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation",
            "",
            "AUDIT: Required for account initialization"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token operations",
            "",
            "AUDIT: Required for ATA creation"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA creation",
            "",
            "AUDIT: Required for ATA creation"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "accountId",
          "type": {
            "array": [
              "u8",
              15
            ]
          }
        }
      ]
    },
    {
      "name": "withdrawFromVault",
      "docs": [
        "Withdraw from vault",
        "",
        "AUDIT CRITICAL:",
        "- Requires 3-of-5 multisig from withdraw_whitelist",
        "- Transfers tokens/SOL from vault to recipient",
        "- Critical operation affecting vault security",
        "",
        "SECURITY CHECKS:",
        "- Multisig validation (3-of-5)",
        "- Vault account validation",
        "- Balance validation",
        "- Transfer amount validation"
      ],
      "discriminator": [
        180,
        34,
        37,
        46,
        156,
        0,
        211,
        238
      ],
      "accounts": [
        {
          "name": "investmentInfo",
          "docs": [
            "InvestmentInfo account for validation",
            "",
            "AUDIT CRITICAL:",
            "- Validates investment exists and is active",
            "- Provides investment parameters and withdraw whitelist",
            "- Used for vault PDA derivation"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "usdtMint",
          "docs": [
            "USDT mint account for validation",
            "",
            "AUDIT: Must match expected USDT mint address"
          ]
        },
        {
          "name": "hcoinMint",
          "docs": [
            "H2COIN mint account for validation",
            "",
            "AUDIT: Must match expected H2COIN mint address"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA account for fund transfers",
            "",
            "AUDIT CRITICAL:",
            "- Derived from investment_id and version",
            "- Source of all fund transfers",
            "- No deserialization needed (AccountInfo)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "investment_info.investment_id",
                "account": "investmentInfo"
              },
              {
                "kind": "account",
                "path": "investment_info.version",
                "account": "investmentInfo"
              }
            ]
          }
        },
        {
          "name": "vaultUsdtAccount",
          "docs": [
            "Vault associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- Source of USDT transfers",
            "- Ownership validated against vault PDA",
            "- Must be mutable for transfers"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vaultHcoinAccount",
          "docs": [
            "Vault associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- Source of H2COIN transfers",
            "- Ownership validated against vault PDA",
            "- Must be mutable for transfers"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "hcoinMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientAccount",
          "docs": [
            "Recipient account for fund transfers",
            "",
            "AUDIT CRITICAL:",
            "- Destination for all fund transfers",
            "- Must be in withdraw whitelist",
            "- Manually validated in instruction"
          ],
          "writable": true
        },
        {
          "name": "recipientUsdtAccount",
          "docs": [
            "Recipient associated token account for USDT",
            "",
            "AUDIT CRITICAL:",
            "- Destination for USDT transfers",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientHcoinAccount",
          "docs": [
            "Recipient associated token account for H2COIN",
            "",
            "AUDIT CRITICAL:",
            "- Destination for H2COIN transfers",
            "- Ownership validated against recipient",
            "- Created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipientAccount"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "hcoinMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "Transaction payer account",
            "",
            "AUDIT: Pays for ATA creation and transaction fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar for account creation",
            "",
            "AUDIT: Required for ATA initialization"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account operations",
            "",
            "AUDIT: Required for account operations"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for token transfers",
            "",
            "AUDIT: Required for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program for ATA operations",
            "",
            "AUDIT: Required for ATA operations"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "investmentInfo",
      "discriminator": [
        61,
        69,
        128,
        59,
        129,
        22,
        213,
        106
      ]
    },
    {
      "name": "investmentRecord",
      "discriminator": [
        221,
        250,
        100,
        99,
        81,
        218,
        9,
        94
      ]
    },
    {
      "name": "profitShareCache",
      "discriminator": [
        243,
        212,
        163,
        0,
        32,
        226,
        46,
        225
      ]
    },
    {
      "name": "refundShareCache",
      "discriminator": [
        187,
        79,
        191,
        79,
        202,
        61,
        10,
        182
      ]
    }
  ],
  "events": [
    {
      "name": "investmentInfoCompleted",
      "discriminator": [
        242,
        231,
        99,
        122,
        80,
        40,
        14,
        103
      ]
    },
    {
      "name": "investmentInfoDeactivated",
      "discriminator": [
        97,
        138,
        167,
        107,
        8,
        10,
        190,
        34
      ]
    },
    {
      "name": "investmentInfoInitialized",
      "discriminator": [
        170,
        249,
        106,
        166,
        132,
        139,
        21,
        3
      ]
    },
    {
      "name": "investmentRecordAdded",
      "discriminator": [
        81,
        72,
        151,
        181,
        210,
        229,
        33,
        91
      ]
    },
    {
      "name": "investmentRecordRevoked",
      "discriminator": [
        92,
        35,
        100,
        197,
        231,
        114,
        176,
        254
      ]
    },
    {
      "name": "investmentRecordWalletUpdated",
      "discriminator": [
        135,
        189,
        105,
        63,
        196,
        1,
        173,
        117
      ]
    },
    {
      "name": "investmentUpdated",
      "discriminator": [
        137,
        102,
        123,
        112,
        254,
        92,
        122,
        205
      ]
    },
    {
      "name": "profitShareEstimated",
      "discriminator": [
        245,
        181,
        144,
        38,
        237,
        156,
        175,
        153
      ]
    },
    {
      "name": "profitShareExecuted",
      "discriminator": [
        243,
        33,
        228,
        132,
        40,
        5,
        184,
        137
      ]
    },
    {
      "name": "refundShareEstimated",
      "discriminator": [
        90,
        229,
        183,
        225,
        228,
        91,
        117,
        133
      ]
    },
    {
      "name": "refundShareExecuted",
      "discriminator": [
        208,
        69,
        210,
        42,
        216,
        23,
        169,
        165
      ]
    },
    {
      "name": "vaultDepositSolEvent",
      "discriminator": [
        229,
        141,
        116,
        143,
        172,
        237,
        166,
        114
      ]
    },
    {
      "name": "vaultDepositTokenEvent",
      "discriminator": [
        111,
        105,
        31,
        182,
        0,
        31,
        215,
        247
      ]
    },
    {
      "name": "vaultTransferred",
      "discriminator": [
        217,
        143,
        236,
        60,
        98,
        14,
        49,
        60
      ]
    },
    {
      "name": "whitelistUpdated",
      "discriminator": [
        205,
        110,
        205,
        193,
        238,
        237,
        220,
        22
      ]
    },
    {
      "name": "withdrawWhitelistUpdated",
      "discriminator": [
        118,
        254,
        245,
        232,
        240,
        98,
        100,
        246
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "numericalOverflow",
      "msg": "🔴 Math overflow."
    },
    {
      "code": 6001,
      "name": "unauthorizedSigner",
      "msg": "🔴 Unauthorized signer or not enough signatures."
    },
    {
      "code": 6002,
      "name": "whitelistLengthInvalid",
      "msg": "🔴 Withdraw whitelist must be between 1 and 5 entries."
    },
    {
      "code": 6003,
      "name": "invalidInvestmentIdLength",
      "msg": "🔴 Investment ID is too long or too short, must be 15 bytes."
    },
    {
      "code": 6004,
      "name": "invalidStageRatioLength",
      "msg": "🔴 stage_ratio length per stage must be exactly 10 elements."
    },
    {
      "code": 6005,
      "name": "invalidStageRatioValue",
      "msg": "🔴 Stage ratio value must be between 0 and 100."
    },
    {
      "code": 6006,
      "name": "invalidStageRatioSum",
      "msg": "🔴 Stage ratio sum for a single stage must not exceed 100."
    },
    {
      "code": 6007,
      "name": "nonContiguousStage",
      "msg": "🔴 Stage ratio must be contiguous once non-zero values begin."
    },
    {
      "code": 6008,
      "name": "emptyStageRatio",
      "msg": "🔴 All stage ratio values are zero."
    },
    {
      "code": 6009,
      "name": "investmentInfoNotFound",
      "msg": "🔴 Investment info not exists."
    },
    {
      "code": 6010,
      "name": "investmentInfoNotCompleted",
      "msg": "🔴 Investment info has not completed yet."
    },
    {
      "code": 6011,
      "name": "investmentInfoHasCompleted",
      "msg": "🔴 Investment info has completed already."
    },
    {
      "code": 6012,
      "name": "investmentInfoDeactivated",
      "msg": "🔴 Investment info has been deactivated and can no longer be modified."
    },
    {
      "code": 6013,
      "name": "invalidInvestmentInfoPda",
      "msg": "🔴 The derived PDA does not match the expected investment info PDA."
    },
    {
      "code": 6014,
      "name": "recordIdMismatch",
      "msg": "🔴 Record ID mismatch."
    },
    {
      "code": 6015,
      "name": "accountIdMismatch",
      "msg": "🔴 Account ID mismatch."
    },
    {
      "code": 6016,
      "name": "invalidAccountIdLength",
      "msg": "🔴 Account ID is too long or too short, must be 15 bytes."
    },
    {
      "code": 6017,
      "name": "investmentRecordNotFound",
      "msg": "🔴 Investment record not found."
    },
    {
      "code": 6018,
      "name": "invalidRecordPda",
      "msg": "🔴 The derived PDA does not match the expected investment record PDA."
    },
    {
      "code": 6019,
      "name": "noRecordsInRemainingAccounts",
      "msg": "🔴 There are not investment records in remainingAccounts."
    },
    {
      "code": 6020,
      "name": "recordAlreadyRevoked",
      "msg": "🔴 This record has been revoked already."
    },
    {
      "code": 6021,
      "name": "noRecordsUpdated",
      "msg": "🔴 No record has been updated."
    },
    {
      "code": 6022,
      "name": "whitelistMustBeFive",
      "msg": "🔴 Whitelist must contain exactly 5 members"
    },
    {
      "code": 6023,
      "name": "whitelistAddressExists",
      "msg": "🔴 Target address already exists in whitelist"
    },
    {
      "code": 6024,
      "name": "whitelistAddressNotFound",
      "msg": "🔴 Address to be replaced not found in whitelist"
    },
    {
      "code": 6025,
      "name": "invalidVaultPda",
      "msg": "🔴 Invalid Vault PDA"
    },
    {
      "code": 6026,
      "name": "invalidTokenMint",
      "msg": "🔴 Vault token account mint is not USDT or H2coin."
    },
    {
      "code": 6027,
      "name": "invalidVaultAta",
      "msg": "🔴 The provided vault ATA does not match the expected associated token address."
    },
    {
      "code": 6028,
      "name": "invalidRecipientMint",
      "msg": "🔴 Recipient token account mint is not USDT or H2coin."
    },
    {
      "code": 6029,
      "name": "invalidVaultOwner",
      "msg": "🔴 Vault token account owner mismatch."
    },
    {
      "code": 6030,
      "name": "invalidFromOwner",
      "msg": "🔴 From token account owner mismatch."
    },
    {
      "code": 6031,
      "name": "invalidRecipientOwner",
      "msg": "🔴 Recipient token account owner mismatch."
    },
    {
      "code": 6032,
      "name": "standardOnly",
      "msg": "🔴 Investment type must be `Standard`."
    },
    {
      "code": 6033,
      "name": "totalShareMismatch",
      "msg": "🔴 Total share does not match."
    },
    {
      "code": 6034,
      "name": "profitCacheNotFound",
      "msg": "🔴 Profit share cache not found."
    },
    {
      "code": 6035,
      "name": "profitCacheExpired",
      "msg": "🔴 Profit share cache has expired (older than 25 days)"
    },
    {
      "code": 6036,
      "name": "profitAlreadyExecuted",
      "msg": "🔴 Profit already executed."
    },
    {
      "code": 6037,
      "name": "insufficientTokenBalance",
      "msg": "🔴 Insufficient USDT token balance in vault"
    },
    {
      "code": 6038,
      "name": "insufficientSolBalance",
      "msg": "🔴 Insufficient SOL balance in vault to cover estimated gas cost"
    },
    {
      "code": 6039,
      "name": "invalidTotalUsdt",
      "msg": "🔴 Total USDT cannot be 0 or undefined"
    },
    {
      "code": 6040,
      "name": "batchIdMismatch",
      "msg": "🔴 Batch id does not match expected number."
    },
    {
      "code": 6041,
      "name": "tooManyRecordsLoaded",
      "msg": "🔴 Too many records have been loaded."
    },
    {
      "code": 6042,
      "name": "missingAssociatedTokenAccount",
      "msg": "🔴 Missing associated token account."
    },
    {
      "code": 6043,
      "name": "invalidProfitCachePda",
      "msg": "🔴 The derived PDA does not match the expected profit cache PDA."
    },
    {
      "code": 6044,
      "name": "bpRatioOverflow",
      "msg": "🔴 Bp ratio overflowed u16."
    },
    {
      "code": 6045,
      "name": "duplicateRecord",
      "msg": "🔴 Duplicate record_id detected in input records."
    },
    {
      "code": 6046,
      "name": "refundCacheExpired",
      "msg": "🔴 Refund share cache has expired (older than 25 days)"
    },
    {
      "code": 6047,
      "name": "refundCacheNotFound",
      "msg": "🔴 Refund share cache not found."
    },
    {
      "code": 6048,
      "name": "refundPeriodInvalid",
      "msg": "🔴 Refund period is invalid"
    },
    {
      "code": 6049,
      "name": "refundAlreadyExecuted",
      "msg": "🔴 Refund share already executed."
    },
    {
      "code": 6050,
      "name": "invalidRecipientAta",
      "msg": "🔴 Invalid Recipient ATA"
    },
    {
      "code": 6051,
      "name": "invalidTotalH2coin",
      "msg": "🔴 Total H2coin cannot be 0 or undefined"
    },
    {
      "code": 6052,
      "name": "invalidRefundCachePda",
      "msg": "🔴 The derived PDA does not match the expected refund cache PDA."
    },
    {
      "code": 6053,
      "name": "emptyWhitelist",
      "msg": "🔴 Whitelist must contain at least one wallet."
    },
    {
      "code": 6054,
      "name": "invalidRecipientAddress",
      "msg": "🔴 Invalid Recipient wallet Address"
    },
    {
      "code": 6055,
      "name": "unauthorizedRecipient",
      "msg": "🔴 Recipient wallet is not in the withdraw whitelist."
    },
    {
      "code": 6056,
      "name": "invalidAssociatedTokenAccount",
      "msg": "🔴 Invalid associated token account."
    },
    {
      "code": 6057,
      "name": "invalidTokenProgramId",
      "msg": "🔴 Invalid token program ID. Must be Token 2020(Legacy)."
    },
    {
      "code": 6058,
      "name": "invalidAssociatedTokenProgramId",
      "msg": "🔴 Invalid associated token program ID."
    }
  ],
  "types": [
    {
      "name": "investmentInfo",
      "docs": [
        "Main investment configuration account",
        "",
        "AUDIT CRITICAL:",
        "- Contains all investment parameters and configuration",
        "- Manages whitelists for different operation types",
        "- Controls investment state transitions",
        "- Stores vault PDA reference",
        "- Central control point for all investment operations",
        "",
        "SECURITY FEATURES:",
        "- Fixed account size prevents overflow",
        "- PDA-based address derivation",
        "- State validation prevents invalid transitions",
        "- Whitelist validation for access control",
        "- Comprehensive input validation",
        "- State consistency enforcement"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Unique investment identifier (15 bytes)",
              "AUDIT: Must be exactly 15 bytes, used for PDA derivation",
              "SECURITY: Prevents ID manipulation and ensures unique identification"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version identifier (4 bytes)",
              "AUDIT: Used for versioning and PDA derivation",
              "SECURITY: Enables version control and prevents version confusion"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "investmentType",
            "docs": [
              "Investment type (Standard or CSR)",
              "AUDIT: Affects profit sharing eligibility",
              "SECURITY: Controls access to profit distribution features"
            ],
            "type": {
              "defined": {
                "name": "investmentType"
              }
            }
          },
          {
            "name": "stageRatio",
            "docs": [
              "Refund percentage ratios for each stage and year",
              "AUDIT: 3 stages × 10 years = 30 values, each 0-100%",
              "SECURITY: Must be validated to prevent mathematical errors"
            ],
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    10
                  ]
                },
                3
              ]
            }
          },
          {
            "name": "startAt",
            "docs": [
              "Investment start timestamp",
              "AUDIT: Used for timing validation",
              "SECURITY: Prevents premature operations"
            ],
            "type": "i64"
          },
          {
            "name": "endAt",
            "docs": [
              "Investment end timestamp",
              "AUDIT: Used for completion validation",
              "SECURITY: Controls investment lifecycle"
            ],
            "type": "i64"
          },
          {
            "name": "investmentUpperLimit",
            "docs": [
              "Maximum investment amount limit",
              "AUDIT: Prevents over-investment",
              "SECURITY: Controls fund exposure and risk management"
            ],
            "type": "u64"
          },
          {
            "name": "executeWhitelist",
            "docs": [
              "Whitelist for profit/refund execution operations",
              "AUDIT: Exactly 5 members for 3-of-5 multisig",
              "SECURITY: Controls access to critical financial operations"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "updateWhitelist",
            "docs": [
              "Whitelist for investment info update operations",
              "AUDIT: Exactly 5 members for 3-of-5 multisig",
              "SECURITY: Controls access to configuration changes"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "withdrawWhitelist",
            "docs": [
              "Whitelist for vault withdrawal operations",
              "AUDIT: Exactly 5 members for 3-of-5 multisig",
              "SECURITY: Controls access to fund withdrawals"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "vault",
            "docs": [
              "Vault PDA address for fund storage",
              "AUDIT: Derived from investment_id and version",
              "SECURITY: Prevents vault spoofing and ensures proper fund storage"
            ],
            "type": "pubkey"
          },
          {
            "name": "state",
            "docs": [
              "Current investment state",
              "AUDIT: Controls allowed operations",
              "SECURITY: Prevents invalid state transitions"
            ],
            "type": {
              "defined": {
                "name": "investmentState"
              }
            }
          },
          {
            "name": "isActive",
            "docs": [
              "Whether investment is active",
              "AUDIT: Prevents operations on deactivated investments",
              "SECURITY: Final state control for terminated investments"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Creation timestamp",
              "AUDIT: Used for audit trail",
              "SECURITY: Provides temporal context for operations"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentInfoCompleted",
      "docs": [
        "Event emitted when investment info is marked as completed",
        "",
        "AUDIT CRITICAL:",
        "- Tracks investment completion state change",
        "- Includes all signers for multisig accountability",
        "- Prevents further investment info modifications",
        "- Provides audit trail for completion",
        "- Enables monitoring of investment lifecycle",
        "",
        "SECURITY:",
        "- Records completion of investment phase",
        "- Prevents further modifications",
        "- Records all multisig signers",
        "- Enables state transition verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "updatedBy",
            "docs": [
              "The updater of this investment info",
              "AUDIT: Accountable party for completion",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Completion time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentInfoDeactivated",
      "docs": [
        "Event emitted when investment info is deactivated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks final deactivation of investment",
        "- Includes all signers for multisig accountability",
        "- Prevents all further operations",
        "- Provides audit trail for deactivation",
        "- Enables monitoring of investment termination",
        "",
        "SECURITY:",
        "- Records final state of investment",
        "- Prevents all further operations",
        "- Records all multisig signers",
        "- Enables termination verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "deactivatedBy",
            "docs": [
              "The deactivator of this investment info",
              "AUDIT: Accountable party for deactivation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "deactivatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Deactivation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentInfoInitialized",
      "docs": [
        "Event emitted when a new investment info is initialized",
        "",
        "AUDIT CRITICAL:",
        "- Tracks creation of new investment configurations",
        "- Includes vault PDA for fund tracking",
        "- Records initializer for accountability",
        "- Provides audit trail for investment setup",
        "- Enables monitoring of new investment creation",
        "",
        "SECURITY:",
        "- Records who created the investment",
        "- Includes vault address for fund tracking",
        "- Timestamp for temporal context",
        "- Version information for code tracking"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "vault",
            "docs": [
              "Vault PDA used to store funds",
              "AUDIT: Address for fund tracking",
              "SECURITY: Enables fund flow monitoring"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdBy",
            "docs": [
              "The initializer of this investment info",
              "AUDIT: Accountable party for investment creation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Creation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentRecord",
      "docs": [
        "Individual investment record account",
        "",
        "AUDIT CRITICAL:",
        "- Stores individual investment details",
        "- Links to investment info and investor",
        "- Used for profit and refund calculations",
        "- Immutable once created (can only be revoked)",
        "",
        "SECURITY FEATURES:",
        "- Fixed account size prevents overflow",
        "- PDA-based address derivation",
        "- Revocation mechanism for invalid records",
        "- Comprehensive validation",
        "- Audit trail with timestamps"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Batch identifier for grouping records",
              "AUDIT: Used for batch processing and cache creation",
              "SECURITY: Enables efficient batch operations"
            ],
            "type": "u16"
          },
          {
            "name": "recordId",
            "docs": [
              "Unique record identifier within batch",
              "AUDIT: Must be unique within batch",
              "SECURITY: Prevents duplicate record processing"
            ],
            "type": "u64"
          },
          {
            "name": "accountId",
            "docs": [
              "Account identifier (15 bytes)",
              "AUDIT: Used for record identification and PDA derivation",
              "SECURITY: Ensures proper record ownership"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment identifier (15 bytes)",
              "AUDIT: Links record to investment info",
              "SECURITY: Ensures proper investment association"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version identifier (4 bytes)",
              "AUDIT: Links record to specific investment version",
              "SECURITY: Prevents version confusion"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "wallet",
            "docs": [
              "Investor wallet address",
              "AUDIT: Recipient for profit/refund distributions",
              "SECURITY: Controls fund distribution destination"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountUsdt",
            "docs": [
              "USDT investment amount",
              "AUDIT: Used for profit calculations",
              "SECURITY: Determines profit share allocation"
            ],
            "type": "u64"
          },
          {
            "name": "amountHcoin",
            "docs": [
              "H2COIN investment amount",
              "AUDIT: Used for refund calculations",
              "SECURITY: Determines refund share allocation"
            ],
            "type": "u64"
          },
          {
            "name": "stage",
            "docs": [
              "Investment stage (1, 2, or 3)",
              "AUDIT: Used for refund percentage calculation",
              "SECURITY: Controls refund distribution timing"
            ],
            "type": "u8"
          },
          {
            "name": "revokedAt",
            "docs": [
              "Revocation timestamp (0 if not revoked)",
              "AUDIT: Prevents revoked records from distributions",
              "SECURITY: Enables record invalidation"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Creation timestamp",
              "AUDIT: Used for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentRecordAdded",
      "docs": [
        "Event emitted when a new investment record is added",
        "",
        "AUDIT CRITICAL:",
        "- Tracks creation of individual investment records",
        "- Records investment amounts and recipient",
        "- Includes all signers for multisig accountability",
        "- Provides audit trail for investment tracking",
        "- Enables monitoring of individual investments",
        "",
        "SECURITY:",
        "- Records individual investment details",
        "- Records all multisig signers",
        "- Tracks investment amounts",
        "- Enables investment verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "recordId",
            "docs": [
              "Unique record identifier",
              "AUDIT: Links to specific investment record",
              "SECURITY: Enables record tracking"
            ],
            "type": "u64"
          },
          {
            "name": "accountId",
            "docs": [
              "Account identifier (15 bytes)",
              "AUDIT: Links to specific account",
              "SECURITY: Enables account tracking"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "amountUsdt",
            "docs": [
              "USDT investment amount",
              "AUDIT: Investment amount for profit calculations",
              "SECURITY: Records investment value"
            ],
            "type": "u64"
          },
          {
            "name": "addedBy",
            "docs": [
              "The adder of this investment record",
              "AUDIT: Accountable party for record creation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "addedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Creation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentRecordRevoked",
      "docs": [
        "Event emitted when an investment record is revoked",
        "",
        "AUDIT CRITICAL:",
        "- Tracks revocation of investment records",
        "- Includes all signers for multisig accountability",
        "- Prevents revoked records from distributions",
        "- Provides audit trail for record invalidation",
        "- Enables monitoring of record revocations",
        "",
        "SECURITY:",
        "- Records record invalidation",
        "- Records all multisig signers",
        "- Prevents further operations on revoked records",
        "- Enables revocation verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "recordId",
            "docs": [
              "Unique record identifier",
              "AUDIT: Links to specific investment record",
              "SECURITY: Enables record tracking"
            ],
            "type": "u64"
          },
          {
            "name": "revokedBy",
            "docs": [
              "The revoker of this investment record",
              "AUDIT: Accountable party for revocation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "revokedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Revocation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentRecordWalletUpdated",
      "docs": [
        "Event emitted when investment record wallet is updated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks wallet address changes for investment records",
        "- Includes all signers for multisig accountability",
        "- Records specific wallet updates",
        "- Provides audit trail for recipient changes",
        "- Enables monitoring of recipient updates",
        "",
        "SECURITY:",
        "- Records recipient address changes",
        "- Records all multisig signers",
        "- Tracks specific account updates",
        "- Enables recipient verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "accountId",
            "docs": [
              "Account identifier (15 bytes)",
              "AUDIT: Links to specific account",
              "SECURITY: Enables account tracking"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "newWallet",
            "docs": [
              "New wallet address",
              "AUDIT: Updated recipient address",
              "SECURITY: Records new recipient"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "docs": [
              "The updater of this wallet",
              "AUDIT: Accountable party for the update",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Update time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentState",
      "docs": [
        "Investment state enumeration",
        "",
        "AUDIT CRITICAL:",
        "- Controls allowed operations based on state",
        "- Prevents invalid state transitions",
        "- Ensures proper investment lifecycle",
        "",
        "SECURITY:",
        "- Prevents operations on wrong state",
        "- Controls access to features based on state",
        "- Ensures proper state management"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "init"
          },
          {
            "name": "pending"
          },
          {
            "name": "completed"
          }
        ]
      }
    },
    {
      "name": "investmentType",
      "docs": [
        "Investment type enumeration",
        "",
        "AUDIT CRITICAL:",
        "- Controls profit sharing eligibility",
        "- Affects available operations",
        "- Used for business logic validation",
        "",
        "SECURITY:",
        "- Prevents unauthorized profit sharing",
        "- Controls feature access based on investment type",
        "- Ensures proper business logic enforcement"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "standard"
          },
          {
            "name": "csr"
          }
        ]
      }
    },
    {
      "name": "investmentUpdated",
      "docs": [
        "Event emitted when investment info is updated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks modifications to investment configuration",
        "- Includes all signers for multisig accountability",
        "- Records specific changes made",
        "- Provides audit trail for configuration updates",
        "- Enables monitoring of configuration changes",
        "",
        "SECURITY:",
        "- Records all multisig signers for accountability",
        "- Tracks specific configuration changes",
        "- Prevents unauthorized modifications",
        "- Enables change verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "newStageRatio",
            "docs": [
              "New stage ratio configuration (if updated)",
              "AUDIT: Tracks refund percentage changes",
              "SECURITY: Records critical configuration changes"
            ],
            "type": {
              "option": {
                "array": [
                  {
                    "array": [
                      "u8",
                      10
                    ]
                  },
                  3
                ]
              }
            }
          },
          {
            "name": "newUpperLimit",
            "docs": [
              "New upper limit (if updated)",
              "AUDIT: Tracks investment limit changes",
              "SECURITY: Records risk management changes"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "updatedBy",
            "docs": [
              "The updater of this investment info",
              "AUDIT: Accountable party for the update",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Update time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "profitEntry",
      "docs": [
        "Individual profit share entry",
        "",
        "AUDIT CRITICAL:",
        "- Contains profit distribution details for one recipient",
        "- Used for USDT transfer execution",
        "- Includes calculation validation data",
        "",
        "SECURITY:",
        "- Validates profit calculations",
        "- Ensures proper recipient identification",
        "- Prevents calculation errors"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountId",
            "docs": [
              "Account identifier (15 bytes)",
              "AUDIT: Links entry to specific account",
              "SECURITY: Ensures proper account association"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "wallet",
            "docs": [
              "Recipient wallet address",
              "AUDIT: Destination for USDT transfer",
              "SECURITY: Controls fund distribution destination"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountUsdt",
            "docs": [
              "USDT amount to transfer",
              "AUDIT: Calculated based on investment amount and profit ratio",
              "SECURITY: Determines actual transfer amount"
            ],
            "type": "u64"
          },
          {
            "name": "ratioBp",
            "docs": [
              "Profit ratio in basis points",
              "AUDIT: Used for calculation validation",
              "SECURITY: Ensures calculation accuracy"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "profitShareCache",
      "docs": [
        "Profit share cache account for batch processing",
        "",
        "AUDIT CRITICAL:",
        "- Stores pre-calculated profit distribution data",
        "- Enables efficient batch execution",
        "- Prevents double execution",
        "- Contains gas cost estimates",
        "",
        "SECURITY FEATURES:",
        "- Fixed account size prevents overflow",
        "- PDA-based address derivation",
        "- Expiration mechanism prevents stale data",
        "- Execution tracking prevents double-spending",
        "- Comprehensive validation"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Batch identifier for this profit share entry",
              "AUDIT: Links cache to specific batch of records",
              "SECURITY: Ensures proper batch association"
            ],
            "type": "u16"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment identifier (15 bytes)",
              "AUDIT: Links profit share to specific investment",
              "SECURITY: Ensures proper investment association"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version identifier (4 bytes)",
              "AUDIT: Links profit share to specific investment version",
              "SECURITY: Prevents version confusion"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "subtotalProfitUsdt",
            "docs": [
              "Total USDT amount to be distributed",
              "AUDIT: Must match sum of all entries",
              "SECURITY: Prevents fund exhaustion"
            ],
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "docs": [
              "Estimated SOL cost for execution",
              "AUDIT: Used for gas cost estimation",
              "SECURITY: Ensures sufficient gas coverage"
            ],
            "type": "u64"
          },
          {
            "name": "executedAt",
            "docs": [
              "Execution timestamp (0 if not executed)",
              "AUDIT: Prevents double execution",
              "SECURITY: Ensures idempotency"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Cache creation timestamp",
              "AUDIT: Used for expiration validation",
              "SECURITY: Prevents stale data execution"
            ],
            "type": "i64"
          },
          {
            "name": "entries",
            "docs": [
              "List of profit share entries for this batch",
              "AUDIT: Up to 30 entries per batch",
              "SECURITY: Limits batch size for efficiency"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "profitEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "profitShareEstimated",
      "docs": [
        "Event emitted when profit share is estimated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks profit distribution calculations",
        "- Includes all signers for multisig accountability",
        "- Records estimated amounts and gas costs",
        "- Provides audit trail for profit calculations",
        "- Enables monitoring of profit estimation",
        "",
        "SECURITY:",
        "- Records profit calculation details",
        "- Records all multisig signers",
        "- Tracks estimated amounts and costs",
        "- Enables calculation verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Each batch_id handles up to 30 investment records",
              "AUDIT: Links to specific batch of records",
              "SECURITY: Enables batch tracking"
            ],
            "type": "u16"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "subtotalProfitUsdt",
            "docs": [
              "Total USDT amount to be distributed",
              "AUDIT: Total profit amount for transparency",
              "SECURITY: Records total distribution amount"
            ],
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "docs": [
              "Estimated SOL cost for execution",
              "AUDIT: Gas cost estimation for transparency",
              "SECURITY: Records estimated transaction costs"
            ],
            "type": "u64"
          },
          {
            "name": "createdBy",
            "docs": [
              "The estimator of this profit share",
              "AUDIT: Accountable party for estimation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Estimation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "entryCount",
            "docs": [
              "Number of entries in this batch",
              "AUDIT: Batch size for transparency",
              "SECURITY: Records batch complexity"
            ],
            "type": "u16"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "profitShareExecuted",
      "docs": [
        "Event emitted when profit share is executed",
        "",
        "AUDIT CRITICAL:",
        "- Tracks actual profit distribution execution",
        "- Includes all signers for multisig accountability",
        "- Records actual transfer amounts",
        "- Provides audit trail for profit execution",
        "- Enables monitoring of profit distributions",
        "",
        "SECURITY:",
        "- Records actual distribution execution",
        "- Records all multisig signers",
        "- Tracks actual transfer amounts",
        "- Enables execution verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Batch identifier for this execution",
              "AUDIT: Links to specific batch of records",
              "SECURITY: Enables batch tracking"
            ],
            "type": "u16"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "totalTransferUsdt",
            "docs": [
              "Total USDT amount actually transferred",
              "AUDIT: Actual distribution amount for transparency",
              "SECURITY: Records actual transfer amount"
            ],
            "type": "u64"
          },
          {
            "name": "executedBy",
            "docs": [
              "The executor of this profit share",
              "AUDIT: Accountable party for execution",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Execution time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "refundEntry",
      "docs": [
        "Individual refund share entry",
        "",
        "AUDIT CRITICAL:",
        "- Contains refund distribution details for one recipient",
        "- Used for H2COIN transfer execution",
        "- Includes stage information for validation",
        "",
        "SECURITY:",
        "- Validates refund calculations",
        "- Ensures proper recipient identification",
        "- Prevents calculation errors"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountId",
            "docs": [
              "Account identifier (15 bytes)",
              "AUDIT: Links entry to specific account",
              "SECURITY: Ensures proper account association"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "wallet",
            "docs": [
              "Recipient wallet address",
              "AUDIT: Destination for H2COIN transfer",
              "SECURITY: Controls fund distribution destination"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountHcoin",
            "docs": [
              "H2COIN amount to transfer",
              "AUDIT: Calculated based on investment amount and refund percentage",
              "SECURITY: Determines actual transfer amount"
            ],
            "type": "u64"
          },
          {
            "name": "stage",
            "docs": [
              "Investment stage (1, 2, or 3)",
              "AUDIT: Used for refund percentage calculation",
              "SECURITY: Ensures proper refund calculation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "refundShareCache",
      "docs": [
        "Refund share cache account for batch processing",
        "",
        "AUDIT CRITICAL:",
        "- Stores pre-calculated refund distribution data",
        "- Enables efficient batch execution",
        "- Prevents double execution",
        "- Contains gas cost estimates",
        "",
        "SECURITY FEATURES:",
        "- Fixed account size prevents overflow",
        "- PDA-based address derivation",
        "- Expiration mechanism prevents stale data",
        "- Execution tracking prevents double-spending",
        "- Comprehensive validation"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Batch identifier for this refund share entry",
              "AUDIT: Links cache to specific batch of records",
              "SECURITY: Ensures proper batch association"
            ],
            "type": "u16"
          },
          {
            "name": "yearIndex",
            "docs": [
              "Year index for this refund (0-9)",
              "AUDIT: Specific year for refund calculation",
              "SECURITY: Controls refund timing"
            ],
            "type": "u8"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment identifier (15 bytes)",
              "AUDIT: Links refund share to specific investment",
              "SECURITY: Ensures proper investment association"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version identifier (4 bytes)",
              "AUDIT: Links refund share to specific investment version",
              "SECURITY: Prevents version confusion"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "subtotalRefundHcoin",
            "docs": [
              "Total H2COIN amount to be distributed",
              "AUDIT: Must match sum of all entries",
              "SECURITY: Prevents fund exhaustion"
            ],
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "docs": [
              "Estimated SOL cost for execution",
              "AUDIT: Used for gas cost estimation",
              "SECURITY: Ensures sufficient gas coverage"
            ],
            "type": "u64"
          },
          {
            "name": "executedAt",
            "docs": [
              "Execution timestamp (0 if not executed)",
              "AUDIT: Prevents double execution",
              "SECURITY: Ensures idempotency"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Cache creation timestamp",
              "AUDIT: Used for expiration validation",
              "SECURITY: Prevents stale data execution"
            ],
            "type": "i64"
          },
          {
            "name": "entries",
            "docs": [
              "List of refund share entries for this batch",
              "AUDIT: Up to 30 entries per batch",
              "SECURITY: Limits batch size for efficiency"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "refundEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "refundShareEstimated",
      "docs": [
        "Event emitted when refund share is estimated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks refund distribution calculations",
        "- Includes all signers for multisig accountability",
        "- Records estimated amounts and gas costs",
        "- Provides audit trail for refund calculations",
        "- Enables monitoring of refund estimation",
        "",
        "SECURITY:",
        "- Records refund calculation details",
        "- Records all multisig signers",
        "- Tracks estimated amounts and costs",
        "- Enables calculation verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Each batch_id handles up to 30 investment records",
              "AUDIT: Links to specific batch of records",
              "SECURITY: Enables batch tracking"
            ],
            "type": "u16"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "yearIndex",
            "docs": [
              "Year index for this refund (0-9)",
              "AUDIT: Specific year for refund calculation",
              "SECURITY: Records refund timing"
            ],
            "type": "u8"
          },
          {
            "name": "subtotalRefundHcoin",
            "docs": [
              "Total H2COIN amount to be distributed",
              "AUDIT: Total refund amount for transparency",
              "SECURITY: Records total distribution amount"
            ],
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "docs": [
              "Estimated SOL cost for execution",
              "AUDIT: Gas cost estimation for transparency",
              "SECURITY: Records estimated transaction costs"
            ],
            "type": "u64"
          },
          {
            "name": "createdBy",
            "docs": [
              "The estimator of this refund share",
              "AUDIT: Accountable party for estimation",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Estimation time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "entryCount",
            "docs": [
              "Number of entries in this batch",
              "AUDIT: Batch size for transparency",
              "SECURITY: Records batch complexity"
            ],
            "type": "u16"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "refundShareExecuted",
      "docs": [
        "Event emitted when refund share is executed",
        "",
        "AUDIT CRITICAL:",
        "- Tracks actual refund distribution execution",
        "- Includes all signers for multisig accountability",
        "- Records actual transfer amounts",
        "- Provides audit trail for refund execution",
        "- Enables monitoring of refund distributions",
        "",
        "SECURITY:",
        "- Records actual distribution execution",
        "- Records all multisig signers",
        "- Tracks actual transfer amounts",
        "- Enables execution verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Batch identifier for this execution",
              "AUDIT: Links to specific batch of records",
              "SECURITY: Enables batch tracking"
            ],
            "type": "u16"
          },
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "yearIndex",
            "docs": [
              "Year index for this refund (0-9)",
              "AUDIT: Specific year for refund calculation",
              "SECURITY: Records refund timing"
            ],
            "type": "u8"
          },
          {
            "name": "totalTransferHcoin",
            "docs": [
              "Total H2COIN amount actually transferred",
              "AUDIT: Actual distribution amount for transparency",
              "SECURITY: Records actual transfer amount"
            ],
            "type": "u64"
          },
          {
            "name": "executedBy",
            "docs": [
              "The executor of this refund share",
              "AUDIT: Accountable party for execution",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Execution time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "vaultDepositSolEvent",
      "docs": [
        "Event emitted when SOL is deposited to vault",
        "",
        "AUDIT CRITICAL:",
        "- Tracks SOL deposits to vault",
        "- Records depositor for accountability",
        "- Provides audit trail for fund inflows",
        "- Enables monitoring of vault funding",
        "",
        "SECURITY:",
        "- Records fund inflows",
        "- Records depositor identity",
        "- Tracks deposit amounts",
        "- Enables fund flow verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "from",
            "docs": [
              "Depositor wallet address",
              "AUDIT: Source of the deposit",
              "SECURITY: Records fund source"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountUsdt",
            "docs": [
              "SOL amount deposited (in lamports)",
              "AUDIT: Deposit amount for transparency",
              "SECURITY: Records deposit value"
            ],
            "type": "u64"
          },
          {
            "name": "depositAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Deposit time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultDepositTokenEvent",
      "docs": [
        "Event emitted when tokens are deposited to vault",
        "",
        "AUDIT CRITICAL:",
        "- Tracks token deposits to vault",
        "- Records depositor and token type",
        "- Provides audit trail for token inflows",
        "- Enables monitoring of token funding",
        "",
        "SECURITY:",
        "- Records token inflows",
        "- Records depositor identity",
        "- Tracks token types and amounts",
        "- Enables token flow verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "from",
            "docs": [
              "Depositor wallet address",
              "AUDIT: Source of the deposit",
              "SECURITY: Records fund source"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Token mint address",
              "AUDIT: Type of token deposited",
              "SECURITY: Records token type"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Token amount deposited",
              "AUDIT: Deposit amount for transparency",
              "SECURITY: Records deposit value"
            ],
            "type": "u64"
          },
          {
            "name": "depositAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Deposit time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultTransferred",
      "docs": [
        "Event emitted when funds are withdrawn from vault",
        "",
        "AUDIT CRITICAL:",
        "- Tracks vault withdrawals",
        "- Includes all signers for multisig accountability",
        "- Records all token types and amounts",
        "- Provides audit trail for fund outflows",
        "- Enables monitoring of vault withdrawals",
        "",
        "SECURITY:",
        "- Records fund outflows",
        "- Records all multisig signers",
        "- Tracks all token types and amounts",
        "- Enables withdrawal verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "recipient",
            "docs": [
              "Recipient wallet address",
              "AUDIT: Destination of the withdrawal",
              "SECURITY: Records fund destination"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdtAmount",
            "docs": [
              "USDT amount withdrawn",
              "AUDIT: USDT withdrawal amount for transparency",
              "SECURITY: Records USDT outflow"
            ],
            "type": "u64"
          },
          {
            "name": "hcoinAmount",
            "docs": [
              "H2COIN amount withdrawn",
              "AUDIT: H2COIN withdrawal amount for transparency",
              "SECURITY: Records H2COIN outflow"
            ],
            "type": "u64"
          },
          {
            "name": "solAmount",
            "docs": [
              "SOL amount withdrawn",
              "AUDIT: SOL withdrawal amount for transparency",
              "SECURITY: Records SOL outflow"
            ],
            "type": "u64"
          },
          {
            "name": "executedBy",
            "docs": [
              "The executor of this withdrawal",
              "AUDIT: Accountable party for withdrawal",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Withdrawal time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "whitelistUpdated",
      "docs": [
        "Event emitted when whitelist members are updated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks whitelist membership changes",
        "- Includes all signers for multisig accountability",
        "- Records specific wallet changes",
        "- Provides audit trail for access control changes",
        "- Enables monitoring of authorization changes",
        "",
        "SECURITY:",
        "- Records access control modifications",
        "- Records all multisig signers",
        "- Tracks specific wallet changes",
        "- Enables authorization verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "wallet",
            "docs": [
              "Updated wallet address",
              "AUDIT: Specific wallet that was changed",
              "SECURITY: Records specific authorization change"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "docs": [
              "The updater of this whitelist",
              "AUDIT: Accountable party for the change",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Update time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "withdrawWhitelistUpdated",
      "docs": [
        "Event emitted when withdraw whitelist is updated",
        "",
        "AUDIT CRITICAL:",
        "- Tracks withdraw authorization changes",
        "- Includes all signers for multisig accountability",
        "- Records complete whitelist update",
        "- Provides audit trail for withdrawal access",
        "- Enables monitoring of withdrawal authorization",
        "",
        "SECURITY:",
        "- Records withdrawal authorization changes",
        "- Records all multisig signers",
        "- Tracks complete whitelist state",
        "- Enables authorization verification"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investmentId",
            "docs": [
              "Investment ID (fixed-length string)",
              "AUDIT: Unique identifier for the investment",
              "SECURITY: Enables tracking of specific investments"
            ],
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Git commit version",
              "AUDIT: Links to specific code version",
              "SECURITY: Enables code audit trail"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "wallets",
            "docs": [
              "Updated wallet addresses",
              "AUDIT: Complete new whitelist",
              "SECURITY: Records complete authorization state"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "updatedBy",
            "docs": [
              "The updater of this whitelist",
              "AUDIT: Accountable party for the change",
              "SECURITY: Records responsible party"
            ],
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "docs": [
              "UNIX timestamp",
              "AUDIT: Update time for audit trail",
              "SECURITY: Provides temporal context"
            ],
            "type": "i64"
          },
          {
            "name": "signers",
            "docs": [
              "All signers involved in the multisig operation",
              "AUDIT: Complete signer list for accountability",
              "SECURITY: Records all authorized parties"
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
