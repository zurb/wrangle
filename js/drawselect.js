;(function($) {

	var DrawSelect = function(elem, settings, actions) {

    /*
      Properties
    */

    var self = this;

		// DOM elements
		this.$container = elem;
		this.canvas     = this.$container.find('canvas')[0];
    this.$list      = this.$container.find('[data-items]').eq(0);
    this.$items     = this.$list.children('li');
    this.draw       = this.canvas.getContext('2d');

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

		// List of bounding boxes for list items
		this.itemBoxes     = [];
		// List of selected items
		this.selectedItems = [];
    this.selectedCount = 0;

    /*
      Initialization
    */

    // Add user settings/actions
    $.extend(this.settings, settings);
    $.extend(this.actions, actions);

    // The canvas should match the list area in dimmensions
    this.canvas.width  = this.$list.outerWidth();
    this.canvas.height = this.$list.outerHeight();

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
      }
    });

    /*
      Events
    */


    this.$container.on({

      // Drawing

      'mousedown': function() {
        self.$container.addClass(self.settings.drawingClass);
        self.itemBoxes = self.getBoxes();

        $(this).on('mousemove', function(e) {
          // Store coordinates of mouse
          var x = e.pageX - self.$container.offset().left;
          var y = e.pageY - self.$container.offset().top;

          // If self is the first move, just establish a starting point
          if (typeof self.lastCoords.x !== 'number') {
            self.lastCoords.x = x;
            self.lastCoords.y = y;
          }
          // Otherwise draw a line from the last coordinates to the newest ones
          else {
            // Define new coordinates
            var newCoords = {
              x: x,
              y: y,
            }

            // Draw the line
            self.drawLine(self.lastCoords, newCoords, self.draw);

            // Compare the mouse position to the bounding boxes of each list item
            $.each(self.itemBoxes, function(index) {
              // If an item overlaps...
              if (this.intersects(newCoords.x, newCoords.y)) {
                var elem = self.$items.eq(index);

                // ...and it's not already selected...
                if (!elem.hasClass('selected')) {
                  // Add it to the selection
                  self.selectedItems.push(elem[0]);
                  elem.addClass('selected');
                }

                return false;
              }
            });

            self.lastCoords = $.extend({}, newCoords);
          }
        });
      },

      // Cancelling drawing

      'mouseup mouseout': function() {
        // Erase the canvas
        self.draw.clearRect(0, 0, self.canvas.width, self.canvas.height);

        // Disable drawing
        self.$container.off('mousemove').removeClass(self.settings.drawingClass);

        // Reset coordinates
        self.lastCoords = {};

        // For good measure
        return false;
      },
    });
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
	DrawSelect.prototype.drawLine = function(from, to, context) {
		context.strokeStyle = '#000000';
		context.lineWidth = 5;
		context.beginPath();
		context.moveTo(from.x, from.y);
		context.lineTo(to.x, to.y);
		context.closePath();
		context.stroke();
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