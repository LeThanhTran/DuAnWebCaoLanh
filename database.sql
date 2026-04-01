CREATE DATABASE WardWebsite;
GO

USE WardWebsite;
GO

CREATE TABLE [Roles] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Name] NVARCHAR(50) NOT NULL UNIQUE
);
GO

INSERT INTO [Roles] ([Name]) VALUES ('Admin');
INSERT INTO [Roles] ([Name]) VALUES ('Editor');
INSERT INTO [Roles] ([Name]) VALUES ('Viewer');
GO

CREATE TABLE [Users] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Username] NVARCHAR(100) NOT NULL UNIQUE,
    [PasswordHash] NVARCHAR(MAX) NOT NULL,
    [RoleId] INT NOT NULL,
    FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Users_RoleId] ON [Users]([RoleId]);
GO

CREATE TABLE [Categories] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Name] NVARCHAR(100) NOT NULL UNIQUE
);
GO

INSERT INTO [Categories] ([Name]) VALUES ('Tin Tức');
INSERT INTO [Categories] ([Name]) VALUES ('Thông Báo');
INSERT INTO [Categories] ([Name]) VALUES ('Sự Kiện');
INSERT INTO [Categories] ([Name]) VALUES ('Chính Sách');
GO

CREATE TABLE [Articles] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Title] NVARCHAR(500) NOT NULL,
    [Content] NVARCHAR(MAX) NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [CategoryId] INT NOT NULL,
    FOREIGN KEY ([CategoryId]) REFERENCES [Categories]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Articles_CategoryId] ON [Articles]([CategoryId]);
GO

CREATE TABLE [Comments] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Content] NVARCHAR(MAX) NOT NULL,
    [ArticleId] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY ([ArticleId]) REFERENCES [Articles]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Comments_ArticleId] ON [Comments]([ArticleId]);
GO

CREATE TABLE [Services] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(MAX) NOT NULL
);
GO

INSERT INTO [Services] ([Name], [Description]) VALUES ('Cấp CMND', 'Dịch vụ cấp chứng minh nhân dân');
INSERT INTO [Services] ([Name], [Description]) VALUES ('Cấp sổ hộ khẩu', 'Dịch vụ cấp/thay đổi sổ hộ khẩu');
INSERT INTO [Services] ([Name], [Description]) VALUES ('Thủ tục hôn nhân', 'Dịch vụ đăng ký hôn nhân');
INSERT INTO [Services] ([Name], [Description]) VALUES ('Cấp giấy khai sinh', 'Dịch vụ cấp giấy khai sinh');
GO

CREATE TABLE [Applications] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [FullName] NVARCHAR(200) NOT NULL,
    [ServiceId] INT NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY ([ServiceId]) REFERENCES [Services]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Applications_ServiceId] ON [Applications]([ServiceId]);
GO
