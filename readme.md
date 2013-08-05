# Wrangle

Wrangle is a responsive, touch-friendly selection plugin for jQuery or Zepto. Wrangle offers a unique method of multiple selection: by drawing a line through items to select them. The plugin is lightweight and designed to be exstensible and adaptable. It's also highly experimental, due in no small part to the diversity of touch implementations in various devices and browsers.

## Compatibility

Wrangle depends on two key web technologies: HTML5 Canvas and JavaScript touch events. Canvas is well-supported even with older browsers. IE 9+, Firefox 2+, Chrome, Safari, Mobile Safari, and the Android Browser all have support for the canvas element.

Touch support is a bit more spotty. On desktop browsers, standard touch events are supported in Firefox 6+, Chrome 22+, and Opera 15+. On mobile devices, touch is supported by Android 2.3+ and iOS 3.2+. Android 2.3 only supports single touch events; 3.0 is the first version to support multi-touch events. Windows Phone 7 does not support touch events. Windows Phone 8 and IE10 do, but they use Microsoft's custom Pointer event model (which has since been submitted to the W3C as a potential future standard). This implementation funnels all mouse, pen, and touch input into one MSPointerEvent object.

Wrangle supports mouse, touch, and MSPointer events, but your mileage will vary depending on the device and browser. iOS provides the best experience in terms of standards and smoothness.

## Installing

Download or clone the repository and include `wrangle.min.js` at the bottom of your page's `<body>` tag.

	<script src="js/wrangle.min.js"></script>

Wrangle requires jQuery, and is also compatible with Zepto. However, Zepto's touch module is not required for Wrangle's touch capabilities to work.

## Setup

### HTML

Wrangle will identify your selection area by looking for certain data attributes. Your container should have a `data-Wrangle` attribute, and includes the selection area, as well as controls to manipulate selections.

	<div data-wrangle>
	</div>

Inside the container is a selection area, which houses your list of selectable items, and a transparent canvas to sit on top of it. Your item list should be a `<ul>` or `<ol>` with a series of selectable `<li>`s.

	<!-- Inside [data-wrangle] -->
	<div data-selectarea>
	  <canvas data-canvas></canvas>
	  <ul data-list>
	    <li>Item 1</li>
	    <li>Item 2</li>
	    <li>Item 3</li>
	  </ul>
	</div>

You don't need to set a width and height for the canvas; the plugin will handle that for you.

You can also add controls to manipulate selectons. All of these controls are optional.

	<!-- Selects all elements inside data-items -->
	<a data-all>Select All</a>
	<!-- Deselects all elements -->
	<a data-none>Select None</a>

	<!-- Define a custom action (more on that later) -->
	<a data-action="delete">Delete</a>

Finally, an element with an attribute of `data-count` will display the number of items selected.

    

### CSS

You only need a few lines of CSS to get Wrangle working.

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

*Note:* Don't give the canvas element a percentage width! When a canvas element is automatically scaled, its coordinate system scales along with it, causing the selection line to become misaligned with the user's cursor or finger. Wrangle will adjust the canvas for you to match the dimmensions of the list.

#### Special classes

Wrangle applies a handful of classes to your markup as the interface is being used, purely for styling purposes. They can all be changed in the plugin options. The default names are:

- `editable`: active whenever the canvas can be drawn on.
- `drawing`: active whenever the user is actively drawing.
- `selected`: applied to a list item when it's selected.

## Initializing

Initialize Wrangle by calling `$.fn.wrangle()` on the document, a specific `data-wrangle` element, or anything in between.

	$(window).on('load', function() {
	  $(document).wrangle();
	});

## Customizing

A Wrangle object can be passed an object of options and an object of custom actions on initialization.

### Options

	{
	  lineColor: '#000000',      // Color of the selection line (CSS color, hex, RGB, or RGBa)
	  lineWidth: 5,              // Width of the selection line (this doesn't affect how selections are calculated)

	  drawingClass: 'drawing',   // CSS class to add to container while drawing
	  selectedClass: 'selected', // CSS class to add to selected items

	  deselectable: false        // If true, selected items can be deselected by drawing over them again
	  touchMode: 'auto',         // Method of triggering selection mode on touch devices (see below)
      clearOnCancel: true,       // If using the edit button, should the selection be cleared if the user leaves edit mode?
	}

#### Touch Modes

The `touchMode` property has three settings. By default, touching inside the selection area will always enable drawing. Depending on the layout of your page, this may prevent the user from scrolling, because the drawing process overrides the normal scrolling behavior of most touch devices. There are three alternatives to this:

- Add a button with a `data-edit` attribute to your container. This will turn off drawing by default, and allow the user to enable and disable drawing by tapping the button.
- Set `touchMode` to `double-tap` on initialization. With this setting, the user can only select by double tapping and then dragging to draw. A single tap will still select or deselect an item, but tapping and dragging will not enable drawing, keeping the scrolling behavior in place.
- Set `touchMode` to `2fscroll` on initialization. With this setting, the user can draw with one finger or scroll with two or more fingers. Obviously this prevents multitouch drawing but still allows for the user to scroll and draw on the same surface.

### Custom Actions

To remain open-ended and flexible, Wrangle has few built-in actions. It's up to you as the developer to build an app that models items and provides a means to manipulate them.

A custom action is a callback fired whenever the user clicks or taps a `data-action` button. The callback will give you the parent Wrangle object (in the form of `this`) and a jQuery collection containing all selected items. What you do with the items from there is completely up to you.

Custom actions are passed in as an object of functions. Although you can access the entire Wrangle object from within the callback, an `items` parameter is also passed which gives you access to the selected items.

This example removes selected items from the DOM:

	<div data-Wrangle>
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
	    $(document).wrangle(options, actions);
	  });
	</script>

You'll notice that this sample action returns `false` at the end. Returning `false` at the end of an action will clear the selection when the action finishes. You'll want to do this if the selected items will be unavailable for any reason after the callback runs.

# MIT Open Source License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.