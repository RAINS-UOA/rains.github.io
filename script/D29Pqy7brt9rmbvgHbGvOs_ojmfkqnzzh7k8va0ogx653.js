/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Skip CoBlocks Lightbox images
		if ( img.parentNode.className.match(/coblocks-lightbox__image/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
( function() {
	var cookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)eucookielaw\s*\=\s*([^;]*).*$)|^.*$/, '$1' );
	var overlay = document.querySelector( '#eu-cookie-law' );
	var container = document.querySelector( '.widget_eu_cookie_law_widget' );
	var initialScrollPosition, scrollFunction;

	function remove( el ) {
		return el && el.parentElement && el.parentElement.removeChild( el );
	}

	function triggerDismissEvent() {
		try {
			const dismissEvent = new Event( 'eucookielaw-dismissed' );
			document.dispatchEvent( dismissEvent );
		} catch ( err ) { }
	}

	function removeOverlay() {
		remove( overlay );
		triggerDismissEvent();
	}

	function fade( el, type, fn ) {
		var duration = 400;

		el.style.display = 'block';
		el.style.transitionProperty = 'opacity';
		el.style.transitionDuration = duration + 'ms';
		el.style.opacity = type === 'in' ? 0 : 1;

		// Double rAF to ensure styles are applied cross-browser.
		requestAnimationFrame( function () {
			requestAnimationFrame( function() {
				el.style.opacity = type === 'in' ? 1 : 0;
				// Wait for animation.
				setTimeout( function () {
					// Clean up.
					el.style.removeProperty( 'opacity' );
					el.style.removeProperty( 'transition-property' );
					el.style.removeProperty( 'transition-duration' );

					if ( type === 'out' ) {
						el.style.display = 'none';
					}

					if ( typeof fn === 'function' ) {
						fn();
					}
				}, duration + 50 );
			} );
		} );
	}

	function appendWidget() {
		document.body.appendChild( container );
		overlay.style.display = 'block';
		fade( container, 'in' );
	}

	if ( typeof wp !== 'undefined' && !! wp.customize ) {
		appendWidget();
		return;
	}

	if ( ! overlay || ! container ) {
		return;
	}

	if ( overlay.classList.contains( 'ads-active' ) ) {
		var adsCookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)personalized-ads-consent\s*\=\s*([^;]*).*$)|^.*$/, '$1' );
		if ( cookieValue !== '' && adsCookieValue !== '' ) {
			removeOverlay();
		}
	} else if ( cookieValue !== '' ) {
		removeOverlay();
	}

	appendWidget();

	overlay.querySelector( 'form' ).addEventListener( 'submit', accept );

	if ( overlay.classList.contains( 'hide-on-scroll' ) ) {
		initialScrollPosition = window.pageYOffset;

		scrollFunction = function() {
			if ( Math.abs( window.pageYOffset - initialScrollPosition ) > 50 ) {
				accept();
			}
		};

		window.addEventListener( 'scroll', scrollFunction );
	} else if ( overlay.classList.contains( 'hide-on-time' ) ) {
		var timeout = parseInt( overlay.getAttribute( 'data-hide-timeout' ), 10 ) || 0;
		setTimeout( accept, timeout * 1000 );
	}

	var accepted = false;
	function accept( event ) {
		if ( accepted ) {
			return;
		}
		accepted = true;

		if ( event && event.preventDefault ) {
			event.preventDefault();
		}

		if ( overlay.classList.contains( 'hide-on-scroll' ) ) {
			window.removeEventListener( 'scroll', scrollFunction );
		}

		var expireTime = new Date();
		var consentExpiration = parseInt( overlay.getAttribute( 'data-consent-expiration' ), 10 ) || 0;
		expireTime.setTime( expireTime.getTime() + ( consentExpiration * 24 * 60 * 60 * 1000 ) );

		document.cookie = 'eucookielaw=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		if ( overlay.classList.contains( 'ads-active' ) && overlay.classList.contains( 'hide-on-button' ) ) {
			document.cookie = 'personalized-ads-consent=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		}

		fade( overlay, 'out', function() {
			removeOverlay();
			remove( container );
		} );
	}
} )();
;
/* global wpcom_reblog */

var jetpackLikesWidgetBatch = [];
var jetpackLikesMasterReady = false;

// Due to performance problems on pages with a large number of widget iframes that need to be loaded,
// we are limiting the processing at any instant to unloaded widgets that are currently in viewport,
// plus this constant that will allow processing of widgets above and bellow the current fold.
// This aim of it is to improve the UX and hide the transition from unloaded to loaded state from users.
var jetpackLikesLookAhead = 2000; // pixels

// Keeps track of loaded comment likes widget so we can unload them when they are scrolled out of view.
var jetpackCommentLikesLoadedWidgets = [];

var jetpackLikesDocReadyPromise = new Promise( resolve => {
	if ( document.readyState !== 'loading' ) {
		resolve();
	} else {
		window.addEventListener( 'DOMContentLoaded', () => resolve() );
	}
} );

function JetpackLikesPostMessage( message, target ) {
	if ( typeof message === 'string' ) {
		try {
			message = JSON.parse( message );
		} catch ( e ) {
			return;
		}
	}

	if ( target && typeof target.postMessage === 'function' ) {
		try {
			target.postMessage(
				JSON.stringify( {
					type: 'likesMessage',
					data: message,
				} ),
				'*'
			);
		} catch ( e ) {
			return;
		}
	}
}

function JetpackLikesBatchHandler() {
	const requests = [];
	document.querySelectorAll( 'div.jetpack-likes-widget-unloaded' ).forEach( widget => {
		if ( jetpackLikesWidgetBatch.indexOf( widget.id ) > -1 ) {
			return;
		}

		if ( ! jetpackIsScrolledIntoView( widget ) ) {
			return;
		}

		jetpackLikesWidgetBatch.push( widget.id );

		var regex = /like-(post|comment)-wrapper-(\d+)-(\d+)-(\w+)/,
			match = regex.exec( widget.id ),
			info;

		if ( ! match || match.length !== 5 ) {
			return;
		}

		info = {
			blog_id: match[ 2 ],
			width: widget.width,
		};

		if ( 'post' === match[ 1 ] ) {
			info.post_id = match[ 3 ];
		} else if ( 'comment' === match[ 1 ] ) {
			info.comment_id = match[ 3 ];
		}

		info.obj_id = match[ 4 ];

		requests.push( info );
	} );

	if ( requests.length > 0 ) {
		JetpackLikesPostMessage(
			{ event: 'initialBatch', requests: requests },
			window.frames[ 'likes-master' ]
		);
	}
}

function JetpackLikesMessageListener( event ) {
	let message = event && event.data;
	if ( typeof message === 'string' ) {
		try {
			message = JSON.parse( message );
		} catch ( err ) {
			return;
		}
	}

	const type = message && message.type;
	const data = message && message.data;

	if ( type !== 'likesMessage' || typeof data.event === 'undefined' ) {
		return;
	}

	// We only allow messages from one origin
	const allowedOrigin = 'https://widgets.wp.com';
	if ( allowedOrigin !== event.origin ) {
		return;
	}

	switch ( data.event ) {
		case 'masterReady':
			jetpackLikesDocReadyPromise.then( () => {
				jetpackLikesMasterReady = true;

				const stylesData = {
					event: 'injectStyles',
				};
				const sdTextColor = document.querySelector( '.sd-text-color' );
				const sdLinkColor = document.querySelector( '.sd-link-color' );
				const sdTextColorStyles = ( sdTextColor && getComputedStyle( sdTextColor ) ) || {};
				const sdLinkColorStyles = ( sdLinkColor && getComputedStyle( sdLinkColor ) ) || {};

				if ( document.querySelectorAll( 'iframe.admin-bar-likes-widget' ).length > 0 ) {
					JetpackLikesPostMessage( { event: 'adminBarEnabled' }, window.frames[ 'likes-master' ] );

					const bgSource = document.querySelector(
						'#wpadminbar .quicklinks li#wp-admin-bar-wpl-like > a'
					);

					const wpAdminBar = document.querySelector( '#wpadminbar' );

					stylesData.adminBarStyles = {
						background: bgSource && getComputedStyle( bgSource ).background,
						isRtl: wpAdminBar && getComputedStyle( wpAdminBar ).direction === 'rtl',
					};
				}

				// enable reblogs if we're on a single post page
				if ( document.body.classList.contains( 'single' ) ) {
					JetpackLikesPostMessage( { event: 'reblogsEnabled' }, window.frames[ 'likes-master' ] );
				}

				stylesData.textStyles = {
					color: sdTextColorStyles[ 'color' ],
					fontFamily: sdTextColorStyles[ 'font-family' ],
					fontSize: sdTextColorStyles[ 'font-size' ],
					direction: sdTextColorStyles[ 'direction' ],
					fontWeight: sdTextColorStyles[ 'font-weight' ],
					fontStyle: sdTextColorStyles[ 'font-style' ],
					textDecoration: sdTextColorStyles[ 'text-decoration' ],
				};

				stylesData.linkStyles = {
					color: sdLinkColorStyles[ 'color' ],
					fontFamily: sdLinkColorStyles[ 'font-family' ],
					fontSize: sdLinkColorStyles[ 'font-size' ],
					textDecoration: sdLinkColorStyles[ 'text-decoration' ],
					fontWeight: sdLinkColorStyles[ 'font-weight' ],
					fontStyle: sdLinkColorStyles[ 'font-style' ],
				};

				JetpackLikesPostMessage( stylesData, window.frames[ 'likes-master' ] );

				JetpackLikesBatchHandler();
			} );

			break;

		case 'showLikeWidget': {
			const placeholder = document.querySelector( `#${ data.id } .likes-widget-placeholder` );
			if ( placeholder ) {
				placeholder.style.display = 'none';
			}
			break;
		}

		case 'showCommentLikeWidget': {
			const placeholder = document.querySelector( `#${ data.id } .likes-widget-placeholder` );
			if ( placeholder ) {
				placeholder.style.display = 'none';
			}
			break;
		}

		case 'killCommentLikes':
			// If kill switch for comment likes is enabled remove all widgets wrappers and `Loading...` placeholders.
			document
				.querySelectorAll( '.jetpack-comment-likes-widget-wrapper' )
				.forEach( wrapper => wrapper.remove() );
			break;

		case 'clickReblogFlair':
			if ( wpcom_reblog && typeof wpcom_reblog.toggle_reblog_box_flair === 'function' ) {
				wpcom_reblog.toggle_reblog_box_flair( data.obj_id );
			}
			break;

		case 'showOtherGravatars': {
			const container = document.querySelector( '#likes-other-gravatars' );
			if ( ! container ) {
				break;
			}

			const list = container.querySelector( 'ul' );

			container.style.display = 'none';
			list.innerHTML = '';

			container
				.querySelectorAll( '.likes-text span' )
				.forEach( item => ( item.textContent = data.total ) );

			( data.likers || [] ).forEach( liker => {
				if ( liker.profile_URL.substr( 0, 4 ) !== 'http' ) {
					// We only display gravatars with http or https schema
					return;
				}

				const element = document.createElement( 'li' );
				element.innerHTML = `
					<a href="${ encodeURI( liker.profile_URL ) }" rel="nofollow" target="_parent" class="wpl-liker">
						<img src="${ encodeURI( liker.avatar_URL ) }"
							alt=""
							style="width: 30px; height: 30px; padding-right: 3px;" />
					</a>
				`;

				list.append( element );

				// Add some extra attributes through native methods, to ensure strings are sanitized.
				element.classList.add( liker.css_class );
				element.querySelector( 'img' ).alt = liker.name;
			} );

			const el = document.querySelector( `*[name='${ data.parent }']` );
			const rect = el.getBoundingClientRect();
			const win = el.ownerDocument.defaultView;
			const offset = {
				top: rect.top + win.pageYOffset,
				left: rect.left + win.pageXOffset,
			};

			container.style.left = offset.left + data.position.left - 10 + 'px';
			container.style.top = offset.top + data.position.top - 33 + 'px';

			const rowLength = Math.floor( data.width / 37 );
			let height = Math.ceil( data.likers.length / rowLength ) * 37 + 13;
			if ( height > 204 ) {
				height = 204;
			}

			const containerWidth = rowLength * 37 - 7;
			container.style.height = height + 'px';
			container.style.width = containerWidth + 'px';

			const listWidth = rowLength * 37;
			list.style.width = listWidth + 'px';

			container.style.display = 'block';

			const scrollbarWidth = list.offsetWidth - list.clientWidth;
			if ( scrollbarWidth > 0 ) {
				container.style.width = containerWidth + scrollbarWidth + 'px';
				list.style.width = listWidth + scrollbarWidth + 'px';
			}
		}
	}
}

