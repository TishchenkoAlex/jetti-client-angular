"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var FormControlInfo = /** @class */ (function () {
    function FormControlInfo(options) {
        this.type = options.type;
        this.key = options.key;
        this.label = options.label || options.key;
        this.required = !!options.required;
        this.readOnly = !!options.readOnly;
        this.hidden = !!options.hidden;
        this.disabled = !!options.disabled;
        this.order = options.order === undefined ? 9999999 : options.order;
        this.style = options.style || { 'width': '200px', 'min-width': '200px', 'max-width': '200px' };
        this.totals = options.totals;
        this.owner = options.owner;
        this.showLabel = true;
        this.storageType = options.storageType;
        this.value = options.value;
        this.isAdditional = options.isAdditional;
        this.valuesOptions = [];
        this.onChange = options.onChange;
        this.onChangeServer = options.onChangeServer;
        this.change = options.change;
        this.panel = options.panel;
        this.fieldset = options.fieldset;
        this.validators = options.validators;
        if (this.change && !this.onChange) {
            this.onChange = new Function('doc', 'value', 'api', this.change);
        }
    }
    return FormControlInfo;
}());
exports.FormControlInfo = FormControlInfo;
var TextboxFormControl = /** @class */ (function (_super) {
    __extends(TextboxFormControl, _super);
    function TextboxFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'string';
        _this.controlType = 'string';
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return TextboxFormControl;
}(FormControlInfo));
exports.TextboxFormControl = TextboxFormControl;
var LinkFormControl = /** @class */ (function (_super) {
    __extends(LinkFormControl, _super);
    function LinkFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'string';
        _this.controlType = 'link';
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return LinkFormControl;
}(FormControlInfo));
exports.LinkFormControl = LinkFormControl;
var URLFormControl = /** @class */ (function (_super) {
    __extends(URLFormControl, _super);
    function URLFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'string';
        _this.controlType = 'URL';
        _this.style = { 'width': '250px', 'min-width': '250px', 'max-width': '250px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return URLFormControl;
}(FormControlInfo));
exports.URLFormControl = URLFormControl;
var EnumFormControl = /** @class */ (function (_super) {
    __extends(EnumFormControl, _super);
    function EnumFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controlType = 'enum';
        _this.type = 'string';
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        _this.valuesOptions = __spreadArrays(options.value
            .map(function (el) { return ({ label: el, value: el }); }));
        // if (this.valuesOptions.length) this.value = this.valuesOptions[0].value;
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return EnumFormControl;
}(FormControlInfo));
exports.EnumFormControl = EnumFormControl;
var TextareaFormControl = /** @class */ (function (_super) {
    __extends(TextareaFormControl, _super);
    function TextareaFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'string';
        _this.controlType = 'textarea';
        _this.style = { 'min-width': '100%', 'height': '54px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return TextareaFormControl;
}(FormControlInfo));
exports.TextareaFormControl = TextareaFormControl;
var BooleanFormControl = /** @class */ (function (_super) {
    __extends(BooleanFormControl, _super);
    function BooleanFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controlType = 'boolean';
        _this.type = 'boolean';
        _this.style = { 'min-width': '24px', 'max-width': '24px', 'width': '90px', 'text-align': 'center', 'margin-top': '26px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = false;
        return _this;
    }
    return BooleanFormControl;
}(FormControlInfo));
exports.BooleanFormControl = BooleanFormControl;
var DateFormControl = /** @class */ (function (_super) {
    __extends(DateFormControl, _super);
    function DateFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'date';
        _this.controlType = 'date';
        _this.style = { 'min-width': '130px', 'max-width': '130px', 'width': '130px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        return _this;
    }
    return DateFormControl;
}(FormControlInfo));
exports.DateFormControl = DateFormControl;
var DateTimeFormControl = /** @class */ (function (_super) {
    __extends(DateTimeFormControl, _super);
    function DateTimeFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controlType = 'datetime';
        _this.type = 'datetime';
        _this.style = { 'min-width': '195px', 'max-width': '195px', 'width': '195px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        return _this;
    }
    return DateTimeFormControl;
}(FormControlInfo));
exports.DateTimeFormControl = DateTimeFormControl;
var NumberFormControl = /** @class */ (function (_super) {
    __extends(NumberFormControl, _super);
    function NumberFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controlType = 'number';
        _this.type = 'number';
        _this.style = { 'min-width': '100px', 'max-width': '100px', 'width': '100px', 'text-align': 'right' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        if (_this.value === undefined)
            _this.value = 0;
        return _this;
    }
    return NumberFormControl;
}(FormControlInfo));
exports.NumberFormControl = NumberFormControl;
var AutocompleteFormControl = /** @class */ (function (_super) {
    __extends(AutocompleteFormControl, _super);
    function AutocompleteFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controlType = 'autocomplete';
        _this.style = { 'width': '250px', 'min-width': '250px', 'max-width': '250px' };
        if (options.style)
            _this.style = __assign(__assign({}, _this.style), options.style);
        _this.value = { id: null, code: null, type: _this.type, value: null };
        return _this;
    }
    return AutocompleteFormControl;
}(FormControlInfo));
exports.AutocompleteFormControl = AutocompleteFormControl;
var TableDynamicControl = /** @class */ (function (_super) {
    __extends(TableDynamicControl, _super);
    function TableDynamicControl(options) {
        var _this = _super.call(this, options) || this;
        _this.controls = [];
        _this.controlType = 'table';
        return _this;
    }
    return TableDynamicControl;
}(FormControlInfo));
exports.TableDynamicControl = TableDynamicControl;
var ScriptFormControl = /** @class */ (function (_super) {
    __extends(ScriptFormControl, _super);
    function ScriptFormControl(options) {
        var _this = _super.call(this, options) || this;
        _this.type = 'javascript';
        _this.controlType = 'script';
        if (options.style)
            _this.style = options.style;
        if (options.type)
            _this.type = options.type;
        if (_this.value === undefined)
            _this.value = '';
        return _this;
    }
    return ScriptFormControl;
}(FormControlInfo));
exports.ScriptFormControl = ScriptFormControl;
