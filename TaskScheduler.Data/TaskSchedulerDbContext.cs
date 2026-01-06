using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using TaskScheduler.Core.Models;
using TaskScheduler.Data.Services;

namespace TaskScheduler.Data
{
    public class TaskSchedulerDbContext : DbContext
    {

        private readonly IDateTime _dateTime;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ICurrentUserService _currentUserService;
        public TaskSchedulerDbContext(
            DbContextOptions<TaskSchedulerDbContext> options,
            IDateTime dateTime,
            IHttpContextAccessor httpContextAccessor,
            ICurrentUserService currentUserService)
            : base(options)
        {
            _dateTime = dateTime;
            _httpContextAccessor = httpContextAccessor;
            _currentUserService = currentUserService;
        }
        public TaskSchedulerDbContext(DbContextOptions<TaskSchedulerDbContext> options)
            : base(options)
        {
        }

        public DbSet<ScheduledTask> Tasks { get; set; }
        public DbSet<TaskTrigger> TaskTriggers { get; set; }
        public DbSet<TaskExecutionLog> TaskExecutionLogs { get; set; }
        public DbSet<TaskStep> TaskSteps { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ScheduledTask>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);


            });

            modelBuilder.Entity<TaskTrigger>(entity =>
            {
                entity.ToTable("TaskTriggers");
                entity.HasKey(e => e.Id);
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

            modelBuilder.Entity<TaskStep>(entity =>
            {
                entity.ToTable("TaskSteps");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ApiUrl).IsRequired().HasMaxLength(500);

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
            var entries = ChangeTracker.Entries<BaseEntity>();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedAt = _dateTime.Now;
                    entry.Entity.CreatedBy = _currentUserService.UserId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdatedAt = _dateTime.Now;
                    entry.Entity.UpdatedBy = _currentUserService.UserId;

                    // 🛡️ ป้องกันไม่ให้ CreatedAt และ CreatedBy ถูกแก้ไขโดยไม่ตั้งใจตอน Update
                    entry.Property(x => x.CreatedAt).IsModified = false;
                    entry.Property(x => x.CreatedBy).IsModified = false;
                }
            }
        }
    }
}
