using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Eclipse.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(AppDbContext db, OrderService orderService) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<ActionResult<OrderConfirmationDto>> CreateOrder(CreateOrderDto dto)
    {
        var confirmation = await orderService.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, confirmation);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResult<OrderDto>>> GetOrders(
        [FromQuery] OrderStatus? status,
        [FromQuery] string? search,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var orders = db.Orders.AsNoTracking();

        if (status.HasValue)
        {
            orders = orders.Where(o => o.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            orders = orders.Where(o =>
                o.OrderNumber.Contains(term) ||
                o.CustomerName.Contains(term) ||
                (o.CustomerEmail != null && o.CustomerEmail.Contains(term)) ||
                (o.CustomerPhone != null && o.CustomerPhone.Contains(term)));
        }

        if (from.HasValue)
        {
            orders = orders.Where(o => o.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            orders = orders.Where(o => o.CreatedAt <= to.Value);
        }

        var total = await orders.CountAsync();
        var entities = await orders
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = entities.Select(o => o.ToDto()).ToList();
        return Ok(PagedResult<OrderDto>.Create(items, page, pageSize, total));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
        return order is null
            ? NotFound(new { message = "Orden no encontrada." })
            : Ok(order.ToDto());
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(int id, OrderStatusUpdateDto dto)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null)
        {
            return NotFound(new { message = "Orden no encontrada." });
        }

        order.Status = dto.Status;
        order.VerifiedAt = dto.Status == OrderStatus.Verified ? DateTime.UtcNow : null;
        await db.SaveChangesAsync();

        return Ok(order.ToDto());
    }
}
