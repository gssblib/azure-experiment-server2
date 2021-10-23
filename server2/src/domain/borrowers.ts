import {BaseEntity} from '../common/base_entity';
import {EnumColumnDomain} from '../common/column';
import {Db} from '../common/db';
import {Flags} from '../common/entity';
import {httpError} from '../common/error';
import {ExpressApp, HttpMethod} from '../common/express_app';
import {mapQueryResult, QueryOptions, QueryResult} from '../common/query';
import {SqlQuery} from '../common/sql';
import {EntityConfig, EntityTable} from '../common/table';
import {sum} from '../common/util';
import {Checkout, checkoutsTable, historyTable} from './checkouts';
import {ordersTable, OrderSummary} from './orders';
import { User } from './user';

/**
 * Collection of checkouts (current or history) with fees.
 */
interface FeeInfo {
  /** Total of all outstanding fees. */
  total: number;

  /** Current check-outs with outstanding fees. */
  items: Checkout[];

  /** Returned items with outstanding fees. */
  history: Checkout[];
}

type BorrowerState = 'ACTIVE'|'INACTIVE';

export interface Borrower {
  /** Auto-generated id. */
  id: number;

  /** Natural key of this borrower. */
  borrowernumber: number;

  /** Child surname. */
  surname: string;

  /** List of first names of the children. */
  firstname: string;

  /** Contact names of the parents. */
  contactname: string;

  phone: string;

  /** Comma-separated list of email addresses. */
  emailaddress: string;

  /** Id of the family in the Sycamore system. */
  sycamoreid: string;

  state: BorrowerState;

  /** List of currently checked-out items. */
  items?: Checkout[];

  /** Check-out history. */
  history?: Checkout[];

  /** Information about outstanding fees. */
  fees?: FeeInfo;

  orders?: OrderSummary[];
}

const BorrowerStateDomain = new EnumColumnDomain<BorrowerState>([
  'ACTIVE',
  'INACTIVE',
]);

export class BorrowerTable extends EntityTable<Borrower> {
  constructor() {
    super({name: 'borrowers', naturalKey: 'borrowernumber'});
    this.addColumn({name: 'id'});
    this.addColumn({name: 'borrowernumber', label: 'Borrower number', internal: true});
    this.addColumn({name: 'surname', label: 'Last name', queryOp: 'contains'});
    this.addColumn({name: 'firstname', label: 'First name', queryOp: 'contains'});
    this.addColumn({name: 'contactname', label: 'Contact name', queryOp: 'contains'});
    this.addColumn({name: 'phone', label: 'Phone number'});
    this.addColumn({name: 'emailaddress', required: true, label: 'Email', queryOp: 'contains'});
    this.addColumn({name: 'sycamoreid', label: 'Sycamore ID'});
    this.addColumn({name: 'state', required: true, domain: BorrowerStateDomain});
  }
}

export const borrowersTable = new BorrowerTable();

type BorrowerFlag = 'items'|'history'|'fees'|'orders';
type BorrowerFlags = Flags<BorrowerFlag>;

interface BorrowerFeeSummary {
  borrowernumber: number;
  surname: string;
  contactname: string;
  firstname: string;
  fee: number;
}

export class Borrowers extends BaseEntity<Borrower, BorrowerFlag> {
  constructor(db: Db) {
    super(db, borrowersTable);
  }

  protected toKeyFields(key: string): Partial<Borrower> {
    return {borrowernumber: parseInt(key, 10)};
  }

  checkouts(borrowernumber: number, feesOnly?: boolean):
      Promise<QueryResult<Checkout>> {
    return checkoutsTable.listBorrowerCheckoutItems(
        this.db, {borrowernumber, feesOnly});
  }

  history(borrowernumber: number, feesOnly?: boolean, options?: QueryOptions):
      Promise<QueryResult<Checkout>> {
    return historyTable.listBorrowerCheckoutItems(
        this.db, {borrowernumber, feesOnly, options});
  }

