import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatPaginatorModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule
} from '@angular/material';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';

import { ReportsRoutingModule } from './reports-routing';
import { ReportsPageComponent } from './reports-page/reports-page.component';
import { ReportItemUsageComponent } from './report-item-usage/report-item-usage.component';
import { SharedModule } from '../shared/shared.module';
import { ReportOverdueComponent } from './report-overdue/report-overdue.component';
import { Angular2CsvModule} from "angular2-csv";

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    Angular2CsvModule,
    FormlyModule.forRoot(),
    FormlyMaterialModule,
    ReportsRoutingModule,
  ],
  declarations: [
    ReportsPageComponent,
    ReportItemUsageComponent,
    ReportOverdueComponent,
  ],
  providers: [
  ],
})
export class ReportsModule { }
