"use strict";
exports.__esModule = true;
function viewModelToFlatDocument(viewModel) {
    var newDoc = {
        id: viewModel.id || null,
        type: viewModel.type,
        date: viewModel.date || new Date(),
        code: viewModel.code,
        description: viewModel.description,
        posted: viewModel.posted,
        deleted: viewModel.deleted,
        parent: viewModel.parent && viewModel.parent['id'],
        isfolder: viewModel.isfolder,
        company: viewModel.company && viewModel.company['id'],
        user: viewModel.user && viewModel.user['id'],
        info: viewModel.info,
        timestamp: viewModel.timestamp || null
    };
    var JETTI_DOC_PROP = Object.keys(newDoc);
    for (var property in viewModel) {
        if (!viewModel.hasOwnProperty(property)) {
            continue;
        }
        if (JETTI_DOC_PROP.indexOf(property) > -1) {
            continue;
        }
        if ((Array.isArray(viewModel[property]))) {
            var copy = JSON.parse(JSON.stringify(viewModel[property]));
            copy.forEach(function (element) {
                for (var p in element) {
                    if (element.hasOwnProperty(p)) {
                        var value = element[p];
                        if (value && value.type &&
                            ['string', 'number', 'boolean', 'datetime'].includes(value.type)) {
                            value = null;
                            element[p] = value;
                            continue;
                        }
                        if (value && value.type && !value.value && ((value.id === '') || (value.id === null))) {
                            value = null;
                        }
                        element[p] = !(value === undefined || value === null) ? value.id || value : value || null;
                    }
                }
                delete element.index;
            });
            newDoc[property] = copy;
        }
        else {
            var value = viewModel[property];
            if (value && value['type'] &&
                ['string', 'number', 'boolean', 'datetime'].includes(value['type'])) {
                value['id'] = null;
                newDoc[property] = value;
                continue;
            }
            if (value && value['type'] && !value['value'] && ((value['id'] === '') || (value['id'] === null))) {
                value = null;
            }
            newDoc[property] = !(value === undefined || value === null) ? value['id'] || value : value || null;
        }
    }
    return newDoc;
}
exports.viewModelToFlatDocument = viewModelToFlatDocument;
