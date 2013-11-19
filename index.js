/**
 * React application controller.
 *
 * 2013 (c) Andrey Popp <8mayday@gmail.com>
 */
"use strict";

var qs            = require('querystring');
var React         = require('react-tools/build/modules/React');
var createRouter  = require('./router');

function Controller(routes, opts) {
  opts = opts || {};
  routes = routes || {};

  this.routes = routes;
  this.opts = opts;
  this.router = createRouter(routes);
  this.activeRequest = null;
  this.activeComponent = null;

  this.renderComponent = opts.renderComponent ||
    renderComponent;

  this.renderComponentToString = opts.renderComponentToString ||
    renderComponentToString;

  this.onPopState = skipFirst(this.onPopState.bind(this));
}

Controller.prototype = {
  /**
   * Start controller
   *
   * @param {Object} data Bootstrap data which will be passed to the first
   *                      matched component
   * @param {Callback} cb
   */
  start: function(data, cb) {
    window.addeventlistener('popstate', this.onpopstate);
    this.process(null, cb);
  },

  /**
   * Stop controller
   */
  stop: function() {
    window.removeEventListener('popstate', this.onPopState);
  },

  /**
   * Navigate to a new URL
   *
   * @param {String|Request} URL
   * @param {Callback} cb
   */
  navigate: function(request, cb) {
    if (isString(request))
      request = createRequestFromURL(request);
    var url = createURL(request);
    window.history.pushState(null, '', url);
    this.process(request, cb);
  },

  /**
   * Navigate to a new URL by updating querystring
   *
   * @param {Object} query Values for querystring
   * @param {Callback} cb
   */
  navigateQuery: function(query, cb) {
    var k, newQuery = {}
    for (k in this.activeRequest.query)
      newQuery[k] = this.activeRequest.query[k];
    for (k in query)
      newQuery[k] = query[k];
    var request = {path: this.activeRequest.path, query: newQuery};
    this.navigate(request);
  },

  /**
   * Generate markup for a component for a specified request.
   *
   * This method doesn't touch the DOM and could be used on server to
   * pre-generate markup for a specified request.
   *
   * @param {String|Request} request
   * @param {Callback} cb
   */
  generateMarkup: function(request, cb) {
    if (isString(request))
      request = createRequestFromURL(request);
    var component = this.createComponent(request);
    if (!component)
      return cb(new NotFoundError(request.path));
    this.renderComponentToString(component, cb);
  },

  /**
   * Process request
   *
   * @private
   */
  process: function(request, cb) {
    request = request || createRequestFromLocation(window.location);
    cb = cb || function(err) { throwAsync(err); };

    var component = this.createComponent(request);
    if (!component)
      return cb(new NotFoundError(request.path));

    var mountPoint = this.opts.mountPoint || document.body;

    this.renderComponent(component, mountPoint, function(err, component) {
      if (err)
        return cb(err);

      this.activeRequest = request;
      this.activeComponent = component;

      cb(null, this);
    }.bind(this));
  },

  /**
   * Create component for request
   *
   * @private
   */
  createComponent: function(request) {
    var match = this.router.match(request.path);

    if (!match)
      return null;

    return match.handler({
      controller: this,
      request: {
        path: request.path,
        query: request.query || {},
        params: match.params || {}
      },
      data: request.data,
      options: this.opts.options
    });
  },

  /**
   * Handle 'popstate' event
   *
   * @private
   */
  onPopState: function(e) {
    e.preventDefault();
    this.process(null);
  }
};

/**
 * If object is a string
 *
 * @param {Object} obj
 */
function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
}

/**
 * Skip first invokation for a specified func
 *
 * @param {Function} func
 */
function skipFirst(func) {
  var n = 0;
  return function() {
    if (n > 0) return func.apply(this, arguments);
    n = n + 1;
  }
}

/**
 * Throw exception in an async way.
 */
function throwAsync(err) {
  setTimeout(function() { throw err; }, 0);
}

function renderComponentAsync(component, element, cb) {
  try {
    component = React.renderComponent(component, element);
  } catch (err) {
    return cb(err);
  }
  cb(null, component);
}

function renderComponent(component, element, cb) {
  var doc = element.ownerDocument;

  if (doc.readyState === 'interactive' || doc.readyState === 'complete') {
    renderComponentAsync(component, element, cb);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      renderComponentAsync(component, element, cb);
    });
  }
}

function renderComponentToString(component, cb) {
  React.renderComponentToString(component, cb.bind(null, null));
}

/**
 * Error which will be thrown in case of no match found for a processed request.
 *
 * @param {String} url
 */
function NotFoundError(url) {
  Error.call(this, 'not found: ' + url);
  this.name = 'NotFoundError';
  this.url = url;
  this.isNotFound = true;
}
NotFoundError.prototype = new Error();

function createURL(request) {
  var url = request.path;
  if (request.query)
    url = url + '?' + qs.stringify(request.query);
  return url;
}

/**
 * Create request from URL
 *
 * @param {String} url
 * @param {Object} data
 */
function createRequestFromURL(url, data) {
  if (url.indexOf('?') > -1) {
    var parts = url.split('?');
    return {
      path: parts[0],
      query: qs.parse(parts[1]),
      data: data
    };
  } else {
    return {
      path: url,
      query: undefined,
      data: data
    };
  }
}

/**
 * Create request from location (such as window.location)
 *
 * @param {Location} loc
 * @param {Object} data
 */
function createRequestFromLocation(loc, data) {
  return {
    path: loc.pathname,
    query: qs.parse(loc.search.slice(1)),
    data: data
  };
}

/**
 * Create controller
 *
 * @param {Object} routes Mapping from URL patterns to React components
 */
function createController(routes, opts) {
  return new Controller(routes, opts);
}

module.exports = createController;
module.exports.createController = createController;
module.exports.createRequestFromURL = createRequestFromURL;
module.exports.createRequestFromLocation = createRequestFromLocation;
module.exports.createRouter = createRouter;
module.exports.createURL = createURL;
module.exports.NotFoundError = NotFoundError;
