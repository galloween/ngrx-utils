import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Select, Dispatch } from '@ngrx-utils/store';
import { Observable } from 'rxjs/Observable';

import * as fromBooks from '../reducers';
import * as collection from '../actions/collection';
import { Book } from '../models/book';

@Component({
  selector: 'bc-collection-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-title>My Collection</mat-card-title>
    </mat-card>

    <bc-book-preview-list [books]="books$ | async"></bc-book-preview-list>
  `,
  /**
   * Container components are permitted to have just enough styles
   * to bring the view together. If the number of styles grow,
   * consider breaking them out into presentational
   * components.
   */
  styles: [
    `
    mat-card-title {
      display: flex;
      justify-content: center;
    }
  `
  ]
})
export class CollectionPageComponent implements OnInit {
  @Select(fromBooks.getBookCollection) books$: Observable<Book[]>;

  @Dispatch()
  ngOnInit() {
    return new collection.Load();
  }
}
