/**
 * Backbone Cloud9 Adapter v1.0
 */

// A simple module to replace `Backbone.sync` with *cloud9*-based
// persistence. Models are given and id if they don't already have one.

// Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

window.C9Store = function(index, type) {
    this.index = index;
    this.type = type;
};

_.extend(C9Store.prototype, {

  // Add a model
  create: function(model, cb) {    
    if (!model.id) {
        model.id = model.attributes.id = guid();
    }
    
    var doc = {
        collection: this.index,
        type: this.type,
        id: model.id,
        source: model
    };
    
    C9.api.index.Document(doc).put(function(data) {
        if (data.ok) {
            cb(model);
        } else {
            cb("");
        }
    });
  },

  // Same as create.
  update: function(model, cb) {
      this.create(model, cb);
  },

  // Retrieve
  find: function(model, cb) {
      C9.api.index.Document({
          collection: this.index, 
          type: this.type, 
          id: model.id
       }).get(function(data) {
           cb(data);
       });
  },

  // Return the array of all models currently in storage.
  // default to 50 items returned.
  findAll: function(cb) {
    var qry = C9.api.query.queryString('*');
    var cloud9 = C9.api.search.Search({indices:[this.index], types:[this.type]});
    cloud9.setQuery(qry).size(50).get(function(results) {
        var all = [];
        jQuery.each(results.hits.hits, function(idx, result) {
            all.push(result._source);
        });
        cb(all);
    });
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model, cb) {
    C9.api.index.Document({
        collection: this.index, 
        type: this.type, 
        id: model.id
     }).delete(function(data) {
         if (data.ok) {
             cb(model);
         } else {
             cb("");
         }
     });
  }

});

// Override `Backbone.sync` to use delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
Backbone.sync = function(method, model, options, error) {
    
    // Backwards compatibility with Backbone <= 0.3.3
    if (typeof options == 'function') {
      options = {
        success: options,
        error: error
      };
    }
    
    var c9store = model.cloud9storage || model.collection.cloud9storage;
    
    var resp = function(doc) {
        if (doc) {
            options.success(doc);
        } else {
            options.error("Record not found");
        }
    }
    
    switch (method) {
        case "read":    
            model.id ? c9store.find(model, resp) : c9store.findAll(resp); 
            break;
        case "create":  
            c9store.create(model, resp); 
            break;
        case "update":  
            c9store.update(model, resp); 
            break;
        case "delete":  
            c9store.destroy(model, resp);
            break;
    }
};