import { Injectable, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';

import { TokenStorageService } from '../auth/token-storage.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  RealtimeDeliveryReceiptPayload,
  RealtimeMessagePayload,
  RealtimeReadReceiptPayload,
  RealtimeTypingPayload,
} from './messaging.models';

@Injectable({ providedIn: 'root' })
export class MessagingHubService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly tenantContext = inject(TenantContextService);

  private connection: HubConnection | null = null;
  private joinedThreadId: string | null = null;

  readonly connectionState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');

  readonly messageReceived$ = new Subject<RealtimeMessagePayload>();
  readonly deliveryReceipt$ = new Subject<RealtimeDeliveryReceiptPayload>();
  readonly readReceipt$ = new Subject<RealtimeReadReceiptPayload>();
  readonly typing$ = new Subject<RealtimeTypingPayload>();
  readonly stoppedTyping$ = new Subject<RealtimeTypingPayload>();
  readonly threadResyncRequired$ = new Subject<{ threadId: string; lastSeenSequenceNumber: number }>();

  async connect(): Promise<void> {
    if (
      this.connection?.state === HubConnectionState.Connected ||
      this.connection?.state === HubConnectionState.Connecting
    ) {
      return;
    }

    const accessToken = this.tokenStorage.getAccessToken();
    if (accessToken === null) {
      throw new Error('Cannot connect to messaging hub without an access token.');
    }

    this.connectionState.set('connecting');

    const headers: Record<string, string> = {};
    const tenantId = this.tenantContext.getTenantId();
    if (tenantId !== null && tenantId.trim() !== '') {
      headers[this.tenantContext.getHeaderName()] = tenantId;
    }

    const tenantSlug = this.tenantContext.getTenantSlug();
    if (tenantSlug !== null && tenantSlug.trim() !== '') {
      headers[this.tenantContext.getSlugHeaderName()] = tenantSlug;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(`/hubs/messages?access_token=${encodeURIComponent(accessToken)}`, {
        headers,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.registerHandlers(this.connection);

    this.connection.onreconnected(async () => {
      this.connectionState.set('connected');
      if (this.joinedThreadId !== null) {
        await this.connection?.invoke('JoinThreadAsync', this.joinedThreadId);
      }
    });

    this.connection.onclose(() => {
      this.connectionState.set('disconnected');
    });

    await this.connection.start();
    this.connectionState.set('connected');
  }

  async disconnect(): Promise<void> {
    if (this.joinedThreadId !== null) {
      await this.leaveThread(this.joinedThreadId);
    }

    if (this.connection !== null) {
      await this.connection.stop();
      this.connection = null;
    }

    this.connectionState.set('disconnected');
  }

  async joinThread(threadId: string): Promise<void> {
    await this.ensureConnected();
    if (this.joinedThreadId !== null && this.joinedThreadId !== threadId) {
      await this.leaveThread(this.joinedThreadId);
    }

    await this.connection!.invoke('JoinThreadAsync', threadId);
    this.joinedThreadId = threadId;
  }

  async leaveThread(threadId: string): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) {
      return;
    }

    await this.connection.invoke('LeaveThreadAsync', threadId);
    if (this.joinedThreadId === threadId) {
      this.joinedThreadId = null;
    }
  }

  async broadcastTyping(threadId: string, isTyping: boolean): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) {
      return;
    }

    await this.connection.invoke('BroadcastTypingAsync', threadId, isTyping);
  }

  private async ensureConnected(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    await this.connect();
  }

  private registerHandlers(connection: HubConnection): void {
    connection.on('message-received', (payload: RealtimeMessagePayload) => {
      this.messageReceived$.next(payload);
    });

    connection.on('delivery-receipt', (payload: RealtimeDeliveryReceiptPayload) => {
      this.deliveryReceipt$.next(payload);
    });

    connection.on('read-receipt', (payload: RealtimeReadReceiptPayload) => {
      this.readReceipt$.next(payload);
    });

    connection.on('user-typing', (payload: RealtimeTypingPayload) => {
      this.typing$.next(payload);
    });

    connection.on('user-stopped-typing', (payload: RealtimeTypingPayload) => {
      this.stoppedTyping$.next(payload);
    });

    connection.on(
      'thread-resync-required',
      (threadId: string, lastSeenSequenceNumber: number) => {
        this.threadResyncRequired$.next({ threadId, lastSeenSequenceNumber });
      },
    );
  }
}
