import { PrismaClient } from '@prisma/client';

export type TransactionType = 
  | 'MINING_REWARD'
  | 'AUCTION_BID'
  | 'AUCTION_SALE'
  | 'P2P_TRANSFER'
  | 'RECHARGE'
  | 'WITHDRAWAL'
  | 'REFUND';

export interface Wallet {
  id: number;
  userId: string;
  balance: number;
  frozenBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  createdAt: Date;
}

export class WalletService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建钱包
   */
  async createWallet(userId: string): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        frozenBalance: 0,
      },
    });
  }

  /**
   * 获取余额
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    return wallet?.balance ?? 0;
  }

  /**
   * 获取可用余额
   */
  async getAvailableBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) return 0;
    return wallet.balance - wallet.frozenBalance;
  }

  /**
   * 充值
   */
  async credit(userId: string, amount: number, type: TransactionType, description?: string): Promise<Wallet> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    await this.validateTransaction(amount, type);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type,
          amount,
          description,
        },
      });

      return wallet;
    });
  }

  /**
   * 扣款
   */
  async debit(userId: string, amount: number, type: TransactionType, description?: string): Promise<Wallet> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await this.validateTransaction(amount, type);

    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type,
          amount: -amount,
          description,
        },
      });

      return updatedWallet;
    });
  }

  /**
   * 转账
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    type: TransactionType,
    description?: string
  ): Promise<{ fromWallet: Wallet; toWallet: Wallet }> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      // Debit from sender
      const fromWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
      });

      if (!fromWallet || fromWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const updatedFromWallet = await tx.wallet.update({
        where: { userId: fromUserId },
        data: {
          balance: { decrement: amount },
        },
      });

      // Credit to receiver
      const toWallet = await tx.wallet.findUnique({
        where: { userId: toUserId },
      });

      let updatedToWallet: Wallet;
      if (toWallet) {
        updatedToWallet = await tx.wallet.update({
          where: { userId: toUserId },
          data: {
            balance: { increment: amount },
          },
        });
      } else {
        updatedToWallet = await tx.wallet.create({
          data: {
            userId: toUserId,
            balance: amount,
            frozenBalance: 0,
          },
        });
      }

      // Create transaction records
      await tx.transaction.create({
        data: {
          userId: fromUserId,
          type,
          amount: -amount,
          description: description ? `Sent to ${toUserId}: ${description}` : `Sent to ${toUserId}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: toUserId,
          type,
          amount,
          description: description ? `Received from ${fromUserId}: ${description}` : `Received from ${fromUserId}`,
        },
      });

      return { fromWallet: updatedFromWallet, toWallet: updatedToWallet };
    });
  }

  /**
   * 冻结资金
   */
  async freeze(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance - wallet.frozenBalance < amount) {
      throw new Error('Insufficient available balance');
    }

    return this.prisma.wallet.update({
      where: { userId },
      data: {
        frozenBalance: { increment: amount },
      },
    });
  }

  /**
   * 解冻资金
   */
  async unfreeze(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.frozenBalance < amount) {
      throw new Error('Insufficient frozen balance');
    }

    return this.prisma.wallet.update({
      where: { userId },
      data: {
        frozenBalance: { decrement: amount },
      },
    });
  }

  /**
   * 获取交易历史
   */
  async getTransactionHistory(userId: string, limit: number = 10, offset: number = 0): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取或创建钱包
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    return wallet;
  }

  /**
   * 验证交易
   */
  async validateTransaction(amount: number, type: TransactionType): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (amount >= 1_000_000_000) {
      throw new Error('Amount exceeds maximum limit');
    }

    const validTypes: TransactionType[] = [
      'MINING_REWARD',
      'AUCTION_BID',
      'AUCTION_SALE',
      'P2P_TRANSFER',
      'RECHARGE',
      'WITHDRAWAL',
      'REFUND',
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`Invalid transaction type: ${type}`);
    }
  }

  /**
   * 获取总余额 (可用 + 冻结)
   */
  async getTotalBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) return 0;
    return (wallet.balance ?? 0) + (wallet.frozenBalance ?? 0);
  }
}
