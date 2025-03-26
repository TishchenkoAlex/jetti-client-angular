"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var LoadingService = /** @class */ (function () {
    function LoadingService() {
        this.history = {};
        this._loading = new rxjs_1.BehaviorSubject(undefined);
        this.loading$ = this._loading.asObservable();
        this._counter = new rxjs_1.BehaviorSubject(undefined);
        this.counter$ = this._counter.asObservable();
        this._color = new rxjs_1.BehaviorSubject('accent');
        this.color$ = this._color.asObservable();
        this.busy$ = rxjs_1.combineLatest([this.loading$, this.color$]).pipe(operators_1.map(function (r) { return r[0] && r[1] === 'accent'; }));
    }
    Object.defineProperty(LoadingService.prototype, "loading", {
        get: function () { return this._loading.value; },
        set: function (value) {
            if (history[value.req] && (value.loading !== true))
                delete history[value.req];
            else if ((value.loading === true) && value.req)
                history[value.req] = value.req;
            if (Object.keys(history).length === 0)
                this._loading.next(undefined);
            else
                this._loading.next(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LoadingService.prototype, "counter", {
        get: function () { return this._counter.value; },
        set: function (value) { if (value !== this._counter.value)
            this._counter.next(value); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LoadingService.prototype, "color", {
        get: function () { return this._color.value; },
        set: function (value) { if (value !== this._color.value)
            this._color.next(value); },
        enumerable: true,
        configurable: true
    });
    LoadingService = __decorate([
        core_1.Injectable({ providedIn: 'root' })
    ], LoadingService);
    return LoadingService;
}());
exports.LoadingService = LoadingService;
