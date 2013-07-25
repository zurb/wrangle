;(function($) {
	
	var DrawSelect = function(elem) {
		// DOM elements
		this.$container = elem;
		this.$canvas    = $(this).find('canvas').eq(0);
		this.$items     = $(this).find('[data-items] > li');

		// Drawing context
		this.draw = $canvas[0].getContext('2d');

		// Drawing coordinates
		this.lastCoords = {};
		this.newCoords  = {};

		// List of bounding boxes for list items
		this.itemBoxes     = [];
		// List of selected items
		this.selectedItems = [];
	}
	DrawSelect.prototype.drawLine = function(from, to) {
		this.draw.strokeStyle = '#000000';
		this.draw.lineWidth = 5;
		this.draw.beginPath();
		this.draw.moveTo(from.x, from.y);
		this.draw.lineTo(to.x, to.y);
		this.draw.closePath();
		this.draw.stroke();
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

}(window.Zepto || window.jQuery));