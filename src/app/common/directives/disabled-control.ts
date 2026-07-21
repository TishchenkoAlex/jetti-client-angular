import { NgControl } from '@angular/forms';
import { Directive, Input, OnInit } from '@angular/core';

@Directive({
    // eslint-disable-next-line @angular-eslint/directive-selector
    selector: '[disableControl]'
})
export class DisableControlDirective implements OnInit {

    private disabled = false;

    @Input() set disableControl(condition: boolean) {
        this.disabled = condition;
        this.updateControlState();
    }

    constructor(private ngControl: NgControl) {
    }

    ngOnInit(): void {
        this.updateControlState();
    }

    private updateControlState(): void {
        const control = this.ngControl.control;
        if (!control || control.disabled === this.disabled) return;

        if (this.disabled) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
    }

}
