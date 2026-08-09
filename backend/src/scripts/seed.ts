import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

async function seedDatabase() {
  try {
    await AppDataSource.initialize();
    logger.info('📊 Database connected for seeding');

    const accountRepo = AppDataSource.getRepository(Account);
    const transactionRepo = AppDataSource.getRepository(Transaction);

    // Crear cuentas de ejemplo
    const accountData = [
      { name: 'BBVA Débito', type: 'debit' as const, initial_balance: 10000 },
      { name: 'Nu México', type: 'savings' as const, initial_balance: 5000 },
      { name: 'Efectivo', type: 'cash' as const, initial_balance: 2000 },
      { name: 'BBVA Crédito', type: 'credit' as const, initial_balance: 0, credit_limit: 15000 },
    ];

    for (const accountDataItem of accountData) {
      const existing = await accountRepo.findOne({ 
        where: { name: accountDataItem.name } 
      });
      
      if (!existing) {
        const account = accountRepo.create(accountDataItem);
        await accountRepo.save(account);
        logger.info(`✅ Account created: ${account.name}`);
      }
    }

    // Crear algunas transacciones de ejemplo
    const savedAccounts = await accountRepo.find();
    const bbvaDebit = savedAccounts.find(a => a.name === 'BBVA Débito');
    const nu = savedAccounts.find(a => a.name === 'Nu México');

    if (bbvaDebit) {
      const transactionData = [
        {
          date: new Date('2026-08-01'),
          description: 'Supermercado',
          amount: 350,
          type: 'expense' as const,
          category: 'Comida',
          budget_type: 'need' as const,
          account_id: bbvaDebit.id
        },
        {
          date: new Date('2026-08-02'),
          description: 'Sueldo',
          amount: 15000,
          type: 'income' as const,
          category: 'Salario',
          budget_type: undefined,
          account_id: bbvaDebit.id
        },
        {
          date: new Date('2026-08-03'),
          description: 'Cena con amigos',
          amount: 450,
          type: 'expense' as const,
          category: 'Entretenimiento',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id
        }
      ];

      for (const transactionDataItem of transactionData) {
        const transaction = transactionRepo.create(transactionDataItem);
        await transactionRepo.save(transaction);
        logger.info(`✅ Transaction created: ${transaction.description}`);
      }
    }

    logger.info('🌱 Seed completed successfully');
    await AppDataSource.destroy();
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();