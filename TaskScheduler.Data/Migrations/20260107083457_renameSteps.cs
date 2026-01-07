using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskScheduler.Data.Migrations
{
    /// <inheritdoc />
    public partial class renameSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskSteps_Tasks_TaskId",
                table: "TaskSteps");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskTriggers_Tasks_TaskId",
                table: "Schedules");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TaskTriggers",
                table: "Schedules");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TaskSteps",
                table: "TaskSteps");

            migrationBuilder.RenameTable(
                name: "TaskTriggers",
                newName: "Schedules");

            migrationBuilder.RenameTable(
                name: "TaskSteps",
                newName: "Steps");

            migrationBuilder.RenameIndex(
                name: "IX_TaskTriggers_TaskId",
                table: "Schedules",
                newName: "IX_Schedules_TaskId");

            migrationBuilder.RenameIndex(
                name: "IX_TaskSteps_TaskId",
                table: "Steps",
                newName: "IX_Steps_TaskId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Schedules",
                table: "Schedules",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Steps",
                table: "Steps",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Schedules_Tasks_TaskId",
                table: "Schedules",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Steps_Tasks_TaskId",
                table: "Steps",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Schedules_Tasks_TaskId",
                table: "Schedules");

            migrationBuilder.DropForeignKey(
                name: "FK_Steps_Tasks_TaskId",
                table: "Steps");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Steps",
                table: "Steps");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Schedules",
                table: "Schedules");

            migrationBuilder.RenameTable(
                name: "Steps",
                newName: "TaskSteps");

            migrationBuilder.RenameTable(
                name: "Schedules",
                newName: "TaskTriggers");

            migrationBuilder.RenameIndex(
                name: "IX_Steps_TaskId",
                table: "TaskSteps",
                newName: "IX_TaskSteps_TaskId");

            migrationBuilder.RenameIndex(
                name: "IX_Schedules_TaskId",
                table: "TaskTriggers",
                newName: "IX_TaskTriggers_TaskId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TaskSteps",
                table: "TaskSteps",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TaskTriggers",
                table: "TaskTriggers",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskSteps_Tasks_TaskId",
                table: "TaskSteps",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskTriggers_Tasks_TaskId",
                table: "TaskTriggers",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
