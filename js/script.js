$(function(){

	var drawLine = function(from, to, context) {
		context.strokeStyle = '#000000';
		context.lineWidth = 5;
		context.beginPath();
		context.moveTo(from.x, from.y);
		context.lineTo(to.x, to.y);
		context.closePath();
		context.stroke();
	}

	var Rectangle = function(x, y, w, h) {
		this.top = y;
		this.bottom = y + h;
		this.left = x;
		this.right = x + w;
	}
	Rectangle.prototype.intersects = function(x, y) {
		return (x >= this.left && x <= this.right && y >= this.top && y <= this.bottom);
	}

	$(document).find('[data-drawselect]').each(function(){
		var $container = $(this);
		var $canvas    = $(this).find('canvas').eq(0);
		var $items     = $(this).find('[data-items] > li');
		var draw       = $canvas[0].getContext('2d');

		var lastCoords = {};

		var itemBoxes = [];
		var selectedItems = [];

		$(this).on('mousedown', function() {
			// Lock the visible items in place and get their bounding boxes
			$container.addClass('drawing');
			itemBoxes = [];
			$items.each(function() {
				var x = $(this).position().left + parseInt($(this).css('margin-left'));
				var y = $(this).position().top  + parseInt($(this).css('margin-top'));
				var w = $(this).outerWidth();
				var h = $(this).outerHeight();

				itemBoxes.push(new Rectangle(x, y, w, h));
			});

			$container.mousemove(function(e) {
				var x = e.pageX - $container.offset().left;
				var y = e.pageY - $container.offset().top;

				// If this is the first move, just establish a starting point
				if (typeof lastCoords.x !== 'number') {
					lastCoords.x = x;
					lastCoords.y = y;

					newCoords = {x: 0, y: 0};
				}
				// Otherwise draw a line from the last coordinates to the newest ones
				else {
					var newCoords = {
						x: x,
						y: y,
					}
					drawLine(lastCoords, newCoords, draw);
					$.each(itemBoxes, function(index) {
						if (this.intersects(newCoords.x, newCoords.y)) {
							var elem = $items.eq(index);

							if (!elem.hasClass('selected')) {
								selectedItems.push(elem);
								elem.addClass('selected');
								console.log("Added to selection.");
							}

							return false;
						}
					})

					lastCoords = $.extend({}, newCoords);
				}
			});
		});

		$(this).on('mouseup mouseout', function(){
			// Erase the canvas
			draw.clearRect(0, 0, $canvas[0].width, $canvas[0].height);

			// Disable drawing
			$container.off('mousemove').removeClass('drawing');

			// Reset coordinates
			lastCoords = {};

			// For good measure
			return false;
		});

		$(this).find('[data-clear]').on('click', function() {
			selectedItems = [];
			$items.removeClass('selected');
		});
		$(this).find('[data-all]').on('click', function() {
			selectedItems = [];
			$items.each(function() {
				selectedItems.push(this);
				$(this).addClass('selected');
			})
		});

		$(this).find('[data-action="delete"]').on('click', function() {
			$.each(selectedItems, function() {
				this.remove();
			});
			selectedItems = [];
		});
	});

});