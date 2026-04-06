-- ============================================================
-- Xray Test Metrics Reporting — SQL Server Schema
-- Star Schema: Dimensions + Facts + Relationships + Indexes
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'XrayTestMetrics')
    CREATE DATABASE XrayTestMetrics;
GO

USE XrayTestMetrics;
GO

-- ============================================================
-- SECTION 1: DROP FOREIGN KEYS (safe re-run)
-- ============================================================
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))
             + '.' + QUOTENAME(OBJECT_NAME(parent_object_id))
             + ' DROP CONSTRAINT ' + QUOTENAME(name) + '; '
FROM sys.foreign_keys;
EXEC sp_executesql @sql;
GO

-- ============================================================
-- SECTION 2: DROP TABLES (safe re-run — facts first)
-- ============================================================
IF OBJECT_ID('dbo.FactCycleSnapshot',       'U') IS NOT NULL DROP TABLE dbo.FactCycleSnapshot;
IF OBJECT_ID('dbo.FactDefectLink',           'U') IS NOT NULL DROP TABLE dbo.FactDefectLink;
IF OBJECT_ID('dbo.FactRequirementCoverage',  'U') IS NOT NULL DROP TABLE dbo.FactRequirementCoverage;
IF OBJECT_ID('dbo.FactTestRun',              'U') IS NOT NULL DROP TABLE dbo.FactTestRun;
IF OBJECT_ID('dbo.DimDate',                  'U') IS NOT NULL DROP TABLE dbo.DimDate;
IF OBJECT_ID('dbo.DimProgram',               'U') IS NOT NULL DROP TABLE dbo.DimProgram;
IF OBJECT_ID('dbo.DimApplication',           'U') IS NOT NULL DROP TABLE dbo.DimApplication;
IF OBJECT_ID('dbo.DimSquad',                 'U') IS NOT NULL DROP TABLE dbo.DimSquad;
IF OBJECT_ID('dbo.DimRelease',               'U') IS NOT NULL DROP TABLE dbo.DimRelease;
IF OBJECT_ID('dbo.DimEnvironment',           'U') IS NOT NULL DROP TABLE dbo.DimEnvironment;
IF OBJECT_ID('dbo.DimTester',                'U') IS NOT NULL DROP TABLE dbo.DimTester;
IF OBJECT_ID('dbo.DimRequirement',           'U') IS NOT NULL DROP TABLE dbo.DimRequirement;
IF OBJECT_ID('dbo.DimTest',                  'U') IS NOT NULL DROP TABLE dbo.DimTest;
IF OBJECT_ID('dbo.DimDefect',                'U') IS NOT NULL DROP TABLE dbo.DimDefect;
IF OBJECT_ID('dbo.DimStatus',                'U') IS NOT NULL DROP TABLE dbo.DimStatus;
IF OBJECT_ID('dbo.DimRootCause',             'U') IS NOT NULL DROP TABLE dbo.DimRootCause;
GO

-- ============================================================
-- SECTION 3: DIMENSION TABLES
-- ============================================================

-- ------------------------------------------------------------
-- DimDate
-- ------------------------------------------------------------
CREATE TABLE dbo.DimDate (
    DateKey         INT          NOT NULL,   -- YYYYMMDD surrogate key
    FullDate        DATE         NOT NULL,
    DayOfMonth      TINYINT      NOT NULL,
    DayOfWeek       TINYINT      NOT NULL,   -- 1=Mon … 7=Sun
    DayName         VARCHAR(10)  NOT NULL,
    WeekOfYear      TINYINT      NOT NULL,
    Month           TINYINT      NOT NULL,
    MonthName       VARCHAR(10)  NOT NULL,
    Quarter         TINYINT      NOT NULL,
    Year            SMALLINT     NOT NULL,
    FinancialYear   CHAR(6)      NOT NULL,   -- e.g. FY2024
    Sprint          VARCHAR(20)  NULL,
    IsWeekend       BIT          NOT NULL DEFAULT 0,
    IsPublicHoliday BIT          NOT NULL DEFAULT 0,
    CONSTRAINT PK_DimDate PRIMARY KEY CLUSTERED (DateKey)
);
GO

-- ------------------------------------------------------------
-- DimProgram
-- ------------------------------------------------------------
CREATE TABLE dbo.DimProgram (
    ProgramKey      INT           NOT NULL IDENTITY(1,1),
    ProgramID       VARCHAR(20)   NOT NULL,
    ProgramName     VARCHAR(100)  NOT NULL,
    PortfolioName   VARCHAR(100)  NOT NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimProgram PRIMARY KEY CLUSTERED (ProgramKey),
    CONSTRAINT UQ_DimProgram_ProgramID UNIQUE (ProgramID)
);
GO

-- ------------------------------------------------------------
-- DimApplication
-- ------------------------------------------------------------
CREATE TABLE dbo.DimApplication (
    ApplicationKey  INT           NOT NULL IDENTITY(1,1),
    ApplicationID   VARCHAR(20)   NOT NULL,
    ApplicationName VARCHAR(100)  NOT NULL,
    ProgramKey      INT           NOT NULL,
    Platform        VARCHAR(50)   NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimApplication PRIMARY KEY CLUSTERED (ApplicationKey),
    CONSTRAINT UQ_DimApplication_ApplicationID UNIQUE (ApplicationID)
);
GO

