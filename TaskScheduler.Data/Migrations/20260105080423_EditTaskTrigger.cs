using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskScheduler.Data.Migrations
{
    /// <inheritdoc />
    public partial class EditTaskTrigger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CronExpression",
                table: "TaskTriggers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CronExpression",
                table: "TaskTriggers",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
