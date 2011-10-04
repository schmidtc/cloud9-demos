/**
 * An example application demonstrating Sproutcore 2.0 and Cloud9.
 */

/* Generate four random hex digits. */
function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/* Generate a pseudo-GUID by concatenating random hexadecimal. */
function guid() {
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" +
                                                        S4() + S4() + S4());
}

/* Creates a new Todo application */
Todos = SC.Application.create({
    ready: function(){
        this.collection = "demos";
        this.type = "todos";
        this._super();
        this.fetchTodos();
    },
 
    /* Gets the last 50 todo items from Cloud9 */
    fetchTodos: function(){
        var qry = C9.api.query.queryString('*');
        var cloud9 = C9.api.search.Search({
            indices: [this.collection],
            types: [this.type]
        });
        cloud9.setQuery(qry).size(50).get(function(results) {
            Todos.todosController.beginPropertyChanges();
            jQuery.each(results.hits.hits, function(idx, result) {
                var todo = Todos.Todo.create({
                    id: result._source.id,
                    title: result._source.content,
                    isDone: result._source.done
                });
                Todos.todosController.pushObject(todo);
            });
            Todos.todosController.endPropertyChanges();
        });
    }
});

/* represents the actual Todo object/model */
Todos.Todo = SC.Object.extend({
    title: null,
    isDone: false,
    id: guid(),
 
    /* computed property that returns this models
     * attributes as an indexable Cloud9 document.
     */
    doc: function(){
        return {
            collection: Todos.collection,
            type: Todos.type,
            id: this.get('id'),
            source: {
                content: this.get('title'),
                done: this.get('isDone'),
                order: 0,
                id: this.get('id')
            }
        };
    }.property('title', 'isDone'),
 
    /* Saves the todo to Cloud9. If the collection does not exist,
     * it's created on the fly along with the type.
     */
    save: function(){
        C9.api.index.Document(this.get('doc')).put(function(data) {
            console.log("saved todo");
        });
    },
    
    /* calls save() any time a doc attribute changes */
    autosave: function(){
        this.save();
    }.observes('doc'),
  
    /* Deletes this todo item from Cloud9 */
    destroy: function(){
        var self = this;
        C9.api.index.Document({
            collection: Todos.collection,
            type: Todos.type,
            id: this.get('id')
        }).del(function(data) {
            if (data.ok) {
                console.log("deleted todo");
            } else {
                console.log("saved failed...");
            }
        });
    }
});

/* Todo controller */
Todos.todosController = SC.ArrayProxy.create({
    content: [],

    createTodo: function(title) {
        var todo = Todos.Todo.create({ title: title });
        this.pushObject(todo);
        todo.save();
    },

    clearCompletedTodos: function() {
        var self = this;
        /* destroys every todo where isDone is true */
        this.filterProperty('isDone', true).forEach(function(todo){
            self.removeObject(todo);
            todo.destroy();
        });
    },

    remaining: function() {
        return this.filterProperty('isDone', false).get('length');
    }.property('@each.isDone'),

    allAreDone: function(key, value) {
        if (value !== undefined) {
            /* if a value (true or false) is provided, set each todo item */
            this.setEach('isDone', value);
            return value;
        } else {
            /* otherwise return true if isDone is true for each item, else false */
            return !!this.get('length') && this.everyProperty('isDone', true);
        }
    }.property('@each.isDone')
});

/* Todo view to display number of remaining items */
Todos.StatsView = SC.View.extend({
    remainingBinding: 'Todos.todosController.remaining',

    remainingString: function() {
        var remaining = this.get('remaining');
        return remaining + (remaining === 1 ? " item" : " items");
    }.property('remaining').cacheable()
});

/* Todo view to display input for creating todos */
Todos.CreateTodoView = SC.TextField.extend({
    insertNewline: function() {
        var value = this.get('value');

        if (value) {
            Todos.todosController.createTodo(value);
            this.set('value', '');
        }
    }
});