-- ------------------------------------------------------------
-- DimSquad
-- ------------------------------------------------------------
CREATE TABLE dbo.DimSquad (
    SquadKey        INT           NOT NULL IDENTITY(1,1),
    SquadID         VARCHAR(20)   NOT NULL,
    SquadName       VARCHAR(100)  NOT NULL,
    ApplicationKey  INT           NOT NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimSquad PRIMARY KEY CLUSTERED (SquadKey),
    CONSTRAINT UQ_DimSquad_SquadID UNIQUE (SquadID)
);
GO

-- ------------------------------------------------------------
-- DimRelease
-- ------------------------------------------------------------
CREATE TABLE dbo.DimRelease (
    ReleaseKey          INT           NOT NULL IDENTITY(1,1),
    ReleaseID           VARCHAR(20)   NOT NULL,
    ReleaseName         VARCHAR(100)  NOT NULL,
    ReleaseTrain        VARCHAR(50)   NULL,
    PlannedStartDate    DATE          NULL,
    PlannedEndDate      DATE          NULL,
    GoLiveDate          DATE          NULL,
    ActualGoLiveDate    DATE          NULL,
    ReleaseStatus       VARCHAR(30)   NOT NULL
                            CONSTRAINT CHK_DimRelease_Status
                            CHECK (ReleaseStatus IN (
                                'Planning','In Progress','Released',
                                'On Hold','Cancelled')),
    ProgramKey          INT           NULL,
    IsActive            BIT           NOT NULL DEFAULT 1,
    CreatedDate         DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimRelease PRIMARY KEY CLUSTERED (ReleaseKey),
    CONSTRAINT UQ_DimRelease_ReleaseID UNIQUE (ReleaseID)
);
GO

-- ------------------------------------------------------------
-- DimEnvironment
-- ------------------------------------------------------------
CREATE TABLE dbo.DimEnvironment (
    EnvironmentKey  INT           NOT NULL IDENTITY(1,1),
    EnvironmentID   VARCHAR(20)   NOT NULL,
    EnvironmentName VARCHAR(100)  NOT NULL,
    EnvironmentType VARCHAR(50)   NOT NULL
                        CONSTRAINT CHK_DimEnv_Type
                        CHECK (EnvironmentType IN (
                            'Development','Integration','Acceptance',
                            'Production','Performance','Sandbox')),
    Platform        VARCHAR(50)   NULL,
    Criticality     VARCHAR(10)   NOT NULL
                        CONSTRAINT CHK_DimEnv_Crit
                        CHECK (Criticality IN ('High','Medium','Low')),
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimEnvironment PRIMARY KEY CLUSTERED (EnvironmentKey),
    CONSTRAINT UQ_DimEnvironment_EnvironmentID UNIQUE (EnvironmentID)
);
GO

-- ------------------------------------------------------------
-- DimTester
-- ------------------------------------------------------------
CREATE TABLE dbo.DimTester (
    TesterKey       INT           NOT NULL IDENTITY(1,1),
    TesterID        VARCHAR(50)   NOT NULL,
    TesterName      VARCHAR(100)  NOT NULL,
    Email           VARCHAR(150)  NULL,
    TeamName        VARCHAR(100)  NULL,
    ManagerName     VARCHAR(100)  NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimTester PRIMARY KEY CLUSTERED (TesterKey),
    CONSTRAINT UQ_DimTester_TesterID UNIQUE (TesterID)
);
GO

-- ------------------------------------------------------------
-- DimRequirement
-- ------------------------------------------------------------
CREATE TABLE dbo.DimRequirement (
    RequirementKey  INT           NOT NULL IDENTITY(1,1),
    RequirementID   VARCHAR(30)   NOT NULL,
    RequirementName VARCHAR(300)  NOT NULL,
    Priority        VARCHAR(20)   NOT NULL
                        CONSTRAINT CHK_DimReq_Priority
                        CHECK (Priority IN ('Critical','High','Medium','Low')),
    BusinessArea    VARCHAR(100)  NULL,
    CriticalFlag    BIT           NOT NULL DEFAULT 0,
    ApplicationKey  INT           NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimRequirement PRIMARY KEY CLUSTERED (RequirementKey),
    CONSTRAINT UQ_DimRequirement_RequirementID UNIQUE (RequirementID)
);
GO

-- ------------------------------------------------------------
-- DimTest
-- ------------------------------------------------------------
CREATE TABLE dbo.DimTest (
    TestKey         INT           NOT NULL IDENTITY(1,1),
    TestID          VARCHAR(30)   NOT NULL,
    TestName        VARCHAR(300)  NOT NULL,
    TestType        VARCHAR(50)   NOT NULL
                        CONSTRAINT CHK_DimTest_Type
                        CHECK (TestType IN (
                            'Functional','Regression','Smoke',
                            'Performance','Integration','Security',
                            'UAT','Exploratory')),
    AutomationFlag  BIT           NOT NULL DEFAULT 0,
    Component       VARCHAR(100)  NULL,
    ApplicationKey  INT           NULL,
    Priority        VARCHAR(20)   NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimTest PRIMARY KEY CLUSTERED (TestKey),
    CONSTRAINT UQ_DimTest_TestID UNIQUE (TestID)
);
GO

