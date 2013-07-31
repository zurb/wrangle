# DrawSelect

DrawSelect is a responsive, touch-friendly selection plugin for jQuery or Zepto. DrawSelect offers a unique method of multiple selection: by drawing a line through items to select them. The plugin is lightweight and designed to be exstensible and adaptable.

## Compatibility

DrawSelect utilizes the HTML5 Canvas, which is well-supported even with older browsers. IE 9+, Firefox 2+, Chrome, Safari, Mobile Safari, and the Android Browser all have support for the canvas element.

## Installing

Download or clone the repository and include `drawselect.min.js` at the bottom of your page's `<body>` tag.

	<script src="js/drawselect.min.js"></script>

DrawSelect requires jQuery, and is also compatible with Zepto. However, Zepto's touch module is not required for DrawSelect's touch capabilities to work.

## Setup

### HTML

DrawSelect will identify your selection area by looking for certain data attributes. Your container should have a `data-drawselect` attribute, and includes the selection area, as well as controls to manipulate selections.

	<div data-drawselect>
	</div>

Inside the container is a selection area, which houses your list of selectable items, and a transparent canvas to sit on top of it. Your item list should be a `<ul>` or `<ol>` with a series of selectable `<li>`s.

	<!-- Inside [data-drawselect] -->
	<div data-selectarea>
	  <canvas data-canvas></canvas>
	  <ul data-list>
	    <li>Item 1</li>
	    <li>Item 2</li>
	    <li>Item 3</li>
	  </ul>
	</div>

You don't need to set a width and height for the canvas; the plugin will handle that for you.

Finally, you can add controls to manipulate selectons. All of these controls are optional.

	<!-- Selects all elements inside data-list -->
	<a data-all>Select All</a>
	<!-- Deselects all elements -->
	<a data-none>Select None</a>

	<!-- Define a custom action (more on that later) -->
	<a data-action="delete">Delete</a>

### CSS

You only need a few lines of CSS to get DrawSelect working.

	[data-selectarea] {
		position: relative;
	}
	[data-canvas] {
		position: absolute;
		z-index: 10;
		background: transparent;
	}
	[data-list] {
		position: relative;
		width: 100%;
		z-index: 5;
	}

As you can see, these values will place the canvas (and thus the selection line) on top of your list. However, you can also place the canvas underneath your list by adjusting the z-index values of the canvas or the list. This is just a visual preference; the plugin will work exactly the same.

*Note:* Don't give the canvas element a percentage width! When a canvas element is automatically scaled, its coordinate system scales along with it, causing the selection line to become misaligned with the user's cursor or finger. DrawSelect will adjust the canvas for you to match the dimmensions of the list.

## Initializing

Initialize DrawSelect by calling `$.fn.drawselect()` on the document, a specific `data-drawselect` element, or anything in between.

	$(window).on('load', function() {
	  $(document).drawselect();
	});

## Customizing

A DrawSelect object can be passed an object of options and an object of custom actions on initialization.

### Options

	{
	  lineColor: '#000000',      // Color of the selection line (CSS color, hex, RGB, or RGBa)
	  lineWidth: 5,              // Width of the selection line (this doesn't affect how selections are calculated)

	  drawingClass: 'drawing',   // CSS class to add to container while drawing
	  selectedClass: 'selected', // CSS class to add to selected items

	  deselectable: false        // If true, selected items can be deselected by drawing over them again
	  touchMode: 'auto',         // Method of triggering selection mode on touch devices (see below)
	}

#### Touch Modes

The `touchMode` property has two settings: `auto` and `double-tap`. By default, touching inside the selection area will always enable drawing. Depending on the layout of your page, this may prevent the user from scrolling, because the drawing process overrides the normal scrolling behavior of most touch devices. There are two alternatives to this:

- Add a button with a `data-edit` attribute to your container. This will turn off drawing by default, and allow the user to enable and disable drawing by tapping the button.
- Set `touchMode` to `double-tap` on initialization. With this setting, the user can only select by double tapping and then dragging to draw. A single tap will still select or deselect an item, but tapping and dragging will not enable drawing, keeping the scrolling behavior in place.

### Custom Actions

To remain open-ended and flexible, DrawSelect has few built-in actions. It's up to you as the developer to build an app that models items and provides a means to manipulate them.

A custom action is a callback fired whenever the user clicks or taps a `data-action` button. The callback will give you the parent DrawSelect object (in the form of `this`) and a jQuery collection containing all selected items. What you do with the items from there is completely up to you.

Custom actions are passed in as an object of functions. Although you can access the entire DrawSelect object from within the callback, an `items` parameter is also passed which gives you access to the selected items.

This example removes selected items from the DOM:

	<div data-drawselect>
	  <!-- Canvas/list code... -->
	  <a data-action="delete">Delete</a>
	</div>

	<script>
	  $(window).on('load', function() {
	  	options = {};
	  	actions = {
		  'delete': function(items) {
		    items.remove();
		    return false;
		  },
	  	};
	    $(document).drawselect(options, actions);
	  });
	</script>

You'll notice that this sample action returns `false` at the end. Returning `false` at the end of an action will clear the selection when the action finishes. You'll want to do this if the selected items will be unavailable for any reason after the callback runs.