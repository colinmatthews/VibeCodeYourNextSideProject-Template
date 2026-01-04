import { UserStorage } from './UserStorage';
import { ItemStorage } from './ItemStorage';
import { FileStorage } from './FileStorage';
import { ThreadStorage } from './ThreadStorage';
import { MessageStorage } from './MessageStorage';
import { type Item, type InsertItem, type User, type InsertUser, type File, type InsertFile, type AiThread, type InsertAiThread, type AiMessage, type InsertAiMessage } from "@shared/schema";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
  subscriptionType?: "free" | "pro";
  stripeCustomerId?: string;
}

interface UpdateThreadData {
  title?: string;
  archived?: boolean;
}

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;

  // Item operations
  getItemsByUserId(userId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  // File operations
  getFilesByUserId(userId: string): Promise<File[]>;
  getFileById(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getFileByPath(path: string): Promise<File | undefined>;

  // Thread operations
  getThreadsByUserId(userId: string): Promise<AiThread[]>;
  getActiveThreadsByUserId(userId: string): Promise<AiThread[]>;
  getArchivedThreadsByUserId(userId: string): Promise<AiThread[]>;
  getThreadById(id: string): Promise<AiThread | undefined>;
  getThreadByIdAndUserId(id: string, userId: string): Promise<AiThread | undefined>;
  createThread(thread: InsertAiThread): Promise<AiThread>;
  updateThread(id: string, userId: string, data: UpdateThreadData): Promise<AiThread | undefined>;
  deleteThread(id: string, userId: string): Promise<void>;

  // Message operations
  getMessagesByThreadId(threadId: string): Promise<AiMessage[]>;
  getMessageById(id: string): Promise<AiMessage | undefined>;
  createMessage(message: InsertAiMessage): Promise<AiMessage>;
  createMessages(messages: InsertAiMessage[]): Promise<AiMessage[]>;
  messageExistsByContent(threadId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<boolean>;
  deleteMessage(id: string): Promise<void>;
  deleteMessagesByThreadId(threadId: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private userStorage: UserStorage;
  private itemStorage: ItemStorage;
  private fileStorage: FileStorage;
  private threadStorage: ThreadStorage;
  private messageStorage: MessageStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.itemStorage = new ItemStorage();
    this.fileStorage = new FileStorage();
    this.threadStorage = new ThreadStorage();
    this.messageStorage = new MessageStorage();
  }

  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    return this.userStorage.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.userStorage.createUser(user);
  }

  async upsertUser(user: InsertUser): Promise<User> {
    return this.userStorage.upsertUser(user);
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    return this.userStorage.updateUser(id, data);
  }

  // Item operations
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return this.itemStorage.getItemsByUserId(userId);
  }

  async createItem(item: InsertItem): Promise<Item> {
    return this.itemStorage.createItem(item);
  }

  async deleteItem(id: number): Promise<void> {
    return this.itemStorage.deleteItem(id);
  }

  // File operations
  async getFilesByUserId(userId: string): Promise<File[]> {
    return this.fileStorage.getFilesByUserId(userId);
  }

  async getFileById(id: number): Promise<File | undefined> {
    return this.fileStorage.getFileById(id);
  }

  async createFile(file: InsertFile): Promise<File> {
    return this.fileStorage.createFile(file);
  }

  async deleteFile(id: number): Promise<void> {
    return this.fileStorage.deleteFile(id);
  }

  async getFileByPath(path: string): Promise<File | undefined> {
    return this.fileStorage.getFileByPath(path);
  }

  // Thread operations
  async getThreadsByUserId(userId: string): Promise<AiThread[]> {
    return this.threadStorage.getThreadsByUserId(userId);
  }

  async getActiveThreadsByUserId(userId: string): Promise<AiThread[]> {
    return this.threadStorage.getActiveThreadsByUserId(userId);
  }

  async getArchivedThreadsByUserId(userId: string): Promise<AiThread[]> {
    return this.threadStorage.getArchivedThreadsByUserId(userId);
  }

  async getThreadById(id: string): Promise<AiThread | undefined> {
    return this.threadStorage.getThreadById(id);
  }

  async getThreadByIdAndUserId(id: string, userId: string): Promise<AiThread | undefined> {
    return this.threadStorage.getThreadByIdAndUserId(id, userId);
  }

  async createThread(thread: InsertAiThread): Promise<AiThread> {
    return this.threadStorage.createThread(thread);
  }

  async updateThread(id: string, userId: string, data: UpdateThreadData): Promise<AiThread | undefined> {
    return this.threadStorage.updateThread(id, userId, data);
  }

  async deleteThread(id: string, userId: string): Promise<void> {
    return this.threadStorage.deleteThread(id, userId);
  }

  // Message operations
  async getMessagesByThreadId(threadId: string): Promise<AiMessage[]> {
    return this.messageStorage.getMessagesByThreadId(threadId);
  }

  async getMessageById(id: string): Promise<AiMessage | undefined> {
    return this.messageStorage.getMessageById(id);
  }

  async createMessage(message: InsertAiMessage): Promise<AiMessage> {
    return this.messageStorage.createMessage(message);
  }

  async createMessages(messages: InsertAiMessage[]): Promise<AiMessage[]> {
    return this.messageStorage.createMessages(messages);
  }

  async messageExistsByContent(threadId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<boolean> {
    return this.messageStorage.messageExistsByContent(threadId, role, content);
  }

  async deleteMessage(id: string): Promise<void> {
    return this.messageStorage.deleteMessage(id);
  }

  async deleteMessagesByThreadId(threadId: string): Promise<void> {
    return this.messageStorage.deleteMessagesByThreadId(threadId);
  }
}

export const storage = new PostgresStorage();
export { UpdateUserData, UpdateThreadData };
