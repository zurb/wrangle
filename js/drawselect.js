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
        self.$container.toggleClass('editable');

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
  */
  DrawSelect.prototype.sizeCanvas = function() {
    this.canvas.width  = this.$list.outerWidth();
    this.canvas.height = this.$list.outerHeight();
  }
  /*
    Calculate bounding boxes for every list item
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
    Fetch coordinates from the given MouseEvent or TouchEvent
    Return as an array of objects containing x and y coordinates
  */
  DrawSelect.prototype.getCoords = function(event) {
    var self = this;
    var coords = [];

    if (this.msTouchSupport) {
      coords.push({
        x: event.originalEvent.pageX,
        y: event.originalEvent.pageX,
      });
    }
    else if (event.type.match(/mouse/)) {
      coords.push({
        x: event.pageX - self.$container.offset().left,
        y: event.pageY - self.$container.offset().top,
      });
    }
    else {
      $.each(event.originalEvent.targetTouches, function() {
        coords.push({
          x: this.pageX - self.$container.offset().left,
          y: this.pageY - self.$container.offset().top,
        })
      });
    }

    return coords;
  }
  /*
    Check to see if given coordinates overlap with any list items
    Add them to the selection if they do, and if they aren't already selected
  */
  DrawSelect.prototype.checkCollision = function(coords, prev) {
    var self = this, last = [];

    // For each box...
    $.each(self.itemBoxes, function(index) {
      var rect = this;

      // ...and each rectangle...
      $.each(coords, function(i) {

        // ...check if the two intersect...
        if (rect.intersects(this.x, this.y)) {
          var elem = self.$items.eq(index);

          // ...and if the item isn't already selected, add it
          if (!self.settings.selectToggle) {
            if (!elem.hasClass(self.settings.selectedClass)) self.select(elem);
          }
          // For deselection mode: don't do anything if the target element was the last to be modified
          else if (prev[i] !== elem[0]) {
            if (elem.hasClass(self.settings.selectedClass)) self.deselect(elem);
            else self.select(elem);
          }
          last[i] = elem[0];
        }
      });
    });

    return last;
  }
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
  DrawSelect.prototype.stopDrawing = function() {
    // Erase the canvas
    this.draw.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Disable drawing
    this.$selectarea.off(this.events.move);
    this.$container.removeClass(this.settings.drawingClass);
    if (this.touchSupport && this.settings.touchMode !== 'auto') this.drawEnabled = false;

    this.drawInProgress = false;

    // For good measure
    return false;
  }
  DrawSelect.prototype.drawLine = function(from, to, context) {
    context.strokeStyle = this.settings.lineColor;
    context.lineWidth = this.settings.lineWidth;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.closePath();
    context.stroke();
  }
  DrawSelect.prototype.multiDrawLine = function(from, to, context) {
    var self = this;

    $.each(from, function(i) {
      self.drawLine(from[i], to[i], context);
    })
  }
  DrawSelect.prototype.select = function(elem) {
    this.selectedItems.push(elem[0]);
    elem.addClass('selected');
    this.$container.trigger('drawselect.countChange');
  }
  DrawSelect.prototype.selectAll = function() {
    var self = this;
    this.selectedItems = [];
    this.$items.each(function() {
      self.selectedItems.push(this);
      $(this).addClass(self.settings.selectedClass);
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