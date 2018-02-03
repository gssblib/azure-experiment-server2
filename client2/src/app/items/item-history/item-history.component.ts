import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { ItemService } from '../shared/item.service';
import { ItemsService } from '../shared/items.service';
import { Item } from '../shared/item';
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';

@Component({
  selector: 'gsl-item-history',
  templateUrl: './item-history.component.html',
  styleUrls: ['./item-history.component.css'],
})
export class ItemHistoryComponent implements OnInit, AfterViewInit {
  item: Item;

  displayedColumns = ['checkout_date', 'returndate', 'surname'];
  dataSource = new MatTableDataSource();
  count = 0;
  loading = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private itemService: ItemService,
              private itemsService: ItemsService) {
  }

  ngOnInit() {
    this.setItem(this.itemService.getItem());
    this.itemService.subscribe(item => this.setItem(item));
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private setItem(item: Item) {
    if (item) {
      this.itemsService.get(item.barcode, {options: 'history'})
        .subscribe(item => {
          this.item = item;
          this.count = this.item.history.length;
          this.dataSource.data = this.item.history;
        });
    }
  }
}