window.addEventListener( 'message', JetpackLikesMessageListener );

document.addEventListener( 'click', e => {
	const container = document.querySelector( '#likes-other-gravatars' );

	if ( container && ! container.contains( e.target ) ) {
		container.style.display = 'none';
	}
} );

function JetpackLikesWidgetQueueHandler() {
	var wrapperID;

	if ( ! jetpackLikesMasterReady ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	// Restore widgets to initial unloaded state when they are scrolled out of view.
	jetpackUnloadScrolledOutWidgets();

	var unloadedWidgetsInView = jetpackGetUnloadedWidgetsInView();

	if ( unloadedWidgetsInView.length > 0 ) {
		// Grab any unloaded widgets for a batch request
		JetpackLikesBatchHandler();
	}

	for ( var i = 0, length = unloadedWidgetsInView.length; i <= length - 1; i++ ) {
		wrapperID = unloadedWidgetsInView[ i ].id;

		if ( ! wrapperID ) {
			continue;
		}

		jetpackLoadLikeWidgetIframe( wrapperID );
	}
}

function jetpackLoadLikeWidgetIframe( wrapperID ) {
	if ( typeof wrapperID === 'undefined' ) {
		return;
	}

	const wrapper = document.querySelector( '#' + wrapperID );
	wrapper.querySelectorAll( 'iframe' ).forEach( iFrame => iFrame.remove() );

	const placeholder = wrapper.querySelector( '.likes-widget-placeholder' );

	// Post like iframe
	if ( placeholder && placeholder.classList.contains( 'post-likes-widget-placeholder' ) ) {
		const postLikesFrame = document.createElement( 'iframe' );

		postLikesFrame.classList.add( 'post-likes-widget', 'jetpack-likes-widget' );
		postLikesFrame.name = wrapper.dataset.name;
		postLikesFrame.src = wrapper.dataset.src;
		postLikesFrame.height = '55px';
		postLikesFrame.width = '100%';
		postLikesFrame.frameBorder = '0';
		postLikesFrame.scrolling = 'no';
		postLikesFrame.title = wrapper.dataset.title;

		placeholder.after( postLikesFrame );
	}

	// Comment like iframe
	if ( placeholder.classList.contains( 'comment-likes-widget-placeholder' ) ) {
		const commentLikesFrame = document.createElement( 'iframe' );

		commentLikesFrame.class = 'comment-likes-widget-frame jetpack-likes-widget-frame';
		commentLikesFrame.name = wrapper.dataset.name;
		commentLikesFrame.src = wrapper.dataset.src;
		commentLikesFrame.height = '18px';
		commentLikesFrame.width = '100%';
		commentLikesFrame.frameBorder = '0';
		commentLikesFrame.scrolling = 'no';

		wrapper.querySelector( '.comment-like-feedback' ).after( commentLikesFrame );

		jetpackCommentLikesLoadedWidgets.push( commentLikesFrame );
	}

	wrapper.classList.remove( 'jetpack-likes-widget-unloaded' );
	wrapper.classList.add( 'jetpack-likes-widget-loading' );

	wrapper.querySelector( 'iframe' ).addEventListener( 'load', e => {
		JetpackLikesPostMessage(
			{ event: 'loadLikeWidget', name: e.target.name, width: e.target.width },
			window.frames[ 'likes-master' ]
		);

		wrapper.classList.remove( 'jetpack-likes-widget-loading' );
		wrapper.classList.add( 'jetpack-likes-widget-loaded' );
	} );
}

function jetpackGetUnloadedWidgetsInView() {
	const unloadedWidgets = document.querySelectorAll( 'div.jetpack-likes-widget-unloaded' );

	return [ ...unloadedWidgets ].filter( item => jetpackIsScrolledIntoView( item ) );
}

function jetpackIsScrolledIntoView( element ) {
	const top = element.getBoundingClientRect().top;
	const bottom = element.getBoundingClientRect().bottom;

	// Allow some slack above and bellow the fold with jetpackLikesLookAhead,
	// with the aim of hiding the transition from unloaded to loaded widget from users.
	return top + jetpackLikesLookAhead >= 0 && bottom <= window.innerHeight + jetpackLikesLookAhead;
}

function jetpackUnloadScrolledOutWidgets() {
	for ( let i = jetpackCommentLikesLoadedWidgets.length - 1; i >= 0; i-- ) {
		const currentWidgetIframe = jetpackCommentLikesLoadedWidgets[ i ];

		if ( ! jetpackIsScrolledIntoView( currentWidgetIframe ) ) {
			const widgetWrapper =
				currentWidgetIframe &&
				currentWidgetIframe.parentElement &&
				currentWidgetIframe.parentElement.parentElement;

			// Restore parent class to 'unloaded' so this widget can be picked up by queue manager again if needed.
			widgetWrapper.classList.remove( 'jetpack-likes-widget-loaded' );
			widgetWrapper.classList.remove( 'jetpack-likes-widget-loading' );
			widgetWrapper.classList.add( 'jetpack-likes-widget-unloaded' );

			// Bring back the loading placeholder into view.
			widgetWrapper
				.querySelectorAll( '.comment-likes-widget-placeholder' )
				.forEach( item => ( item.style.display = 'block' ) );

			// Remove it from the list of loaded widgets.
			jetpackCommentLikesLoadedWidgets.splice( i, 1 );

			// Remove comment like widget iFrame.
			currentWidgetIframe.remove();
		}
	}
}

var jetpackWidgetsDelayedExec = function ( after, fn ) {
	var timer;
	return function () {
		clearTimeout( timer );
		timer = setTimeout( fn, after );
	};
};

var jetpackOnScrollStopped = jetpackWidgetsDelayedExec( 250, JetpackLikesWidgetQueueHandler );

// Load initial batch of widgets, prior to any scrolling events.
JetpackLikesWidgetQueueHandler();

// Add event listener to execute queue handler after scroll.
window.addEventListener( 'scroll', jetpackOnScrollStopped, true );
;
/**
 * Comment Likes - JavaScript
 *
 * This handles liking and unliking comments, as well as viewing who has
 * liked a particular comment.
 *
 * @dependency  Swipe (dynamically loaded when needed)
 *
 * @package     Comment_Likes
 * @subpackage  JavaScript
 */
(function () {
	function init() {
		let extWin;
		let extWinCheck;
		let commentLikeEvent;

		// Only run once.
		if (window.comment_likes_loaded) {
			return;
		}
		window.comment_likes_loaded = true;

		// Client-side cache of who liked a particular comment to avoid
		// having to hit the server multiple times for the same data.
		const commentLikeCache = {};

		let swipeLibPromise;

		// Load the Swipe library, if it's not already loaded.
		function swipeLibLoader() {
			if (!swipeLibPromise) {
				swipeLibPromise = new Promise((resolve, reject) => {
					if (window.Swipe) {
						resolve(window.Swipe);
					} else {
						const swipeScript = document.createElement('script');
						swipeScript.src = comment_like_text.swipeUrl;
						swipeScript.async = true;
						document.body.appendChild(swipeScript);
						swipeScript.addEventListener('load', () => resolve(window.Swipe));
						swipeScript.addEventListener('error', error => reject(error));
					}
				});
			}
			return swipeLibPromise;
		}

		/**
		 * Parse the comment ID from a comment like link.
		 */
		function getCommentId(link) {
			const commentId =
				link && link.getAttribute('href') && link.getAttribute('href').split('like_comment=');
			return commentId[1].split('&_wpnonce=')[0];
		}

		/**
		 * Handle an ajax action on the comment like link.
		 */
		function handleLinkAction(link, action, commentId, callback) {
			const nonce =
				link && link.getAttribute('href') && link.getAttribute('href').split('_wpnonce=')[1];

			fetch('/wp-admin/admin-ajax.php', {
				method: 'POST',
				body: new URLSearchParams({
					action: action,
					_wpnonce: nonce,
					like_comment: commentId,
					blog_id: Number(link.dataset.blog),
				}),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'X-Requested-With': 'XMLHttpRequest',
					Accept: 'application/json',
					'cache-control': 'no-cache',
					pragma: 'no-cache',
				},
			})
				.then(response => response.json())
				.then(callback);
		}

		function startPolling() {
			// Append cookie polling login iframe to this window to wait for user to finish logging in (or cancel)
			const loginIframe = document.createElement('iframe');
			loginIframe.id = 'wp-login-polling-iframe';
			loginIframe.src = 'https://wordpress.com/public.api/connect/?iframe=true';
			document.body.appendChild(loginIframe);
			loginIframe.style.display = 'none';
		}

		function stopPolling() {
			const iframe = document.querySelector('#wp-login-polling-iframe');
			if (iframe) {
				iframe.remove();
			}
		}

		function hide(el) {
			if (el && el.style) {
				el.style.display = 'none';
			}
		}

		function show(el) {
			if (el && el.style) {
				el.style.removeProperty('display');
			}
		}

		// Overlay used for displaying comment like info.
		class Overlay {
			constructor() {
				// Overlay element.
				this.el = document.createElement('div');
				this.el.classList.add('comment-likes-overlay');
				document.body.appendChild(this.el);
				hide(this.el);

				this.el.addEventListener('mouseenter', () => {
					// Don't hide the overlay if the user is mousing over it.
					overlay.cancelHide();
				});

				this.el.addEventListener('mouseleave', () => overlay.requestHide());

				// Inner contents of overlay.
				this.innerEl = null;

				// Instance of the Swipe library.
				this.swipe = null;

				// Timeout used for hiding the overlay.
				this.hideTimeout = null;
			}

			// Initialise the overlay for use, removing any old content.
			clear() {
				// Unload any previous instance of Swipe (to avoid leaking a global
				// event handler). This is done before clearing the contents of the
				// overlay because Swipe expects the slides to still be present.
				if (this.swipe) {
					this.swipe.kill();
					this.swipe = null;
				}
				this.el.innerHTML = '';
				this.innerEl = document.createElement('div');
				this.innerEl.classList.add('inner');
				this.el.appendChild(this.innerEl);
			}

			/**
			 * Construct a list (<ul>) of user (gravatar, name) details.
			 *
			 * @param  data     liker data returned from the server
			 * @param  klass    CSS class to apply to the <ul> element
			 * @param  start    index of user to start at
			 * @param  length   number of users to include in the list
			 *
			 * @return          A container element with the list
			 */
			getUserBits(data, klass, start, length) {
				start = start || 0;
				let last = start + (length || data.length);
				last = last > data.length ? data.length : last;
				const container = document.createElement('div');
				container.classList.add('liker-list');
				let html = `<ul class="${klass || ''}">`;
				for (let i = start; i < last; ++i) {
					const user = data[i];
					html += `
						<li>
							<a rel="nofollow" title="${user.display_name_esc}" href="${user.profile_url_esc}">
								<img src="${user.avatar_url_esc}" alt="${user.display_name_esc}" />
								<span class="user-name">${user.display_name_esc}</span>
							</a>
						</li>
					`;
				}
				html += '</ul>';
				container.innerHTML = html;
				return container;
			}

			/**
			 * Render the display of who has liked this comment. The type of
			 * display depends on how many people have liked the comment.
			 * If more than 10 people have liked the comment, this function
			 * renders navigation controls and sets up the Swipe library for
			 * changing between pages.
			 *
			 * @param link  the element over which the user is hovering
			 * @param data  the results retrieved from the server
			 */
			showLikes(link, data) {
				this.clear();

				link.dataset.likeCount = data.length;
				if (data.length === 0) {
					// No likers after all.
					hide(this.el);
					return;
				}

				this.innerEl.style.padding = '12px';

				if (data.length < 6) {
					// Only one column needed.
					this.innerEl.style.maxWidth = '200px';
					this.innerEl.innerHTML = '';
					this.innerEl.appendChild(this.getUserBits(data, 'single'));
					this.setPosition(link);
				} else if (data.length < 11) {
					// Two columns, but only one page.
					this.innerEl.innerHTML = '';
					this.innerEl.appendChild(this.getUserBits(data, 'double'));
					this.setPosition(link);
				} else {
					// Multiple pages.
					this.renderLikesWithPagination(data, link);
				}
			}

			/**
			 * Render multiple pages of likes with pagination controls.
			 * This function is intended to be called by `showLikes` above.
			 *
			 * @param data  the results retrieved from the server
			 */
			renderLikesWithPagination(data, link) {
				swipeLibLoader().then(() => {
					const page_count = Math.ceil(data.length / 10);
					// Swipe requires two nested containers.
					const swipe = document.createElement('div');
					swipe.classList.add('swipe');
					this.innerEl.appendChild(swipe);

					const wrap = document.createElement('div');
					wrap.classList.add('swipe-wrap');
					swipe.appendChild(wrap);

					for (let i = 0; i < page_count; ++i) {
						wrap.appendChild(this.getUserBits(data, 'double', i * 10, 10));
					}

					/**
					 * Navigation controls.
					 * This is based on the Newdash controls found in
					 *    reader/recommendations-templates.php
					 */
					const nav = document.createElement('nav');
					nav.classList.add('slider-nav');

					let navContents = `
						<a href="#" class="prev">
							<span class="noticon noticon-previous" title="Previous" alt="<"></span>
						</a>
						<span class="position">
					`;
					for (let i = 0; i < page_count; ++i) {
						navContents += `<em data-page="${i}" class="${i === 0 ? 'on' : ''}">&bull;</em>`;
					}
					navContents += `
						</span>
						<a href="#" class="next">
							<span class="noticon noticon-next" title="Next" alt=">"></span>
						</a>
					`;
					this.innerEl.appendChild(nav);
					nav.innerHTML = navContents;

					/** Set up Swipe. **/
					// Swipe cannot be set up successfully unless its container
					// is visible, so we show it now.
					show(this.el);
					this.setPosition(link);

					this.swipe = new Swipe(swipe, {
						callback: function (pos) {
							// Update the pagination indicators.
							//
							// If there are exactly two pages, Swipe has a weird
							// special case where it duplicates both pages and
							// can return index 2 and 3 even though those aren't
							// real pages (see swipe.js, line 47). To deal with
							// this, we use the expression `pos % page_count`.
							pos = pos % page_count;
							nav.querySelectorAll('em').forEach(em => {
								const page = Number(em.dataset.page);
								em.setAttribute('class', pos === page ? 'on' : '');
							});
						},
					});

					nav.querySelectorAll('em').forEach(em => {
						em.addEventListener('click', e => {
							// Go to the page corresponding to the indicator clicked.
							this.swipe.slide(Number(em.dataset.page));
							e.preventDefault();
						});
					});
					// Previous and next buttons.
					nav.querySelector('.prev').addEventListener('click', e => {
						this.swipe.prev();
						e.preventDefault();
					});
					nav.querySelector('.next').addEventListener('click', e => {
						this.swipe.next();
						e.preventDefault();
					});
				});
			}

			/**
			 * Open the overlay and show a loading message.
			 */
			showLoadingMessage(link) {
				this.clear();
				this.innerEl.textContent = comment_like_text.loading;
				this.setPosition(link);
			}

			/**
			 * Position the overlay near the current comment.
			 *
			 * @param link  element near which to position the overlay
			 */
			setPosition(link) {
				// Prepare a down arrow icon for the bottom of the overlay.
				const icon = document.createElement('span');
				this.el.appendChild(icon);
				icon.classList.add('icon', 'noticon', 'noticon-downarrow');
				icon.style.textShadow = '0px 1px 1px rgb(223, 223, 223)';

				const rect = link.getBoundingClientRect();
				const win = document.defaultView;
				const offset = {
					top: rect.top + win.scrollY,
					left: rect.left + win.scrollX,
				};

				// Take measurements with the element fully visible.
				show(this.el);
				let left = offset.left - (this.el.offsetWidth - link.offsetWidth) / 2;
				left = left < 5 ? 5 : left;
				let top = offset.top - this.el.offsetHeight + 5;
				hide(this.el);

				const adminBar = document.querySelector('#wpadminbar');

				// Check if the overlay would appear off the screen.
				if (top < win.scrollY + ((adminBar && adminBar.offsetHeight) || 0)) {
					// We'll display the overlay beneath the link instead.
					top = offset.top + link.offsetHeight;
					// Instead of using the down arrow icon, use an up arrow.
					icon.remove();
					this.el.prepend(icon);
					icon.classList.remove('noticon-downarrow');
					icon.classList.add('noticon-uparrow');
					icon.style.textShadow = '0px -1px 1px rgb(223, 223, 223)';
					icon.style.verticalAlign = 'bottom';
				}

				this.el.style.left = `${left}px`;
				this.el.style.top = `${top}px`;
				show(this.el);

				// The height of the arrow icon differs slightly between browsers,
				// so we compute the margin here to make sure it isn't disjointed
				// from the overlay.
				icon.style.marginTop = `${icon.scrollHeight - 26}px`;
				icon.style.marginBottom = `${20 - icon.scrollHeight}px`;

				// Position the arrow to be horizontally centred on the link.
				icon.style.paddingLeft = `${
					offset.left - left + (link.offsetWidth - icon.scrollWidth) / 2
				}px`;
			}

			/**
			 * Return whether the overlay is visible.
			 */
			isVisible() {
				return this.el.style.getPropertyValue('display') !== 'none';
			}

			/**
			 * Request that the overlay be hidden after a short delay.
			 */
			requestHide() {
				if (this.hideTimeout !== null) {
					return;
				}
				this.hideTimeout = setTimeout(() => {
					hide(this.el);
					this.clear();
				}, 300);
			}

			/**
			 * Cancel a request to hide the overlay.
			 */
			cancelHide() {
				if (this.hideTimeout !== null) {
					clearTimeout(this.hideTimeout);
					this.hideTimeout = null;
				}
			}
		}

		// Overlay used for displaying comment like info.
		const overlay = new Overlay();

		// The most recent comment for which the user has requested to see
		// who liked it.
		var relevantComment;

		// Precache after this timeout.
		var precacheTimeout = null;

		/**
		 * Fetch the like data for a particular comment.
		 */
		function fetchLikeData(link, commentId) {
			commentLikeCache[commentId] = null;

			const container = link && link.parentElement && link.parentElement.parentElement;
			const star = container.querySelector('a.comment-like-link');
			star &&
				handleLinkAction(star, 'view_comment_likes', commentId, data => {
					// Populate the cache.
					commentLikeCache[commentId] = data;

					// Only show the overlay if the user is interested.
					if (overlay.isVisible() && relevantComment === commentId) {
						overlay.showLikes(link, data);
					}
				});
		}

		function readCookie(c) {
			const nameEQ = c + '=';
			const cookieStrings = document.cookie.split(';');

			for (let i = 0; i < cookieStrings.length; i++) {
				let cookieString = cookieStrings[i];
				while (cookieString.charAt(0) === ' ') {
					cookieString = cookieString.substring(1, cookieString.length);
				}
				if (cookieString.indexOf(nameEQ) === 0) {
					const chunk = cookieString.substring(nameEQ.length, cookieString.length);
					const pairs = chunk.split('&');
					const cookieData = {};
					for (let num = pairs.length - 1; num >= 0; num--) {
						const pair = pairs[num].split('=');
						cookieData[pair[0]] = decodeURIComponent(pair[1]);
					}
					return cookieData;
				}
			}
			return null;
		}

		function getServiceData() {
			const data = readCookie('wpc_wpc');
			if (data === null || typeof data.access_token === 'undefined' || !data.access_token) {
				return false;
			}
			return data;
		}

		function readMessage(msg) {
			const event = msg.data;

			if (typeof event.event === 'undefined') {
				return;
			}

			if (event.event === 'login' && event.success) {
				extWinCheck = setInterval(function () {
					if (!extWin || extWin.closed) {
						clearInterval(extWinCheck);
						if (getServiceData()) {
							// Load page in an iframe to get the current comment nonce
							const nonceIframe = document.createElement('iframe');
							nonceIframe.id = 'wp-login-comment-nonce-iframe';
							nonceIframe.style.display = 'none';
							nonceIframe.src = commentLikeEvent + '';
							document.body.appendChild(nonceIframe);

							const commentLikeId = (commentLikeEvent + '')
								.split('like_comment=')[1]
								.split('&_wpnonce=')[0];
							let c;

							// Set a 5 second timeout to redirect to the comment page without doing the Like as a fallback
							const commentLikeTimeout = setTimeout(() => {
								window.location = commentLikeEvent;
							}, 5000);

							// Check for a new nonced redirect and use that if available before timing out
							const commentLikeCheck = setInterval(() => {
								const iframe = document.querySelector('#wp-login-comment-nonce-iframe');
								if (iframe) {
									c = iframe.querySelector(`#comment-like-${commentLikeId} .comment-like-link`);
								}
								if (c && typeof c.href !== 'undefined') {
									clearTimeout(commentLikeTimeout);
									clearInterval(commentLikeCheck);
									window.location = c.href;
								}
							}, 100);
						}
					}
				}, 100);

				if (extWin) {
					if (!extWin.closed) {
						extWin.close();
					}
					extWin = false;
				}

				stopPolling();
			}
		}

		if (typeof window.postMessage !== 'undefined') {
			window.addEventListener('message', e => {
				let message = e && e.data;
				if (typeof message === 'string') {
					try {
						message = JSON.parse(message);
					} catch (err) {
						return;
					}
				}

				const type = message && message.type;
				if (type === 'loginMessage') {
					readMessage(message);
				}
			});
		}

		document.body.addEventListener('click', e => {
			let target = e.target;

			// Don't do anything when clicking on the "X people" link.
			if (target.matches('p.comment-likes a.view-likers')) {
				e.preventDefault();
				return;
			}

			// Retrieve the surrounding paragraph to the star, if it hasn't been liked.
			const notLikedPar = target.closest('p.comment-not-liked');

			// Return if not clicking on star or surrounding paragraph.
			if (!target.matches('a.comment-like-link') && !notLikedPar) {
				return;
			}

			// When a comment hasn't been liked, make the text clickable, too.
			if (notLikedPar) {
				target = notLikedPar.querySelector('a.comment-like-link');
				if (!target) {
					return;
				}
			}

			if (target.classList.contains('needs-login')) {
				e.preventDefault();
				commentLikeEvent = target;
				if (extWin) {
					if (!extWin.closed) {
						extWin.close();
					}
					extWin = false;
				}

				stopPolling();

				const url = 'https://wordpress.com/public.api/connect/?action=request&service=wordpress';
				extWin = window.open(
					url,
					'likeconn',
					'status=0,toolbar=0,location=1,menubar=0,directories=0,resizable=1,scrollbars=1,height=560,width=500'
				);

				startPolling();

				return false;
			}

			// Record that the user likes or does not like this comment.
			const commentId = getCommentId(target);
			target.classList.add('loading');

			let commentEl = document.querySelector(`p#comment-like-${commentId}`);
			// Determine whether to like or unlike based on whether the comment is
			// currently liked.
			const action =
				commentEl && commentEl.dataset.liked === 'comment-liked'
					? 'unlike_comment'
					: 'like_comment';
			handleLinkAction(target, action, commentId, data => {
				// Invalidate the like cache for this comment.
				delete commentLikeCache[commentId];

				const countEl = document.querySelector(`#comment-like-count-${data.context}`);
				if (countEl) {
					countEl.innerHTML = data.display;
				}

				commentEl = document.querySelector(`p#comment-like-${data.context}`);
				if (action === 'like_comment') {
					commentEl.classList.remove('comment-not-liked');
					commentEl.classList.add('comment-liked');
					commentEl.dataset.liked = 'comment-liked';
				} else {
					commentEl.classList.remove('comment-liked');
					commentEl.classList.add('comment-not-liked');
					commentEl.dataset.liked = 'comment-not-liked';
				}

				// Prefetch new data for this comment (if there are likers left).
				const parent = target.closest('.comment-likes');
				const link = parent && parent.querySelector('a.view-likers');
				if (link) {
					fetchLikeData(link, commentId);
				}

				target.classList.remove('loading');
			});
			e.preventDefault();
			e.stopPropagation();
		});

		document.body.addEventListener(
			'mouseenter',
			function (e) {
				if (!e.target.matches('p.comment-likes a.view-likers')) {
					return;
				}
				// Show the user a list of who has liked this comment.

				const link = e.target;
				if (Number(link.dataset.likeCount || 0) === 0) {
					// No one has liked this comment.
					return;
				}

				// Don't hide the overlay.
				overlay.cancelHide();

				// Get the comment ID.
				const container = link.parentElement && link.parentElement.parentElement;
				const star = container && container.querySelector('a.comment-like-link');
				const commentId = star && getCommentId(star);
				relevantComment = commentId;

				// Check if the list of likes for this comment is already in
				// the cache.
				if (commentId in commentLikeCache) {
					const entry = commentLikeCache[commentId];
					// Only display the likes if the ajax request is
					// actually done.
					if (entry !== null) {
						overlay.showLikes(link, entry);
					} else {
						// Make sure the overlay is visible (in case
						// the user moved the mouse away while loading
						// but then came back before it finished
						// loading).
						overlay.showLoadingMessage(link);
					}
					return;
				}

				// Position the "Loading..." overlay.
				overlay.showLoadingMessage(link);

				// Fetch the data.
				fetchLikeData(link, commentId);
			},
			true
		);

		document.body.addEventListener(
			'mouseleave',
			e => {
				if (!e.target.matches('p.comment-likes a.view-likers')) {
					return;
				}
				// User has moved cursor away - hide the overlay.
				overlay.requestHide();
			},
			true
		);

		document.body.addEventListener(
			'mouseenter',
			e => {
				if (!e.target.matches('.comment') || !e.target.querySelector('a.comment-like-link')) {
					return;
				}
				// User is moving over a comment - precache the comment like data.
				if (precacheTimeout !== null) {
					clearTimeout(precacheTimeout);
					precacheTimeout = null;
				}

				const star = e.target.querySelector('a.comment-like-link');
				const parent = star.closest('.comment-likes');
				const link = parent && parent.querySelector('a.view-likers');
				if (!link || Number(link.dataset.likeCount || 0) === 0) {
					// No likes.
					return;
				}
				const commentId = getCommentId(star);
				if (commentId in commentLikeCache) {
					// Already in cache.
					return;
				}

				precacheTimeout = setTimeout(() => {
					precacheTimeout = null;
					if (commentId in commentLikeCache) {
						// Was cached in the interim.
						return;
					}
					fetchLikeData(link, commentId);
				}, 1000);
			},
			true
		);
	}

	if (document.readyState !== 'loading') {
		init();
	} else {
		document.addEventListener('DOMContentLoaded', init);
	}
})();
;
/**
 * File navigation.js.
 *
 * Handles toggling the navigation menu for small screens and enables TAB key
 * navigation support for dropdown menus.
 */
