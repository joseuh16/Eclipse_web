namespace Eclipse.Api.Dtos;

public class DashboardStatsDto
{
    public int PendingOrders { get; set; }
    public int TodayOrders { get; set; }
    public int TotalOrders { get; set; }
    public int ActiveProducts { get; set; }
    public int ActiveCoupons { get; set; }
    public decimal VerifiedRevenue { get; set; }
    public decimal PendingRevenue { get; set; }
    public List<OrderDto> RecentOrders { get; set; } = [];
    public List<DailySalesDto> SalesLast7Days { get; set; } = [];
    public List<TopProductDto> TopProducts { get; set; } = [];
}

public class DailySalesDto
{
    public string Date { get; set; } = string.Empty;
    public int Orders { get; set; }
    public decimal Revenue { get; set; }
}

public class TopProductDto
{
    public string Name { get; set; } = string.Empty;
    public int Units { get; set; }
    public decimal Revenue { get; set; }
}
