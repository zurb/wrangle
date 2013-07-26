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
      drawingClass: 'drawing',
    }

    // Actions
    this.actions = {};

		// Drawing context
		this.draw = this.canvas.getContext('2d');

		// Drawing coordinates
		this.lastCoords = {};
    this.lastTouches = [];

		// List of bounding boxes for list items
		this.itemBoxes     = [];
		// List of selected items
		this.selectedItems = [];
    this.selectedCount = 0;

    // Touch support?
    if (typeof window.ontouchstart !== 'undefined') {
      this.touchSupport = true;
    }

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

    /*
      Initialization
    */

    // Add user settings/actions
    $.extend(this.settings, settings);
    $.extend(this.actions, actions);

    // The canvas should match the list area in dimmensions
    this.sizeCanvas();
    this.$list.on('resize', function() {
      self.sizeCanvas();
    });

    /*
      Actions
    */

    this.$container.find('[data-clear]').on('click', function() {
      self.selectedItems = [];
      self.$items.removeClass('selected');
      return false;
    });
    this.$container.find('[data-all]').on('click', function() {
      self.selectedItems = [];
      self.$items.each(function() {
        self.selectedItems.push(this);
        $(this).addClass('selected');
      });
      return false;
    });

    // Custom actions

    this.$container.find('[data-action]').on('click', function() {
      var evt = $(this).attr('data-action');

      if (self.actions.hasOwnProperty(evt)) {
        self.actions[evt].call(self, $(self.selectedItems));
        self.sizeCanvas();
      }
      else {
        console.log('ERROR: Your markup is referencing an undefined action, "'+evt+'"');
      }
    });

    /*
      Events
    */

    // Drawing
    this.$selectarea.on(this.events.start, function() {
      self.startDrawing();
    });

    // Cancelling drawing
    this.$selectarea.on(this.events.end, function() {
      self.stopDrawing();
    });
  }

  DrawSelect.prototype.sizeCanvas = function() {
    this.canvas.width  = this.$list.outerWidth();
    this.canvas.height = this.$list.outerHeight();
  }
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
  DrawSelect.prototype.startDrawing = function() {
    var self = this;

    self.$container.addClass(self.settings.drawingClass);
    self.itemBoxes = self.getBoxes();

    self.$selectarea.on(self.events.move, function(e) {
      evt = e.originalEvent;

      // Store coordinates of mouse
      if (!self.touchSupport) {
        var x = e.pageX - self.$container.offset().left;  
        var y = e.pageY - self.$container.offset().top;

        var newCoords = {
          x: x,
          y: y,
        }
      }
      // Or touches
      else {
        var newTouches = [];

        $.each(evt.targetTouches, function() {
          newTouches.push({
            x: this.pageX - self.$container.offset().left,
            y: this.pageY - self.$container.offset().top,
          })
        });
      }

      // If this is the first move, just establish a starting point
      if (!self.touchSupport && typeof self.lastCoords.x !== 'number') {
          self.lastCoords.x = x;
          self.lastCoords.y = y;
      }
      else if (typeof self.lastTouches === 'undefined') {
          self.lastTouches = newTouches;
      }
      // Otherwise draw a line from the last coordinates to the newest ones
      else {

        // Draw the line
        if (!self.touchSupport) self.drawLine(self.lastCoords, newCoords, self.draw);
        else self.multiDrawLine(self.lastTouches, newTouches, self.draw);

        if (!self.touchSupport) {
          // Compare the mouse position to the bounding boxes of each list item
          $.each(self.itemBoxes, function(index) {
            // If an item overlaps...
            if (this.intersects(newCoords.x, newCoords.y)) {
              var elem = self.$items.eq(index);

              // ...and it's not already selected...
              if (!elem.hasClass('selected'))
                self.addSelection(elem);
            }
          });
        }

        else {
          $.each(self.itemBoxes, function(index) {
            var rect = this;

            $.each(newTouches, function() {
              if (rect.intersects(this.x, this.y)) {
                var elem = self.$items.eq(index);
                if (!elem.hasClass('selected'))
                  self.addSelection(elem);
              }
            });
          });
        }

        // Make the new coordinates the last coordinates
        if (!self.touchSupport) self.lastCoords = $.extend({}, newCoords);
        else self.lastTouches = newTouches;
      }
      return false;
    });
  }
  DrawSelect.prototype.stopDrawing = function() {
    // Erase the canvas
    this.draw.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Disable drawing
    this.$selectarea.off(this.events.move).removeClass(this.settings.drawingClass);

    // Reset coordinates
    this.lastCoords = {};
    this.lastTouches = {};

    // For good measure
    return false;
  }
	DrawSelect.prototype.drawLine = function(from, to, context) {
		context.strokeStyle = this.settings.lineColor;
		context.lineWidth = 5;
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
  DrawSelect.prototype.addSelection = function(elem) {
    this.selectedItems.push(elem[0]);
    elem.addClass('selected');
  }

	/*	===============
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
    return this.find('[data-drawselect]').addBack().each(function() {
      var ds = new DrawSelect($(this), settings, actions);
    }).end();
  }

}(window.Zepto || window.jQuery));