  /**
   * Returns the information about the fees (total and items with fines) of a
   * borrower.
   */
  async fees(borrowerNumber: number): Promise<FeeInfo> {
    const [checkouts, history] = await Promise.all([
      this.checkouts(borrowerNumber, true), this.history(borrowerNumber, true)
    ]);
    return {
      total: totalFine(checkouts.rows) + totalFine(history.rows),
      items: checkouts.rows,
      history: history.rows,
    };
  }

  async getFeeSummaries(options?: QueryOptions):
      Promise<QueryResult<BorrowerFeeSummary>> {
    delete options?.returnCount;
    const query: SqlQuery = {
      sql: `
        select
          b.borrowernumber, b.surname, b.contactname, b.firstname,
          sum(if(c.fine_due <= c.fine_paid, 0, c.fine_due - c.fine_paid)) as fee
        from
          ((select id, borrowernumber, fine_due, fine_paid from ${
          checkoutsTable.tableName}) union
           (select id, borrowernumber, fine_due, fine_paid from ${
          historyTable.tableName})) c
        inner join borrowers b on c.borrowernumber = b.borrowernumber
        group by borrowernumber
        having fee > 0
      `,
      options,
    };
    const countSql = `
      select count(1) as count from (
        select
          b.borrowernumber,
          sum(if(c.fine_due <= c.fine_paid, 0, c.fine_due - c.fine_paid)) as fee
        from
          ((select id, borrowernumber, fine_due, fine_paid from ${
        checkoutsTable.tableName}) union
           (select id, borrowernumber, fine_due, fine_paid from ${
        historyTable.tableName})) c
        inner join borrowers b on c.borrowernumber = b.borrowernumber
        group by borrowernumber
        having fee > 0
      ) d
    `;
    const [feeResult, countResult] = await Promise.all([
      this.db.selectRows(query),
      this.db.selectRow(countSql),
    ])
    feeResult.count = countResult && countResult['count'];
    return mapQueryResult(feeResult, row => row as BorrowerFeeSummary);
  }

  /**
   * Returns a `Borrower` with optional information subh as the checked-out
   * items and checkout history.
   */
  override async get(key: string, flags: BorrowerFlags): Promise<Borrower> {
    const borrowernumber = parseInt(key, 10);
    const borrower = await this.table.find(this.db, {fields: {borrowernumber}});
    if (!borrower) {
      throw httpError({
        code: 'BORROWER_NOT_FOUND',
        message: `borrower ${borrowernumber} not found`,
        httpStatusCode: 404
      });
    }
    if (flags.items) {
      borrower.items = (await this.checkouts(borrowernumber)).rows;
    }
    if (flags.history) {
      borrower.history = (await this.history(borrowernumber)).rows;
    }
    if (flags.fees) {
      borrower.fees = await this.fees(borrowernumber);
    }
    if (flags.orders) {
      const orderResult =
          await ordersTable.listBorrowerOrderSummaries(this.db, borrowernumber);
      borrower.orders = orderResult.rows;
    }
    return borrower;
  }

  initRoutes(application: ExpressApp): void {
    application.addHandler({
      method: HttpMethod.GET,
      path: `${this.basePath}/:key/history`,
      handle: async (req, res) => {
        const key = req.params['key'] ?? '';
        const borrowernumber = parseInt(key, 10);
        const result = await this.history(
            borrowernumber, false, this.toQueryOptions(req.query));
        res.send(result);
      },
    });
    application.addHandler({
      method: HttpMethod.GET,
      path: `${this.apiPath}/fees`,
      handle: async (req, res) => {
        const result =
            await this.getFeeSummaries(this.toQueryOptions(req.query));
        res.send(result);
      },
    });
    application.addHandler({
      method: HttpMethod.GET,
      path: `${this.basePath}/me`,
      handle: async (req, res) => {
        const user = req.user;
        const appUser = user as User;
        const id = appUser.id;
        return await this.get(id ?? '', {items: true, fees:true});
      },
    });
    super.initRoutes(application);
  }
}

/**
 * Returns the total of unpaid fines of the `checkouts`.
 */
function totalFine(checkouts: Checkout[]): number {
  return sum(
      checkouts.map(item => Math.max(0, item.fine_due - item.fine_paid)));
}
