var IPython = {};

var widget_manager = {

    widget_model_types: {},
    widget_view_types: {},
    _handling_sync: false,
    _model_instances: {},
    _current_cell: null,

    register_widget_model: function (widget_model_name, widget_model_type) {
        this.widget_model_types[widget_model_name] = widget_model_type;
    },


    register_widget_view: function (widget_view_name, widget_view_type) {
        this.widget_view_types[widget_view_name] = widget_view_type;
    },


    get_model: function (widget_id) {
        var model = this._model_instances[widget_id];
        if (model !== undefined && model.id == widget_id) {
            return model;
        }
        return null;
    },


    get_msg_cell: function (msg_id) {
        return this._current_cell;
    },


    get_kernel: function () {
        return null;
    },


    on_create_widget: function (callback) {
        this._create_widget_callback = callback;
    },


    _handle_create_widget: function (widget_model) {
        if (this._create_widget_callback) {
            try {
                this._create_widget_callback(widget_model);
            } catch (e) {
                console.log("Exception in WidgetManager callback", e, widget_model);
            }
        }
    },

    handle_msgs: function(cell, msgs) {
        this._current_cell = cell;

        for (var i = 0; i < msgs.length; i++) {
            var model = this.get_model(msgs[i][0])
            if (model === null) {
                model = new this.widget_model_types[msgs[i][1]](this, msgs[i][0]);
                this._model_instances[msgs[i][0]] = model;
                this._handle_create_widget(model);
            }

            var msg = {
                parent_header: {msg_id: 0},
                content: {data: msgs[i][2]}
            };
            model._handle_comm_msg(msg);
        }
    },

    register_frames: function(cell, frames) {

    },

//////////////////////////////////////////////////////////////////////////////////////////////////

            // for (var i = 0; i < cell_cache.initial.length; i++) {
            //     var model_id = cell_cache.initial[i][0];
            //     var msg = cell_cache.initial[i][1];

            //     widget_manager.display_widget(model_id, cell_display[i][1], cell_display[i][2], cell, initial_state, cell_display[i][3]);
            // }


    _handle_sync: function(model) {
        if (!this._handling_sync) {
            this._handling_sync = true;
            
            // TODO

            this._handling_sync = false;
        }
    },
};

// Define a custom backbone sync method that looks up saved states.
Backbone.sync = function (method, model, options, error) {
    var result = model._handle_sync(method, options);
    if (options.success) {
      options.success(result);
    }
    widget_manager._handle_sync(model);
}; 

// Define a require-like function that doesn't actually load anything.
var define = function(requirements, callback) {
    callback.apply(this, [widget_manager]);
};