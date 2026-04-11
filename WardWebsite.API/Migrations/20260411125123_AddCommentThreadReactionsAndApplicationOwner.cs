using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WardWebsite.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentThreadReactionsAndApplicationOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Comments', 'DislikeCount') IS NULL
BEGIN
    ALTER TABLE [Comments] ADD [DislikeCount] int NOT NULL CONSTRAINT [DF_Comments_DislikeCount] DEFAULT(0);
END

IF COL_LENGTH('Comments', 'LikeCount') IS NULL
BEGIN
    ALTER TABLE [Comments] ADD [LikeCount] int NOT NULL CONSTRAINT [DF_Comments_LikeCount] DEFAULT(0);
END

IF COL_LENGTH('Comments', 'ParentCommentId') IS NULL
BEGIN
    ALTER TABLE [Comments] ADD [ParentCommentId] int NULL;
END

IF COL_LENGTH('Applications', 'CreatedByUsername') IS NULL
BEGIN
    ALTER TABLE [Applications] ADD [CreatedByUsername] nvarchar(100) NOT NULL CONSTRAINT [DF_Applications_CreatedByUsername] DEFAULT(N'');
END

IF OBJECT_ID(N'[CommentReactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [CommentReactions] (
        [Id] int NOT NULL IDENTITY,
        [CommentId] int NOT NULL,
        [Username] nvarchar(100) NOT NULL,
        [ReactionType] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CommentReactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CommentReactions_Comments_CommentId] FOREIGN KEY ([CommentId]) REFERENCES [Comments] ([Id]) ON DELETE CASCADE
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comments_ParentCommentId' AND object_id = OBJECT_ID(N'[Comments]'))
BEGIN
    CREATE INDEX [IX_Comments_ParentCommentId] ON [Comments]([ParentCommentId]);
END

IF OBJECT_ID(N'[CommentReactions]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CommentReactions_CommentId_Username' AND object_id = OBJECT_ID(N'[CommentReactions]'))
BEGIN
    CREATE UNIQUE INDEX [IX_CommentReactions_CommentId_Username] ON [CommentReactions]([CommentId], [Username]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Comments_Comments_ParentCommentId')
BEGIN
    ALTER TABLE [Comments] WITH CHECK ADD CONSTRAINT [FK_Comments_Comments_ParentCommentId]
        FOREIGN KEY([ParentCommentId]) REFERENCES [Comments]([Id]) ON DELETE NO ACTION;
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Comments_Comments_ParentCommentId')
BEGIN
    ALTER TABLE [Comments] DROP CONSTRAINT [FK_Comments_Comments_ParentCommentId];
END

IF OBJECT_ID(N'[CommentReactions]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [CommentReactions];
END

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comments_ParentCommentId' AND object_id = OBJECT_ID(N'[Comments]'))
BEGIN
    DROP INDEX [IX_Comments_ParentCommentId] ON [Comments];
END

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Comments_DislikeCount')
BEGIN
    ALTER TABLE [Comments] DROP CONSTRAINT [DF_Comments_DislikeCount];
END

IF COL_LENGTH('Comments', 'DislikeCount') IS NOT NULL
BEGIN
    ALTER TABLE [Comments] DROP COLUMN [DislikeCount];
END

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Comments_LikeCount')
BEGIN
    ALTER TABLE [Comments] DROP CONSTRAINT [DF_Comments_LikeCount];
END

IF COL_LENGTH('Comments', 'LikeCount') IS NOT NULL
BEGIN
    ALTER TABLE [Comments] DROP COLUMN [LikeCount];
END

IF COL_LENGTH('Comments', 'ParentCommentId') IS NOT NULL
BEGIN
    ALTER TABLE [Comments] DROP COLUMN [ParentCommentId];
END

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Applications_CreatedByUsername')
BEGIN
    ALTER TABLE [Applications] DROP CONSTRAINT [DF_Applications_CreatedByUsername];
END

IF COL_LENGTH('Applications', 'CreatedByUsername') IS NOT NULL
BEGIN
    ALTER TABLE [Applications] DROP COLUMN [CreatedByUsername];
END
");
        }
    }
}
