(function() {
  var AjaxMonitor, Bar, DocumentMonitor, ElementMonitor, ElementTracker, EventLagMonitor, Evented, Events, NoTargetError, Pace, RequestIntercept, SOURCE_KEYS, Scaler, SocketRequestTracker, XHRRequestTracker, animation, avgAmplitude, bar, cancelAnimation, cancelAnimationFrame, defaultOptions, extend, extendNative, getFromDOM, getIntercept, handlePushState, ignoreStack, init, now, options, requestAnimationFrame, result, runAnimation, scalers, shouldIgnoreURL, shouldTrack, source, sources, uniScaler, _WebSocket, _XDomainRequest, _XMLHttpRequest, _i, _intercept, _len, _pushState, _ref, _ref1, _replaceState,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  defaultOptions = {
    catchupTime: 100,
    initialRate: .03,
    minTime: 250,
    ghostTime: 100,
    maxProgressPerFrame: 20,
    easeFactor: 1.25,
    startOnPageLoad: true,
    restartOnPushState: true,
    restartOnRequestAfter: 500,
    target: 'body',
    elements: {
      checkInterval: 100,
      selectors: ['body', 'img', 'img', 'img', 'img', 'img', 'img']
    },
    eventLag: {
      minSamples: 10,
      sampleCount: 3,
      lagThreshold: 3
    },
    ajax: {
      trackMethods: ['GET'],
      trackWebSockets: false,
      ignoreURLs: []
    }
  };

  now = function() {
    var _ref;
    return (_ref = typeof performance !== "undefined" && performance !== null ? typeof performance.now === "function" ? performance.now() : void 0 : void 0) != null ? _ref : +(new Date);
  };

  requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

  cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

  if (requestAnimationFrame == null) {
    requestAnimationFrame = function(fn) {
      return setTimeout(fn, 50);
    };
    cancelAnimationFrame = function(id) {
      return clearTimeout(id);
    };
  }

  runAnimation = function(fn) {
    var last, tick;
    last = now();
    tick = function() {
      var diff;
      diff = now() - last;
      if (diff >= 33) {
        last = now();
        return fn(diff, function() {
          return requestAnimationFrame(tick);
        });
      } else {
        return setTimeout(tick, 33 - diff);
      }
    };
    return tick();
  };

  result = function() {
    var args, key, obj;
    obj = arguments[0], key = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    if (typeof obj[key] === 'function') {
      return obj[key].apply(obj, args);
    } else {
      return obj[key];
    }
  };

  extend = function() {
    var key, out, source, sources, val, _i, _len;
    out = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = sources.length; _i < _len; _i++) {
      source = sources[_i];
      if (source) {
        for (key in source) {
          if (!__hasProp.call(source, key)) continue;
          val = source[key];
          if ((out[key] != null) && typeof out[key] === 'object' && (val != null) && typeof val === 'object') {
            extend(out[key], val);
          } else {
            out[key] = val;
          }
        }
      }
    }
    return out;
  };

  avgAmplitude = function(arr) {
    var count, sum, v, _i, _len;
    sum = count = 0;
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      v = arr[_i];
      sum += Math.abs(v);
      count++;
    }
    return sum / count;
  };

  getFromDOM = function(key, json) {
    var data, e, el;
    if (key == null) {
      key = 'options';
    }
    if (json == null) {
      json = true;
    }
    el = document.querySelector("[data-pace-" + key + "]");
    if (!el) {
      return;
    }
    data = el.getAttribute("data-pace-" + key);
    if (!json) {
      return data;
    }
    try {
      return JSON.parse(data);
    } catch (_error) {
      e = _error;
      return typeof console !== "undefined" && console !== null ? console.error("Error parsing inline pace options", e) : void 0;
    }
  };

  Evented = (function() {
    function Evented() {}

    Evented.prototype.on = function(event, handler, ctx, once) {
      var _base;
      if (once == null) {
        once = false;
      }
      if (this.bindings == null) {
        this.bindings = {};
      }
      if ((_base = this.bindings)[event] == null) {
        _base[event] = [];
      }
      return this.bindings[event].push({
        handler: handler,
        ctx: ctx,
        once: once
      });
    };

    Evented.prototype.once = function(event, handler, ctx) {
      return this.on(event, handler, ctx, true);
    };

    Evented.prototype.off = function(event, handler) {
      var i, _ref, _results;
      if (((_ref = this.bindings) != null ? _ref[event] : void 0) == null) {
        return;
      }
      if (handler == null) {
        return delete this.bindings[event];
      } else {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          if (this.bindings[event][i].handler === handler) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    Evented.prototype.trigger = function() {
      var args, ctx, event, handler, i, once, _ref, _ref1, _results;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if ((_ref = this.bindings) != null ? _ref[event] : void 0) {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          _ref1 = this.bindings[event][i], handler = _ref1.handler, ctx = _ref1.ctx, once = _ref1.once;
          handler.apply(ctx != null ? ctx : this, args);
          if (once) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    return Evented;

  })();

  Pace = window.Pace || {};

  window.Pace = Pace;

  extend(Pace, Evented.prototype);

  options = Pace.options = extend({}, defaultOptions, window.paceOptions, getFromDOM());

  _ref = ['ajax', 'document', 'eventLag', 'elements'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    source = _ref[_i];
    if (options[source] === true) {
      options[source] = defaultOptions[source];
    }
  }

  NoTargetError = (function(_super) {
    __extends(NoTargetError, _super);

    function NoTargetError() {
      _ref1 = NoTargetError.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    return NoTargetError;

  })(Error);

  Bar = (function() {
    function Bar() {
      this.progress = 0;
    }

    Bar.prototype.getElement = function() {
      var targetElement;
      if (this.el == null) {
        targetElement = document.querySelector(options.target);
        if (!targetElement) {
          throw new NoTargetError;
        }
        this.el = document.createElement('div');
        this.el.className = "pace pace-active";
        document.body.className = document.body.className.replace(/pace-done/g, '');
        document.body.className += ' pace-running';
        this.el.innerHTML = `
        <div class="pace-progress"> 
        <svg class="inner-svg" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 142 62">
          <defs>
          <mask id="myMask" x="0" y="0">
          <rect class="maskPart1" x="0" y="0" width="142" height="200" fill="white"></rect>
          <rect class="maskPart2" x="50" y="0" width="142" height="200" fill="black"></rect>
          </mask>
          </defs>
          <g fill="gray">
          <path d="M63.62,38.25a10.23,10.23,0,0,0-4.89,1.3V28.91L53,30.18V59.84A17.45,17.45,0,0,0,61.1,62c5.78,0,11.23-3.33,11.23-12.15S67.57,38.25,63.62,38.25ZM61.09,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6.07,6.07,0,0,1,3.1-.49c1.57.15,4.61,1.43,4.61,8.78S63.43,59.07,61.09,59.07Z"/>
          <path d="M87.94,38.25a10.19,10.19,0,0,0-4.89,1.3V28.91l-5.74,1.27V59.84A17.44,17.44,0,0,0,85.41,62c5.78,0,11.24-3.33,11.24-12.15S91.89,38.25,87.94,38.25ZM85.41,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6,6,0,0,1,3.09-.49c1.58.15,4.61,1.43,4.61,8.78S87.74,59.07,85.41,59.07Z"/>
          <path d="M40.36,57.41a4.35,4.35,0,0,1-2.9,1.29c-4.29.36-4.12-4.7-4.12-4.7V37.65l-5.75,1.27v15s-.33,8,7.45,8a9.73,9.73,0,0,0,6.23-2l.61,1.1h4.23V37.65l-5.75,1.27Z"/>
          <polygon points="14.93 43.63 5.93 43.63 5.93 28.21 0 29.52 0 61.03 5.93 61.03 5.93 46.98 14.93 46.98 14.93 61.03 20.86 61.03 20.86 28.21 14.93 29.52 14.93 43.63"/>
          <path d="M131.19,33.43l9-18.9a10,10,0,1,0-17.94,0Zm0-30A6.64,6.64,0,1,1,124.56,10,6.64,6.64,0,0,1,131.19,3.4Z"/>
          <path d="M131.2,14.76A4.73,4.73,0,0,0,135.92,10a5.36,5.36,0,0,0-.06-.69,2.82,2.82,0,0,1-4.76-2,2.77,2.77,0,0,1,.79-1.94,4,4,0,0,0-.69-.06,4.73,4.73,0,1,0,0,9.45Z"/>
          <path d="M112.89,38.38a22.08,22.08,0,0,0-4.42-.32,22.51,22.51,0,0,0-3.15.27,20.34,20.34,0,0,0-2.81.63l-.61,2.25h5.57a6.54,6.54,0,0,1,3.82.9c.93.6,1.4,1.8,1.4,3.6v1.8c-.63-.12-1.3-.23-2-.31a15.75,15.75,0,0,0-2.2-.14,17.48,17.48,0,0,0-3.28.29,6.41,6.41,0,0,0-2.58,1.11,5.35,5.35,0,0,0-1.71,2.2,9,9,0,0,0-.62,3.6,9,9,0,0,0,.62,3.6,5.6,5.6,0,0,0,1.66,2.2A6,6,0,0,0,105,61.17a14.84,14.84,0,0,0,3,.29,8.66,8.66,0,0,0,3.38-.56,8.52,8.52,0,0,0,2.08-1.24h.25l.74,1.35H118V45.71a9.87,9.87,0,0,0-.65-3.85A6.12,6.12,0,0,0,112.89,38.38Zm-.2,19a5.38,5.38,0,0,1-3.14.9,5.05,5.05,0,0,1-1.32-.18,2.8,2.8,0,0,1-1.19-.66,3.52,3.52,0,0,1-.87-1.26,4.83,4.83,0,0,1-.34-2,4.92,4.92,0,0,1,.34-2A3.71,3.71,0,0,1,107,51a2.89,2.89,0,0,1,1.19-.65,8.54,8.54,0,0,1,1.73-.18h2.73Z"/>
          <path d="M138,40.72a6.88,6.88,0,0,0-3-2,13,13,0,0,0-8,0,6.19,6.19,0,0,0-2.75,2,9.49,9.49,0,0,0-1.84,3.62,19.69,19.69,0,0,0-.64,5.42,18.86,18.86,0,0,0,.67,5.42,8.57,8.57,0,0,0,2,3.62,7.21,7.21,0,0,0,3.27,2,17.51,17.51,0,0,0,5,.63,22.85,22.85,0,0,0,3.59-.27,19.91,19.91,0,0,0,2.86-.63l-.62-2.25h-4.84a6.31,6.31,0,0,1-4.69-1.55c-1-1-1.51-3-1.51-5.63h12.9V49.76a19.66,19.66,0,0,0-.65-5.42A9.63,9.63,0,0,0,138,40.72Zm-10.42,7.47a19.56,19.56,0,0,1,.27-3.6,7.62,7.62,0,0,1,.72-2.21A2.76,2.76,0,0,1,131.09,41a2.85,2.85,0,0,1,2.69,1.39,8,8,0,0,1,.71,2.21,18.61,18.61,0,0,1,.28,3.6Z"/>
          </g>
          <g class="cls-1" mask="url(#myMask)">
          <path d="M63.62,38.25a10.23,10.23,0,0,0-4.89,1.3V28.91L53,30.18V59.84A17.45,17.45,0,0,0,61.1,62c5.78,0,11.23-3.33,11.23-12.15S67.57,38.25,63.62,38.25ZM61.09,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6.07,6.07,0,0,1,3.1-.49c1.57.15,4.61,1.43,4.61,8.78S63.43,59.07,61.09,59.07Z"/>
          <path d="M87.94,38.25a10.19,10.19,0,0,0-4.89,1.3V28.91l-5.74,1.27V59.84A17.44,17.44,0,0,0,85.41,62c5.78,0,11.24-3.33,11.24-12.15S91.89,38.25,87.94,38.25ZM85.41,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6,6,0,0,1,3.09-.49c1.58.15,4.61,1.43,4.61,8.78S87.74,59.07,85.41,59.07Z"/>
          <path d="M40.36,57.41a4.35,4.35,0,0,1-2.9,1.29c-4.29.36-4.12-4.7-4.12-4.7V37.65l-5.75,1.27v15s-.33,8,7.45,8a9.73,9.73,0,0,0,6.23-2l.61,1.1h4.23V37.65l-5.75,1.27Z"/>
          <polygon points="14.93 43.63 5.93 43.63 5.93 28.21 0 29.52 0 61.03 5.93 61.03 5.93 46.98 14.93 46.98 14.93 61.03 20.86 61.03 20.86 28.21 14.93 29.52 14.93 43.63"/>
          <path d="M131.19,33.43l9-18.9a10,10,0,1,0-17.94,0Zm0-30A6.64,6.64,0,1,1,124.56,10,6.64,6.64,0,0,1,131.19,3.4Z"/>
          <path d="M131.2,14.76A4.73,4.73,0,0,0,135.92,10a5.36,5.36,0,0,0-.06-.69,2.82,2.82,0,0,1-4.76-2,2.77,2.77,0,0,1,.79-1.94,4,4,0,0,0-.69-.06,4.73,4.73,0,1,0,0,9.45Z"/>
          <path d="M112.89,38.38a22.08,22.08,0,0,0-4.42-.32,22.51,22.51,0,0,0-3.15.27,20.34,20.34,0,0,0-2.81.63l-.61,2.25h5.57a6.54,6.54,0,0,1,3.82.9c.93.6,1.4,1.8,1.4,3.6v1.8c-.63-.12-1.3-.23-2-.31a15.75,15.75,0,0,0-2.2-.14,17.48,17.48,0,0,0-3.28.29,6.41,6.41,0,0,0-2.58,1.11,5.35,5.35,0,0,0-1.71,2.2,9,9,0,0,0-.62,3.6,9,9,0,0,0,.62,3.6,5.6,5.6,0,0,0,1.66,2.2A6,6,0,0,0,105,61.17a14.84,14.84,0,0,0,3,.29,8.66,8.66,0,0,0,3.38-.56,8.52,8.52,0,0,0,2.08-1.24h.25l.74,1.35H118V45.71a9.87,9.87,0,0,0-.65-3.85A6.12,6.12,0,0,0,112.89,38.38Zm-.2,19a5.38,5.38,0,0,1-3.14.9,5.05,5.05,0,0,1-1.32-.18,2.8,2.8,0,0,1-1.19-.66,3.52,3.52,0,0,1-.87-1.26,4.83,4.83,0,0,1-.34-2,4.92,4.92,0,0,1,.34-2A3.71,3.71,0,0,1,107,51a2.89,2.89,0,0,1,1.19-.65,8.54,8.54,0,0,1,1.73-.18h2.73Z"/>
          <path d="M138,40.72a6.88,6.88,0,0,0-3-2,13,13,0,0,0-8,0,6.19,6.19,0,0,0-2.75,2,9.49,9.49,0,0,0-1.84,3.62,19.69,19.69,0,0,0-.64,5.42,18.86,18.86,0,0,0,.67,5.42,8.57,8.57,0,0,0,2,3.62,7.21,7.21,0,0,0,3.27,2,17.51,17.51,0,0,0,5,.63,22.85,22.85,0,0,0,3.59-.27,19.91,19.91,0,0,0,2.86-.63l-.62-2.25h-4.84a6.31,6.31,0,0,1-4.69-1.55c-1-1-1.51-3-1.51-5.63h12.9V49.76a19.66,19.66,0,0,0-.65-5.42A9.63,9.63,0,0,0,138,40.72Zm-10.42,7.47a19.56,19.56,0,0,1,.27-3.6,7.62,7.62,0,0,1,.72-2.21A2.76,2.76,0,0,1,131.09,41a2.85,2.85,0,0,1,2.69,1.39,8,8,0,0,1,.71,2.21,18.61,18.61,0,0,1,.28,3.6Z"/>
          </g>
        </svg>
        <div class="pace-progress-inner"></div>
        </div>
        <p class="debuggerTxt" id="txt"></p>
        <div class="pace-activity"></div>`

        if (targetElement.firstChild != null) {
          targetElement.insertBefore(this.el, targetElement.firstChild);
        } else {
          targetElement.appendChild(this.el);
        }
      }
      return this.el;
    };

    Bar.prototype.finish = function() {
      var el;
      el = this.getElement();
      el.className = el.className.replace('pace-active', '');
      el.className += ' pace-inactive';
      document.body.className = document.body.className.replace('pace-running', '');
      return document.body.className += ' pace-done';
    };

    Bar.prototype.update = function(prog) {
      this.progress = prog;
      return this.render();
    };

    Bar.prototype.destroy = function() {
      try {
        this.getElement().parentNode.removeChild(this.getElement());
      } catch (_error) {
        NoTargetError = _error;
      }
      return this.el = void 0;
    };

    Bar.prototype.render = function() {
      var el, key, progressStr, transform, _j, _len1, _ref2;
      if (document.querySelector(options.target) == null) {
        return false;
      }
      el = this.getElement();
      transform = "translate3d(" + 100 + "%, 0, 0)";
      document.getElementsByClassName('maskPart2')[0].setAttribute('x', (this.progress * 1.42 | 0))
      _ref2 = ['webkitTransform', 'msTransform', 'transform'];
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        key = _ref2[_j];
        el.children[0].style[key] = transform;
      }
      if (!this.lastRenderedProgress || this.lastRenderedProgress | 0 !== this.progress | 0) {
        el.children[0].setAttribute('data-progress-text', "" + (this.progress | 0) + "%");
        document.getElementById('txt').innerText = 'debug: ' + (this.progress | 0) + "%"
        if (this.progress >= 100) {
          progressStr = '99';
        } else {
          progressStr = this.progress < 10 ? "0" : "";
          progressStr += this.progress | 0;
        }
        el.children[0].setAttribute('data-progress', "" + progressStr);
      }
      return this.lastRenderedProgress = this.progress;
    };

    Bar.prototype.done = function() {
      return this.progress >= 100;
    };

    return Bar;

  })();

  Events = (function() {
    function Events() {
      this.bindings = {};
    }

    Events.prototype.trigger = function(name, val) {
      var binding, _j, _len1, _ref2, _results;
      if (this.bindings[name] != null) {
        _ref2 = this.bindings[name];
        _results = [];
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          binding = _ref2[_j];
          _results.push(binding.call(this, val));
        }
        return _results;
      }
    };

    Events.prototype.on = function(name, fn) {
      var _base;
      if ((_base = this.bindings)[name] == null) {
        _base[name] = [];
      }
      return this.bindings[name].push(fn);
    };

    return Events;

  })();

  _XMLHttpRequest = window.XMLHttpRequest;

  _XDomainRequest = window.XDomainRequest;

  _WebSocket = window.WebSocket;

  extendNative = function(to, from) {
    var e, key, _results;
    _results = [];
    for (key in from.prototype) {
      try {
        if ((to[key] == null) && typeof from[key] !== 'function') {
          if (typeof Object.defineProperty === 'function') {
            _results.push(Object.defineProperty(to, key, {
              get: function() {
                return from.prototype[key];
              },
              configurable: true,
              enumerable: true
            }));
          } else {
            _results.push(to[key] = from.prototype[key]);
          }
        } else {
          _results.push(void 0);
        }
      } catch (_error) {
        e = _error;
      }
    }
    return _results;
  };

  ignoreStack = [];

  Pace.ignore = function() {
    var args, fn, ret;
    fn = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    ignoreStack.unshift('ignore');
    ret = fn.apply(null, args);
    ignoreStack.shift();
    return ret;
  };

  Pace.track = function() {
    var args, fn, ret;
    fn = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    ignoreStack.unshift('track');
    ret = fn.apply(null, args);
    ignoreStack.shift();
    return ret;
  };

  shouldTrack = function(method) {
    var _ref2;
    if (method == null) {
      method = 'GET';
    }
    if (ignoreStack[0] === 'track') {
      return 'force';
    }
    if (!ignoreStack.length && options.ajax) {
      if (method === 'socket' && options.ajax.trackWebSockets) {
        return true;
      } else if (_ref2 = method.toUpperCase(), __indexOf.call(options.ajax.trackMethods, _ref2) >= 0) {
        return true;
      }
    }
    return false;
  };

  RequestIntercept = (function(_super) {
    __extends(RequestIntercept, _super);

    function RequestIntercept() {
      var monitorXHR,
        _this = this;
      RequestIntercept.__super__.constructor.apply(this, arguments);
      monitorXHR = function(req) {
        var _open;
        _open = req.open;
        return req.open = function(type, url, async) {
          if (shouldTrack(type)) {
            _this.trigger('request', {
              type: type,
              url: url,
              request: req
            });
          }
          return _open.apply(req, arguments);
        };
      };
      window.XMLHttpRequest = function(flags) {
        var req;
        req = new _XMLHttpRequest(flags);
        monitorXHR(req);
        return req;
      };
      try {
        extendNative(window.XMLHttpRequest, _XMLHttpRequest);
      } catch (_error) {}
      if (_XDomainRequest != null) {
        window.XDomainRequest = function() {
          var req;
          req = new _XDomainRequest;
          monitorXHR(req);
          return req;
        };
        try {
          extendNative(window.XDomainRequest, _XDomainRequest);
        } catch (_error) {}
      }
      if ((_WebSocket != null) && options.ajax.trackWebSockets) {
        window.WebSocket = function(url, protocols) {
          var req;
          if (protocols != null) {
            req = new _WebSocket(url, protocols);
          } else {
            req = new _WebSocket(url);
          }
          if (shouldTrack('socket')) {
            _this.trigger('request', {
              type: 'socket',
              url: url,
              protocols: protocols,
              request: req
            });
          }
          return req;
        };
        try {
          extendNative(window.WebSocket, _WebSocket);
        } catch (_error) {}
      }
    }

    return RequestIntercept;

  })(Events);

  _intercept = null;

  getIntercept = function() {
    if (_intercept == null) {
      _intercept = new RequestIntercept;
    }
    return _intercept;
  };

  shouldIgnoreURL = function(url) {
    var pattern, _j, _len1, _ref2;
    _ref2 = options.ajax.ignoreURLs;
    for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
      pattern = _ref2[_j];
      if (typeof pattern === 'string') {
        if (url.indexOf(pattern) !== -1) {
          return true;
        }
      } else {
        if (pattern.test(url)) {
          return true;
        }
      }
    }
    return false;
  };

  getIntercept().on('request', function(_arg) {
    var after, args, request, type, url;
    type = _arg.type, request = _arg.request, url = _arg.url;
    if (shouldIgnoreURL(url)) {
      return;
    }
    if (!Pace.running && (options.restartOnRequestAfter !== false || shouldTrack(type) === 'force')) {
      args = arguments;
      after = options.restartOnRequestAfter || 0;
      if (typeof after === 'boolean') {
        after = 0;
      }
      return setTimeout(function() {
        var stillActive, _j, _len1, _ref2, _ref3, _results;
        if (type === 'socket') {
          stillActive = request.readyState < 2;
        } else {
          stillActive = (0 < (_ref2 = request.readyState) && _ref2 < 4);
        }
        if (stillActive) {
          Pace.restart();
          _ref3 = Pace.sources;
          _results = [];
          for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
            source = _ref3[_j];
            if (source instanceof AjaxMonitor) {
              source.watch.apply(source, args);
              break;
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        }
      }, after);
    }
  });

  AjaxMonitor = (function() {
    function AjaxMonitor() {
      var _this = this;
      this.elements = [];
      getIntercept().on('request', function() {
        return _this.watch.apply(_this, arguments);
      });
    }

    AjaxMonitor.prototype.watch = function(_arg) {
      var request, tracker, type, url;
      type = _arg.type, request = _arg.request, url = _arg.url;
      if (shouldIgnoreURL(url)) {
        return;
      }
      if (type === 'socket') {
        tracker = new SocketRequestTracker(request);
      } else {
        tracker = new XHRRequestTracker(request);
      }
      return this.elements.push(tracker);
    };

    return AjaxMonitor;

  })();

  XHRRequestTracker = (function() {
    function XHRRequestTracker(request) {
      var event, size, _j, _len1, _onreadystatechange, _ref2,
        _this = this;
      this.progress = 0;
      if (window.ProgressEvent != null) {
        size = null;
        request.addEventListener('progress', function(evt) {
          if (evt.lengthComputable) {
            return _this.progress = 100 * evt.loaded / evt.total;
          } else {
            return _this.progress = _this.progress + (100 - _this.progress) / 2;
          }
        }, false);
        _ref2 = ['load', 'abort', 'timeout', 'error'];
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          event = _ref2[_j];
          request.addEventListener(event, function() {
            return _this.progress = 100;
          }, false);
        }
      } else {
        _onreadystatechange = request.onreadystatechange;
        request.onreadystatechange = function() {
          var _ref3;
          if ((_ref3 = request.readyState) === 0 || _ref3 === 4) {
            _this.progress = 100;
          } else if (request.readyState === 3) {
            _this.progress = 50;
          }
          return typeof _onreadystatechange === "function" ? _onreadystatechange.apply(null, arguments) : void 0;
        };
      }
    }

    return XHRRequestTracker;

  })();

  SocketRequestTracker = (function() {
    function SocketRequestTracker(request) {
      var event, _j, _len1, _ref2,
        _this = this;
      this.progress = 0;
      _ref2 = ['error', 'open'];
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        event = _ref2[_j];
        request.addEventListener(event, function() {
          return _this.progress = 100;
        }, false);
      }
    }

    return SocketRequestTracker;

  })();

  ElementMonitor = (function() {
    function ElementMonitor(options) {
      var selector, _j, _len1, _ref2;
      if (options == null) {
        options = {};
      }
      this.elements = [];
      if (options.selectors == null) {
        options.selectors = [];
      }
      _ref2 = options.selectors;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        selector = _ref2[_j];
        this.elements.push(new ElementTracker(selector));
      }
    }

    return ElementMonitor;

  })();

  ElementTracker = (function() {
    function ElementTracker(selector) {
      this.selector = selector;
      this.progress = 0;
      this.check();
    }

    ElementTracker.prototype.check = function() {
      var _this = this;
      if (document.querySelector(this.selector)) {
        return this.done();
      } else {
        return setTimeout((function() {
          return _this.check();
        }), options.elements.checkInterval);
      }
    };

    ElementTracker.prototype.done = function() {
      return this.progress = 100;
    };

    return ElementTracker;

  })();

  DocumentMonitor = (function() {
    DocumentMonitor.prototype.states = {
      loading: 0,
      interactive: 50,
      complete: 100
    };

    function DocumentMonitor() {
      var _onreadystatechange, _ref2,
        _this = this;
      this.progress = (_ref2 = this.states[document.readyState]) != null ? _ref2 : 100;
      _onreadystatechange = document.onreadystatechange;
      document.onreadystatechange = function() {
        if (_this.states[document.readyState] != null) {
          _this.progress = _this.states[document.readyState];
        }
        return typeof _onreadystatechange === "function" ? _onreadystatechange.apply(null, arguments) : void 0;
      };
    }

    return DocumentMonitor;

  })();

  EventLagMonitor = (function() {
    function EventLagMonitor() {
      var avg, interval, last, points, samples,
        _this = this;
      this.progress = 0;
      avg = 0;
      samples = [];
      points = 0;
      last = now();
      interval = setInterval(function() {
        var diff;
        diff = now() - last - 50;
        last = now();
        samples.push(diff);
        if (samples.length > options.eventLag.sampleCount) {
          samples.shift();
        }
        avg = avgAmplitude(samples);
        if (++points >= options.eventLag.minSamples && avg < options.eventLag.lagThreshold) {
          _this.progress = 100;
          return clearInterval(interval);
        } else {
          return _this.progress = 100 * (3 / (avg + 3));
        }
      }, 50);
    }

    return EventLagMonitor;

  })();

  Scaler = (function() {
    function Scaler(source) {
      this.source = source;
      this.last = this.sinceLastUpdate = 0;
      this.rate = options.initialRate;
      this.catchup = 0;
      this.progress = this.lastProgress = 0;
      if (this.source != null) {
        this.progress = result(this.source, 'progress');
      }
    }

    Scaler.prototype.tick = function(frameTime, val) {
      var scaling;
      if (val == null) {
        val = result(this.source, 'progress');
      }
      if (val >= 100) {
        this.done = true;
      }
      if (val === this.last) {
        this.sinceLastUpdate += frameTime;
      } else {
        if (this.sinceLastUpdate) {
          this.rate = (val - this.last) / this.sinceLastUpdate;
        }
        this.catchup = (val - this.progress) / options.catchupTime;
        this.sinceLastUpdate = 0;
        this.last = val;
      }
      if (val > this.progress) {
        this.progress += this.catchup * frameTime;
      }
      scaling = 1 - Math.pow(this.progress / 100, options.easeFactor);
      this.progress += scaling * this.rate * frameTime;
      this.progress = Math.min(this.lastProgress + options.maxProgressPerFrame, this.progress);
      this.progress = Math.max(0, this.progress);
      this.progress = Math.min(100, this.progress);
      this.lastProgress = this.progress;
      return this.progress;
    };

    return Scaler;

  })();

  sources = null;

  scalers = null;

  bar = null;

  uniScaler = null;

  animation = null;

  cancelAnimation = null;

  Pace.running = false;

  handlePushState = function() {
    if (options.restartOnPushState) {
      return Pace.restart();
    }
  };

  if (window.history.pushState != null) {
    _pushState = window.history.pushState;
    window.history.pushState = function() {
      handlePushState();
      return _pushState.apply(window.history, arguments);
    };
  }

  if (window.history.replaceState != null) {
    _replaceState = window.history.replaceState;
    window.history.replaceState = function() {
      handlePushState();
      return _replaceState.apply(window.history, arguments);
    };
  }

  SOURCE_KEYS = {
    ajax: AjaxMonitor,
    elements: ElementMonitor,
    document: DocumentMonitor,
    eventLag: EventLagMonitor
  };

  //99% stuck fix
  var initDestroyTimeOutPace = function() {
    var counter = 0;

    var refreshIntervalId = setInterval( function(){
        var progress; 

        if( typeof $( '.pace-progress' ).attr( 'data-progress-text' ) !== 'undefined' ) {
            progress = Number( $( '.pace-progress' ).attr( 'data-progress-text' ).replace("%" ,'') );
        }

        if( progress === 99 ) {
            counter++;
        }

        if( counter > 50 ) {
            clearInterval(refreshIntervalId);
            Pace.stop();
        }
    }, 100);
  }
  initDestroyTimeOutPace();


  (init = function() {
    var type, _j, _k, _len1, _len2, _ref2, _ref3, _ref4;
    Pace.sources = sources = [];
    _ref2 = ['ajax', 'elements', 'document', 'eventLag'];
    for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
      type = _ref2[_j];
      if (options[type] !== false) {
        sources.push(new SOURCE_KEYS[type](options[type]));
      }
    }
    _ref4 = (_ref3 = options.extraSources) != null ? _ref3 : [];
    for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
      source = _ref4[_k];
      sources.push(new source(options));
    }
    Pace.bar = bar = new Bar;
    scalers = [];
    return uniScaler = new Scaler;
  })();

  Pace.stop = function() {
    Pace.trigger('stop');
    Pace.running = false;
    bar.destroy();
    cancelAnimation = true;
    if (animation != null) {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(animation);
      }
      animation = null;
    }
    return init();
  };

  Pace.restart = function() {
    Pace.trigger('restart');
    Pace.stop();
    return Pace.start();
  };

  Pace.go = function() {
    var start;
    Pace.running = true;
    bar.render();
    start = now();
    cancelAnimation = false;
    return animation = runAnimation(function(frameTime, enqueueNextFrame) {
      var avg, count, done, element, elements, i, j, remaining, scaler, scalerList, sum, _j, _k, _len1, _len2, _ref2;
      remaining = 100 - bar.progress;
      count = sum = 0;
      done = true;
      for (i = _j = 0, _len1 = sources.length; _j < _len1; i = ++_j) {
        source = sources[i];
        scalerList = scalers[i] != null ? scalers[i] : scalers[i] = [];
        elements = (_ref2 = source.elements) != null ? _ref2 : [source];
        for (j = _k = 0, _len2 = elements.length; _k < _len2; j = ++_k) {
          element = elements[j];
          scaler = scalerList[j] != null ? scalerList[j] : scalerList[j] = new Scaler(element);
          done &= scaler.done;
          if (scaler.done) {
            continue;
          }
          count++;
          sum += scaler.tick(frameTime);
        }
      }
      avg = sum / count;
      bar.update(uniScaler.tick(frameTime, avg));
      if (bar.done() || done || cancelAnimation) {
        bar.update(100);
        Pace.trigger('done');
        return setTimeout(function() {
          bar.finish();
          Pace.running = false;
          return Pace.trigger('hide');
        }, Math.max(options.ghostTime, Math.max(options.minTime - (now() - start), 0)));
      } else {
        return enqueueNextFrame();
      }
    });
  };

  Pace.start = function(_options) {
    extend(options, _options);
    Pace.running = true;
    try {
      bar.render();
    } catch (_error) {
      NoTargetError = _error;
    }
    if (!document.querySelector('.pace')) {
      return setTimeout(Pace.start, 50);
    } else {
      Pace.trigger('start');
      return Pace.go();
    }
  };

  if (typeof define === 'function' && define.amd) {
    define(['pace'], function() {
      return Pace;
    });
  } else if (typeof exports === 'object') {
    module.exports = Pace;
  } else {
    if (options.startOnPageLoad) {
      Pace.start();
    }
  }

}).call(this);