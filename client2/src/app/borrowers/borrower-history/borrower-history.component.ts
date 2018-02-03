import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Borrower } from '../shared/borrower';
import { BorrowersService } from '../shared/borrowers.service';
import { BorrowerService } from '../shared/borrower.service';
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { merge } from 'rxjs/observable/merge';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { of as observableOf } from 'rxjs/observable/of';

/**
 * Presents the items that a borrower has checked out in the past.
 */
@Component({
  selector: 'gsl-borrower-history',
  templateUrl: './borrower-history.component.html',
  styleUrls: ['./borrower-history.component.css']
})
export class BorrowerHistoryComponent implements OnInit, AfterViewInit {
  borrower: Borrower;

  displayedColumns = ['barcode', 'title', 'checkout_date', 'returndate'];
  dataSource = new MatTableDataSource();

  resultsLength = 0;
  isLoadingResults = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private borrowersService: BorrowersService,
              private borrowerService: BorrowerService) {
    this.borrowerService.subscribe(borrower => {
      this.borrower = borrower;
    });
  }

  ngOnInit() {
    this.borrower = this.borrowerService.get();
  }

  sortOrder(sort: MatSort): string {
    return (sort.direction === 'desc' ? '-' : '') + sort.active;
  }

  ngAfterViewInit(): void {
    // Reset page when sort order is change.
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    // Reload data When sort order or page changes.
    merge(this.sort.sortChange, this.paginator.page, this.borrowerService.modelObservable)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          const params = {
            offset: this.paginator.pageIndex * this.paginator.pageSize,
            limit: this.paginator.pageSize,
            returnCount: true,
            _order: this.sortOrder(this.sort),
          };
          return this.borrowersService.getBorrowerHistory(this.borrower.borrowernumber, params);
        }),
        map(result => {
          this.isLoadingResults = false;
          this.resultsLength = result.count;
          return result.rows;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return observableOf([]);
        })
      ).subscribe(data => this.dataSource.data = data);
  }
}
