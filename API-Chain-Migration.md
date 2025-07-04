# API-Chain Migration Note
This migration introduces structural changes to support tracking of Solana Address Lookup Tables (ALT) and enhance linkage with investment records.

## Following attributes are required to stored in off line database

### New column on table `- investment`

| Columns   | type     | Description |
| --------- | -------- | ----------- |
| verion    | VARCHAR(4) | match state > InvestmentInfo > verion |

### PostgreSQL DDL `- investment`
Insert a new column
```sql
ALTER TABLE investment_record
ADD COLUMN "version" VARCHAR(4);
```
Add a new index
```sql
CREATE INDEX idx_investment_version ON investment ("id", "version");
```
---

### New column on table `- investment_record`

| Columns   | type     | Description |
| --------- | -------- | ----------- |
| batchId   | SMALLINT | match state > InvestmentRecord > batchId |
| verion    | VARCHAR(4) | match state > InvestmentRecord > verion |

### PostgreSQL DDL `- investment_record`
Insert a new column
```sql
ALTER TABLE investment_record
ADD COLUMN "batchId" VARCHAR(4);


ALTER TABLE investment_record
ADD COLUMN "version" VARCHAR(4);
```
Add a new index
```
CREATE INDEX idx_investment_record_batchId ON investment_record ("investmentId", "version", "batchId");
```
---
### New table `- address_lookup_tables`

| Column           | Type         | Description                                                        |
| ---------------- | ------------ | ------------------------------------------------------------------ |
| `lookup_table`   | VARCHAR(44) | Address Lookup Table public key (PDA), used as the primary key     |
| `authority`      | VARCHAR(44) | The authority that can modify or close the ALT                     |
| `payer`          | VARCHAR(44) | Account that paid for ALT creation                                 |
| `recent_slot`    | BIGINT       | Slot used as a seed when creating the ALT (used in PDA derivation) |
| `investment_id`  | VARCHAR(15)  | Matches state > InvestmentInfo > `investment_id` (optional)        |
| `version`        | VARCHAR(4)   | Matches state > InvestmentInfo > `version` (optional)              |
| `batch_id`       | INTEGER      | Matches state > InvestmentRecord > `batch_id` (optional)           |
| `alt_type`       | TEXT         | Type of ALT usage: `'record'`, `'profit'`, or `'refund'`           |
| `created_at`     | BIGINT       | Timestamp when the ALT was created (in seconds since epoch)        |
| `extended_at`    | BIGINT       | Timestamp of the last extension (default: `0` if never)            |
| `deactivated_at` | BIGINT       | Timestamp when the ALT was deactivated (default: `0` if not yet)   |
| `closed_at`      | BIGINT       | Timestamp when the ALT was closed (default: `0` if not yet)        |


###  ALT Usage Mapping
| **Instruction**         | **ALT Type (`alt_type`)** |
| ----------------------- | ------------------------- |
| `estimate_profit_share` | `'record'`                |
| `estimate_refund_share` | `'record'`                |
| `execute_profit_share`  | `'profit'`                |
| `execute_refund_share`  | `'refund'`                |


### PostgreSQL DDL `- address_lookup_tables`
```sql
CREATE TABLE address_lookup_tables (
    lookup_table     VARCHAR(44) PRIMARY KEY,
    authority        VARCHAR(44) NOT NULL,
    payer            VARCHAR(44) NOT NULL,
    recent_slot      BIGINT NOT NULL,
    investment_id    VARCHAR(15),
    version          VARCHAR(4),
    batch_id         INTEGER,
    alt_type         TEXT CHECK (alt_type IN ('record', 'profit', 'refund')) NOT NULL,
    created_at       BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()))::BIGINT,
    extended_at      BIGINT DEFAULT 0,
    deactivated_at   BIGINT DEFAULT 0,
    closed_at        BIGINT DEFAULT 0,
    UNIQUE (investment_id, version, batch_id, alt_type)
);

CREATE INDEX idx_lookup_by_inv_batch ON address_lookup_tables (investment_id, version, batch_id);

```