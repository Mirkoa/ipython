//----------------------------------------------------------------------------
//  Copyright (C) 2013 The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// Base Widget Model and View classes
//============================================================================

/**
 * @module IPython
 * @namespace IPython
 **/

define(["notebook/js/widget",
        "components/underscore/underscore-min",
        "components/backbone/backbone-min"], 
function(widget_manager, underscore, backbone){
    
    //--------------------------------------------------------------------
    // WidgetModel class
    //--------------------------------------------------------------------
    var WidgetModel = Backbone.Model.extend({
        constructor: function (widget_manager, widget_id, comm) {
            this.widget_manager = widget_manager;
            this.pending_msgs = 0;
            this.msg_throttle = 3;
            this.msg_buffer = null;
            this.views = [];
            this.id = widget_id;
            this._custom_msg_callbacks = [];

            if (comm !== undefined) {

                // Remember comm associated with the model.
                this.comm = comm;
                comm.model = this;

                // Hook comm messages up to model.
                comm.on_close($.proxy(this._handle_comm_closed, this));
                comm.on_msg($.proxy(this._handle_comm_msg, this));
            }

            return Backbone.Model.apply(this);
        },


        update_other_views: function (caller) {
            this.last_modified_view = caller;
            this.save(this.changedAttributes(), {patch: true});

            for (var view_index in this.views) {
                var view = this.views[view_index];
                if (view !== caller) {
                    view.update();    
                }
            }
        },
    

        send: function (content, cell) {
            if (this._has_comm()) {
                // Used the last modified view as the sender of the message.  This
                // will insure that any python code triggered by the sent message
                // can create and display widgets and output.
                if (cell === undefined) {
                    if (this.last_modified_view !== undefined && 
                        this.last_modified_view.cell !== undefined) {
                        cell = this.last_modified_view.cell;
                    }
                }
                var callbacks = this._make_callbacks(cell);
                var data = {method: 'custom', custom_content: content};
                
                this.comm.send(data, callbacks);
            }
        },


        on_view_displayed: function (callback) {
            this._view_displayed_callback = callback;
        },


        on_close: function (callback) {
            this._close_callback = callback;
        },


        on_msg: function (callback, remove) {
            if (remove) {
                var found_index = -1;
                for (var index in this._custom_msg_callbacks) {
                    if (callback === this._custom_msg_callbacks[index]) {
                        found_index = index;
                        break;
                    }
                }

                if (found_index >= 0) {
                    this._custom_msg_callbacks.splice(found_index, 1);
                }
            } else {
                this._custom_msg_callbacks.push(callback);
            }
        },


        _handle_custom_msg: function (content) {
            for (var index in this._custom_msg_callbacks) {
                try {
                    this._custom_msg_callbacks[index](content);
                } catch (e) {
                    console.log("Exception in widget model msg callback", e, content);
                }
            }
        },


        // Handle when a widget is closed.
        _handle_comm_closed: function (msg) {
            this._execute_views_method('remove');
            if (this._has_comm()) {
                delete this.comm.model; // Delete ref so GC will collect widget model.
                delete this.comm;
            }
            delete this.widget_id; // Delete id from model so widget manager cleans up.
        },


        // Handle incomming comm msg.
        _handle_comm_msg: function (msg) {
            var method = msg.content.data.method;
            switch (method) {
                case 'display':

                    // Try to get the cell.
                    var cell = this._get_msg_cell(msg.parent_header.msg_id);
                    if (cell === null) {
                        console.log("Could not determine where the display" + 
                            " message was from.  Widget will not be displayed");
                    } else {
                        this._display_view(msg.content.data.view_name, 
                        msg.content.data.parent,
                        cell);
                    }
                    break;
                case 'update':
                    this._handle_update(msg.content.data.state);
                    break;
                case 'add_class':
                case 'remove_class':
                    var selector = msg.content.data.selector;
                    if (selector === undefined) {
                        selector = '';
                    }

                    var class_list = msg.content.data.class_list;
                    this._execute_views_method(method, selector, class_list);
                    break;
                case 'set_snapshot':
                    var cell = this._get_msg_cell(msg.parent_header.msg_id);
                    cell.metadata.snapshot = msg.content.data.snapshot;
                    break;
                case 'custom':
                    this._handle_custom_msg(msg.content.data.custom_content);
                    break;
            }
        },


        // Handle when a widget is updated via the python side.
        _handle_update: function (state) {
            this.updating = true;
            try {
                for (var key in state) {
                    if (state.hasOwnProperty(key)) {
                        if (key == "_css") {

                            // Set the css value of the model as an attribute
                            // instead of a backbone trait because we are only 
                            // interested in backend css -> frontend css.  In
                            // other words, if the css dict changes in the
                            // frontend, we don't need to push the changes to
                            // the backend.
                            this.css = state[key];
                        } else {
                            this.set(key, state[key]); 
                        }
                    }
                }
                this.save();
            } finally {
                this.updating = false;
            }
        },


        _handle_status: function (cell, msg) {
            //execution_state : ('busy', 'idle', 'starting')
            if (this._has_comm()) {
                if (msg.content.execution_state=='idle') {
                    
                    // Send buffer if this message caused another message to be
                    // throttled.
                    if (this.msg_buffer !== null &&
                        this.msg_throttle == this.pending_msgs) {

                        var callbacks = this._make_callbacks(cell);
                        var data = {method: 'backbone', sync_method: 'update', sync_data: this.msg_buffer};
                        this.comm.send(data, callbacks);   
                        this.msg_buffer = null;
                    } else {

                        // Only decrease the pending message count if the buffer
                        // doesn't get flushed (sent).
                        --this.pending_msgs;
                    }
                }
            }
        },


        // Custom syncronization logic.
        _handle_sync: function (method, options) {
            var model_json = this.toJSON();
            var attr;

            // Only send updated state if the state hasn't been changed 
            // during an update.
            if (this._has_comm()) {
                if (!this.updating) {
                    if (this.pending_msgs >= this.msg_throttle) {
                        // The throttle has been exceeded, buffer the current msg so
                        // it can be sent once the kernel has finished processing 
                        // some of the existing messages.
                        if (method=='patch') {
                            if (this.msg_buffer === null) {
                                this.msg_buffer = $.extend({}, model_json); // Copy
                            }
                            for (attr in options.attrs) {
                                this.msg_buffer[attr] = options.attrs[attr];
                            }
                        } else {
                            this.msg_buffer = $.extend({}, model_json); // Copy
                        }

                    } else {
                        // We haven't exceeded the throttle, send the message like 
                        // normal.  If this is a patch operation, just send the 
                        // changes.
                        var send_json = model_json;
                        if (method =='patch') {
                            send_json = {};
                            for (attr in options.attrs) {
                                send_json[attr] = options.attrs[attr];
                            }
                        }

                        var data = {method: 'backbone', sync_method: method, sync_data: send_json};

                        var cell = null;
                        if (this.last_modified_view !== undefined && this.last_modified_view !== null) {
                            cell = this.last_modified_view.cell;    
                        }
                        
                        var callbacks = this._make_callbacks(cell);
                        this.comm.send(data, callbacks);    
                        this.pending_msgs++;
                    }
                }
            }
            
            // Since the comm is a one-way communication, assume the message 
            // arrived.
            return model_json;
        },


        _handle_view_displayed: function (view) {
            if (this._view_displayed_callback) {
                try {
                    this._view_displayed_callback(view);
                } catch (e) {
                    console.log("Exception in widget model view displayed callback", e, view, this);
                }
            }
        },


        _execute_views_method: function (/* method_name, [argument0], [argument1], [...] */) {
            var method_name = arguments[0];
            var args = null;
            if (arguments.length > 1) {
                args = [].splice.call(arguments,1);
            }

            for (var view_index in this.views) {
                var view = this.views[view_index];
                var method = view[method_name];
                if (args === null) {
                    method.apply(view);
                } else {
                    method.apply(view, args);
                }
            }
        },


        // Create view that represents the model.
        _display_view: function (view_name, parent_id, cell) {
            var new_views = [];
            var view;

            // Try creating and adding the view to it's parent.
            var displayed = false;
            if (parent_id !== undefined) {
                var parent_model = this.widget_manager.get_model(parent_id);
                if (parent_model !== null) {
                    var parent_views = parent_model.views; 
                    for (var parent_view_index in parent_views) {
                        var parent_view = parent_views[parent_view_index];
                        if (parent_view.cell === cell) {
                            if (parent_view.display_child !== undefined) {
                                view = this._create_view(view_name, cell);
                                if (view !== null) {
                                    new_views.push(view);
                                    parent_view.display_child(view);
                                    displayed = true;
                                    this._handle_view_displayed(view);
                                }
                            }    
                        }
                    }
                }
            }

            // If no parent view is defined or exists.  Add the view's 
            // element to cell's widget div.
            if (!displayed) {
                view = this._create_view(view_name, cell);
                if (view !== null) {
                    new_views.push(view);

                    if (cell.widget_subarea !== undefined && cell.widget_subarea !== null) {
                        cell.widget_area.show();
                        cell.widget_subarea.append(view.$el);
                        this._handle_view_displayed(view);
                    }
                }
            }

            // Force the new view(s) to update their selves
            for (var view_index in new_views) {
                view = new_views[view_index];
                view.update();
            }
        },


        // Create a view
        _create_view: function (view_name, cell) {
            var ViewType = this.widget_manager.widget_view_types[view_name]; 
            if (ViewType !== undefined && ViewType !== null) {
                var view = new ViewType({model: this});
                view.render();
                this.views.push(view);
                view.cell = cell;

                // Handle when the view element is remove from the page.
                var that = this;
                view.$el.on("remove", function () { 
                    var index = that.views.indexOf(view);
                    if (index > -1) {
                        that.views.splice(index, 1);
                    }
                    view.remove(); // Clean-up view 

                    // Close the comm if there are no views left.
                    if (that.views.length() === 0) {
                        if (that._close_callback) {
                            try {
                                that._close_callback(that);
                            } catch (e) {
                                console.log("Exception in widget model close callback", e, that);
                            }
                        }

                        if (that._has_comm()) {
                            that.comm.close();
                            delete that.comm.model; // Delete ref so GC will collect widget model.
                            delete that.comm;
                        }
                        delete that.widget_id; // Delete id from model so widget manager cleans up.
                    }
                });
                return view;    
            }
            return null;
        },


        // Build a callback dict.
        _make_callbacks: function (cell) {
            var callbacks = {};
            if (cell !== null) {
                
                // Try to get output handlers
                var handle_output = null;
                var handle_clear_output = null;
                if (cell.output_area !== undefined && cell.output_area !== null) {
                    handle_output = $.proxy(cell.output_area.handle_output, cell.output_area);
                    handle_clear_output = $.proxy(cell.output_area.handle_clear_output, cell.output_area);
                }

                // Create callback dict usign what is known
                var that = this;
                callbacks = {
                    iopub : {
                        output : handle_output,
                        clear_output : handle_clear_output,

                        status : function (msg) {
                            that._handle_status(cell, msg);
                        },

                        // Special function only registered by widget messages.
                        // Allows us to get the cell for a message so we know
                        // where to add widgets if the code requires it.
                        get_cell : function () {
                            return cell;
                        },
                    },
                };
            }
            return callbacks;
        },


        // Get the output area corresponding to the msg_id.
        // cell is an instance of IPython.Cell
        _get_msg_cell: function (msg_id) {

            // First, check to see if the msg was triggered by cell execution.
            var cell = this.widget_manager.get_msg_cell(msg_id);
            if (cell !== null) {
                return cell;
            }

            // Second, check to see if a get_cell callback was defined
            // for the message.  get_cell callbacks are registered for
            // widget messages, so this block is actually checking to see if the
            // message was triggered by a widget.
            var kernel = this.widget_manager.get_kernel();
            if (kernel !== undefined && kernel !== null) {
                var callbacks = kernel.get_callbacks_for_msg(msg_id);
                if (callbacks !== undefined && 
                    callbacks.iopub !== undefined && 
                    callbacks.iopub.get_cell !== undefined) {

                    return callbacks.iopub.get_cell();
                }    
            }
            
            // Not triggered by a cell or widget (no get_cell callback 
            // exists).
            return null;
        },


        // Function that checks if a comm has been attached to this widget
        // model.  Returns True if a valid comm is attached.
        _has_comm: function() {
            return this.comm !== undefined && this.comm !== null;
        },
    });


    //--------------------------------------------------------------------
    // WidgetView class
    //--------------------------------------------------------------------
    var WidgetView = Backbone.View.extend({
        
        initialize: function () {
            this.visible = true;
            this.model.on('sync',this.update,this);
        },
        
        add_class: function (selector, class_list) {
            var elements = this._get_selector_element(selector);
            if (elements.length > 0) {
                elements.addClass(class_list);
            }
        },
        
        remove_class: function (selector, class_list) {
            var elements = this._get_selector_element(selector);
            if (elements.length > 0) {
                elements.removeClass(class_list);
            }
        },
    
    
        send: function (content) {
            this.model.send(content, this.cell);
        },

        update: function () {
            if (this.model.get('visible') !== undefined) {
                if (this.visible != this.model.get('visible')) {
                    this.visible = this.model.get('visible');
                    if (this.visible) {
                        this.$el.show();
                    } else {
                        this.$el.hide();
                    }
                }
            }

            if (this.model.css !== undefined) {
                for (var selector in this.model.css) {
                    if (this.model.css.hasOwnProperty(selector)) {

                        // Apply the css traits to all elements that match the selector.
                        var elements = this._get_selector_element(selector);
                        if (elements.length > 0) {
                            var css_traits = this.model.css[selector];    
                            for (var css_key in css_traits) {
                                if (css_traits.hasOwnProperty(css_key)) {
                                    elements.css(css_key, css_traits[css_key]);
                                }
                            }
                        }
                    }
                }
            }
        },

        _get_selector_element: function (selector) {
            // Get the elements via the css selector.  If the selector is
            // blank, apply the style to the $el_to_style element.  If
            // the $el_to_style element is not defined, use apply the 
            // style to the view's element.
            var elements = this.$el.find(selector);
            if (selector === undefined || selector === null || selector === '') {
                if (this.$el_to_style === undefined) {
                    elements = this.$el;
                } else {
                    elements = this.$el_to_style;
                }
            }
            return elements;
        },
    });

    IPython.WidgetModel = WidgetModel;
    IPython.WidgetView = WidgetView;
});