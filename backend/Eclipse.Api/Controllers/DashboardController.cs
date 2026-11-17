using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Eclipse.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var pendingOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Pending);
        var todayOrders = await db.Orders.CountAsync(o => o.CreatedAt >= today);
        var totalOrders = await db.Orders.CountAsync();
        var activeProducts = await db.Products.CountAsync(p => p.IsActive);
        var activeCoupons = await db.Coupons.CountAsync(c => c.IsActive);
        var verifiedRevenue = await db.Orders
            .Where(o => o.Status == OrderStatus.Verified)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;
        var pendingRevenue = await db.Orders
            .Where(o => o.Status == OrderStatus.Pending)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        var recentEntities = await db.Orders.AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Take(6)
            .ToListAsync();

        var weekStart = today.AddDays(-6);
        var weekOrders = await db.Orders.AsNoTracking()
            .Where(o => o.CreatedAt >= weekStart && o.Status != OrderStatus.Cancelled)
            .ToListAsync();

        var salesLast7Days = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = weekStart.AddDays(offset);
                var dayOrders = weekOrders.Where(o => o.CreatedAt.Date == date).ToList();
                return new DailySalesDto
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    Orders = dayOrders.Count,
                    Revenue = dayOrders.Where(o => o.Status == OrderStatus.Verified).Sum(o => o.TotalAmount)
                };
            })
            .ToList();

        var verifiedLast30 = await db.Orders.AsNoTracking()
            .Where(o => o.Status == OrderStatus.Verified && o.CreatedAt >= now.AddDays(-30))
            .OrderByDescending(o => o.CreatedAt)
            .Take(250)
            .ToListAsync();

        var topProducts = verifiedLast30
            .SelectMany(o => OrderItemsCodec.Deserialize(o.ItemsJson))
            .GroupBy(i => i.Name)
            .Select(g => new TopProductDto
            {
                Name = g.Key,
                Units = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.LineTotal)
            })
            .OrderByDescending(x => x.Units)
            .ThenByDescending(x => x.Revenue)
            .Take(5)
            .ToList();

        return Ok(new DashboardStatsDto
        {
            PendingOrders = pendingOrders,
            TodayOrders = todayOrders,
            TotalOrders = totalOrders,
            ActiveProducts = activeProducts,
            ActiveCoupons = activeCoupons,
            VerifiedRevenue = verifiedRevenue,
            PendingRevenue = pendingRevenue,
            RecentOrders = recentEntities.Select(o => o.ToDto()).ToList(),
            SalesLast7Days = salesLast7Days,
            TopProducts = topProducts
        });
    }
}