-- ------------------------------------------------------------
-- DimDefect
-- ------------------------------------------------------------
CREATE TABLE dbo.DimDefect (
    DefectKey       INT           NOT NULL IDENTITY(1,1),
    DefectID        VARCHAR(30)   NOT NULL,
    DefectSummary   VARCHAR(500)  NULL,
    Severity        VARCHAR(20)   NOT NULL
                        CONSTRAINT CHK_DimDefect_Sev
                        CHECK (Severity IN (
                            'Critical','Sev1','High','Sev2',
                            'Medium','Sev3','Low','Sev4')),
    Status          VARCHAR(30)   NOT NULL
                        CONSTRAINT CHK_DimDefect_Status
                        CHECK (Status IN (
                            'Open','In Progress','Resolved',
                            'Closed','Reopened','Deferred')),
    AssignedTeam    VARCHAR(100)  NULL,
    LeakageFlag     BIT           NOT NULL DEFAULT 0,
    ApplicationKey  INT           NULL,
    ReleaseFoundKey INT           NULL,
    CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DimDefect PRIMARY KEY CLUSTERED (DefectKey),
    CONSTRAINT UQ_DimDefect_DefectID UNIQUE (DefectID)
);
GO

-- ------------------------------------------------------------
-- DimStatus
-- ------------------------------------------------------------
CREATE TABLE dbo.DimStatus (
    StatusKey       INT           NOT NULL IDENTITY(1,1),
    StatusName      VARCHAR(30)   NOT NULL,
    StatusCategory  VARCHAR(20)   NOT NULL
                        CONSTRAINT CHK_DimStatus_Cat
                        CHECK (StatusCategory IN (
                            'Pass','Fail','Blocked',
                            'Active','Pending','Skipped')),
    SortOrder       TINYINT       NULL,
    CONSTRAINT PK_DimStatus PRIMARY KEY CLUSTERED (StatusKey),
    CONSTRAINT UQ_DimStatus_Name UNIQUE (StatusName)
);
GO

-- ------------------------------------------------------------
-- DimRootCause
-- ------------------------------------------------------------
CREATE TABLE dbo.DimRootCause (
    RootCauseKey        INT           NOT NULL IDENTITY(1,1),
    RootCauseName       VARCHAR(100)  NOT NULL,
    RootCauseCategory   VARCHAR(50)   NOT NULL
                            CONSTRAINT CHK_DimRC_Cat
                            CHECK (RootCauseCategory IN (
                                'App','Infra','Data','Config',
                                'Network','Process','N/A')),
    CONSTRAINT PK_DimRootCause PRIMARY KEY CLUSTERED (RootCauseKey),
    CONSTRAINT UQ_DimRootCause_Name UNIQUE (RootCauseName)
);
GO

-- ============================================================
-- SECTION 4: FACT TABLES
-- ============================================================

-- ------------------------------------------------------------
-- FactTestRun  (core execution grain)
-- ------------------------------------------------------------
CREATE TABLE dbo.FactTestRun (
    TestRunKey          BIGINT        NOT NULL IDENTITY(1,1),
    TestKey             INT           NOT NULL,
    RequirementKey      INT           NULL,
    ReleaseKey          INT           NOT NULL,
    EnvironmentKey      INT           NOT NULL,
    TesterKey           INT           NOT NULL,
    StatusKey           INT           NOT NULL,
    RootCauseKey        INT           NOT NULL,
    ExecutionDateKey    INT           NOT NULL,
    ApplicationKey      INT           NULL,
    SquadKey            INT           NULL,
    ExecutionID         VARCHAR(50)   NOT NULL,
    RunSequence         TINYINT       NOT NULL DEFAULT 1,
    IsAutomated         BIT           NOT NULL DEFAULT 0,
    DurationMinutes     DECIMAL(8,2)  NULL,
    IsBlocked           BIT           NOT NULL DEFAULT 0,
    BlockReason         VARCHAR(300)  NULL,
    LinkedDefectCount   SMALLINT      NOT NULL DEFAULT 0,
    ExecutionSource     VARCHAR(30)   NULL
                            CONSTRAINT CHK_FTR_ExecSource
                            CHECK (ExecutionSource IN (
                                'Manual','CI/CD','Scheduled',NULL)),
    Comments            NVARCHAR(500) NULL,
    CreatedDate         DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_FactTestRun PRIMARY KEY CLUSTERED (TestRunKey),
    CONSTRAINT UQ_FactTestRun_ExecutionID UNIQUE (ExecutionID)
);
GO

-- ------------------------------------------------------------
-- FactRequirementCoverage
-- ------------------------------------------------------------
CREATE TABLE dbo.FactRequirementCoverage (
    RequirementCoverageKey  BIGINT    NOT NULL IDENTITY(1,1),
    RequirementKey          INT       NOT NULL,
    ReleaseKey              INT       NOT NULL,
    CoveredFlag             BIT       NOT NULL DEFAULT 0,
    PartialCoverageFlag     BIT       NOT NULL DEFAULT 0,
    FailedCoverageFlag      BIT       NOT NULL DEFAULT 0,
    LinkedTestCount         SMALLINT  NOT NULL DEFAULT 0,
    LatestExecutionDateKey  INT       NULL,
    CreatedDate             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ModifiedDate            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_FactRequirementCoverage
        PRIMARY KEY CLUSTERED (RequirementCoverageKey),
    CONSTRAINT UQ_FactReqCoverage_ReqRelease
        UNIQUE (RequirementKey, ReleaseKey)
);
GO

