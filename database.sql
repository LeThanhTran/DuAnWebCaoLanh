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

INSERT INTO [Services] ([Name], [Description]) VALUES ('Cấp CCCD', 'Dịch vụ cấp căn cước công dân');
INSERT INTO [Services] ([Name], [Description]) VALUES ('Đăng ký & thay đổi thông tin cư trú', 'Dịch vụ đăng ký và thay đổi thông tin cư trú');
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

CREATE TABLE [Media] (
    [Id] INT PRIMARY KEY IDENTITY(1,1),
    [Url] NVARCHAR(MAX) NOT NULL,
    [Type] NVARCHAR(100) NOT NULL
);
GO

SET IDENTITY_INSERT [Media] ON;
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (1, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (2, 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (3, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (4, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (5, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (6, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 'Image');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (7, 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'Video');
INSERT INTO [Media] ([Id], [Url], [Type]) VALUES (8, 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm', 'Video');
SET IDENTITY_INSERT [Media] OFF;
GO
