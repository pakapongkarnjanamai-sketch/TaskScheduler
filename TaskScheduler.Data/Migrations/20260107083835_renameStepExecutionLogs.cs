using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskScheduler.Data.Migrations
{
    /// <inheritdoc />
    public partial class renameStepExecutionLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
             name: "TaskStepExecutionLogs",
             newName: "StepExecutionLogs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
