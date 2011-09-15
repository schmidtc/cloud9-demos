/**
 * Backbone Cloud9 Adapter v1.0
 * Based on Backbone localStorage Adapter
 * 
 */

// A simple module to replace `Backbone.sync` with Cloud9 backed
// persistence. Models are given an id if they don't already have one.

// Generate four random hex digits.
function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + 
                                                        S4() + S4() + S4());
};

// Cloud9 backed storage in the specified index and type
window.C9Store = function(index, type) {
    this.index = index;
    this.type = type;
};

_.extend(C9Store.prototype, {

    // Add a model
    create: function(model, cb) {
        
        // generate an id if one does not exist
        if (!model.id) {
            model.id = model.attributes.id = guid();
        }

        // cloud9 document config
        var doc = {
            collection: this.index,
            type: this.type,
            id: model.id,
            source: model
        };

        // index the document using a put operation
        // the specified index and type will be created
        // if it does not already exist
        C9.api.index.Document(doc).put(function(data) {
            if (data.ok) {
                cb(model);
            } else {
                cb(false);
            }
        });
    },

    // Update a model.  For cloud9 this is the same as a create operation
    update: function(model, cb) {
        this.create(model, cb);
    },

    // Get a specific model
    find: function(model, cb) {
        C9.api.index.Document({
            collection: this.index,
            type: this.type,
            id: model.id
        }).get(function(data) {
            // TODO what happens when doc does not exist?
            cb(data._source);
        });
    },

    // Return the array of all models currently in storage.
    // default to 50 items returned.
    // TODO make size configurable
    findAll: function(cb) {
        // do wildcard search for all document in the given index and type
        var qry = C9.api.query.queryString('*');
        var cloud9 = C9.api.search.Search({
            indices: [this.index],
            types: [this.type]
        });
        cloud9.setQuery(qry).size(50).get(function(results) {
            // extract the models from the source
            var all = [];
            jQuery.each(results.hits.hits, function(idx, result) {
                all.push(result._source);
            });
            cb(all);
        });
    },

    // Delete a model
    destroy: function(model, cb) {
        C9.api.index.Document({
            collection: this.index,
            type: this.type,
            id: model.id
        }).del(function(data) {
            if (data.ok) {
                cb(model);
            } else {
                cb(false);
            }
        });
    }

});

// cloud9Sync delegates to the model or collection's
// cloud9storage property, which should be an instance of `C9Store`.
Backbone.cloud9Sync = function(method, model, options, error) {

    // Backwards compatibility with Backbone <= 0.3.3
    if (typeof options == 'function') {
        options = {
            success: options,
            error: error
        };
    }

    var c9store = model.cloud9storage || model.collection.cloud9storage;

    var responseCallback = function(doc) {
        if (doc) {
            options.success(doc);
        } else {
            options.error("Record not found");
        }
    }

    switch (method) {
    case "read":
        model.id ? c9store.find(model, responseCallback) : 
                                        c9store.findAll(responseCallback);
        break;
    case "create":
        c9store.create(model, responseCallback);
        break;
    case "update":
        c9store.update(model, responseCallback);
        break;
    case "delete":
        c9store.destroy(model, responseCallback);
        break;
    }
};

// Override 'Backbone.sync' to default to cloud9Sync, 
// the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
Backbone.ajaxSync = Backbone.sync;
Backbone.sync = Backbone.cloud9Sync;