-- ------------------------------------------------------------
-- FactDefectLink
-- ------------------------------------------------------------
CREATE TABLE dbo.FactDefectLink (
    DefectLinkKey   BIGINT        NOT NULL IDENTITY(1,1),
    DefectKey       INT           NOT NULL,
    TestRunKey      BIGINT        NOT NULL,
    RequirementKey  INT           NULL,
    ReleaseKey      INT           NOT NULL,
    LinkType        VARCHAR(30)   NOT NULL
                        CONSTRAINT CHK_FDL_LinkType
                        CHECK (LinkType IN (
                            'Caused By','Blocks','Related','Duplicate')),
    OpenFlag        BIT           NOT NULL DEFAULT 1,
    LinkedDate      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_FactDefectLink PRIMARY KEY CLUSTERED (DefectLinkKey)
);
GO

-- ------------------------------------------------------------
-- FactCycleSnapshot  (nightly aggregated snapshot)
-- ------------------------------------------------------------
CREATE TABLE dbo.FactCycleSnapshot (
    SnapshotKey             BIGINT    NOT NULL IDENTITY(1,1),
    SnapshotDateKey         INT       NOT NULL,
    ProgramKey              INT       NOT NULL,
    ApplicationKey          INT       NOT NULL,
    ReleaseKey              INT       NOT NULL,
    EnvironmentKey          INT       NULL,
    TotalTests              INT       NOT NULL DEFAULT 0,
    ExecutedTests           INT       NOT NULL DEFAULT 0,
    PassedTests             INT       NOT NULL DEFAULT 0,
    FailedTests             INT       NOT NULL DEFAULT 0,
    BlockedTests            INT       NOT NULL DEFAULT 0,
    NotRunTests             INT       NOT NULL DEFAULT 0,
    AutomatedExecutions     INT       NOT NULL DEFAULT 0,
    ManualExecutions        INT       NOT NULL DEFAULT 0,
    CoveredRequirements     INT       NOT NULL DEFAULT 0,
    TotalRequirements       INT       NOT NULL DEFAULT 0,
    OpenCriticalDefects     INT       NOT NULL DEFAULT 0,
    TotalRerunCount         INT       NOT NULL DEFAULT 0,
    AvgDurationMinutes      DECIMAL(8,2) NULL,
    CreatedDate             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_FactCycleSnapshot PRIMARY KEY CLUSTERED (SnapshotKey),
    CONSTRAINT UQ_FactCycleSnapshot
        UNIQUE (SnapshotDateKey, ProgramKey, ApplicationKey, ReleaseKey)
);
GO

-- ============================================================
-- SECTION 5: FOREIGN KEY CONSTRAINTS
-- ============================================================

-- ── DimApplication → DimProgram ─────────────────────────────
ALTER TABLE dbo.DimApplication
    ADD CONSTRAINT FK_DimApplication_DimProgram
    FOREIGN KEY (ProgramKey) REFERENCES dbo.DimProgram (ProgramKey);

-- ── DimSquad → DimApplication ───────────────────────────────
ALTER TABLE dbo.DimSquad
    ADD CONSTRAINT FK_DimSquad_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

-- ── DimRelease → DimProgram ─────────────────────────────────
ALTER TABLE dbo.DimRelease
    ADD CONSTRAINT FK_DimRelease_DimProgram
    FOREIGN KEY (ProgramKey) REFERENCES dbo.DimProgram (ProgramKey);

-- ── DimRequirement → DimApplication ─────────────────────────
ALTER TABLE dbo.DimRequirement
    ADD CONSTRAINT FK_DimRequirement_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

-- ── DimTest → DimApplication ────────────────────────────────
ALTER TABLE dbo.DimTest
    ADD CONSTRAINT FK_DimTest_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

-- ── DimDefect → DimApplication ──────────────────────────────
ALTER TABLE dbo.DimDefect
    ADD CONSTRAINT FK_DimDefect_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

-- ── DimDefect → DimRelease (found in) ───────────────────────
ALTER TABLE dbo.DimDefect
    ADD CONSTRAINT FK_DimDefect_DimRelease
    FOREIGN KEY (ReleaseFoundKey) REFERENCES dbo.DimRelease (ReleaseKey);

