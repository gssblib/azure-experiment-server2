import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ItemsService } from '../../items/shared/items.service';
import { BorrowerService } from '../shared/borrower.service';
import { ErrorService } from '../../core/error-service';
import { RpcError } from '../../core/rpc-error';
import { Observable } from 'rxjs/Observable';
import { Item } from '../../items/shared/item';
import { MatSort, MatTableDataSource } from '@angular/material';

@Component({
  selector: 'gsl-borrower-checkouts-table',
  templateUrl: './borrower-checkouts-table.component.html',
  styleUrls: ['./borrower-checkouts-table.component.css']
})
export class BorrowerCheckoutsTableComponent implements OnInit, OnChanges, AfterViewInit {
  displayedColumns = [
    'barcode', 'title', 'category', 'checkout_date', 'date_due', 'fine_due', 'actions'
  ];

  @Input()
  showActions: boolean = true;

  items: Object[] = [];
  dataSource = new MatTableDataSource<Object>([]);

  @ViewChild(MatSort) sort: MatSort;

  @Input()
  set checkouts(checkouts) {
    this.items = checkouts.map(this.prepareCheckout);
  }

  constructor(private itemsService: ItemsService,
              private borrowerService: BorrowerService,
              private errorService: ErrorService) {}

  ngOnInit() {
    if (!this.showActions) {
      this.displayedColumns.pop()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.dataSource.data = this.items;
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.data = this.items;
  }

  private prepareCheckout(checkout: any): any {
    checkout.date_due = new Date(checkout.date_due);
    checkout.checkout_date = new Date(checkout.checkout_date);
    return checkout;
  }

  onRenew(item) {
    this.itemsService.renewItem(item.barcode).subscribe(
      newItem => {
        item.date_due = newItem.checkout.date_due;
      },
      (error: RpcError) => this.onError(item, error)
    );
  }

  onReturn(item) {
    this.itemsService.returnItem(item.barcode).subscribe(
      item => this.borrowerService.reload(),
      (error: RpcError) => this.onError(item, error)
    );
  }

  private onError(item: Item, error: RpcError) {
    this.errorService.showError(this.toErrorMessage(item, error));
    // Resolve the error.
    return Observable.create(() => {});
  }

  private toErrorMessage(item: Item, error: RpcError) {
    if (!error.errorCode) {
      return `Server error: ${error.httpResponseCode}`;
    }
    switch (error.errorCode) {
      case 'ENTITY_NOT_FOUND':
        return `Item with barcode ${item.barcode} does not exist.`;
      default:
        return `Server error: ${error.errorCode}`;
    }
  }
}
