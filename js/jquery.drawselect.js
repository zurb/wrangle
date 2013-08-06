;(function($) {

  var DrawSelect = function(elem, settings, actions) {

    /*
      Properties
    */

    var self = this;

    // DOM elements
    this.$container  = elem;
    this.$selectarea = this.$container.find('[data-selectarea]')
    this.canvas      = this.$container.find('canvas')[0];
    this.$list       = this.$container.find('[data-items]').eq(0);
    this.$items      = this.$list.children('li');
    this.draw        = this.canvas.getContext('2d');

    // Settings
    this.settings = {
      lineColor: '#000000',
      lineWidth: 5,
      editableClass: 'editable',
      drawingClass: 'drawing',
      selectedClass: 'selected',
      selectToggle: false,
      touchMode: 'auto',
      clearOnCancel: true,
    }

    // Actions
    this.actions = {};

    // Add user settings/actions
    $.extend(this.settings, settings);
    $.extend(this.actions, actions);

    // Drawing context
    this.draw = this.canvas.getContext('2d');

    // List of bounding boxes for list items
    this.itemBoxes     = [];
    // List of selected items
    this.selectedItems = [];

    // Touch support?
    if (typeof window.ontouchstart !== 'undefined') this.touchSupport = true;
    // Microsoft special edition touch events?
    if (window.navigator.msPointerEnabled) this.msTouchSupport = true;

    // Drawing enabled
    this.drawEnabled = !this.touchSupport || this.settings.touchMode === 'auto' ? true : false;
    this.drawInProgress = false;

    // Event listeners
    this.events = {
      start: 'mousedown',
      move: 'mousemove',
      end: 'mouseup mouseout',
    }
    if (this.touchSupport) {
      this.events.start += ' touchstart';
      this.events.move  += ' touchmove';
      this.events.end   += ' touchcancel touchend touchleave';
    }
    if (this.msTouchSupport) {
      this.events.start += ' MSPointerDown';
      this.events.move  += ' MSPointerMove';
      this.events.end   += ' MSPointerUp MSPointerOut';
    }

    /*
      Initialization
    */

    // The canvas should match the list area in dimmensions
    this.sizeCanvas();
    $(window).on('resize', function() {
      self.sizeCanvas();
    });

    /*
      Actions
    */

    this.$container.find('[data-clear]').on('click', function() {
      self.deselectAll();
      return false;
    });
    this.$container.find('[data-all]').on('click', function() {
      self.selectAll();
      return false;
    });

    var editButton = this.$container.find('[data-edit]');
    if (editButton.length > 0) {
      this.drawEnabled = false;
      editButton.on('click', function() {
        // Toggle drawable state
        self.drawEnabled = !self.drawEnabled;
        if (!self.drawEnabled && self.settings.clearOnCancel) self.deselectAll();
        self.$container.toggleClass(self.settings.editableClass);

        // Switch button text
        var alttext = $(this).attr('data-alttext');
        if (typeof alttext !== 'undefined') {  
          $(this).attr('data-alttext', $(this).text());
          $(this).text(alttext);
        }
      });
    }

    // Custom actions

    this.$container.find('[data-action]').on('click', function() {
      var evt = $(this).attr('data-action');

      if (self.actions.hasOwnProperty(evt)) {
        var response = self.actions[evt].call(self, $(self.selectedItems));
        if (response === false) self.deselectAll();
        self.sizeCanvas();
      }
      else {
        console.warn('Your markup is referencing an undefined action, "'+evt+'"');
      }
    });

    /*
      Other UI
    */

    this.$container.find('[data-count]').each(function() {
      var count = this;
      count.innerHTML = '0 items selected';

      self.$container.on('drawselect.countChange', function() {
        count.innerHTML = self.selectedItems.length + ' item' + (self.selectedItems.length !== 1 ? 's' : '') + ' selected';
      });
    });

    /*
      Events
    */

    // Drawing
    this.$selectarea.on(this.events.start, function(e) {
      if (self.drawEnabled) self.startDrawing(e);
    });

    // Cancelling drawing
    this.$selectarea.on(this.events.end, function() {
      self.stopDrawing();
    });

    /*
      Touch modes
    */

    // Double tap to draw
    if (this.settings.touchMode === 'double-tap') {
      var firstTap = true, then;
      this.$selectarea.on('touchstart', function(e) {
        // A double tap is two taps within 300ms of each other
        if (firstTap) {
          firstTap = false;
          then = Date.now();
        }
        else if (Date.now() - then <= 300) {
          firstTap = true;
          self.drawEnabled = true;
          self.startDrawing(e);

          return false;
        }
        else {
          firstTap = true;
        }
      });
    }

    // One finger to draw, two fingers to scroll
    else if (this.settings.touchMode === '2fscroll') {
      this.$selectarea.on('touchstart', function(e) {

        if (!self.drawEnabled) {
          var started = Date.now();

          $(this).on('touchmove', function(e) {
            if (!self.drawEnabled && e.originalEvent.targetTouches.length === 1) {
              if (Date.now() - started < 100) return false;
              else {
                self.drawEnabled = true;
                self.startDrawing(e);

                return false;
              }
            }
          })
        }
      });
    }
  }

  /*
    Resize the canvas to match the size of the list container

    Doesn't return anything
  */
  DrawSelect.prototype.sizeCanvas = function() {
    this.canvas.width  = this.$list.outerWidth();
    this.canvas.height = this.$list.outerHeight();
  }
  /*
    Calculate bounding boxes for every list item

    Returns an array of Rectangle objects indicating the size/location of each list item
  */
  DrawSelect.prototype.getBoxes = function() {
    var boxes = [];
    this.$items.each(function() {
      var x = $(this).position().left + parseInt($(this).css('margin-left'));
      var y = $(this).position().top  + parseInt($(this).css('margin-top'));
      var w = $(this).outerWidth();
      var h = $(this).outerHeight();

      boxes.push(new Rectangle(x, y, w, h));
    });
    return boxes;
  }
  /*
    Fetch coordinates from the given MouseEvent, TouchEvent, or MSPointerEvent
    Return as an array of objects containing x and y coordinates

    @param event: a jQuery event representing a Mouse, Touch, or MSPointer event

    Returns an array of coordinates based on mouse/touch movement
  */
  DrawSelect.prototype.getCoords = function(event) {
    var self = this;
    var coords = [];
    var offset = self.$container.offset();

    if (this.msTouchSupport) {
      coords[event.originalEvent.pointerId] = {
        x: event.originalEvent.pageX - offset.left,
        y: event.originalEvent.pageY - offset.top,
      };
    }
    else if (event.type.match(/mouse/)) {
      coords.push({
        x: event.pageX - offset.left,
        y: event.pageY - offset.top,
      });
    }
    else {
      $.each(event.originalEvent.targetTouches, function() {
        coords.push({
          x: this.pageX - offset.left,
          y: this.pageY - offset.top,
        })
      });
    }

    return coords;
  }
  /*
    Check to see if given coordinates overlap with any list items
    Add them to the selection if they do, and if they aren't already selected

    @param coords: array of coordinates from mouse or touch input
    @param prev: array of DOM elements representing the last selections to be made

    Returns list of selections made
  */
  DrawSelect.prototype.checkCollision = function(coords, prev) {
    var self = this, last = [];

    // For each box...
    $.each(self.itemBoxes, function(index) {
      // If this === window, then we're inside an empty part of the array
      if (this === window) return;
      var rect = this;

      // ...and each rectangle...
      $.each(coords, function(i) {

        // ...check if the two intersect...
        if (rect.intersects(this.x, this.y)) {
          var elem = self.$items.eq(index);

          // ...and if the item isn't already selected, add it
          if (!self.settings.selectToggle) {
            self.select(elem, index);
          }
          // For deselection mode: don't do anything if the target element was the last to be modified
          else if (prev[i] !== elem[0]) {
            if (elem.hasClass(self.settings.selectedClass)) self.deselect(elem);
            else self.select(elem);
          }
          last[i] = elem[0];
        }
        else {
        }
      });
    });

    return last;
  }
  /*
    Called on mouse, touch, or MSPointer down
    Sets up the drawing environment and adds event handlers for move events

    @param e: jQuery event representing a mousedown, touchstart, or MSPointerStart event

    Returns false to prevent default event behavior (namely, viewport scrolling on touch devices)
  */
  DrawSelect.prototype.startDrawing = function(e) {
    var self = this, lastElems = [];

    // Only do setup once
    if (!this.drawInProgress) {
      this.itemBoxes = this.getBoxes();
      this.$container.addClass(this.settings.drawingClass);
    }

    // Initial collision check (allows for single select by clicking/tapping)
    var lastCoords = this.getCoords(e);
    lastElems  = this.checkCollision(lastCoords, lastElems)

    // Prevent touch devices from firing fake mouse events (this will cause a double selection)
    if (this.touchSupport) {
      $(e.target).one('mousedown mousemove mouseup', function() {
        return false;
      });
    }

    this.$selectarea.on(this.events.move, function(e) {
      self.drawInProgress = true;
      var evt = e.originalEvent;

      // Get new click or touches
      var newCoords = self.getCoords(e);

      // Draw lines
      self.multiDrawLine(lastCoords, newCoords, self.draw);

      // Check collision
      lastElems = self.checkCollision(newCoords, lastElems);

      // Make the new coordinates the last coordinates
      lastCoords = newCoords;

      // Prevent scrolling
      return false;
    });

    // Prevent default behavior
    return false;
  }
  /*
    Called on mouseup, mouseout, touchup, touchleave, touchcancel, MSPointerUp, or MSPointerOut
    Basically whenever the user lifts a mouse or finger.

    Starts a 50ms timer to cancel drawing if the user ceases all input.
    When drawing is stopped, the canvas is cleared and styling classes are removed.

    Returns false to prevent default event behavior
  */
  DrawSelect.prototype.stopDrawing = function() {
    var self = this;

    this.drawInProgress = false;

    window.drawTimeout = window.setTimeout(function() {
      if (!self.drawInProgress) {
        // Erase the canvas
        self.draw.clearRect(0, 0, self.canvas.width, self.canvas.height);

        // Disable drawing
        self.$selectarea.off(self.events.move);
        self.$container.removeClass(self.settings.drawingClass);
        if (self.touchSupport && self.settings.touchMode !== 'auto') self.drawEnabled = false;
      }
    }, 50);

    // For good measure
    return false;
  }

  /*
    Draw a line on the canvas from and to the given points

    @param from: an object with X and Y coordinates representing the start of the stroke
    @param to: an object with X and Y coordinates representing the end of the stroke
    @param context: a CanvasRenderingContext2D object to draw with

    Doesn't return anything
  */
  DrawSelect.prototype.drawLine = function(from, to, context) {
    context.strokeStyle = this.settings.lineColor;
    context.lineWidth = this.settings.lineWidth;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.closePath();
    context.stroke();
  }
  /*
    Draws multiple lines based on an array of coordinates. A line is only drawn if a set of coordinates with matching indices in the array are available

    @param from: an array of objects with X and Y coordinates representing the starts of strokes
    @param to: an array of objects with X and Y coordinates representing the ends of strokes
    @param context: a CanvasRenderingContext2D object to draw with

    Doesn't return anything
  */
  DrawSelect.prototype.multiDrawLine = function(from, to, context) {
    var self = this;

    $.each(from, function(i) {
      if (typeof to[i] === 'object') self.drawLine(from[i], to[i], context);
    })
  }

  /*
    Select an item. The selection is added to an array of selected items, and the bounding box of the selected item is removed from the array of bounding boxes. This prevents the item from being selected twice, and speeds up collision checking by reducing the number of checks needed.

    @param elem: jQuery element representing DOM element to be added to the selection
    @param index: index of the bounding box of the selected item

    Doesn't return anything
  */
  DrawSelect.prototype.select = function(elem, index) {
    this.selectedItems.push(elem[0]);
    if (typeof index === 'number') delete this.itemBoxes[index];
    elem.addClass(this.settings.selectedClass);
    this.$container.trigger('drawselect.countChange');
  }
  /*

  */
  DrawSelect.prototype.selectAll = function() {
    var self = this;
    this.selectedItems = [];
    this.$items.each(function() {
      self.select(this);
    });
    this.$container.trigger('drawselect.countChange');
  }
  DrawSelect.prototype.deselect = function(elem) {
    var index, self = this;
    $.each(this.selectedItems, function(index) {
      if (this === elem[0]) {
        self.selectedItems.splice(index, 1);
        elem.removeClass('selected');
        self.$container.trigger('drawselect.countChange');
      }
    });
  }
  DrawSelect.prototype.deselectAll = function() {
    this.selectedItems = [];
    this.$items.removeClass('selected');
    this.$container.trigger('drawselect.countChange');
  }

  /*  ===============
      Rectangle class
      =============== */

  var Rectangle = function(x, y, w, h) {
    this.top = y;
    this.bottom = y + h;
    this.left = x;
    this.right = x + w;
  }
  Rectangle.prototype.intersects = function(x, y) {
    return (x >= this.left && x <= this.right && y >= this.top && y <= this.bottom);
  }

  $.fn.drawselect = function(settings, actions) {
    return $(this).find('[data-drawselect]').addBack('[data-drawselect]').each(function() {
      var ds = new DrawSelect($(this), settings, actions);
    }).end();
  }

}(window.Zepto || window.jQuery));