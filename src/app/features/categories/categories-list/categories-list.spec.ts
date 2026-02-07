import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriesList } from './categories-list';

describe('CategoriesList', () => {
  let component: CategoriesList;
  let fixture: ComponentFixture<CategoriesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoriesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
