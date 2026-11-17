using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    private static readonly int[] AllowedProductDurations = [1, 3, 6, 12];

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetProducts([FromQuery] ProductQueryDto query)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 48);

        var products = db.Products.AsNoTracking().Where(p => p.IsActive);

        if (!query.IncludeAdult)
        {
            products = products.Where(p => !p.IsAdultOnly);
        }

        if (query.Category.HasValue)
        {
            products = products.Where(p => p.Category == query.Category.Value);
        }

        if (query.Featured == true)
        {
            products = products.Where(p => p.IsFeatured);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            products = products.Where(p => p.Name.Contains(term));
        }

        if (query.MinPrice.HasValue)
        {
            products = products.Where(p => p.BasePrice >= query.MinPrice.Value);
        }

        if (query.MaxPrice.HasValue)
        {
            products = products.Where(p => p.BasePrice <= query.MaxPrice.Value);
        }

        products = query.Sort?.ToLowerInvariant() switch
        {
            "price_asc" => products.OrderBy(p => p.BasePrice).ThenBy(p => p.Name),
            "price_desc" => products.OrderByDescending(p => p.BasePrice).ThenBy(p => p.Name),
            "name" => products.OrderBy(p => p.Name),
            "discount" => products.OrderByDescending(p => p.DiscountPercent).ThenByDescending(p => p.CreatedAt),
            _ => products.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAt)
        };

        var total = await products.CountAsync();
        var items = await products
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => p.ToDto())
            .ToListAsync();

        return Ok(PagedResult<ProductDto>.Create(items, page, pageSize, total));
    }

    [HttpGet("manage")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetForManagement([FromQuery] string? search, [FromQuery] ProductCategory? category)
    {
        var products = db.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            products = products.Where(p => p.Name.Contains(term));
        }

        if (category.HasValue)
        {
            products = products.Where(p => p.Category == category.Value);
        }

        var result = await products
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => p.ToDto())
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductDto>> GetProduct(int id)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && p.IsActive);
        return product is null ? NotFound(new { message = "Producto no encontrado." }) : Ok(product.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> CreateProduct(ProductUpsertDto dto)
    {
        ValidateProduct(dto);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var product = new Product
        {
            Name = dto.Name.Trim(),
            Category = dto.Category,
            BasePrice = dto.BasePrice,
            DiscountPercent = dto.DiscountPercent,
            DurationMonths = dto.DurationMonths,
            ImageUrl = dto.ImageUrl.Trim(),
            IsActive = dto.IsActive,
            IsAdultOnly = dto.IsAdultOnly || dto.Category == ProductCategory.AdultPlus,
            IsFeatured = dto.IsFeatured,
            CreatedAt = DateTime.UtcNow
        };

        db.Products.Add(product);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> UpdateProduct(int id, ProductUpsertDto dto)
    {
        ValidateProduct(dto);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound(new { message = "Producto no encontrado." });
        }

        product.Name = dto.Name.Trim();
        product.Category = dto.Category;
        product.BasePrice = dto.BasePrice;
        product.DiscountPercent = dto.DiscountPercent;
        product.DurationMonths = dto.DurationMonths;
        product.ImageUrl = dto.ImageUrl.Trim();
        product.IsActive = dto.IsActive;
        product.IsAdultOnly = dto.IsAdultOnly || dto.Category == ProductCategory.AdultPlus;
        product.IsFeatured = dto.IsFeatured;

        await db.SaveChangesAsync();
        return Ok(product.ToDto());
    }

    [HttpPatch("{id:int}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> ToggleProduct(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound(new { message = "Producto no encontrado." });
        }

        product.IsActive = !product.IsActive;
        await db.SaveChangesAsync();
        return Ok(product.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound(new { message = "Producto no encontrado." });
        }

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private void ValidateProduct(ProductUpsertDto dto)
    {
        if (!AllowedProductDurations.Contains(dto.DurationMonths))
        {
            ModelState.AddModelError(nameof(dto.DurationMonths), "La duración base debe ser 1, 3, 6 o 12 meses.");
        }

        if (dto.IsAdultOnly && dto.Category != ProductCategory.AdultPlus)
        {
            ModelState.AddModelError(nameof(dto.IsAdultOnly), "Los productos +18 deben pertenecer a la categoría AdultPlus.");
        }

        if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
        {
            if (!Uri.TryCreate(dto.ImageUrl, UriKind.Absolute, out var uri) ||
                uri.Scheme is not ("http" or "https"))
            {
                ModelState.AddModelError(nameof(dto.ImageUrl), "La imagen debe ser una URL http(s) válida.");
            }
        }
    }
}
