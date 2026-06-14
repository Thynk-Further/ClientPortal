export interface MessageAttachmentMetadata {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

export interface MessageHistoryItem {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  clientMessageId: string;
  sequenceNumber: number;
  content: string;
  replyToMessageId: string | null;
  emojiReaction: string | null;
  attachment: MessageAttachmentMetadata | null;
  attachmentExpiresAt: string | null;
  status: MessageStatus;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface MessageThreadListItem {
  id: string;
  clientId: string;
  projectId: string | null;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface RealtimeMessagePayload {
  messageId: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  content: string;
  replyToMessageId: string | null;
  emojiReaction: string | null;
  attachment: MessageAttachmentMetadata | null;
  attachmentExpiresAt: string | null;
  sequenceNumber: number;
  status: MessageStatus;
  sentAt: string;
}

export interface RealtimeDeliveryReceiptPayload {
  threadId: string;
  recipientId: string;
  deliveredCount: number;
  deliveredAt: string;
}

export interface RealtimeReadReceiptPayload {
  threadId: string;
  readerId: string;
  readCount: number;
  readAt: string;
}

export interface RealtimeTypingPayload {
  threadId: string;
  userId: string;
  isTyping: boolean;
  at: string;
}

export enum MessageStatus {
  Sent = 1,
  Delivered = 2,
  Read = 3,
}

export const CLIENT_SENDER_ROLE = 'ClientUser';

export function isClientMessage(senderRole: string): boolean {
  return senderRole === CLIENT_SENDER_ROLE;
}

export function mapRealtimePayloadToHistoryItem(payload: RealtimeMessagePayload): MessageHistoryItem {
  return {
    id: payload.messageId,
    threadId: payload.threadId,
    senderId: payload.senderId,
    senderRole: payload.senderRole,
    clientMessageId: '',
    sequenceNumber: payload.sequenceNumber,
    content: payload.content,
    replyToMessageId: payload.replyToMessageId,
    emojiReaction: payload.emojiReaction,
    attachment: payload.attachment,
    attachmentExpiresAt: payload.attachmentExpiresAt,
    status: payload.status,
    sentAt: payload.sentAt,
    deliveredAt: null,
    readAt: null,
  };
}

export function isImageAttachment(contentType: string): boolean {
  return contentType.startsWith('image/');
}