( function() {
	var container, button, menu, links, subMenus, i, len;

	container = document.getElementById( 'site-navigation' );
	if ( ! container ) {
		return;
	}

	button = container.getElementsByTagName( 'button' )[0];
	if ( 'undefined' === typeof button ) {
		return;
	}

	menu = container.getElementsByTagName( 'ul' )[0];

	// Hide menu toggle button if menu is empty and return early.
	if ( 'undefined' === typeof menu ) {
		button.style.display = 'none';
		return;
	}

	menu.setAttribute( 'aria-expanded', 'false' );
	if ( -1 === menu.className.indexOf( 'nav-menu' ) ) {
		menu.className += ' nav-menu';
	}

	button.onclick = function() {
		if ( -1 !== container.className.indexOf( 'toggled' ) ) {
			container.className = container.className.replace( ' toggled', '' );
			button.setAttribute( 'aria-expanded', 'false' );
			menu.setAttribute( 'aria-expanded', 'false' );
		} else {
			container.className += ' toggled';
			button.setAttribute( 'aria-expanded', 'true' );
			menu.setAttribute( 'aria-expanded', 'true' );
		}
	};

	// Get all the link elements within the menu.
	links    = menu.getElementsByTagName( 'a' );
	subMenus = menu.getElementsByTagName( 'ul' );

	// Set menu items with submenus to aria-haspopup="true".
	for ( i = 0, len = subMenus.length; i < len; i++ ) {
		subMenus[i].parentNode.setAttribute( 'aria-haspopup', 'true' );
	}

	// Each time a menu link is focused or blurred, toggle focus.
	for ( i = 0, len = links.length; i < len; i++ ) {
		links[i].addEventListener( 'focus', toggleFocus, true );
		links[i].addEventListener( 'blur', toggleFocus, true );
	}

	/**
	 * Sets or removes .focus class on an element.
	 */
	function toggleFocus() {
		var self = this;

		// Move up through the ancestors of the current link until we hit .nav-menu.
		while ( -1 === self.className.indexOf( 'nav-menu' ) ) {

			// On li elements toggle the class .focus.
			if ( 'li' === self.tagName.toLowerCase() ) {
				if ( -1 !== self.className.indexOf( 'focus' ) ) {
					self.className = self.className.replace( ' focus', '' );
				} else {
					self.className += ' focus';
				}
			}

			self = self.parentElement;
		}
	}

	// Fix child menus for touch devices.
	function fixMenuTouchTaps( container ) {
		var touchStartFn,
			parentLink = container.querySelectorAll( '.menu-item-has-children > a, .page_item_has_children > a' );

		if ( 'ontouchstart' in window ) {
			touchStartFn = function( e ) {
				var menuItem = this.parentNode;

				if ( ! menuItem.classList.contains( 'focus' ) ) {
					e.preventDefault();
					for( var i = 0; i < menuItem.parentNode.children.length; ++i ) {
						if ( menuItem === menuItem.parentNode.children[i] ) {
							continue;
						}
						menuItem.parentNode.children[i].classList.remove( 'focus' );
					}
					menuItem.classList.add( 'focus' );
				} else {
					menuItem.classList.remove( 'focus' );
				}
			};

			for ( var i = 0; i < parentLink.length; ++i ) {
				parentLink[i].addEventListener( 'touchstart', touchStartFn, false )
			}
		}
	}

	fixMenuTouchTaps( container );
} )();
;
/**
 * File skip-link-focus-fix.js.
 *
 * Helps with accessibility for keyboard only users.
 *
 * Learn more: https://git.io/vWdr2
 */
