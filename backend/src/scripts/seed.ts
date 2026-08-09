import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { Debt } from '../models/Debt';
import { Receivable } from '../models/Receivable';
import { Goal } from '../models/Goal';
import { Investment } from '../models/Investment';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { logger } from '../utils/logger';
import * as bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    await AppDataSource.initialize();
    logger.info('📊 Database connected for seeding');

    const userRepo = AppDataSource.getRepository(User);
    const accountRepo = AppDataSource.getRepository(Account);
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const budgetRepo = AppDataSource.getRepository(Budget);
    const debtRepo = AppDataSource.getRepository(Debt);
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const goalRepo = AppDataSource.getRepository(Goal);
    const investmentRepo = AppDataSource.getRepository(Investment);
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);

    // Usuario de prueba
    const passwordHash = bcrypt.hashSync('TestPass123!', 12);
    let testUser = await userRepo.findOne({ where: { username: 'testuser' } });
    if (!testUser) {
      testUser = userRepo.create({
        username: 'testuser',
        email: 'test@finance.com',
        password_hash: passwordHash,
        is_active: true,
      });
      await userRepo.save(testUser);
      logger.info('✅ User created: testuser / TestPass123!');
    }
    const userId = testUser.id;

    if (testUser.monthly_income === null || testUser.monthly_income === undefined) {
      testUser.monthly_income = 15000;
      await userRepo.save(testUser);
      logger.info('✅ User monthly income set to 15000');
    }

    // Adoptar registros huérfanos (sin user_id) al usuario de prueba
    const orphanRepos = [
      accountRepo, transactionRepo, budgetRepo, debtRepo,
      receivableRepo, goalRepo, investmentRepo, recurringRepo,
    ];
    for (const repo of orphanRepos) {
      await repo.createQueryBuilder().update().set({ userId }).where('user_id IS NULL').execute();
    }
    logger.info('✅ Orphaned records adopted by user testuser');

    // Cuentas de ejemplo
    const accountData = [
      { name: 'BBVA Débito', type: 'debit' as const, initial_balance: 10000 },
      { name: 'Nu México', type: 'savings' as const, initial_balance: 5000, interest_rate: 4.5 },
      { name: 'Efectivo', type: 'cash' as const, initial_balance: 2000 },
      { name: 'BBVA Crédito', type: 'credit' as const, initial_balance: 0, credit_limit: 15000 },
      { name: 'Banorte Débito', type: 'debit' as const, initial_balance: 3500 },
      { name: 'CETES Directo', type: 'investment' as const, initial_balance: 50000 },
    ];

    for (const accountDataItem of accountData) {
      const existing = await accountRepo.findOne({
        where: { name: accountDataItem.name },
      });

      if (!existing) {
        const account = accountRepo.create({ ...accountDataItem, userId });
        await accountRepo.save(account);
        logger.info(`✅ Account created: ${account.name}`);
      }
    }

    // Transacciones de ejemplo
    const savedAccounts = await accountRepo.find();
    const bbvaDebit = savedAccounts.find(a => a.name === 'BBVA Débito');
    const nu = savedAccounts.find(a => a.name === 'Nu México');
    const cash = savedAccounts.find(a => a.name === 'Efectivo');
    const credit = savedAccounts.find(a => a.name === 'BBVA Crédito');

    if (bbvaDebit && nu && cash && credit) {
      const transactionData = [
        {
          date: new Date('2026-07-01'),
          description: 'Sueldo',
          amount: 15000,
          type: 'income' as const,
          category: 'Salario',
          budget_type: undefined,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-05'),
          description: 'Supermercado',
          amount: 350,
          type: 'expense' as const,
          category: 'Comida',
          budget_type: 'need' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-08'),
          description: 'Cena con amigos',
          amount: 450,
          type: 'expense' as const,
          category: 'Entretenimiento',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-12'),
          description: 'Netflix',
          amount: 219,
          type: 'expense' as const,
          category: 'Suscripciones',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-15'),
          description: 'Renta departamento',
          amount: 4500,
          type: 'expense' as const,
          category: 'Vivienda',
          budget_type: 'need' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-18'),
          description: 'Gasolina',
          amount: 600,
          type: 'expense' as const,
          category: 'Transporte',
          budget_type: 'need' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-20'),
          description: 'Transferencia a ahorro',
          amount: 2000,
          type: 'transfer' as const,
          category: 'Ahorro',
          budget_type: undefined,
          account_id: bbvaDebit.id,
          destination_account_id: nu.id,
        },
        {
          date: new Date('2026-07-22'),
          description: 'Freelance diseño',
          amount: 3000,
          type: 'income' as const,
          category: 'Ingresos extra',
          budget_type: undefined,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-07-25'),
          description: 'Compras supermercado',
          amount: 820,
          type: 'expense' as const,
          category: 'Comida',
          budget_type: 'need' as const,
          account_id: credit.id,
        },
        {
          date: new Date('2026-07-28'),
          description: 'Cinépolis',
          amount: 280,
          type: 'expense' as const,
          category: 'Entretenimiento',
          budget_type: 'want' as const,
          account_id: cash.id,
        },
        {
          date: new Date('2026-08-01'),
          description: 'Sueldo',
          amount: 15000,
          type: 'income' as const,
          category: 'Salario',
          budget_type: undefined,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-08-03'),
          description: 'Supermercado',
          amount: 350,
          type: 'expense' as const,
          category: 'Comida',
          budget_type: 'need' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-08-04'),
          description: 'Cena con amigos',
          amount: 450,
          type: 'expense' as const,
          category: 'Entretenimiento',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-08-06'),
          description: 'Spotify',
          amount: 129,
          type: 'expense' as const,
          category: 'Suscripciones',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id,
        },
        {
          date: new Date('2026-08-08'),
          description: 'Vestimenta',
          amount: 950,
          type: 'expense' as const,
          category: 'Ropa',
          budget_type: 'want' as const,
          account_id: bbvaDebit.id,
        },
      ];

      for (const transactionDataItem of transactionData) {
        const existing = await transactionRepo.findOne({
          where: {
            description: transactionDataItem.description,
            date: transactionDataItem.date,
            account_id: transactionDataItem.account_id,
          },
        });

        if (!existing) {
          const transaction = transactionRepo.create({ ...transactionDataItem, userId });
          await transactionRepo.save(transaction);
          logger.info(`✅ Transaction created: ${transaction.description}`);
        }
      }
    }

    // Presupuestos de ejemplo
    const budgetData = [
      { month: new Date('2026-08-01'), budget_type: 'need', percentage: 50, target_amount: 7500, notes: 'Presupuesto de necesidades' },
      { month: new Date('2026-08-01'), budget_type: 'want', percentage: 30, target_amount: 4500, notes: 'Presupuesto de deseos' },
      { month: new Date('2026-08-01'), budget_type: 'save', percentage: 20, target_amount: 3000, notes: 'Ahorro mensual' },
    ];

    for (const budgetDataItem of budgetData) {
      const existing = await budgetRepo.findOne({
        where: {
          month: budgetDataItem.month,
          budget_type: budgetDataItem.budget_type,
        },
      });

      if (!existing) {
        const budget = budgetRepo.create({ ...budgetDataItem, userId });
        await budgetRepo.save(budget);
        logger.info(`✅ Budget created: ${budget.budget_type} ${budget.month.toISOString().slice(0, 7)}`);
      }
    }

    // Deudas de ejemplo
    const debtData = [
      {
        name: 'Tarjeta BBVA',
        creditor: 'BBVA',
        type: 'credit_card' as const,
        original_amount: 5000,
        interest_rate: 3.5,
        start_date: new Date('2026-03-15'),
        due_date: new Date('2026-12-15'),
        status: 'active',
        notes: 'Tasa mensual',
      },
      {
        name: 'Préstamo personal',
        creditor: 'Banco Azteca',
        type: 'personal' as const,
        original_amount: 12000,
        interest_rate: 12,
        start_date: new Date('2026-01-10'),
        due_date: new Date('2026-10-10'),
        status: 'active',
        notes: 'Tasa anual',
      },
      {
        name: 'Préstamo familiar',
        creditor: 'Luis Hernández',
        type: 'personal' as const,
        original_amount: 3000,
        interest_rate: 0,
        start_date: new Date('2025-12-01'),
        due_date: new Date('2026-06-01'),
        status: 'paid',
        notes: 'Liquidado',
      },
    ];

    for (const debtDataItem of debtData) {
      const existing = await debtRepo.findOne({ where: { name: debtDataItem.name } });

      if (!existing) {
        const debt = debtRepo.create({ ...debtDataItem, userId });
        await debtRepo.save(debt);
        logger.info(`✅ Debt created: ${debt.name}`);
      }
    }

    // Préstamos por cobrar
    const receivableData = [
      { person: 'Ana Martínez', description: 'Préstamo para curso', original_amount: 1500, due_date: new Date('2026-09-15'), status: 'pending', notes: 'Pagará quincenal' },
      { person: 'Carlos Ramírez', description: 'Mitad de vacaciones', original_amount: 800, due_date: new Date('2026-08-30'), status: 'pending' },
      { person: 'Mamá', description: 'Electrodoméstico', original_amount: 2500, due_date: new Date('2026-07-01'), status: 'paid', notes: 'Pagado' },
    ];

    for (const receivableDataItem of receivableData) {
      const existing = await receivableRepo.findOne({ where: { person: receivableDataItem.person, description: receivableDataItem.description } });

      if (!existing) {
        const receivable = receivableRepo.create({ ...receivableDataItem, userId });
        await receivableRepo.save(receivable);
        logger.info(`✅ Receivable created: ${receivable.person}`);
      }
    }

    // Metas de ahorro
    const goalData = [
      { name: 'Fondo de emergencia', target_amount: 30000, current_amount: 12000, target_date: new Date('2026-12-31'), priority: 1, account_id: nu?.id ?? null, notes: '3 meses de gastos' },
      { name: 'Viaje a CDMX', target_amount: 8000, current_amount: 3500, target_date: new Date('2026-10-15'), priority: 2, account_id: nu?.id ?? null },
      { name: 'Computadora nueva', target_amount: 25000, current_amount: 5000, target_date: new Date('2027-02-01'), priority: 3, account_id: nu?.id ?? null },
    ];

    for (const goalDataItem of goalData) {
      const existing = await goalRepo.findOne({ where: { name: goalDataItem.name } });

      if (!existing) {
        const goal = goalRepo.create({ ...goalDataItem, userId });
        await goalRepo.save(goal);
        logger.info(`✅ Goal created: ${goal.name}`);
      }
    }

    // Inversiones
    const investmentData = [
      { name: 'S&P 500 ETF', ticker: 'VOO', broker: 'GBM', type: 'etf' as const, units: 5, average_cost: 12000, current_price: 13500, purchase_date: new Date('2026-03-10'), last_updated: new Date('2026-08-09'), notes: 'Largo plazo' },
      { name: 'Bitcoin', ticker: 'BTC', broker: 'Binance', type: 'crypto' as const, units: 0.05, average_cost: 8000, current_price: 9200, purchase_date: new Date('2026-06-01'), last_updated: new Date('2026-08-09') },
      { name: 'CETES 28 días', ticker: 'CETES', broker: 'CETES Directo', type: 'fixed_income' as const, units: 1, average_cost: 50000, current_price: 50150, purchase_date: new Date('2026-07-20'), last_updated: new Date('2026-08-09') },
    ];

    for (const investmentDataItem of investmentData) {
      const existing = await investmentRepo.findOne({ where: { name: investmentDataItem.name } });

      if (!existing) {
        const investment = investmentRepo.create({ ...investmentDataItem, userId });
        await investmentRepo.save(investment);
        logger.info(`✅ Investment created: ${investment.name}`);
      }
    }

    // Transacciones recurrentes
    if (bbvaDebit && nu) {
      const recurringData = [
        { name: 'Netflix', amount: 219, frequency: 'monthly' as const, next_date: new Date('2026-09-12'), category: 'Suscripciones', budget_type: 'want', account_id: bbvaDebit.id },
        { name: 'Spotify', amount: 129, frequency: 'monthly' as const, next_date: new Date('2026-09-06'), category: 'Suscripciones', budget_type: 'want', account_id: bbvaDebit.id },
        { name: 'Renta departamento', amount: 4500, frequency: 'monthly' as const, next_date: new Date('2026-09-01'), category: 'Vivienda', budget_type: 'need', account_id: bbvaDebit.id },
        { name: 'Ahorro automático', amount: 2000, frequency: 'monthly' as const, next_date: new Date('2026-09-01'), category: 'Ahorro', budget_type: 'save', account_id: nu.id },
      ];

      for (const recurringDataItem of recurringData) {
        const existing = await recurringRepo.findOne({ where: { name: recurringDataItem.name } });

        if (!existing) {
          const recurring = recurringRepo.create({ ...recurringDataItem, userId });
          await recurringRepo.save(recurring);
          logger.info(`✅ Recurring transaction created: ${recurring.name}`);
        }
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