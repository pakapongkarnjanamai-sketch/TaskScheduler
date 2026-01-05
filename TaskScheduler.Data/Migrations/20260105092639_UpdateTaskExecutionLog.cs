using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskScheduler.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTaskExecutionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Duration",
                table: "TaskExecutionLogs");

            migrationBuilder.DropColumn(
                name: "ErrorMessage",
                table: "TaskExecutionLogs");

            migrationBuilder.DropColumn(
                name: "ExecutedAt",
                table: "TaskExecutionLogs");

            migrationBuilder.DropColumn(
                name: "ResponseCode",
                table: "TaskExecutionLogs");

            migrationBuilder.RenameColumn(
                name: "ResponseBody",
                table: "TaskExecutionLogs",
                newName: "ResponseMessage");

            migrationBuilder.AddColumn<DateTime>(
                name: "EndTime",
                table: "TaskExecutionLogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartTime",
                table: "TaskExecutionLogs",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "TriggerId",
                table: "TaskExecutionLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "TaskExecutionLogs");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "TaskExecutionLogs");

            migrationBuilder.DropColumn(
                name: "TriggerId",
                table: "TaskExecutionLogs");

            migrationBuilder.RenameColumn(
                name: "ResponseMessage",
                table: "TaskExecutionLogs",
                newName: "ResponseBody");

            migrationBuilder.AddColumn<int>(
                name: "Duration",
                table: "TaskExecutionLogs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ErrorMessage",
                table: "TaskExecutionLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExecutedAt",
                table: "TaskExecutionLogs",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()");

            migrationBuilder.AddColumn<int>(
                name: "ResponseCode",
                table: "TaskExecutionLogs",
                type: "int",
                nullable: true);
        }
    }
}
