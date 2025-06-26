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
  "instructions": [
    {
      "name": "addInvestmentRecord",
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
          "name": "usdtMint"
        },
        {
          "name": "hcoinMint"
        },
        {
          "name": "recipientAccount"
        },
        {
          "name": "recipientUsdtAccount",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "deactivateInvestmentInfo",
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
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "depositSolToVault",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
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
          "name": "mint"
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "vault",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
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
          "name": "mint"
        },
        {
          "name": "vault",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "name": "mint"
        },
        {
          "name": "vault",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "name": "usdtMint"
        },
        {
          "name": "hcoinMint"
        },
        {
          "name": "vault",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "patchUpdateWhitelist",
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
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "patchWithdrawWhitelist",
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
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "revokedInvestmentRecord",
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
          "name": "usdtMint"
        },
        {
          "name": "hcoinMint"
        },
        {
          "name": "recipientAccount"
        },
        {
          "name": "recipientUsdtAccount",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
          "name": "usdtMint"
        },
        {
          "name": "hcoinMint"
        },
        {
          "name": "vault",
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
          "writable": true
        },
        {
          "name": "recipientUsdtAccount",
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
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
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
      "type": {
        "kind": "struct",
        "fields": [
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
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "investmentState"
              }
            }
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentInfoCompleted",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentInfoDeactivated",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "deactivatedBy",
            "type": "pubkey"
          },
          {
            "name": "deactivatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentInfoInitialized",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentRecord",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "wallet",
            "type": "pubkey"
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
            "name": "stage",
            "type": "u8"
          },
          {
            "name": "revokedAt",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "investmentRecordAdded",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "addedBy",
            "type": "pubkey"
          },
          {
            "name": "addedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentRecordRevoked",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "recordId",
            "type": "u64"
          },
          {
            "name": "revokedBy",
            "type": "pubkey"
          },
          {
            "name": "revokedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentRecordWalletUpdated",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "accountId",
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "newWallet",
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "investmentState",
      "repr": {
        "kind": "rust"
      },
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
      "type": {
        "kind": "struct",
        "fields": [
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
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "profitEntry",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "amountUsdt",
            "type": "u64"
          },
          {
            "name": "ratioBp",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "profitShareCache",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
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
            "name": "subtotalProfitUsdt",
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "type": "u64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "entries",
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
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
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
            "name": "subtotalProfitUsdt",
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "type": "u64"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "entryCount",
            "type": "u16"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "profitShareExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
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
            "name": "totalTransferUsdt",
            "type": "u64"
          },
          {
            "name": "executedBy",
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "refundEntry",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "amountHcoin",
            "type": "u64"
          },
          {
            "name": "stage",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "refundShareCache",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
          {
            "name": "yearIndex",
            "type": "u8"
          },
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
            "name": "subtotalRefundHcoin",
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "type": "u64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "entries",
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
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
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
            "name": "yearIndex",
            "type": "u8"
          },
          {
            "name": "subtotalRefundHcoin",
            "type": "u64"
          },
          {
            "name": "subtotalEstimateSol",
            "type": "u64"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "entryCount",
            "type": "u16"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "refundShareExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u16"
          },
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
            "name": "yearIndex",
            "type": "u8"
          },
          {
            "name": "totalTransferHcoin",
            "type": "u64"
          },
          {
            "name": "executedBy",
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "vaultDepositSolEvent",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "amountUsdt",
            "type": "u64"
          },
          {
            "name": "depositAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultDepositTokenEvent",
      "docs": [
        "Event emitted after a successful token deposit into the vault"
      ],
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "depositAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultTransferred",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "usdtAmount",
            "type": "u64"
          },
          {
            "name": "hcoinAmount",
            "type": "u64"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "executedBy",
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "whitelistUpdated",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "withdrawWhitelistUpdated",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "wallets",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "signers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
