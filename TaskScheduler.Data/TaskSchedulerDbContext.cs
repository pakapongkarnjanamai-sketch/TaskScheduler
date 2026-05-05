using Microsoft.EntityFrameworkCore;
using System;
using TaskScheduler.Core.Models;
using TaskScheduler.Data.Services;

namespace TaskScheduler.Data
{
    public class TaskSchedulerDbContext : DbContext
    {

        private readonly IDateTime _dateTime;
        private readonly ICurrentUserService _currentUserService;
        public TaskSchedulerDbContext(
            DbContextOptions<TaskSchedulerDbContext> options,
            IDateTime dateTime,
            ICurrentUserService currentUserService)
            : base(options)
        {
            _dateTime = dateTime;
            _currentUserService = currentUserService;
        }

        public DbSet<Core.Models.Task> Tasks { get; set; }
        public DbSet<Schedule>  Schedules { get; set; }
        public DbSet<TaskExecutionLog> TaskExecutionLogs { get; set; }
        public DbSet<Step>  Steps { get; set; }
        public DbSet<StepExecutionLog> StepExecutionLogs { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Core.Models.Task>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.HasQueryFilter(e => !e.IsDeleted);


            });

            modelBuilder.Entity<Schedule>(entity =>
            {
                entity.ToTable("Schedules");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TriggerType).IsRequired().HasMaxLength(32);
                entity.Property(e => e.DaysOfWeek).HasMaxLength(64);
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Task)
                      .WithMany(e => e.Triggers)
                      .HasForeignKey(e => e.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TaskExecutionLog>(entity =>
            {
                entity.ToTable("TaskExecutionLogs");
                entity.HasKey(e => e.Id);
            });

            modelBuilder.Entity<Step>(entity =>
            {
                entity.ToTable("Steps");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ApiUrl).IsRequired().HasMaxLength(500);
                entity.HasQueryFilter(e => e.Task != null && !e.Task.IsDeleted);

                entity.HasOne(e => e.Task)
                      .WithMany(e => e.Steps)
                      .HasForeignKey(e => e.TaskId)
                      .OnDelete(DeleteBehavior.Cascade); // ลบ Task แล้ว Step หายด้วย
            });
        }

        public override int SaveChanges()
        {
            SetAuditFields();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SetAuditFields();
            return await base.SaveChangesAsync(cancellationToken);
        }

        // ✅ แยก Logic ออกมาเป็น Private Method เพื่อลด Code Duplication
        private void SetAuditFields()
        {
            var now = _dateTime?.Now ?? DateTime.UtcNow;
            var currentUserId = _currentUserService?.UserId ?? "SYSTEM";

            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable softDeletable)
                {
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedAt = now;
                    softDeletable.DeletedBy = currentUserId;
                }
            }

            var entries = ChangeTracker.Entries<BaseEntity>();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy = currentUserId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = currentUserId;

                    // 🛡️ ป้องกันไม่ให้ CreatedAt และ CreatedBy ถูกแก้ไขโดยไม่ตั้งใจตอน Update
                    entry.Property(x => x.CreatedAt).IsModified = false;
                    entry.Property(x => x.CreatedBy).IsModified = false;
                }
            }
        }
    }
}
