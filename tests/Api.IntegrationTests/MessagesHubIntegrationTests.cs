using Api.Communication;
using Application.Abstractions;
using Application.Messaging;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shared;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Api.IntegrationTests;

public sealed class MessagesHubIntegrationTests
{
    [Fact]
    public async Task BroadcastMessage_ShouldDeliverToJoinedParticipants()
    {
        Guid threadId = Guid.NewGuid();
        Guid senderId = Guid.NewGuid();
        Guid receiverId = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, senderId, receiverId);
        await using HubConnection sender = host.CreateConnection(senderId);
        await using HubConnection receiver = host.CreateConnection(receiverId);

        RealtimeMessagePayload? receivedPayload = null;
        TaskCompletionSource<bool> receivedTcs = CreateTcs();
        receiver.On<RealtimeMessagePayload>("message-received", payload =>
        {
            receivedPayload = payload;
            receivedTcs.TrySetResult(true);
        });

        await sender.StartAsync();
        await receiver.StartAsync();
        await sender.InvokeAsync("JoinThreadAsync", threadId);
        await receiver.InvokeAsync("JoinThreadAsync", threadId);

        RealtimeMessagePayload payload = new(
            Guid.NewGuid(),
            threadId,
            senderId,
            "Owner",
            "Hello from realtime",
            1,
            MessageStatus.Sent,
            DateTime.UtcNow);
        await host.RealtimeMessagingService.BroadcastMessageAsync(payload);

        await WaitAsync(receivedTcs.Task);