( function() {
	var isWebkit = navigator.userAgent.toLowerCase().indexOf( 'webkit' ) > -1,
	    isOpera  = navigator.userAgent.toLowerCase().indexOf( 'opera' )  > -1,
	    isIe     = navigator.userAgent.toLowerCase().indexOf( 'msie' )   > -1;

	if ( ( isWebkit || isOpera || isIe ) && document.getElementById && window.addEventListener ) {
		window.addEventListener( 'hashchange', function() {
			var id = location.hash.substring( 1 ),
				element;

			if ( ! ( /^[A-z0-9_-]+$/.test( id ) ) ) {
				return;
			}

			element = document.getElementById( id );

			if ( element ) {
				if ( ! ( /^(?:a|select|input|button|textarea)$/i.test( element.tagName ) ) ) {
					element.tabIndex = -1;
				}

				element.focus();
			}
		}, false );
	}
})();
;
/*! This file is auto-generated */
window.addComment=function(v){var I,C,h,E=v.document,b={commentReplyClass:"comment-reply-link",commentReplyTitleId:"reply-title",cancelReplyId:"cancel-comment-reply-link",commentFormId:"commentform",temporaryFormId:"wp-temp-form-div",parentIdFieldId:"comment_parent",postIdFieldId:"comment_post_ID"},e=v.MutationObserver||v.WebKitMutationObserver||v.MozMutationObserver,r="querySelector"in E&&"addEventListener"in v,n=!!E.documentElement.dataset;function t(){d(),e&&new e(o).observe(E.body,{childList:!0,subtree:!0})}function d(e){if(r&&(I=g(b.cancelReplyId),C=g(b.commentFormId),I)){I.addEventListener("touchstart",l),I.addEventListener("click",l);function t(e){if((e.metaKey||e.ctrlKey)&&13===e.keyCode)return C.removeEventListener("keydown",t),e.preventDefault(),C.submit.click(),!1}C&&C.addEventListener("keydown",t);for(var n,d=function(e){var t=b.commentReplyClass;e&&e.childNodes||(e=E);e=E.getElementsByClassName?e.getElementsByClassName(t):e.querySelectorAll("."+t);return e}(e),o=0,i=d.length;o<i;o++)(n=d[o]).addEventListener("touchstart",a),n.addEventListener("click",a)}}function l(e){var t,n,d=g(b.temporaryFormId);d&&h&&(g(b.parentIdFieldId).value="0",t=d.textContent,d.parentNode.replaceChild(h,d),this.style.display="none",n=(d=(d=g(b.commentReplyTitleId))&&d.firstChild)&&d.nextSibling,d&&d.nodeType===Node.TEXT_NODE&&t&&(n&&"A"===n.nodeName&&n.id!==b.cancelReplyId&&(n.style.display=""),d.textContent=t),e.preventDefault())}function a(e){var t=g(b.commentReplyTitleId),t=t&&t.firstChild.textContent,n=this,d=m(n,"belowelement"),o=m(n,"commentid"),i=m(n,"respondelement"),r=m(n,"postid"),n=m(n,"replyto")||t;d&&o&&i&&r&&!1===v.addComment.moveForm(d,o,i,r,n)&&e.preventDefault()}function o(e){for(var t=e.length;t--;)if(e[t].addedNodes.length)return void d()}function m(e,t){return n?e.dataset[t]:e.getAttribute("data-"+t)}function g(e){return E.getElementById(e)}return r&&"loading"!==E.readyState?t():r&&v.addEventListener("DOMContentLoaded",t,!1),{init:d,moveForm:function(e,t,n,d,o){var i,r,l,a,m,c,s,e=g(e),n=(h=g(n),g(b.parentIdFieldId)),y=g(b.postIdFieldId),p=g(b.commentReplyTitleId),u=(p=p&&p.firstChild)&&p.nextSibling;if(e&&h&&n){void 0===o&&(o=p&&p.textContent),a=h,m=b.temporaryFormId,c=g(m),s=(s=g(b.commentReplyTitleId))?s.firstChild.textContent:"",c||((c=E.createElement("div")).id=m,c.style.display="none",c.textContent=s,a.parentNode.insertBefore(c,a)),d&&y&&(y.value=d),n.value=t,I.style.display="",e.parentNode.insertBefore(h,e.nextSibling),p&&p.nodeType===Node.TEXT_NODE&&(u&&"A"===u.nodeName&&u.id!==b.cancelReplyId&&(u.style.display="none"),p.textContent=o),I.onclick=function(){return!1};try{for(var f=0;f<C.elements.length;f++)if(i=C.elements[f],r=!1,"getComputedStyle"in v?l=v.getComputedStyle(i):E.documentElement.currentStyle&&(l=i.currentStyle),(i.offsetWidth<=0&&i.offsetHeight<=0||"hidden"===l.visibility)&&(r=!0),"hidden"!==i.type&&!i.disabled&&!r){i.focus();break}}catch(e){}return!1}}}}(window);;
! ( function ( d, s, id ) {
	var js,
		fjs = d.getElementsByTagName( s )[ 0 ],
		p = /^http:/.test( d.location ) ? 'http' : 'https';
	if ( ! d.getElementById( id ) ) {
		js = d.createElement( s );
		js.id = id;
		js.src = p + '://platform.twitter.com/widgets.js';
		fjs.parentNode.insertBefore( js, fjs );
	}
} )( document, 'script', 'twitter-wjs' );
;
/* globals JSON */
( function () {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		// top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		// my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		// my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		// my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		// my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		// reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		// account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		// account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	// Element.prototype.matches as a standalone function, with old browser fallback
	function matches( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( ! Element.prototype.matches && ! Element.prototype.msMatchesSelector ) {
			throw new Error( 'Unsupported browser' );
		}

		return Element.prototype.matches ? node.matches( selector ) : node.msMatchesSelector( selector );
	}

	// Element.prototype.closest as a standalone function, with old browser fallback
	function closest( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( Element.prototype.closest ) {
			return node.closest( selector );
		}

		do {
			if ( matches( node, selector ) ) {
				return node;
			}

			node = node.parentElement || node.parentNode;
		} while ( node !== null && node.nodeType === 1 );

		return null;
	}

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	function createTrackableLinkEventHandler( link ) {
		return function () {
			var parent = closest( link, 'li' );

			if ( ! parent ) {
				return;
			}

			var trackingId = link.getAttribute( 'ID' ) || parent.getAttribute( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };
			recordTracksEvent( eventProps );
		}
	}

	function init() {
		var trackableLinkSelector = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		var trackableLinks = document.querySelectorAll( trackableLinkSelector );

		for ( var i = 0; i < trackableLinks.length; i++ ) {
			var link = trackableLinks[ i ];
			var handler = createTrackableLinkEventHandler( link );

			link.addEventListener( 'click', handler );
			link.addEventListener( 'touchstart', handler );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// listen for postMessage events from the notifications iframe
	window.addEventListener( 'message', function ( event ) {
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( typeof event.data === 'string' ) ? parseJson( event.data, {} ) : event.data;
		if ( data.type !== 'notesIframeMessage' ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	}, false );

} )();
;
/**
 * Loading support for Outbrain widgets.
 */

( function () {
	let insertScript = function () {
		const obScript = document.createElement( 'script' );
		obScript.setAttribute( 'src', 'https://widgets.outbrain.com/outbrain.js' );
		document.head.appendChild( obScript );
	};

	document.addEventListener( 'DOMContentLoaded', () => {
		const widgets = document.querySelectorAll( '.wa-ob-widget' );

		if ( widgets.length === 0 ) {
			return;
		}

		// Track widget render.
		widgets.forEach( ( widget ) => {
			let widgetId = ( widget.getAttribute( 'data-widget-id' ) || 'unknown' ).toLowerCase();

			window._stq = window._stq || [];
			window._stq.push( [
				'extra',
				{
					x_wordads_outbrain: 'widget_render_' + widgetId,
				},
			] );
		} );

		// Load Outbrain script.
		insertScript();
	} );
} )();
;
/**
 * Observe how the user enters content into the comment form in order to determine whether it's a bot or not.
 *
 * Note that no actual input is being saved here, only counts and timings between events.
 */

( function() {
	function init() {
		var input_begin = '';

		var keydowns = {};
		var lastKeyup = null;
		var lastKeydown = null;
		var keypresses = [];

		var modifierKeys = [];
		var correctionKeys = [];

		var lastMouseup = null;
		var lastMousedown = null;
		var mouseclicks = [];

		var mousemoveTimer = null;
		var lastMousemoveX = null;
		var lastMousemoveY = null;
		var mousemoveStart = null;
		var mousemoves = [];

		var touchmoveCountTimer = null;
		var touchmoveCount = 0;

		var lastTouchEnd = null;
		var lastTouchStart = null;
		var touchEvents = [];

		var scrollCountTimer = null;
		var scrollCount = 0;

		var correctionKeyCodes = [ 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown' ];
		var modifierKeyCodes = [ 'Shift', 'CapsLock' ];

		var forms = document.querySelectorAll( 'form[method=post]' );

		for ( var i = 0; i < forms.length; i++ ) {
			var form = forms[i];

			form.addEventListener( 'submit', function () {
				var ak_bkp = prepare_timestamp_array_for_request( keypresses );
				var ak_bmc = prepare_timestamp_array_for_request( mouseclicks );
				var ak_bte = prepare_timestamp_array_for_request( touchEvents );
				var ak_bmm = prepare_timestamp_array_for_request( mousemoves );

				var input_fields = {
					// When did the user begin entering any input?
					'ak_bib': input_begin,

					// When was the form submitted?
					'ak_bfs': Date.now(),

					// How many keypresses did they make?
					'ak_bkpc': keypresses.length,

					// How quickly did they press a sample of keys, and how long between them?
					'ak_bkp': ak_bkp,

					// How quickly did they click the mouse, and how long between clicks?
					'ak_bmc': ak_bmc,

					// How many mouseclicks did they make?
					'ak_bmcc': mouseclicks.length,

					// When did they press modifier keys (like Shift or Capslock)?
					'ak_bmk': modifierKeys.join( ';' ),

					// When did they correct themselves? e.g., press Backspace, or use the arrow keys to move the cursor back
					'ak_bck': correctionKeys.join( ';' ),

					// How many times did they move the mouse?
					'ak_bmmc': mousemoves.length,

					// How many times did they move around using a touchscreen?
					'ak_btmc': touchmoveCount,

					// How many times did they scroll?
					'ak_bsc': scrollCount,

					// How quickly did they perform touch events, and how long between them?
					'ak_bte': ak_bte,

					// How many touch events were there?
					'ak_btec' : touchEvents.length,

					// How quickly did they move the mouse, and how long between moves?
					'ak_bmm' : ak_bmm
				};

				for ( var field_name in input_fields ) {
					var field = document.createElement( 'input' );
					field.setAttribute( 'type', 'hidden' );
					field.setAttribute( 'name', field_name );
					field.setAttribute( 'value', input_fields[ field_name ] );
					this.appendChild( field );
				}
			} );

			form.addEventListener( 'keydown', function ( e ) {
				// If you hold a key down, some browsers send multiple keydown events in a row.
				// Ignore any keydown events for a key that hasn't come back up yet.
				if ( e.key in keydowns ) {
					return;
				}

				var keydownTime = ( new Date() ).getTime();
				keydowns[ e.key ] = [ keydownTime ];

				if ( ! input_begin ) {
					input_begin = keydownTime;
				}

				// In some situations, we don't want to record an interval since the last keypress -- for example,
				// on the first keypress, or on a keypress after focus has changed to another element. Normally,
				// we want to record the time between the last keyup and this keydown. But if they press a
				// key while already pressing a key, we want to record the time between the two keydowns.

				var lastKeyEvent = Math.max( lastKeydown, lastKeyup );

				if ( lastKeyEvent ) {
					keydowns[ e.key ].push( keydownTime - lastKeyEvent );
				}

				lastKeydown = keydownTime;
			} );

			form.addEventListener( 'keyup', function ( e ) {
				if ( ! ( e.key in keydowns ) ) {
					// This key was pressed before this script was loaded, or a mouseclick happened during the keypress, or...
					return;
				}

				var keyupTime = ( new Date() ).getTime();

				if ( 'TEXTAREA' === e.target.nodeName || 'INPUT' === e.target.nodeName ) {
					if ( -1 !== modifierKeyCodes.indexOf( e.key ) ) {
						modifierKeys.push( keypresses.length - 1 );
					} else if ( -1 !== correctionKeyCodes.indexOf( e.key ) ) {
						correctionKeys.push( keypresses.length - 1 );
					} else {
						// ^ Don't record timings for keys like Shift or backspace, since they
						// typically get held down for longer than regular typing.

						var keydownTime = keydowns[ e.key ][0];

						var keypress = [];

						// Keypress duration.
						keypress.push( keyupTime - keydownTime );

						// Amount of time between this keypress and the previous keypress.
						if ( keydowns[ e.key ].length > 1 ) {
							keypress.push( keydowns[ e.key ][1] );
						}

						keypresses.push( keypress );
					}
				}

				delete keydowns[ e.key ];

				lastKeyup = keyupTime;
			} );

			form.addEventListener( "focusin", function ( e ) {
				lastKeydown = null;
				lastKeyup = null;
				keydowns = {};
			} );

			form.addEventListener( "focusout", function ( e ) {
				lastKeydown = null;
				lastKeyup = null;
				keydowns = {};
			} );
		}

		document.addEventListener( 'mousedown', function ( e ) {
			lastMousedown = ( new Date() ).getTime();
		} );

		document.addEventListener( 'mouseup', function ( e ) {
			if ( ! lastMousedown ) {
				// If the mousedown happened before this script was loaded, but the mouseup happened after...
				return;
			}

			var now = ( new Date() ).getTime();

			var mouseclick = [];
			mouseclick.push( now - lastMousedown );

			if ( lastMouseup ) {
				mouseclick.push( lastMousedown - lastMouseup );
			}

			mouseclicks.push( mouseclick );

			lastMouseup = now;

			// If the mouse has been clicked, don't record this time as an interval between keypresses.
			lastKeydown = null;
			lastKeyup = null;
			keydowns = {};
		} );

		document.addEventListener( 'mousemove', function ( e ) {
			if ( mousemoveTimer ) {
				clearTimeout( mousemoveTimer );
				mousemoveTimer = null;
			}
			else {
				mousemoveStart = ( new Date() ).getTime();
				lastMousemoveX = e.offsetX;
				lastMousemoveY = e.offsetY;
			}

			mousemoveTimer = setTimeout( function ( theEvent, originalMousemoveStart ) {
				var now = ( new Date() ).getTime() - 250; // To account for the timer delay.

				var mousemove = [];
				mousemove.push( now - originalMousemoveStart );
				mousemove.push(
					Math.round(
						Math.sqrt(
							Math.pow( theEvent.offsetX - lastMousemoveX, 2 ) +
							Math.pow( theEvent.offsetY - lastMousemoveY, 2 )
						)
					)
				);

				if ( mousemove[1] > 0 ) {
					// If there was no measurable distance, then it wasn't really a move.
					mousemoves.push( mousemove );
				}

				mousemoveStart = null;
				mousemoveTimer = null;
			}, 250, e, mousemoveStart );
		} );

		document.addEventListener( 'touchmove', function ( e ) {
			if ( touchmoveCountTimer ) {
				clearTimeout( touchmoveCountTimer );
			}

			touchmoveCountTimer = setTimeout( function () {
				touchmoveCount++;
			}, 250 );
		} );

		document.addEventListener( 'touchstart', function ( e ) {
			lastTouchStart = ( new Date() ).getTime();
		} );

		document.addEventListener( 'touchend', function ( e ) {
			if ( ! lastTouchStart ) {
				// If the touchstart happened before this script was loaded, but the touchend happened after...
				return;
			}

			var now = ( new Date() ).getTime();

			var touchEvent = [];
			touchEvent.push( now - lastTouchStart );

			if ( lastTouchEnd ) {
				touchEvent.push( lastTouchStart - lastTouchEnd );
			}

			touchEvents.push( touchEvent );

			lastTouchEnd = now;

			// Don't record this time as an interval between keypresses.
			lastKeydown = null;
			lastKeyup = null;
			keydowns = {};
		} );

		document.addEventListener( 'scroll', function ( e ) {
			if ( scrollCountTimer ) {
				clearTimeout( scrollCountTimer );
			}

			scrollCountTimer = setTimeout( function () {
				scrollCount++;
			}, 250 );
		} );
	}

	/**
	 * For the timestamp data that is collected, don't send more than `limit` data points in the request.
	 * Choose a random slice and send those.
	 */
	function prepare_timestamp_array_for_request( a, limit ) {
		if ( ! limit ) {
			limit = 100;
		}

		var rv = '';

		if ( a.length > 0 ) {
			var random_starting_point = Math.max( 0, Math.floor( Math.random() * a.length - limit ) );

			for ( var i = 0; i < limit && i < a.length; i++ ) {
				rv += a[ random_starting_point + i ][0];

				if ( a[ random_starting_point + i ].length >= 2 ) {
					rv += "," + a[ random_starting_point + i ][1];
				}

				rv += ";";
			}
		}

		return rv;
	}

	if ( document.readyState !== 'loading' ) {
		init();
	} else {
		document.addEventListener( 'DOMContentLoaded', init );
	}
})();;
/* global WPCOM_sharing_counts */

// NOTE: This file intentionally does not make use of polyfills or libraries,
// including jQuery. Please keep all code as IE11-compatible vanilla ES5, and
// ensure everything is inside an IIFE to avoid global namespace pollution.
// Code follows WordPress browser support guidelines. For an up to date list,
// see https://make.wordpress.org/core/handbook/best-practices/browser-support/

( function () {
	var currentScript = document.currentScript;

	// -------------------------- UTILITY FUNCTIONS -------------------------- //

	// Helper function to load an external script.
	function loadScript( url ) {
		var script = document.createElement( 'script' );
		var prev = currentScript || document.getElementsByTagName( 'script' )[ 0 ];
		script.setAttribute( 'async', true );
		script.setAttribute( 'src', url );
		prev.parentNode.insertBefore( script, prev );
	}

	// Helper matches function (not a polyfill), compatible with IE 11.
	function matches( el, sel ) {
		if ( Element.prototype.matches ) {
			return el.matches( sel );
		}

		if ( Element.prototype.msMatchesSelector ) {
			return el.msMatchesSelector( sel );
		}
	}

	// Helper closest parent node function (not a polyfill) based on
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
	function closest( el, sel ) {
		if ( el.closest ) {
			return el.closest( sel );
		}

		var current = el;

		do {
			if ( matches( current, sel ) ) {
				return current;
			}
			current = current.parentElement || current.parentNode;
		} while ( current !== null && current.nodeType === 1 );

		return null;
	}

	// Helper function to iterate over a NodeList
	// (since IE 11 doesn't have NodeList.prototype.forEach)
	function forEachNode( list, fn ) {
		for ( var i = 0; i < list.length; i++ ) {
			var node = list[ i ];
			fn( node, i, list );
		}
	}

	// Helper function to remove a node from the DOM.
	function removeNode( node ) {
		if ( node && node.parentNode ) {
			node.parentNode.removeChild( node );
		}
	}

	// Helper functions to show/hide a node, and check its status.
	function hideNode( node ) {
		if ( node ) {
			node.style.display = 'none';
		}
	}

	function showNode( node ) {
		if ( node ) {
			node.style.removeProperty( 'display' );
		}
	}

	function isNodeHidden( node ) {
		return ! node || node.style.display === 'none';
	}

	// ------------------------------- CLASSES ------------------------------- //

	var PANE_SELECTOR = '.sharing-hidden .inner';
	var PANE_DATA_ATTR = 'data-sharing-more-button-id';

	// Implements a MoreButton class, which controls the lifecycle and behavior
	// of a "more" button and its dialog.
	function MoreButton( buttonEl ) {
		this.button = buttonEl;
		this.pane = closest( buttonEl, 'div' ).querySelector( PANE_SELECTOR );
		this.openedBy = null;
		this.recentlyOpenedByHover = false;

		MoreButton.instances.push( this );
		this.pane.setAttribute( PANE_DATA_ATTR, MoreButton.instances.length - 1 );

		this.attachHandlers();
	}

	// Keep a reference to each instance, so we can get back to it from the DOM.
	MoreButton.instances = [];

	// Delay time configs.
	MoreButton.hoverOpenDelay = 200;
	MoreButton.recentOpenDelay = 400;
	MoreButton.hoverCloseDelay = 300;

	// Use this to avoid creating new instances for buttons which already have one.
	MoreButton.instantiateOrReuse = function ( buttonEl ) {
		var pane = closest( buttonEl, 'div' ).querySelector( PANE_SELECTOR );
		var paneId = pane && pane.getAttribute( PANE_DATA_ATTR );

		var existingInstance = MoreButton.instances[ paneId ];
		if ( existingInstance ) {
			return existingInstance;
		}

		return new MoreButton( buttonEl );
	};

	// Retrieve a button instance from the pane DOM element.
	MoreButton.getButtonInstanceFromPane = function ( paneEl ) {
		var paneId = paneEl && paneEl.getAttribute( PANE_DATA_ATTR );
		return MoreButton.instances[ paneId ];
	};

	// Close all open More Button dialogs.
	MoreButton.closeAll = function () {
		for ( var i = 0; i < MoreButton.instances.length; i++ ) {
			MoreButton.instances[ i ].close();
		}
	};

	MoreButton.prototype.open = function () {
		var offset;
		var offsetParent;
		var parentOffset = [ 0, 0 ];

		function getOffsets( el ) {
			var rect = el.getBoundingClientRect();
			return [
				rect.left + ( window.scrollX || window.pageXOffset || 0 ),
				rect.top + ( window.scrollY || window.pageYOffset || 0 ),
			];
		}

		function getStyleValue( el, prop ) {
			return parseInt( getComputedStyle( el ).getPropertyValue( prop ) || 0 );
		}

		offset = getOffsets( this.button );
		offsetParent = this.button.offsetParent || document.documentElement;

		while (
			offsetParent &&
			( offsetParent === document.body || offsetParent === document.documentElement ) &&
			getComputedStyle( offsetParent ).getPropertyValue( 'position' ) === 'static'
		) {
			offsetParent = offsetParent.parentNode;
		}

		if ( offsetParent && offsetParent !== this.button && offsetParent.nodeType === 1 ) {
			parentOffset = getOffsets( offsetParent );
			parentOffset = [
				parentOffset[ 0 ] + getStyleValue( offsetParent, 'border-left-width' ),
				parentOffset[ 1 ] + getStyleValue( offsetParent, 'border-top-width' ),
			];
		}

		var positionLeft =
			offset[ 0 ] - parentOffset[ 0 ] - getStyleValue( this.button, 'margin-left' );
		var positionTop = offset[ 1 ] - parentOffset[ 1 ] - getStyleValue( this.button, 'margin-top' );

		this.pane.style.left = positionLeft + 'px';
		this.pane.style.top = positionTop + this.button.offsetHeight + 3 + 'px';

		showNode( this.pane );
	};

	MoreButton.prototype.close = function () {
		hideNode( this.pane );
		this.openedBy = null;
	};

	MoreButton.prototype.toggle = function () {
		if ( isNodeHidden( this.pane ) ) {
			this.open();
		} else {
			this.close();
		}
	};

	MoreButton.prototype.resetCloseTimer = function () {
		clearTimeout( this.closeTimer );
		this.closeTimer = setTimeout( this.close.bind( this ), MoreButton.hoverCloseDelay );
	};

	MoreButton.prototype.attachHandlers = function () {
		this.buttonClick = function ( event ) {
			event.preventDefault();
			event.stopPropagation();

			this.openedBy = 'click';
			clearTimeout( this.openTimer );
			clearTimeout( this.closeTimer );

			if ( this.recentlyOpenedByHover ) {
				this.recentlyOpenedByHover = false;
				clearTimeout( this.hoverOpenTimer );
				this.open();
			} else {
				this.toggle();
			}
		}.bind( this );

		this.buttonEnter = function () {
			if ( ! this.openedBy ) {
				this.openTimer = setTimeout(
					function () {
						this.open();
						this.openedBy = 'hover';
						this.recentlyOpenedByHover = true;
						this.hoverOpenTimer = setTimeout(
							function () {
								this.recentlyOpenedByHover = false;
							}.bind( this ),
							MoreButton.recentOpenDelay
						);
					}.bind( this ),
					MoreButton.hoverOpenDelay
				);
			}
			clearTimeout( this.closeTimer );
		}.bind( this );

		this.buttonLeave = function () {
			if ( this.openedBy === 'hover' ) {
				this.resetCloseTimer();
			}
			clearTimeout( this.openTimer );
		}.bind( this );

		this.paneEnter = function () {
			clearTimeout( this.closeTimer );
		}.bind( this );

		this.paneLeave = function () {
			if ( this.openedBy === 'hover' ) {
				this.resetCloseTimer();
			}
		}.bind( this );

		this.documentClick = function () {
			this.close();
		}.bind( this );

		this.button.addEventListener( 'click', this.buttonClick );
		document.addEventListener( 'click', this.documentClick );

		if ( document.ontouchstart === undefined ) {
			// Non-touchscreen device: use hover/mouseout with delay
			this.button.addEventListener( 'mouseenter', this.buttonEnter );
			this.button.addEventListener( 'mouseleave', this.buttonLeave );
			this.pane.addEventListener( 'mouseenter', this.paneEnter );
			this.pane.addEventListener( 'mouseleave', this.paneLeave );
		}
	};

	// ---------------------------- SHARE COUNTS ---------------------------- //

	if ( window.sharing_js_options && window.sharing_js_options.counts ) {
		var WPCOMSharing = {
			done_urls: [],
			get_counts: function () {
				var url, requests, id, service, service_request;

				if ( 'undefined' === typeof WPCOM_sharing_counts ) {
					return;
				}

				for ( url in WPCOM_sharing_counts ) {
					id = WPCOM_sharing_counts[ url ];

					if ( 'undefined' !== typeof WPCOMSharing.done_urls[ id ] ) {
						continue;
					}

					requests = {
						// Pinterest handles share counts for both http and https
						pinterest: [
							window.location.protocol +
								'//api.pinterest.com/v1/urls/count.json?callback=WPCOMSharing.update_pinterest_count&url=' +
								encodeURIComponent( url ),
						],
					};

					for ( service in requests ) {
						if ( ! document.querySelector( 'a[data-shared=sharing-' + service + '-' + id + ']' ) ) {
							continue;
						}

						while ( ( service_request = requests[ service ].pop() ) ) {
							loadScript( service_request );
						}

						if ( window.sharing_js_options.is_stats_active ) {
							WPCOMSharing.bump_sharing_count_stat( service );
						}
					}

					WPCOMSharing.done_urls[ id ] = true;
				}
			},
			update_pinterest_count: function ( data ) {
				if ( 'undefined' !== typeof data.count && data.count * 1 > 0 ) {
					WPCOMSharing.inject_share_count(
						'sharing-pinterest-' + WPCOM_sharing_counts[ data.url ],
						data.count
					);
				}
			},
			inject_share_count: function ( id, count ) {
				forEachNode(
					document.querySelectorAll( 'a[data-shared=' + id + '] > span' ),
					function ( span ) {
						var countNode = span.querySelector( '.share-count' );
						removeNode( countNode );
						var newNode = document.createElement( 'span' );
						newNode.className = 'share-count';
						newNode.textContent = WPCOMSharing.format_count( count );
						span.appendChild( newNode );
					}
				);
			},
			format_count: function ( count ) {
				if ( count < 1000 ) {
					return count;
				}
				if ( count >= 1000 && count < 10000 ) {
					return String( count ).substring( 0, 1 ) + 'K+';
				}
				return '10K+';
			},
			bump_sharing_count_stat: function ( service ) {
				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/g.gif?v=wpcom-no-pv&x_sharing-count-request=' +
					service +
					'&r=' +
					Math.random();
			},
		};
		window.WPCOMSharing = WPCOMSharing;
	}

	// ------------------------ BUTTON FUNCTIONALITY ------------------------ //
	function isUrlForCurrentHost( url ) {
		var currentDomain = window.location.protocol + '//' + window.location.hostname + '/';

		return String( url ).indexOf( currentDomain ) === 0;
	}

	function getEncodedFormFieldForSubmit( name, value ) {
		// Encode the key and value into a URI-compatible string.
		var encoded = encodeURIComponent( name ) + '=' + encodeURIComponent( value );

		// In x-www-form-urlencoded, spaces should be `+`, not `%20`.
		return encoded.replace( /%20/g, '+' );
	}

	function trackButtonClick( button ) {
		var clickCount = getClickCountForButton( button );

		setClickCountForButton( button, clickCount + 1 );
	}

	function setClickCountForButton( button, clickCount ) {
		button.setAttribute( 'jetpack-share-click-count', clickCount );
	}

	function getClickCountForButton( button ) {
		var currentClickCount = button.getAttribute( 'jetpack-share-click-count' );
		if ( currentClickCount === null ) {
			return 0;
		}

		return parseInt( currentClickCount, 10 );
	}

	function showEmailShareError( emailShareButton, sdUlGroup ) {
		var sdContent = sdUlGroup.parentElement;
		if ( ! sdContent.classList.contains( 'sd-content' ) ) {
			return;
		}

		forEachNode( sdContent.querySelectorAll( '.share-email-error' ), function ( shareEmailError ) {
			shareEmailError.parentElement.removeChild( shareEmailError );
		} );

		var newShareEmailError = document.createElement( 'div' );
		newShareEmailError.className = 'share-email-error';

		var newShareEmailErrorTitle = document.createElement( 'h6' );
		newShareEmailErrorTitle.className = 'share-email-error-title';
		newShareEmailErrorTitle.innerText = emailShareButton.getAttribute(
			'data-email-share-error-title'
		);
		newShareEmailError.appendChild( newShareEmailErrorTitle );

		var newShareEmailErrorText = document.createElement( 'p' );
		newShareEmailErrorText.className = 'share-email-error-text';
		newShareEmailErrorText.innerText = emailShareButton.getAttribute(
			'data-email-share-error-text'
		);
		newShareEmailError.appendChild( newShareEmailErrorText );

		sdContent.appendChild( newShareEmailError );
	}

	function recordEmailShareClick( emailShareTrackerUrl, emailShareNonce ) {
		var request = new XMLHttpRequest();
		request.open( 'POST', emailShareTrackerUrl, true );
		request.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
		request.setRequestHeader( 'x-requested-with', 'XMLHttpRequest' );

		request.send( getEncodedFormFieldForSubmit( 'email-share-nonce', emailShareNonce ) );
	}

	// Sharing initialization.
	// Will run immediately or on `DOMContentLoaded`, depending on current page status.
	function init() {
		WPCOMSharing_do();
	}
	if ( document.readyState !== 'loading' ) {
		init();
	} else {
		document.addEventListener( 'DOMContentLoaded', init );
	}

	// Set up sharing again whenever a new post loads, to pick up any new buttons.
	document.body.addEventListener( 'is.post-load', WPCOMSharing_do );

	// Set up sharing, updating counts and adding all button functionality.
	function WPCOMSharing_do() {
		if ( window.WPCOMSharing ) {
			window.WPCOMSharing.get_counts();
		}

		forEachNode( document.querySelectorAll( '.sharedaddy a' ), function ( anchor ) {
			var href = anchor.getAttribute( 'href' );
			if ( href && href.indexOf( 'share=' ) !== -1 && href.indexOf( '&nb=1' ) === -1 ) {
				anchor.setAttribute( 'href', href + '&nb=1' );
			}
		} );

		// Show hidden buttons

		// Touchscreen device: use click.
		// Non-touchscreen device: use click if not already appearing due to a hover event

		forEachNode(
			document.querySelectorAll( '.sharedaddy a.sharing-anchor' ),
			function ( buttonEl ) {
				MoreButton.instantiateOrReuse( buttonEl );
			}
		);

		if ( document.ontouchstart !== undefined ) {
			document.body.classList.add( 'jp-sharing-input-touch' );
		}

		// Add click functionality
		forEachNode( document.querySelectorAll( '.sharedaddy ul' ), function ( group ) {
			if ( group.getAttribute( 'data-sharing-events-added' ) === 'true' ) {
				return;
			}
			group.setAttribute( 'data-sharing-events-added', 'true' );

			var printUrl = function ( uniqueId, urlToPrint ) {
				var iframe = document.createElement( 'iframe' );
				iframe.setAttribute(
					'style',
					'position:fixed; top:100; left:100; height:1px; width:1px; border:none;'
				);
				iframe.setAttribute( 'id', 'printFrame-' + uniqueId );
				iframe.setAttribute( 'name', iframe.getAttribute( 'id' ) );
				iframe.setAttribute( 'src', urlToPrint );
				iframe.setAttribute(
					'onload',
					'frames["printFrame-' +
						uniqueId +
						'"].focus();frames["printFrame-' +
						uniqueId +
						'"].print();'
				);
				document.body.appendChild( iframe );
			};

			// Print button
			forEachNode( group.querySelectorAll( 'a.share-print' ), function ( printButton ) {
				printButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					var ref = printButton.getAttribute( 'href' ) || '';
					var doPrint = function () {
						if ( ref.indexOf( '#print' ) === -1 ) {
							var uid = new Date().getTime();
							printUrl( uid, ref );
						} else {
							window.print();
						}
					};

					// Is the button in a dropdown?
					var pane = closest( printButton, PANE_SELECTOR );
					if ( pane ) {
						var moreButton = MoreButton.getButtonInstanceFromPane( pane );
						if ( moreButton ) {
							moreButton.close();
							doPrint();
						}
					} else {
						doPrint();
					}
				} );
			} );

			// Press This button
			forEachNode( group.querySelectorAll( 'a.share-press-this' ), function ( pressThisButton ) {
				pressThisButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					var s = '';

					if ( window.getSelection ) {
						s = window.getSelection();
					} else if ( document.getSelection ) {
						s = document.getSelection();
					} else if ( document.selection ) {
						s = document.selection.createRange().text;
					}

					if ( s ) {
						var href = pressThisButton.getAttribute( 'href' );
						pressThisButton.setAttribute( 'href', href + '&sel=' + encodeURI( s ) );
					}

					if (
						! window.open(
							pressThisButton.getAttribute( 'href' ),
							't',
							'toolbar=0,resizable=1,scrollbars=1,status=1,width=720,height=570'
						)
					) {
						document.location.href = pressThisButton.getAttribute( 'href' );
					}
				} );
			} );

			// Email button
			forEachNode( group.querySelectorAll( 'a.share-email' ), function ( emailButton ) {
				setClickCountForButton( emailButton, 0 );

				var emailShareNonce = emailButton.getAttribute( 'data-email-share-nonce' );
				var emailShareTrackerUrl = emailButton.getAttribute( 'data-email-share-track-url' );

				if (
					emailShareNonce &&
					emailShareTrackerUrl &&
					isUrlForCurrentHost( emailShareTrackerUrl )
				) {
					emailButton.addEventListener( 'click', function () {
						trackButtonClick( emailButton );

						if ( getClickCountForButton( emailButton ) > 2 ) {
							showEmailShareError( emailButton, group );
						}

						recordEmailShareClick( emailShareTrackerUrl, emailShareNonce );
					} );
				}
			} );
		} );

		forEachNode(
			document.querySelectorAll( 'li.share-email, li.share-custom a.sharing-anchor' ),
			function ( node ) {
				node.classList.add( 'share-service-visible' );
			}
		);
	}
} )();
;
