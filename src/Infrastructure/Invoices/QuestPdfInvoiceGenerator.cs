using System.Globalization;
using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Invoices;

public sealed class QuestPdfInvoiceGenerator : IInvoicePdfGenerator
{
    private static readonly CultureInfo InvariantCulture = CultureInfo.InvariantCulture;

    private readonly ICurrentTenant _currentTenant;
    private readonly IClientRepository _clientRepository;
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;

    static QuestPdfInvoiceGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public QuestPdfInvoiceGenerator(
        ICurrentTenant currentTenant,
        IClientRepository clientRepository,
        ITenantPublicRecordLookup tenantPublicRecordLookup)
    {
        _currentTenant = currentTenant;
        _clientRepository = clientRepository;
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
    }

    public async Task<InvoicePdfDocument> GenerateAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        InvoicePdfBranding branding = await ResolveBrandingAsync(cancellationToken);
        Client? client = await _clientRepository.FindByIdAsync(invoice.ClientId, cancellationToken);

        byte[] content = QuestPDF.Fluent.Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(40);
                page.MarginVertical(36);
                page.DefaultTextStyle(text => text.FontSize(10));

                page.Header().Element(header => ComposeHeader(header, branding));
                page.Content().Element(contentContainer => ComposeContent(contentContainer, invoice, client, branding));
                page.Footer()
                    .AlignCenter()
                    .Text(text =>
                    {
                        text.DefaultTextStyle(style => style.FontSize(8).FontColor(Colors.Grey.Medium));
                        text.Span("Page ");
                        text.CurrentPageNumber();
                        text.Span(" of ");
                        text.TotalPages();
                    });
            });
        }).GeneratePdf();

        return new InvoicePdfDocument(
            FileName: SanitizeFileName($"{invoice.InvoiceNumber}.pdf"),
            ContentType: "application/pdf",
            Content: content);
    }

    private async Task<InvoicePdfBranding> ResolveBrandingAsync(CancellationToken cancellationToken)
    {
        TenantSettings? settings = _currentTenant.Settings;
        string brandColour = settings?.BrandColour ?? "#2563EB";
        string? logoUrl = settings?.LogoUrl;

        if (!string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            TenantPublicRecord? tenant = await _tenantPublicRecordLookup.FindBySlugAsync(
                _currentTenant.Slug,
                cancellationToken);

            if (tenant is not null)
            {
                return new InvoicePdfBranding(
                    tenant.Name,
                    tenant.Domain,
                    tenant.Settings.BrandColour,
                    tenant.Settings.LogoUrl);
            }
        }

        string fallbackName = string.IsNullOrWhiteSpace(_currentTenant.Slug)
            ? "Your Company"
            : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(_currentTenant.Slug.Replace('-', ' '));

        return new InvoicePdfBranding(fallbackName, null, brandColour, logoUrl);
    }

    private static void ComposeHeader(IContainer container, InvoicePdfBranding branding)
    {
        string headerColour = NormalizeHexColour(branding.BrandColourHex);

        container.Column(column =>
        {
            column.Item()
                .Background(headerColour)
                .Padding(16)
                .Row(row =>
                {
                    row.RelativeItem().Column(left =>
                    {
                        left.Item().Text(branding.BusinessName)
                            .FontSize(18)
                            .Bold()
                            .FontColor(Colors.White);
                        left.Item().PaddingTop(4).Text("Tax Invoice")
                            .FontSize(11)
                            .FontColor(Colors.White);
                    });

                    row.ConstantItem(180).AlignRight().Column(right =>
                    {
                        if (!string.IsNullOrWhiteSpace(branding.Domain))
                        {
                            right.Item().Text(branding.Domain)
                                .FontSize(10)
                                .FontColor(Colors.White);
                        }
                    });
                });

            column.Item().PaddingBottom(12);
        });
    }

    private static void ComposeContent(IContainer container, Invoice invoice, Client? client, InvoicePdfBranding branding)
    {
        decimal outstanding = Math.Max(0m, invoice.Total - invoice.AmountPaid);
        bool showTaxColumn = invoice.LineItems.Any(item => item.TaxRate > 0m);

        container.Column(column =>
        {
            column.Spacing(16);

            column.Item().Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text("Invoice details").Bold().FontSize(11);
                    left.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(72);
                            columns.RelativeColumn();
                        });

                        AddDetailRow(table, "Invoice", invoice.InvoiceNumber);
                        AddDetailRow(table, "Status", FormatStatus(invoice.Status));
                        AddDetailRow(table, "Issued", FormatDate(invoice.CreatedAt));
                        AddDetailRow(table, "Due", FormatDateOnly(invoice.DueDate));
                        if (invoice.PaidAt.HasValue)
                        {
                            AddDetailRow(table, "Paid", FormatDate(invoice.PaidAt.Value));
                        }

                        AddDetailRow(table, "Currency", invoice.Currency);
                    });
                });

                row.ConstantItem(220).Background(Colors.Grey.Lighten4).Padding(12).Column(billTo =>
                {
                    billTo.Item().Text("Bill to").Bold().FontSize(11);
                    billTo.Item().PaddingTop(6).Text(ResolveClientCompanyName(client))
                        .SemiBold();
                    if (!string.IsNullOrWhiteSpace(client?.ContactName))
                    {
                        billTo.Item().PaddingTop(2).Text(client.ContactName);
                    }

                    if (client?.Email is not null)
                    {
                        billTo.Item().PaddingTop(2).Text(client.Email.Value);
                    }

                    if (client?.Phone is not null)
                    {
                        billTo.Item().PaddingTop(2).Text(client.Phone.Value);
                    }
                });
            });

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(24);
                    columns.RelativeColumn(4);
                    columns.ConstantColumn(42);
                    columns.ConstantColumn(72);
                    if (showTaxColumn)
                    {
                        columns.ConstantColumn(44);
                    }

                    columns.ConstantColumn(72);
                });

                table.Header(header =>
                {
                    header.Cell().Element(TableHeaderCellStyle).Text("#");
                    header.Cell().Element(TableHeaderCellStyle).Text("Description");
                    header.Cell().Element(TableHeaderCellStyle).AlignRight().Text("Qty");
                    header.Cell().Element(TableHeaderCellStyle).AlignRight().Text($"Unit ({invoice.Currency})");
                    if (showTaxColumn)
                    {
                        header.Cell().Element(TableHeaderCellStyle).AlignRight().Text("Tax");
                    }

                    header.Cell().Element(TableHeaderCellStyle).AlignRight().Text($"Amount ({invoice.Currency})");
                });

                int index = 1;
                foreach (LineItem lineItem in invoice.LineItems)
                {
                    table.Cell().Element(TableBodyCellStyle).Text(index.ToString(InvariantCulture));
                    table.Cell().Element(TableBodyCellStyle).Text(lineItem.Description);
                    table.Cell().Element(TableBodyCellStyle).AlignRight()
                        .Text(FormatQuantity(lineItem.Quantity));
                    table.Cell().Element(TableBodyCellStyle).AlignRight()
                        .Text(FormatMoney(lineItem.UnitPrice));
                    if (showTaxColumn)
                    {
                        table.Cell().Element(TableBodyCellStyle).AlignRight()
                            .Text(FormatTaxRate(lineItem.TaxRate));
                    }

                    table.Cell().Element(TableBodyCellStyle).AlignRight()
                        .Text(FormatMoney(lineItem.Amount));
                    index++;
                }

                if (invoice.LineItems.Count == 0)
                {
                    int colspan = showTaxColumn ? 6 : 5;
                    table.Cell().ColumnSpan((uint)colspan)
                        .Element(TableBodyCellStyle)
                        .Text("No line items on this invoice.")
                        .FontColor(Colors.Grey.Darken1);
                }
            });

            column.Item().AlignRight().Width(240).Column(totals =>
            {
                totals.Spacing(4);
                AddTotalRow(totals, "Subtotal", FormatMoney(invoice.Subtotal, invoice.Currency));
                if (invoice.TaxAmount > 0m)
                {
                    AddTotalRow(totals, "Tax", FormatMoney(invoice.TaxAmount, invoice.Currency));
                }

                totals.Item().PaddingTop(4).BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(6)
                    .Row(row =>
                    {
                        row.RelativeItem().Text("Invoice total").Bold();
                        row.ConstantItem(90).AlignRight().Text(FormatMoney(invoice.Total, invoice.Currency)).Bold();
                    });

                if (invoice.AmountPaid > 0m)
                {
                    AddTotalRow(totals, "Amount paid", $"- {FormatMoney(invoice.AmountPaid, invoice.Currency)}");
                    totals.Item().PaddingTop(4).Background(Colors.Grey.Lighten4).Padding(6).Row(row =>
                    {
                        row.RelativeItem().Text("Outstanding").Bold();
                        row.ConstantItem(90).AlignRight().Text(FormatMoney(outstanding, invoice.Currency)).Bold();
                    });
                }
            });

            if (!string.IsNullOrWhiteSpace(invoice.Notes))
            {
                column.Item().Background(Colors.Grey.Lighten4).Padding(12).Column(notes =>
                {
                    notes.Item().Text("Notes").Bold().FontSize(11);
                    notes.Item().PaddingTop(4).Text(invoice.Notes).FontSize(10);
                });
            }

            column.Item().PaddingTop(8).Text(text =>
            {
                text.DefaultTextStyle(style => style.FontSize(8).FontColor(Colors.Grey.Medium));
                text.Span("Generated by ");
                text.Span(branding.BusinessName).SemiBold();
                text.Span($" on {FormatDate(DateTime.UtcNow)} UTC.");
            });
        });
    }

    private static void AddDetailRow(TableDescriptor table, string label, string value)
    {
        table.Cell().PaddingVertical(2).Text(label).FontColor(Colors.Grey.Darken1);
        table.Cell().PaddingVertical(2).Text(value);
    }

    private static void AddTotalRow(ColumnDescriptor column, string label, string value)
    {
        column.Item().Row(row =>
        {
            row.RelativeItem().Text(label);
            row.ConstantItem(90).AlignRight().Text(value);
        });
    }

    private static IContainer TableHeaderCellStyle(IContainer container) =>
        container.DefaultTextStyle(style => style.SemiBold().FontSize(9))
            .Background(Colors.Grey.Lighten3)
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten1)
            .PaddingVertical(6)
            .PaddingHorizontal(4);

    private static IContainer TableBodyCellStyle(IContainer container) =>
        container.BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten2)
            .PaddingVertical(6)
            .PaddingHorizontal(4);

    private static string ResolveClientCompanyName(Client? client)
    {
        if (!string.IsNullOrWhiteSpace(client?.CompanyName))
        {
            return client.CompanyName;
        }

        return "Client";
    }

    private static string FormatStatus(InvoiceStatus status) =>
        status switch
        {
            InvoiceStatus.Draft => "Draft",
            InvoiceStatus.Sent => "Sent",
            InvoiceStatus.Viewed => "Viewed",
            InvoiceStatus.PartiallyPaid => "Partially paid",
            InvoiceStatus.Paid => "Paid",
            InvoiceStatus.Overdue => "Overdue",
            InvoiceStatus.Cancelled => "Cancelled",
            _ => status.ToString(),
        };

    private static string FormatDate(DateTime value) =>
        value.ToString("d MMM yyyy", CultureInfo.InvariantCulture);

    private static string FormatDateOnly(DateOnly value) =>
        value.ToString("d MMM yyyy", CultureInfo.InvariantCulture);

    private static string FormatMoney(decimal amount) =>
        amount.ToString("N2", InvariantCulture);

    private static string FormatMoney(decimal amount, string currency) =>
        $"{currency} {FormatMoney(amount)}";

    private static string FormatQuantity(decimal quantity) =>
        quantity.ToString("0.##", InvariantCulture);

    private static string FormatTaxRate(decimal taxRate) =>
        $"{(taxRate * 100m).ToString("0.##", InvariantCulture)}%";

    private static string NormalizeHexColour(string? colour)
    {
        if (string.IsNullOrWhiteSpace(colour))
        {
            return "#2563EB";
        }

        string trimmed = colour.Trim();
        if (trimmed.StartsWith('#') && (trimmed.Length == 7 || trimmed.Length == 4))
        {
            return trimmed;
        }

        return "#2563EB";
    }

    private static string SanitizeFileName(string fileName)
    {
        char[] invalidChars = Path.GetInvalidFileNameChars();
        string sanitized = new(fileName.Select(ch => invalidChars.Contains(ch) ? '-' : ch).ToArray());
        return string.IsNullOrWhiteSpace(sanitized) ? "invoice.pdf" : sanitized;
    }

    private sealed record InvoicePdfBranding(
        string BusinessName,
        string? Domain,
        string BrandColourHex,
        string? LogoUrl);
}
