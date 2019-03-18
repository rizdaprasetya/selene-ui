import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { map, startWith, tap } from 'rxjs/operators';

import { Country } from '../../models/country.model';
import { Observable } from 'rxjs';
import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';

@Component({
    selector: 'account-country-input',
    templateUrl: './country-input.component.html',
    styleUrls: ['./country-input.component.scss']
})
export class CountryInputComponent implements OnInit {
    @Input() countries$: Observable<Country[]>;
    private countries: Country[];
    @Input() deviceForm: FormGroup;
    public filteredCountries$: Observable<Country[]>;
    @Output() countrySelected = new EventEmitter<Country>();

    constructor() { }

    ngOnInit() {
    }

    getCountries() {
        if (!this.countries) {
            this.countries$.subscribe(
                (countries) => {
                    this.countries = countries;
                    this.deviceForm.controls['country'].validator = this.geographyValidator(this.countries);
                    this.filteredCountries$ = this.deviceForm.controls['country'].valueChanges.pipe(
                        startWith(''),
                        map((value) => this.filterCountries(value)),
                        tap(() => { this.checkForCountryValidity(); })
                    );
                }
            );
        }
    }

    private filterCountries(value: string): Country[] {
        console.log(value);
        const filterValue = value.toLowerCase();
        let filteredCountries: Country[];

        if (this.countries) {
            filteredCountries = this.countries.filter(
                (country) => country.name.toLowerCase().includes(filterValue)
            );
        } else {
            filteredCountries = [];
        }

        return filteredCountries;
    }

    geographyValidator(geographies: any[]): ValidatorFn {
        return (geographyControl: AbstractControl) => {
            let valid = true;
            if (geographyControl.value) {
                const foundGeography = geographies.find(
                    (geography) => geography.name === geographyControl.value
                );
                if (!foundGeography) {
                    valid = false;
                }
            }
            return valid ? null : {geographyNotFound: true};

        };
    }

    checkForCountryValidity() {
        if (this.deviceForm.controls['country'].valid) {
            this.countrySelected.emit(this.deviceForm.controls['country'].value);
        }
    }

}