        Assert.NotNull(receivedPayload);
        Assert.Equal(payload.ThreadId, receivedPayload!.ThreadId);
        Assert.Equal(payload.Content, receivedPayload.Content);
    }

    [Fact]
    public async Task BroadcastReadReceipt_ShouldDeliverToJoinedParticipants()
    {
        Guid threadId = Guid.NewGuid();
        Guid readerId = Guid.NewGuid();
        Guid participantId = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, readerId, participantId);
        await using HubConnection reader = host.CreateConnection(readerId);
        await using HubConnection participant = host.CreateConnection(participantId);

        RealtimeReadReceiptPayload? receipt = null;
        TaskCompletionSource<bool> receiptTcs = CreateTcs();
        participant.On<RealtimeReadReceiptPayload>("read-receipt", payload =>
        {
            receipt = payload;
            receiptTcs.TrySetResult(true);
        });

        await reader.StartAsync();
        await participant.StartAsync();
        await reader.InvokeAsync("JoinThreadAsync", threadId);
        await participant.InvokeAsync("JoinThreadAsync", threadId);

        RealtimeReadReceiptPayload payload = new(threadId, readerId, 3, DateTime.UtcNow);
        await host.RealtimeMessagingService.BroadcastReadReceiptAsync(payload);

        await WaitAsync(receiptTcs.Task);

        Assert.NotNull(receipt);
        Assert.Equal(3, receipt!.ReadCount);
        Assert.Equal(readerId, receipt.ReaderId);
    }

    [Fact]
    public async Task BroadcastTyping_ShouldNotifyOtherParticipantsOnly()
    {
        Guid threadId = Guid.NewGuid();
        Guid typerId = Guid.NewGuid();
        Guid listenerId = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, typerId, listenerId);
        await using HubConnection typer = host.CreateConnection(typerId);
        await using HubConnection listener = host.CreateConnection(listenerId);

        RealtimeTypingPayload? listenerPayload = null;
        TaskCompletionSource<bool> listenerTcs = CreateTcs();
        listener.On<RealtimeTypingPayload>("user-typing", payload =>
        {
            listenerPayload = payload;
            listenerTcs.TrySetResult(true);
        });

        bool selfReceived = false;
        typer.On<RealtimeTypingPayload>("user-typing", _ => selfReceived = true);

        await typer.StartAsync();
        await listener.StartAsync();
        await typer.InvokeAsync("JoinThreadAsync", threadId);
        await listener.InvokeAsync("JoinThreadAsync", threadId);

        await typer.InvokeAsync("BroadcastTypingAsync", threadId, true);
        await WaitAsync(listenerTcs.Task);
        await Task.Delay(50);

        Assert.NotNull(listenerPayload);
        Assert.Equal(typerId, listenerPayload!.UserId);
        Assert.False(selfReceived);
    }

    [Fact]
    public async Task RecoverThread_ShouldRequestClientRestResync()
    {
        Guid threadId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, userId);
        await using HubConnection connection = host.CreateConnection(userId);

        Guid recoveredThreadId = Guid.Empty;
        long recoveredSequence = -1;
        TaskCompletionSource<bool> resyncTcs = CreateTcs();
        connection.On<Guid, long>("thread-resync-required", (id, sequence) =>
        {
            recoveredThreadId = id;
            recoveredSequence = sequence;
            resyncTcs.TrySetResult(true);
        });

        await connection.StartAsync();
        await connection.InvokeAsync("RecoverThreadAsync", threadId, 42L);
        await WaitAsync(resyncTcs.Task);

        Assert.Equal(threadId, recoveredThreadId);
        Assert.Equal(42L, recoveredSequence);
    }

    [Fact]
    public async Task JoinThread_ShouldRejectUnauthorizedParticipant()
    {
        Guid threadId = Guid.NewGuid();
        Guid allowedUser = Guid.NewGuid();
        Guid deniedUser = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, allowedUser);
        await using HubConnection deniedConnection = host.CreateConnection(deniedUser);

        await deniedConnection.StartAsync();

        HubException exception = await Assert.ThrowsAsync<HubException>(() =>
            deniedConnection.InvokeAsync("JoinThreadAsync", threadId));

        Assert.Contains("not authorized", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Connection_ShouldRejectUnauthenticatedClients()
    {
        Guid threadId = Guid.NewGuid();
        Guid participant = Guid.NewGuid();

        await using TestHubHost host = await TestHubHost.CreateAsync(threadId, participant);
        await using HubConnection unauthenticated = host.CreateConnection(null);

        await Assert.ThrowsAnyAsync<Exception>(() => unauthenticated.StartAsync());
    }

    private static async Task WaitAsync(Task task)
    {
        Task timeout = Task.Delay(TimeSpan.FromSeconds(3));
        Task completed = await Task.WhenAny(task, timeout);
        Assert.Same(task, completed);
        await task;
    }

    private static TaskCompletionSource<bool> CreateTcs()
    {
        return new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    private sealed class TestHubHost : IAsyncDisposable
    {
        private readonly WebApplication _app;

        private TestHubHost(WebApplication app, Guid threadId, IReadOnlyCollection<Guid> participants)
        {
            _app = app;
            ThreadId = threadId;
            Participants = participants;
        }

        public Guid ThreadId { get; }

        public IReadOnlyCollection<Guid> Participants { get; }

        public IRealtimeMessagingService RealtimeMessagingService =>
            _app.Services.GetRequiredService<IRealtimeMessagingService>();

        public static async Task<TestHubHost> CreateAsync(Guid threadId, params Guid[] participants)
        {
            WebApplicationBuilder builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                EnvironmentName = "Development"
            });

            builder.WebHost.UseTestServer();
            builder.Services.AddLogging();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddSignalR();
            builder.Services.AddAuthorization(options =>
            {
                options.FallbackPolicy = new AuthorizationPolicyBuilder()
                    .AddAuthenticationSchemes(TestAuthHandler.SchemeName)
                    .RequireAuthenticatedUser()
                    .Build();
            });
            builder.Services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            builder.Services.AddSingleton<IMessageThreadRepository>(new InMemoryThreadRepository(threadId, participants));
            builder.Services.AddSingleton<IConnectionPresenceTracker, ConnectionPresenceTracker>();
            builder.Services.AddSingleton<ISender, NoOpSender>();
            builder.Services.AddSingleton<ICurrentTenant, TestCurrentTenant>();
            builder.Services.AddSingleton<IRealtimeMessagingService, SignalRRealtimeMessagingService>();
            builder.Services.AddSingleton<IHubFilter, MessagesHubGuardFilter>();

            WebApplication app = builder.Build();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapHub<MessagesHub>("/hubs/messages").RequireAuthorization();
            await app.StartAsync();

            return new TestHubHost(app, threadId, participants);
        }

        public HubConnection CreateConnection(Guid? userId)
        {
            string token = userId.HasValue ? userId.Value.ToString("D") : string.Empty;
            return new HubConnectionBuilder()
                .WithUrl("http://localhost/hubs/messages", options =>
                {
                    options.HttpMessageHandlerFactory = _ => _app.GetTestServer().CreateHandler();
                    options.Headers["X-Tenant-Slug"] = "tenant-integration";
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        options.Headers["Authorization"] = $"{TestAuthHandler.SchemeName} {token}";
                    }
                })
                .Build();
        }

        public async ValueTask DisposeAsync()
        {
            await _app.StopAsync();
            await _app.DisposeAsync();
        }
    }

    private sealed class InMemoryThreadRepository : IMessageThreadRepository
    {
        private readonly MessageThread _thread;

        public InMemoryThreadRepository(Guid threadId, IReadOnlyCollection<Guid> participants)
        {
            _thread = MessageThread.Create(
                threadId,
                Guid.NewGuid(),
                null,
                participants,
                "Integration Thread",
                DateTime.UtcNow);
        }

        public Task<MessageThread?> FindByIdAsync(Guid threadId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(threadId == _thread.Id ? _thread : null);
        }

        public Task<PagedResult<MessageThreadListItemDto>> GetPagedForParticipantAsync(
            Guid participantId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            _ = participantId;
            _ = page;
            _ = pageSize;
            return Task.FromResult(new PagedResult<MessageThreadListItemDto>([], 0, 1, 1));
        }

        public void Add(MessageThread thread)
        {
            _ = thread;
        }

        public void Update(MessageThread thread)
        {
            _ = thread;
        }
    }

    private sealed class NoOpSender : ISender
    {
        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
            where TRequest : IRequest
        {
            _ = cancellationToken;
            if (request is MarkThreadDeliveredCommand or MarkThreadReadCommand)
            {
                return Task.CompletedTask;
            }

            throw new InvalidOperationException($"Unexpected request type {request.GetType().Name}");
        }

        public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            _ = cancellationToken;
            if (request is MarkThreadDeliveredCommand)
            {
                return Task.FromResult((TResponse)(object)Result<int>.Success(0));
            }

            throw new InvalidOperationException($"Unexpected request type {request.GetType().Name}");
        }

        public Task<object?> Send(object request, CancellationToken cancellationToken = default)
        {
            _ = request;
            _ = cancellationToken;
            return Task.FromResult<object?>(null);
        }

        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            _ = request;
            _ = cancellationToken;
            return AsyncEnumerable.Empty<TResponse>();
        }

        public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default)
        {
            _ = request;
            _ = cancellationToken;
            return AsyncEnumerable.Empty<object?>();
        }
    }

    private sealed class TestCurrentTenant : ICurrentTenant
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TestCurrentTenant(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string? TenantId => "tenant-integration";

        public string? Slug =>
            _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Slug"].ToString();

        public TenantSettings? Settings => null;

        public bool IsResolved => !string.IsNullOrWhiteSpace(Slug);
    }

    private sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "TestAuth";

        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            string? authorization = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrWhiteSpace(authorization) ||
                !authorization.StartsWith($"{SchemeName} ", StringComparison.Ordinal))
            {
                return Task.FromResult(AuthenticateResult.Fail("Missing test authorization header."));
            }

            string value = authorization[(SchemeName.Length + 1)..];
            if (!Guid.TryParse(value, out Guid userId) || userId == Guid.Empty)
            {
                return Task.FromResult(AuthenticateResult.Fail("Invalid test authorization user id."));
            }

            Claim[] claims =
            [
                new("userId", userId.ToString("D")),
                new(ClaimTypes.NameIdentifier, userId.ToString("D"))
            ];
            ClaimsIdentity identity = new(claims, SchemeName);
            ClaimsPrincipal principal = new(identity);
            AuthenticationTicket ticket = new(principal, SchemeName);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
