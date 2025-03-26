import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/api';
import { getFormGroup } from 'src/app/common/dynamic-form/dynamic-form.service';
import { FormGroup } from '@angular/forms';
import { FormControlInfo } from '../common/dynamic-form/dynamic-form-base';
import { BehaviorSubject } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'j-input-value-dialog',
    templateUrl: './input-value.dialog.component.html',
    providers: [DialogService]
})


export class InputValueDialogComponent implements OnInit, OnDestroy {

    viewModel: {
        schema?: { [x: string]: any };
        model?: { [x: string]: any };
    };

    private readonly _form$ = new BehaviorSubject<FormGroup>(undefined);
    form$ = this._form$.asObservable();

    get metadata() { return { module: '' }; }
    get form() { return this._form$.value; }
    get tables() { return this.controls.filter(t => t.controlType === 'table' && !t.panel); }
    get headFields() { return this.controls.filter(t => t.controlType !== 'table'); }
    get controls() { return <FormControlInfo[]>this.form['orderedControls']; }

    constructor(public dialog: DialogService, public ref: DynamicDialogRef,
        public config: DynamicDialogConfig, public cd: ChangeDetectorRef) { }

    async ngOnInit() {
        const fg = getFormGroup(this.config.data.schema, this.config.data.value, false);
        this._form$.next(fg);
    }

    // private _getViewModel(schema: { [x: string]: any }, model: { [x: string]: any }) {
    //     return {
    //         schema: {
    //             Company: { type: this.type, label: 'Company', order: 1 },
    //             Items:
    //             {
    //                 order: 1, required: false, type: 'table',
    //                 Items: { Input: { type: this.type, label: 'Value', order: 1 } }
    //             }
    //         },
    //         model: {
    //             Company: { id: '', type: this.type, code: '', value: '' },
    //             Items: []
    //         }
    //     };
    // }

    async ngOnDestroy() {
        this._form$.complete();
    }

    validate(event) {

    }

    select() {

        this.ref.close(this.form.getRawValue());
    }

}