-- ── FactTestRun → all dimensions ────────────────────────────
ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimTest
    FOREIGN KEY (TestKey) REFERENCES dbo.DimTest (TestKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimRequirement
    FOREIGN KEY (RequirementKey) REFERENCES dbo.DimRequirement (RequirementKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimRelease
    FOREIGN KEY (ReleaseKey) REFERENCES dbo.DimRelease (ReleaseKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimEnvironment
    FOREIGN KEY (EnvironmentKey) REFERENCES dbo.DimEnvironment (EnvironmentKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimTester
    FOREIGN KEY (TesterKey) REFERENCES dbo.DimTester (TesterKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimStatus
    FOREIGN KEY (StatusKey) REFERENCES dbo.DimStatus (StatusKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimRootCause
    FOREIGN KEY (RootCauseKey) REFERENCES dbo.DimRootCause (RootCauseKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimDate
    FOREIGN KEY (ExecutionDateKey) REFERENCES dbo.DimDate (DateKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

ALTER TABLE dbo.FactTestRun
    ADD CONSTRAINT FK_FactTestRun_DimSquad
    FOREIGN KEY (SquadKey) REFERENCES dbo.DimSquad (SquadKey);

-- ── FactRequirementCoverage → dimensions ─────────────────────
ALTER TABLE dbo.FactRequirementCoverage
    ADD CONSTRAINT FK_FactReqCov_DimRequirement
    FOREIGN KEY (RequirementKey) REFERENCES dbo.DimRequirement (RequirementKey);

ALTER TABLE dbo.FactRequirementCoverage
    ADD CONSTRAINT FK_FactReqCov_DimRelease
    FOREIGN KEY (ReleaseKey) REFERENCES dbo.DimRelease (ReleaseKey);

ALTER TABLE dbo.FactRequirementCoverage
    ADD CONSTRAINT FK_FactReqCov_DimDate
    FOREIGN KEY (LatestExecutionDateKey) REFERENCES dbo.DimDate (DateKey);

-- ── FactDefectLink → dimensions ──────────────────────────────
ALTER TABLE dbo.FactDefectLink
    ADD CONSTRAINT FK_FactDefectLink_DimDefect
    FOREIGN KEY (DefectKey) REFERENCES dbo.DimDefect (DefectKey);

ALTER TABLE dbo.FactDefectLink
    ADD CONSTRAINT FK_FactDefectLink_FactTestRun
    FOREIGN KEY (TestRunKey) REFERENCES dbo.FactTestRun (TestRunKey);

ALTER TABLE dbo.FactDefectLink
    ADD CONSTRAINT FK_FactDefectLink_DimRequirement
    FOREIGN KEY (RequirementKey) REFERENCES dbo.DimRequirement (RequirementKey);

ALTER TABLE dbo.FactDefectLink
    ADD CONSTRAINT FK_FactDefectLink_DimRelease
    FOREIGN KEY (ReleaseKey) REFERENCES dbo.DimRelease (ReleaseKey);

-- ── FactCycleSnapshot → dimensions ───────────────────────────
ALTER TABLE dbo.FactCycleSnapshot
    ADD CONSTRAINT FK_FactSnapshot_DimDate
    FOREIGN KEY (SnapshotDateKey) REFERENCES dbo.DimDate (DateKey);

ALTER TABLE dbo.FactCycleSnapshot
    ADD CONSTRAINT FK_FactSnapshot_DimProgram
    FOREIGN KEY (ProgramKey) REFERENCES dbo.DimProgram (ProgramKey);

ALTER TABLE dbo.FactCycleSnapshot
    ADD CONSTRAINT FK_FactSnapshot_DimApplication
    FOREIGN KEY (ApplicationKey) REFERENCES dbo.DimApplication (ApplicationKey);

ALTER TABLE dbo.FactCycleSnapshot
    ADD CONSTRAINT FK_FactSnapshot_DimRelease
    FOREIGN KEY (ReleaseKey) REFERENCES dbo.DimRelease (ReleaseKey);

ALTER TABLE dbo.FactCycleSnapshot
    ADD CONSTRAINT FK_FactSnapshot_DimEnvironment
    FOREIGN KEY (EnvironmentKey) REFERENCES dbo.DimEnvironment (EnvironmentKey);
GO

-- ============================================================
-- SECTION 6: INDEXES
-- ============================================================

-- ── DimDate ──────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimDate_FullDate
    ON dbo.DimDate (FullDate) INCLUDE (Year, Month, Quarter, Sprint);

CREATE NONCLUSTERED INDEX IX_DimDate_YearMonth
    ON dbo.DimDate (Year, Month);

-- ── DimApplication ───────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimApplication_ProgramKey
    ON dbo.DimApplication (ProgramKey) INCLUDE (ApplicationName);

-- ── DimSquad ─────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimSquad_ApplicationKey
    ON dbo.DimSquad (ApplicationKey) INCLUDE (SquadName);

-- ── DimRelease ───────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimRelease_Status
    ON dbo.DimRelease (ReleaseStatus) INCLUDE (ReleaseName, GoLiveDate);

CREATE NONCLUSTERED INDEX IX_DimRelease_GoLiveDate
    ON dbo.DimRelease (GoLiveDate);

-- ── DimRequirement ───────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimRequirement_CriticalFlag
    ON dbo.DimRequirement (CriticalFlag) INCLUDE (RequirementID, Priority);

CREATE NONCLUSTERED INDEX IX_DimRequirement_ApplicationKey
    ON dbo.DimRequirement (ApplicationKey);

-- ── DimTest ──────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimTest_AutomationFlag
    ON dbo.DimTest (AutomationFlag) INCLUDE (TestID, TestType);

CREATE NONCLUSTERED INDEX IX_DimTest_ApplicationKey
    ON dbo.DimTest (ApplicationKey) INCLUDE (TestName, TestType);

-- ── DimDefect ────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_DimDefect_Severity_Status
    ON dbo.DimDefect (Severity, Status) INCLUDE (DefectID, ApplicationKey);

-- ── FactTestRun ──────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_FactTestRun_ReleaseKey
    ON dbo.FactTestRun (ReleaseKey) INCLUDE (StatusKey, IsAutomated, DurationMinutes);

CREATE NONCLUSTERED INDEX IX_FactTestRun_ExecutionDateKey
    ON dbo.FactTestRun (ExecutionDateKey) INCLUDE (ReleaseKey, StatusKey);

CREATE NONCLUSTERED INDEX IX_FactTestRun_StatusKey
    ON dbo.FactTestRun (StatusKey) INCLUDE (ReleaseKey, EnvironmentKey);

CREATE NONCLUSTERED INDEX IX_FactTestRun_EnvironmentKey
    ON dbo.FactTestRun (EnvironmentKey) INCLUDE (StatusKey, RootCauseKey);

CREATE NONCLUSTERED INDEX IX_FactTestRun_TestKey
    ON dbo.FactTestRun (TestKey) INCLUDE (ReleaseKey, StatusKey, RunSequence);

CREATE NONCLUSTERED INDEX IX_FactTestRun_RequirementKey
    ON dbo.FactTestRun (RequirementKey) INCLUDE (ReleaseKey, StatusKey);

CREATE NONCLUSTERED INDEX IX_FactTestRun_ApplicationKey
    ON dbo.FactTestRun (ApplicationKey) INCLUDE (SquadKey, StatusKey);

CREATE NONCLUSTERED INDEX IX_FactTestRun_IsBlocked
    ON dbo.FactTestRun (IsBlocked) INCLUDE (ReleaseKey, EnvironmentKey);

-- ── FactRequirementCoverage ───────────────────────────────────
CREATE NONCLUSTERED INDEX IX_FactReqCov_ReleaseKey
    ON dbo.FactRequirementCoverage (ReleaseKey)
    INCLUDE (CoveredFlag, PartialCoverageFlag, FailedCoverageFlag);

CREATE NONCLUSTERED INDEX IX_FactReqCov_RequirementKey
    ON dbo.FactRequirementCoverage (RequirementKey)
    INCLUDE (ReleaseKey, CoveredFlag);

-- ── FactDefectLink ────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_FactDefectLink_DefectKey
    ON dbo.FactDefectLink (DefectKey) INCLUDE (ReleaseKey, OpenFlag);

CREATE NONCLUSTERED INDEX IX_FactDefectLink_TestRunKey
    ON dbo.FactDefectLink (TestRunKey) INCLUDE (DefectKey, LinkType);

CREATE NONCLUSTERED INDEX IX_FactDefectLink_ReleaseKey_Open
    ON dbo.FactDefectLink (ReleaseKey, OpenFlag) INCLUDE (DefectKey);

-- ── FactCycleSnapshot ─────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_FactSnapshot_SnapshotDateKey
    ON dbo.FactCycleSnapshot (SnapshotDateKey)
    INCLUDE (ProgramKey, ApplicationKey, ReleaseKey, PassedTests, FailedTests);

CREATE NONCLUSTERED INDEX IX_FactSnapshot_ReleaseKey
    ON dbo.FactCycleSnapshot (ReleaseKey)
    INCLUDE (SnapshotDateKey, PassedTests, FailedTests, OpenCriticalDefects);
GO

-- ============================================================
-- SECTION 7: SEED REFERENCE DATA
-- ============================================================

-- DimStatus
INSERT INTO dbo.DimStatus (StatusName, StatusCategory, SortOrder) VALUES
    ('PASSED',      'Pass',    1),
    ('FAILED',      'Fail',    2),
    ('BLOCKED',     'Blocked', 3),
    ('IN PROGRESS', 'Active',  4),
    ('NOT RUN',     'Pending', 5),
    ('SKIP',        'Skipped', 6);

-- DimRootCause
INSERT INTO dbo.DimRootCause (RootCauseName, RootCauseCategory) VALUES
    ('Environment Outage',     'Infra'),
    ('Environment Config',     'Infra'),
    ('Test Data Missing',      'Data'),
    ('Test Data Corrupt',      'Data'),
    ('Application Bug',        'App'),
    ('Application Config',     'Config'),
    ('Network Timeout',        'Network'),
    ('Build Failure',          'Process'),
    ('Not Applicable',         'N/A');
GO

-- ============================================================
-- SECTION 8: REPORTING VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- vw_TestRunDetail  — flat denormalised view for Power BI
-- ------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_TestRunDetail AS
SELECT
    ftr.TestRunKey,
    ftr.ExecutionID,
    ftr.RunSequence,
    ftr.IsAutomated,
    ftr.DurationMinutes,
    ftr.IsBlocked,
    ftr.BlockReason,
    ftr.LinkedDefectCount,
    ftr.ExecutionSource,
    dd.FullDate          AS ExecutionDate,
    dd.WeekOfYear,
    dd.Month,
    dd.Quarter,
    dd.Year,
    dd.FinancialYear,
    dd.Sprint,
    dt.TestID,
    dt.TestName,
    dt.TestType,
    dt.AutomationFlag,
    dt.Component,
    ds.StatusName,
    ds.StatusCategory,
    dr.ReleaseID,
    dr.ReleaseName,
    dr.ReleaseTrain,
    dr.GoLiveDate,
    dr.ReleaseStatus,
    de.EnvironmentName,
    de.EnvironmentType,
    de.Criticality       AS EnvironmentCriticality,
    dtt.TesterName,
    dtt.TeamName,
    dtt.ManagerName,
    drc.RootCauseName,
    drc.RootCauseCategory,
    dreq.RequirementID,
    dreq.RequirementName,
    dreq.Priority        AS RequirementPriority,
    dreq.CriticalFlag    AS RequirementCritical,
    da.ApplicationName,
    da.Platform,
    dp.ProgramName,
    dp.PortfolioName,
    sq.SquadName
FROM dbo.FactTestRun            ftr
JOIN dbo.DimDate                dd   ON ftr.ExecutionDateKey = dd.DateKey
JOIN dbo.DimTest                dt   ON ftr.TestKey          = dt.TestKey
JOIN dbo.DimStatus              ds   ON ftr.StatusKey        = ds.StatusKey
JOIN dbo.DimRelease             dr   ON ftr.ReleaseKey       = dr.ReleaseKey
JOIN dbo.DimEnvironment         de   ON ftr.EnvironmentKey   = de.EnvironmentKey
JOIN dbo.DimTester              dtt  ON ftr.TesterKey        = dtt.TesterKey
JOIN dbo.DimRootCause           drc  ON ftr.RootCauseKey     = drc.RootCauseKey
LEFT JOIN dbo.DimRequirement    dreq ON ftr.RequirementKey   = dreq.RequirementKey
LEFT JOIN dbo.DimApplication    da   ON ftr.ApplicationKey   = da.ApplicationKey
LEFT JOIN dbo.DimProgram        dp   ON da.ProgramKey        = dp.ProgramKey
LEFT JOIN dbo.DimSquad          sq   ON ftr.SquadKey         = sq.SquadKey;
GO

-- ------------------------------------------------------------
-- vw_RequirementCoverage
-- ------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_RequirementCoverage AS
SELECT
    frc.RequirementCoverageKey,
    frc.CoveredFlag,
    frc.PartialCoverageFlag,
    frc.FailedCoverageFlag,
    frc.LinkedTestCount,
    dreq.RequirementID,
    dreq.RequirementName,
    dreq.Priority,
    dreq.CriticalFlag,
    dreq.BusinessArea,
    dr.ReleaseName,
    dr.ReleaseStatus,
    da.ApplicationName,
    dp.ProgramName,
    dd.FullDate          AS LatestExecutionDate
FROM dbo.FactRequirementCoverage    frc
JOIN dbo.DimRequirement             dreq ON frc.RequirementKey        = dreq.RequirementKey
JOIN dbo.DimRelease                 dr   ON frc.ReleaseKey            = dr.ReleaseKey
LEFT JOIN dbo.DimDate               dd   ON frc.LatestExecutionDateKey= dd.DateKey
LEFT JOIN dbo.DimApplication        da   ON dreq.ApplicationKey       = da.ApplicationKey
LEFT JOIN dbo.DimProgram            dp   ON da.ProgramKey             = dp.ProgramKey;
GO

-- ------------------------------------------------------------
-- vw_DefectTraceability
-- ------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_DefectTraceability AS
SELECT
    fdl.DefectLinkKey,
    fdl.LinkType,
    fdl.OpenFlag,
    fdl.LinkedDate,
    ddef.DefectID,
    ddef.DefectSummary,
    ddef.Severity,
    ddef.Status          AS DefectStatus,
    ddef.LeakageFlag,
    dr.ReleaseName,
    dreq.RequirementID,
    dreq.RequirementName,
    dreq.CriticalFlag,
    ftr.ExecutionID,
    ds.StatusName        AS TestRunStatus,
    dt.TestID,
    dt.TestName,
    da.ApplicationName,
    dp.ProgramName
FROM dbo.FactDefectLink             fdl
JOIN dbo.DimDefect                  ddef ON fdl.DefectKey       = ddef.DefectKey
JOIN dbo.FactTestRun                ftr  ON fdl.TestRunKey      = ftr.TestRunKey
JOIN dbo.DimRelease                 dr   ON fdl.ReleaseKey      = dr.ReleaseKey
JOIN dbo.DimTest                    dt   ON ftr.TestKey         = dt.TestKey
JOIN dbo.DimStatus                  ds   ON ftr.StatusKey       = ds.StatusKey
LEFT JOIN dbo.DimRequirement        dreq ON fdl.RequirementKey  = dreq.RequirementKey
LEFT JOIN dbo.DimApplication        da   ON ddef.ApplicationKey = da.ApplicationKey
LEFT JOIN dbo.DimProgram            dp   ON da.ProgramKey       = dp.ProgramKey;
GO

-- ------------------------------------------------------------
-- vw_ReleaseSnapshot  — executive summary by release + date
-- ------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_ReleaseSnapshot AS
SELECT
    fcs.SnapshotKey,
    dd.FullDate                                         AS SnapshotDate,
    dd.Year,
    dd.Month,
    dd.Sprint,
    dr.ReleaseName,
    dr.ReleaseStatus,
    dr.GoLiveDate,
    dp.ProgramName,
    da.ApplicationName,
    fcs.TotalTests,
    fcs.ExecutedTests,
    fcs.PassedTests,
    fcs.FailedTests,
    fcs.BlockedTests,
    fcs.NotRunTests,
    fcs.AutomatedExecutions,
    fcs.CoveredRequirements,
    fcs.TotalRequirements,
    fcs.OpenCriticalDefects,
    fcs.TotalRerunCount,
    fcs.AvgDurationMinutes,
    CASE WHEN fcs.ExecutedTests > 0
         THEN CAST(fcs.PassedTests  AS FLOAT) / fcs.ExecutedTests
         ELSE 0 END                                     AS PassRate,
    CASE WHEN fcs.ExecutedTests > 0
         THEN CAST(fcs.FailedTests  AS FLOAT) / fcs.ExecutedTests
         ELSE 0 END                                     AS FailRate,
    CASE WHEN fcs.ExecutedTests > 0
         THEN CAST(fcs.BlockedTests AS FLOAT) / fcs.ExecutedTests
         ELSE 0 END                                     AS BlockedRate,
    CASE WHEN fcs.ExecutedTests > 0
         THEN CAST(fcs.AutomatedExecutions AS FLOAT) / fcs.ExecutedTests
         ELSE 0 END                                     AS AutomationRate,
    CASE WHEN fcs.TotalRequirements > 0
         THEN CAST(fcs.CoveredRequirements AS FLOAT) / fcs.TotalRequirements
         ELSE 0 END                                     AS CoverageRate
FROM dbo.FactCycleSnapshot          fcs
JOIN dbo.DimDate                    dd  ON fcs.SnapshotDateKey = dd.DateKey
JOIN dbo.DimRelease                 dr  ON fcs.ReleaseKey      = dr.ReleaseKey
JOIN dbo.DimProgram                 dp  ON fcs.ProgramKey      = dp.ProgramKey
JOIN dbo.DimApplication             da  ON fcs.ApplicationKey  = da.ApplicationKey;
GO

-- ------------------------------------------------------------
-- vw_EnvironmentHealth
-- ------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_EnvironmentHealth AS
SELECT
    de.EnvironmentName,
    de.EnvironmentType,
    de.Criticality,
    dr.ReleaseName,
    da.ApplicationName,
    dp.ProgramName,
    drc.RootCauseCategory,
    drc.RootCauseName,
    dd.FullDate          AS ExecutionDate,
    dd.Year,
    dd.Month,
    COUNT(*)             AS TotalRuns,
    SUM(CASE WHEN ds.StatusCategory = 'Fail'    THEN 1 ELSE 0 END) AS FailedRuns,
    SUM(CASE WHEN ds.StatusCategory = 'Blocked' THEN 1 ELSE 0 END) AS BlockedRuns,
    SUM(CASE WHEN ftr.IsBlocked = 1             THEN 1 ELSE 0 END) AS BlockedByEnv
FROM dbo.FactTestRun        ftr
JOIN dbo.DimEnvironment     de  ON ftr.EnvironmentKey   = de.EnvironmentKey
JOIN dbo.DimStatus          ds  ON ftr.StatusKey        = ds.StatusKey
JOIN dbo.DimRootCause       drc ON ftr.RootCauseKey     = drc.RootCauseKey
JOIN dbo.DimDate            dd  ON ftr.ExecutionDateKey = dd.DateKey
JOIN dbo.DimRelease         dr  ON ftr.ReleaseKey       = dr.ReleaseKey
LEFT JOIN dbo.DimApplication da  ON ftr.ApplicationKey  = da.ApplicationKey
LEFT JOIN dbo.DimProgram    dp  ON da.ProgramKey        = dp.ProgramKey
GROUP BY
    de.EnvironmentName, de.EnvironmentType, de.Criticality,
    dr.ReleaseName, da.ApplicationName, dp.ProgramName,
    drc.RootCauseCategory, drc.RootCauseName,
    dd.FullDate, dd.Year, dd.Month;
GO

-- ============================================================
-- SECTION 9: VERIFY OBJECTS CREATED
-- ============================================================
SELECT
    o.type_desc                         AS ObjectType,
    SCHEMA_NAME(o.schema_id)            AS SchemaName,
    o.name                              AS ObjectName,
    (
        SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = o.object_id
    )                                   AS ColumnCount
FROM sys.objects o
WHERE o.type IN ('U','V')
  AND o.schema_id = SCHEMA_ID('dbo')
ORDER BY o.type_desc, o.name;
GO

PRINT '============================================================';
PRINT 'XrayTestMetrics schema created successfully.';
PRINT 'Tables: 12 dimensions + 4 facts';
PRINT 'Foreign Keys: 24 constraints';
PRINT 'Indexes: 26 non-clustered';
PRINT 'Views: 5 reporting views';
PRINT 'Seed data: DimStatus (6 rows) + DimRootCause (9 rows)';
PRINT '============================================================';
GO
