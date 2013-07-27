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
    this.lastCoords = [];

    // Drawing enabled
    this.drawEnabled = true;

    // List of bounding boxes for list items
    this.itemBoxes     = [];
    // List of selected items
    this.selectedItems = [];

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
      self.$container.trigger('drawselect.countChange');
      return false;
    });
    this.$container.find('[data-all]').on('click', function() {
      self.selectedItems = [];
      self.$items.each(function() {
        self.selectedItems.push(this);
        $(this).addClass('selected');
      });
      self.$container.trigger('drawselect.countChange');
      return false;
    });

    var editButton = this.$container.find('[data-edit]');
    if (editButton.length > 0) {
      this.drawEnabled = false;
      editButton.on('click', function() {
        self.drawEnabled = !self.drawEnabled;
      });
    }

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
  DrawSelect.prototype.startDrawing = function(e) {
    var self = this;

    this.$container.addClass(this.settings.drawingClass);
    this.itemBoxes = this.getBoxes();

    this.lastCoords = [];

    if (e.type === 'mousedown') {
      this.lastCoords.push({
        x: e.pageX - self.$container.offset().left,
        y: e.pageY - self.$container.offset().top,
      });
    }
    else {
      $.each(e.originalEvent.targetTouches, function() {
        self.lastCoords.push({
          x: this.pageX - self.$container.offset().left,
          y: this.pageY - self.$container.offset().top,
        })
      });
    }

    this.$selectarea.on(this.events.move, function(e) {
      var evt = e.originalEvent;
      var newCoords = [];

      console.log(e);

      // Store mouse coordinates of move
      if (e.type === 'mousemove') {
        newCoords.push({
          x: e.pageX - self.$container.offset().left,
          y: e.pageY - self.$container.offset().top,
        });
      }
      // Or all touch coordinates
      else {
        $.each(evt.targetTouches, function() {
          newCoords.push({
            x: this.pageX - self.$container.offset().left,
            y: this.pageY - self.$container.offset().top,
          })
        });
      }

      // Draw lines
      self.multiDrawLine(self.lastCoords, newCoords, self.draw);

      // Check for collisions between touches and boxes
      $.each(self.itemBoxes, function(index) {
        var rect = this;

        $.each(newCoords, function() {
          if (rect.intersects(this.x, this.y)) {
            var elem = self.$items.eq(index);
            if (!elem.hasClass('selected'))
              self.addSelection(elem);
          }
        });
      });

      // Make the new coordinates the last coordinates
      self.lastCoords = newCoords;
      return false;
    });
  }
  DrawSelect.prototype.stopDrawing = function() {
    // Erase the canvas
    this.draw.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Disable drawing
    this.$selectarea.off(this.events.move).removeClass(this.settings.drawingClass);

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
    return this.find('[data-drawselect]').addBack().each(function() {
      var ds = new DrawSelect($(this), settings, actions);
    }).end();
  }

}(window.Zepto || window.jQuery));