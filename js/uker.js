/* Zepto v1.0 - polyfill zepto detect event ajax form fx - zeptojs.com/license */
//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)

//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)

/* Gmu v2.1.0 - core/gmu.js, core/event.js, extend/parseTpl.js, core/widget.js, extend/throttle.js, extend/event.scrollStop.js, extend/matchMedia.js, extend/event.ortchange.js, extend/fix.js, widget/add2desktop/add2desktop.js, extend/highlight.js, widget/button/button.js, widget/button/$input.js, extend/touch.js, widget/calendar/calendar.js, widget/calendar/$picker.js, widget/dialog/dialog.js, extend/offset.js, extend/position.js, widget/dialog/$position.js, widget/popover/popover.js, widget/dropmenu/dropmenu.js, widget/dropmenu/horizontal.js, widget/dropmenu/placement.js, widget/gotop/gotop.js, widget/historylist/historylist.js, widget/navigator/navigator.js, extend/iscroll.js, widget/navigator/$scrollable.js, widget/navigator/evenness.js, widget/navigator/scrolltonext.js, widget/panel/panel.js, widget/popover/arrow.js, widget/popover/collision.js, widget/popover/dismissible.js, widget/popover/placement.js, widget/progressbar/progressbar.js, widget/refresh/refresh.js, widget/slider/slider.js, widget/slider/$autoplay.js, widget/slider/$lazyloadimg.js, widget/slider/$touch.js, widget/slider/arrow.js, widget/slider/dots.js, widget/slider/imgzoom.js, widget/suggestion/suggestion.js, widget/suggestion/$iscroll.js, widget/suggestion/$posadapt.js, widget/suggestion/$quickdelete.js, widget/suggestion/compatdata.js, widget/suggestion/renderlist.js, widget/suggestion/sendrequest.js, widget/tabs/tabs.js, widget/tabs/$ajax.js, widget/tabs/$swipe.js, widget/toolbar/toolbar.js, widget/toolbar/$position.js, widget/refresh/$iOS5.js */
// Copyright (c) 2013, Baidu Inc. All rights reserved.
//
// Licensed under the BSD License
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://gmu.baidu.com/license.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file 声明gmu命名空间
 * @namespace gmu
 * @import zepto.js
*/

/**
 * GMU是基于zepto的轻量级mobile UI组件库，符合jquery ui使用规范，提供webapp、pad端简单易用的UI组件。为了减小代码量，提高性能，组件再插件化，兼容iOS3+ / android2.1+，支持国内主流移动端浏览器，如safari, chrome, UC, qq等。
 * GMU由百度GMU小组开发，基于开源BSD协议，支持商业和非商业用户的免费使用和任意修改，您可以通过[get started](http://gmu.baidu.com/getstarted)快速了解。
 *
 * ###Quick Start###
 * + **官网：**http://gmu.baidu.com/
 * + **API：**http://gmu.baidu.com/doc
 *
 * ###历史版本###
 *
 * ### 2.0.5 ###
 * + **DEMO: ** http://gmu.baidu.com/demo/2.0.5
 * + **API：** http://gmu.baidu.com/doc/2.0.5
 * + **下载：** http://gmu.baidu.com/download/2.0.5
 *
 * @module GMU
 * @title GMU API 文档
 */
var gmu = gmu || {
    version: '@version',
    $: window.Zepto,

    /**
     * 调用此方法，可以减小重复实例化Zepto的开销。所有通过此方法调用的，都将公用一个Zepto实例，
     * 如果想减少Zepto实例创建的开销，就用此方法。
     * @method staticCall
     * @grammar gmu.staticCall( dom, fnName, args... )
     * @param  {DOM} elem Dom对象
     * @param  {String} fn Zepto方法名。
     * @param {*} * zepto中对应的方法参数。
     * @example
     * // 复制dom的className给dom2, 调用的是zepto的方法，但是只会实例化一次Zepto类。
     * var dom = document.getElementById( '#test' );
     *
     * var className = gmu.staticCall( dom, 'attr', 'class' );
     * console.log( className );
     *
     * var dom2 = document.getElementById( '#test2' );
     * gmu.staticCall( dom, 'addClass', className );
     */
    staticCall: (function( $ ) {
        var proto = $.fn,
            slice = [].slice,

            // 公用此zepto实例
            instance = $();

        instance.length = 1;

        return function( item, fn ) {
            instance[ 0 ] = item;
            return proto[ fn ].apply( instance, slice.call( arguments, 2 ) );
        };
    })( Zepto )
};
/**
 * @file Event相关, 给widget提供事件行为。也可以给其他对象提供事件行为。
 * @import core/gmu.js
 * @module GMU
 */
(function( gmu, $ ) {
    var slice = [].slice,
        separator = /\s+/,

        returnFalse = function() {
            return false;
        },

        returnTrue = function() {
            return true;
        };

    function eachEvent( events, callback, iterator ) {

        // 不支持对象，只支持多个event用空格隔开
        (events || '').split( separator ).forEach(function( type ) {
            iterator( type, callback );
        });
    }

    // 生成匹配namespace正则
    function matcherFor( ns ) {
        return new RegExp( '(?:^| )' + ns.replace( ' ', ' .* ?' ) + '(?: |$)' );
    }

    // 分离event name和event namespace
    function parse( name ) {
        var parts = ('' + name).split( '.' );

        return {
            e: parts[ 0 ],
            ns: parts.slice( 1 ).sort().join( ' ' )
        };
    }

    function findHandlers( arr, name, callback, context ) {
        var matcher,
            obj;

        obj = parse( name );
        obj.ns && (matcher = matcherFor( obj.ns ));
        return arr.filter(function( handler ) {
            return handler &&
                    (!obj.e || handler.e === obj.e) &&
                    (!obj.ns || matcher.test( handler.ns )) &&
                    (!callback || handler.cb === callback ||
                    handler.cb._cb === callback) &&
                    (!context || handler.ctx === context);
        });
    }

    /**
     * Event类，结合gmu.event一起使用, 可以使任何对象具有事件行为。包含基本`preventDefault()`, `stopPropagation()`方法。
     * 考虑到此事件没有Dom冒泡概念，所以没有`stopImmediatePropagation()`方法。而`stopProgapation()`的作用就是
     * 让之后的handler都不执行。
     *
     * @class Event
     * @constructor
     * ```javascript
     * var obj = {};
     *
     * $.extend( obj, gmu.event );
     *
     * var etv = gmu.Event( 'beforeshow' );
     * obj.trigger( etv );
     *
     * if ( etv.isDefaultPrevented() ) {
     *     console.log( 'before show has been prevented!' );
     * }
     * ```
     * @grammar new gmu.Event( name[, props]) => instance
     * @param {String} type 事件名字
     * @param {Object} [props] 属性对象，将被复制进event对象。
     */
    function Event( type, props ) {
        if ( !(this instanceof Event) ) {
            return new Event( type, props );
        }

        props && $.extend( this, props );
        this.type = type;

        return this;
    }

    Event.prototype = {

        /**
         * @method isDefaultPrevented
         * @grammar e.isDefaultPrevented() => Boolean
         * @desc 判断此事件是否被阻止
         */
        isDefaultPrevented: returnFalse,

        /**
         * @method isPropagationStopped
         * @grammar e.isPropagationStopped() => Boolean
         * @desc 判断此事件是否被停止蔓延
         */
        isPropagationStopped: returnFalse,

        /**
         * @method preventDefault
         * @grammar e.preventDefault() => undefined
         * @desc 阻止事件默认行为
         */
        preventDefault: function() {
            this.isDefaultPrevented = returnTrue;
        },

        /**
         * @method stopPropagation
         * @grammar e.stopPropagation() => undefined
         * @desc 阻止事件蔓延
         */
        stopPropagation: function() {
            this.isPropagationStopped = returnTrue;
        }
    };

    /**
     * @class event
     * @static
     * @description event对象，包含一套event操作方法。可以将此对象扩张到任意对象，来增加事件行为。
     *
     * ```javascript
     * var myobj = {};
     *
     * $.extend( myobj, gmu.event );
     *
     * myobj.on( 'eventname', function( e, var1, var2, var3 ) {
     *     console.log( 'event handler' );
     *     console.log( var1, var2, var3 );    // =>1 2 3
     * } );
     *
     * myobj.trigger( 'eventname', 1, 2, 3 );
     * ```
     */
    gmu.event = {

        /**
         * 绑定事件。
         * @method on
         * @grammar on( name, fn[, context] ) => self
         * @param  {String}   name     事件名
         * @param  {Function} callback 事件处理器
         * @param  {Object}   context  事件处理器的上下文。
         * @return {self} 返回自身，方便链式
         * @chainable
         */
        on: function( name, callback, context ) {
            var me = this,
                set;

            if ( !callback ) {
                return this;
            }

            set = this._events || (this._events = []);

            eachEvent( name, callback, function( name, callback ) {
                var handler = parse( name );

                handler.cb = callback;
                handler.ctx = context;
                handler.ctx2 = context || me;
                handler.id = set.length;
                set.push( handler );
            } );

            return this;
        },

        /**
         * 绑定事件，且当handler执行完后，自动解除绑定。
         * @method one
         * @grammar one( name, fn[, context] ) => self
         * @param  {String}   name     事件名
         * @param  {Function} callback 事件处理器
         * @param  {Object}   context  事件处理器的上下文。
         * @return {self} 返回自身，方便链式
         * @chainable
         */
        one: function( name, callback, context ) {
            var me = this;

            if ( !callback ) {
                return this;
            }

            eachEvent( name, callback, function( name, callback ) {
                var once = function() {
                        me.off( name, once );
                        return callback.apply( context || me, arguments );
                    };

                once._cb = callback;
                me.on( name, once, context );
            } );

            return this;
        },

        /**
         * 解除事件绑定
         * @method off
         * @grammar off( name[, fn[, context] ] ) => self
         * @param  {String}   name     事件名
         * @param  {Function} callback 事件处理器
         * @param  {Object}   context  事件处理器的上下文。
         * @return {self} 返回自身，方便链式
         * @chainable
         */
        off: function( name, callback, context ) {
            var events = this._events;

            if ( !events ) {
                return this;
            }

            if ( !name && !callback && !context ) {
                this._events = [];
                return this;
            }

            eachEvent( name, callback, function( name, callback ) {
                findHandlers( events, name, callback, context )
                        .forEach(function( handler ) {
                            delete events[ handler.id ];
                        });
            } );

            return this;
        },

        /**
         * 触发事件
         * @method trigger
         * @grammar trigger( name[, ...] ) => self
         * @param  {String | Event }   evt     事件名或gmu.Event对象实例
         * @param  {*} * 任意参数
         * @return {self} 返回自身，方便链式
         * @chainable
         */
        trigger: function( evt ) {
            var i = -1,
                args,
                events,
                stoped,
                len,
                ev;

            if ( !this._events || !evt ) {
                return this;
            }

            typeof evt === 'string' && (evt = new Event( evt ));

            args = slice.call( arguments, 1 );
            evt.args = args;    // handler中可以直接通过e.args获取trigger数据
            args.unshift( evt );

            events = findHandlers( this._events, evt.type );

            if ( events ) {
                len = events.length;

                while ( ++i < len ) {
                    if ( (stoped = evt.isPropagationStopped()) ||  false ===
                            (ev = events[ i ]).cb.apply( ev.ctx2, args )
                            ) {

                        // 如果return false则相当于stopPropagation()和preventDefault();
                        stoped || (evt.stopPropagation(), evt.preventDefault());
                        break;
                    }
                }
            }

            return this;
        }
    };

    // expose
    gmu.Event = Event;
})( gmu, gmu.$ );
/**
 * @file 模板解析
 * @import zepto.js
 * @module GMU
 */
(function( $, undefined ) {
    
    /**
     * 解析模版tpl。当data未传入时返回编译结果函数；当某个template需要多次解析时，建议保存编译结果函数，然后调用此函数来得到结果。
     * 
     * @method $.parseTpl
     * @grammar $.parseTpl(str, data)  ⇒ string
     * @grammar $.parseTpl(str)  ⇒ Function
     * @param {String} str 模板
     * @param {Object} data 数据
     * @example var str = "<p><%=name%></p>",
     * obj = {name: 'ajean'};
     * console.log($.parseTpl(str, data)); // => <p>ajean</p>
     */
    $.parseTpl = function( str, data ) {
        var tmpl = 'var __p=[];' + 'with(obj||{}){__p.push(\'' +
                str.replace( /\\/g, '\\\\' )
                .replace( /'/g, '\\\'' )
                .replace( /<%=([\s\S]+?)%>/g, function( match, code ) {
                    return '\',' + code.replace( /\\'/, '\'' ) + ',\'';
                } )
                .replace( /<%([\s\S]+?)%>/g, function( match, code ) {
                    return '\');' + code.replace( /\\'/, '\'' )
                            .replace( /[\r\n\t]/g, ' ' ) + '__p.push(\'';
                } )
                .replace( /\r/g, '\\r' )
                .replace( /\n/g, '\\n' )
                .replace( /\t/g, '\\t' ) +
                '\');}return __p.join("");',

            /* jsbint evil:true */
            func = new Function( 'obj', tmpl );
        
        return data ? func( data ) : func;
    };
})( Zepto );
/**
 * @file gmu底层，定义了创建gmu组件的方法
 * @import core/gmu.js, core/event.js, extend/parseTpl.js
 * @module GMU
 */

(function( gmu, $, undefined ) {
    var slice = [].slice,
        toString = Object.prototype.toString,
        blankFn = function() {},

        // 挂到组件类上的属性、方法
        staticlist = [ 'options', 'template', 'tpl2html' ],

        // 存储和读取数据到指定对象，任何对象包括dom对象
        // 注意：数据不直接存储在object上，而是存在内部闭包中，通过_gid关联
        // record( object, key ) 获取object对应的key值
        // record( object, key, value ) 设置object对应的key值
        // record( object, key, null ) 删除数据
        record = (function() {
            var data = {},
                id = 0,
                ikey = '_gid';    // internal key.

            return function( obj, key, val ) {
                var dkey = obj[ ikey ] || (obj[ ikey ] = ++id),
                    store = data[ dkey ] || (data[ dkey ] = {});

                val !== undefined && (store[ key ] = val);
                val === null && delete store[ key ];

                return store[ key ];
            };
        })(),

        event = gmu.event;

    function isPlainObject( obj ) {
        return toString.call( obj ) === '[object Object]';
    }

    // 遍历对象
    function eachObject( obj, iterator ) {
        obj && Object.keys( obj ).forEach(function( key ) {
            iterator( key, obj[ key ] );
        });
    }

    // 从某个元素上读取某个属性。
    function parseData( data ) {
        try {    // JSON.parse可能报错

            // 当data===null表示，没有此属性
            data = data === 'true' ? true :
                    data === 'false' ? false : data === 'null' ? null :

                    // 如果是数字类型，则将字符串类型转成数字类型
                    +data + '' === data ? +data :
                    /(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test( data ) ?
                    JSON.parse( data ) : data;
        } catch ( ex ) {
            data = undefined;
        }

        return data;
    }

    // 从DOM节点上获取配置项
    function getDomOptions( el ) {
        var ret = {},
            attrs = el && el.attributes,
            len = attrs && attrs.length,
            key,
            data;

        while ( len-- ) {
            data = attrs[ len ];
            key = data.name;

            if ( key.substring(0, 5) !== 'data-' ) {
                continue;
            }

            key = key.substring( 5 );
            data = parseData( data.value );

            data === undefined || (ret[ key ] = data);
        }

        return ret;
    }

    // 在$.fn上挂对应的组件方法呢
    // $('#btn').button( options );实例化组件
    // $('#btn').button( 'select' ); 调用实例方法
    // $('#btn').button( 'this' ); 取组件实例
    // 此方法遵循get first set all原则
    function zeptolize( name ) {
        var key = name.substring( 0, 1 ).toLowerCase() + name.substring( 1 ),
            old = $.fn[ key ];

        $.fn[ key ] = function( opts ) {
            var args = slice.call( arguments, 1 ),
                method = typeof opts === 'string' && opts,
                ret,
                obj;

            $.each( this, function( i, el ) {

                // 从缓存中取，没有则创建一个
                obj = record( el, name ) || new gmu[ name ]( el,
                        isPlainObject( opts ) ? opts : undefined );

                // 取实例
                if ( method === 'this' ) {
                    ret = obj;
                    return false;    // 断开each循环
                } else if ( method ) {

                    // 当取的方法不存在时，抛出错误信息
                    if ( !$.isFunction( obj[ method ] ) ) {
                        throw new Error( '组件没有此方法：' + method );
                    }

                    ret = obj[ method ].apply( obj, args );

                    // 断定它是getter性质的方法，所以需要断开each循环，把结果返回
                    if ( ret !== undefined && ret !== obj ) {
                        return false;
                    }

                    // ret为obj时为无效值，为了不影响后面的返回
                    ret = undefined;
                }
            } );

            return ret !== undefined ? ret : this;
        };

        /*
         * NO CONFLICT
         * var gmuPanel = $.fn.panel.noConflict();
         * gmuPanel.call(test, 'fnname');
         */
        $.fn[ key ].noConflict = function() {
            $.fn[ key ] = old;
            return this;
        };
    }

    // 加载注册的option
    function loadOption( klass, opts ) {
        var me = this;

        // 先加载父级的
        if ( klass.superClass ) {
            loadOption.call( me, klass.superClass, opts );
        }

        eachObject( record( klass, 'options' ), function( key, option ) {
            option.forEach(function( item ) {
                var condition = item[ 0 ],
                    fn = item[ 1 ];

                if ( condition === '*' ||
                        ($.isFunction( condition ) &&
                        condition.call( me, opts[ key ] )) ||
                        condition === opts[ key ] ) {

                    fn.call( me );
                }
            });
        } );
    }

    // 加载注册的插件
    function loadPlugins( klass, opts ) {
        var me = this;

        // 先加载父级的
        if ( klass.superClass ) {
            loadPlugins.call( me, klass.superClass, opts );
        }

        eachObject( record( klass, 'plugins' ), function( opt, plugin ) {

            // 如果配置项关闭了，则不启用此插件
            if ( opts[ opt ] === false ) {
                return;
            }

            eachObject( plugin, function( key, val ) {
                var oringFn;

                if ( $.isFunction( val ) && (oringFn = me[ key ]) ) {
                    me[ key ] = function() {
                        var origin = me.origin,
                            ret;

                        me.origin = oringFn;
                        ret = val.apply( me, arguments );
                        origin === undefined ? delete me.origin :
                                (me.origin = origin);

                        return ret;
                    };
                } else {
                    me[ key ] = val;
                }
            } );

            plugin._init.call( me );
        } );
    }

    // 合并对象
    function mergeObj() {
        var args = slice.call( arguments ),
            i = args.length,
            last;

        while ( i-- ) {
            last = last || args[ i ];
            isPlainObject( args[ i ] ) || args.splice( i, 1 );
        }

        return args.length ?
                $.extend.apply( null, [ true, {} ].concat( args ) ) : last; // 深拷贝，options中某项为object时，用例中不能用==判断
    }

    // 初始化widget. 隐藏具体细节，因为如果放在构造器中的话，是可以看到方法体内容的
    // 同时此方法可以公用。
    function bootstrap( name, klass, uid, el, options ) {
        var me = this,
            opts;

        if ( isPlainObject( el ) ) {
            options = el;
            el = undefined;
        }

        // options中存在el时，覆盖el
        options && options.el && (el = $( options.el ));
        el && (me.$el = $( el ), el = me.$el[ 0 ]);

        opts = me._options = mergeObj( klass.options,
                getDomOptions( el ), options );

        me.template = mergeObj( klass.template, opts.template );

        me.tpl2html = mergeObj( klass.tpl2html, opts.tpl2html );

        // 生成eventNs widgetName
        me.widgetName = name.toLowerCase();
        me.eventNs = '.' + me.widgetName + uid;

        me._init( opts );

        // 设置setup参数，只有传入的$el在DOM中，才认为是setup模式
        me._options.setup = (me.$el && me.$el.parent()[ 0 ]) ? true: false;

        loadOption.call( me, klass, opts );
        loadPlugins.call( me, klass, opts );

        // 进行创建DOM等操作
        me._create();
        me.trigger( 'ready' );

        el && record( el, name, me ) && me.on( 'destroy', function() {
            record( el, name, null );
        } );

        return me;
    }

    /**
     * @desc 创建一个类，构造函数默认为init方法, superClass默认为Base
     * @name createClass
     * @grammar createClass(object[, superClass]) => fn
     */
    function createClass( name, object, superClass ) {
        if ( typeof superClass !== 'function' ) {
            superClass = gmu.Base;
        }

        var uuid = 1,
            suid = 1;

        function klass( el, options ) {
            if ( name === 'Base' ) {
                throw new Error( 'Base类不能直接实例化' );
            }

            if ( !(this instanceof klass) ) {
                return new klass( el, options );
            }

            return bootstrap.call( this, name, klass, uuid++, el, options );
        }

        $.extend( klass, {

            /**
             * @name register
             * @grammar klass.register({})
             * @desc 注册插件
             */
            register: function( name, obj ) {
                var plugins = record( klass, 'plugins' ) ||
                        record( klass, 'plugins', {} );

                obj._init = obj._init || blankFn;

                plugins[ name ] = obj;
                return klass;
            },

            /**
             * @name option
             * @grammar klass.option(option, value, method)
             * @desc 扩充组件的配置项
             */
            option: function( option, value, method ) {
                var options = record( klass, 'options' ) ||
                        record( klass, 'options', {} );

                options[ option ] || (options[ option ] = []);
                options[ option ].push([ value, method ]);

                return klass;
            },

            /**
             * @name inherits
             * @grammar klass.inherits({})
             * @desc 从该类继承出一个子类，不会被挂到gmu命名空间
             */
            inherits: function( obj ) {

                // 生成 Sub class
                return createClass( name + 'Sub' + suid++, obj, klass );
            },

            /**
             * @name extend
             * @grammar klass.extend({})
             * @desc 扩充现有组件
             */
            extend: function( obj ) {
                var proto = klass.prototype,
                    superProto = superClass.prototype;

                staticlist.forEach(function( item ) {
                    obj[ item ] = mergeObj( superClass[ item ], obj[ item ] );
                    obj[ item ] && (klass[ item ] = obj[ item ]);
                    delete obj[ item ];
                });

                // todo 跟plugin的origin逻辑，公用一下
                eachObject( obj, function( key, val ) {
                    if ( typeof val === 'function' && superProto[ key ] ) {
                        proto[ key ] = function() {
                            var $super = this.$super,
                                ret;

                            // todo 直接让this.$super = superProto[ key ];
                            this.$super = function() {
                                var args = slice.call( arguments, 1 );
                                return superProto[ key ].apply( this, args );
                            };

                            ret = val.apply( this, arguments );

                            $super === undefined ? (delete this.$super) :
                                    (this.$super = $super);
                            return ret;
                        };
                    } else {
                        proto[ key ] = val;
                    }
                } );
            }
        } );

        klass.superClass = superClass;
        klass.prototype = Object.create( superClass.prototype );


        /*// 可以在方法中通过this.$super(name)方法调用父级方法。如：this.$super('enable');
        object.$super = function( name ) {
            var fn = superClass.prototype[ name ];
            return $.isFunction( fn ) && fn.apply( this,
                    slice.call( arguments, 1 ) );
        };*/

        klass.extend( object );

        return klass;
    }

    /**
     * @method define
     * @grammar gmu.define( name, object[, superClass] )
     * @class
     * @param {String} name 组件名字标识符。
     * @param {Object} object
     * @desc 定义一个gmu组件
     * @example
     * ####组件定义
     * ```javascript
     * gmu.define( 'Button', {
     *     _create: function() {
     *         var $el = this.getEl();
     *
     *         $el.addClass( 'ui-btn' );
     *     },
     *
     *     show: function() {
     *         console.log( 'show' );
     *     }
     * } );
     * ```
     *
     * ####组件使用
     * html部分
     * ```html
     * <a id='btn'>按钮</a>
     * ```
     *
     * javascript部分
     * ```javascript
     * var btn = $('#btn').button();
     *
     * btn.show();    // => show
     * ```
     *
     */
    gmu.define = function( name, object, superClass ) {
        gmu[ name ] = createClass( name, object, superClass );
        zeptolize( name );
    };

    /**
     * @desc 判断object是不是 widget实例, klass不传时，默认为Base基类
     * @method isWidget
     * @grammar gmu.isWidget( anything[, klass] ) => Boolean
     * @param {*} anything 需要判断的对象
     * @param {String|Class} klass 字符串或者类。
     * @example
     * var a = new gmu.Button();
     *
     * console.log( gmu.isWidget( a ) );    // => true
     * console.log( gmu.isWidget( a, 'Dropmenu' ) );    // => false
     */
    gmu.isWidget = function( obj, klass ) {

        // 处理字符串的case
        klass = typeof klass === 'string' ? gmu[ klass ] || blankFn : klass;
        klass = klass || gmu.Base;
        return obj instanceof klass;
    };

    /**
     * @class Base
     * @description widget基类。不能直接使用。
     */
    gmu.Base = createClass( 'Base', {

        /**
         * @method _init
         * @grammar instance._init() => instance
         * @desc 组件的初始化方法，子类需要重写该方法
         */
        _init: blankFn,

        /**
         * @override
         * @method _create
         * @grammar instance._create() => instance
         * @desc 组件创建DOM的方法，子类需要重写该方法
         */
        _create: blankFn,


        /**
         * @method getEl
         * @grammar instance.getEl() => $el
         * @desc 返回组件的$el
         */
        getEl: function() {
            return this.$el;
        },

        /**
         * @method on
         * @grammar instance.on(name, callback, context) => self
         * @desc 订阅事件
         */
        on: event.on,

        /**
         * @method one
         * @grammar instance.one(name, callback, context) => self
         * @desc 订阅事件（只执行一次）
         */
        one: event.one,

        /**
         * @method off
         * @grammar instance.off(name, callback, context) => self
         * @desc 解除订阅事件
         */
        off: event.off,

        /**
         * @method trigger
         * @grammar instance.trigger( name ) => self
         * @desc 派发事件, 此trigger会优先把options上的事件回调函数先执行
         * options上回调函数可以通过调用event.stopPropagation()来阻止事件系统继续派发,
         * 或者调用event.preventDefault()阻止后续事件执行
         */
        trigger: function( name ) {
            var evt = typeof name === 'string' ? new gmu.Event( name ) : name,
                args = [ evt ].concat( slice.call( arguments, 1 ) ),
                opEvent = this._options[ evt.type ],

                // 先存起来，否则在下面使用的时候，可能已经被destory给删除了。
                $el = this.getEl();

            if ( opEvent && $.isFunction( opEvent ) ) {

                // 如果返回值是false,相当于执行stopPropagation()和preventDefault();
                false === opEvent.apply( this, args ) &&
                        (evt.stopPropagation(), evt.preventDefault());
            }

            event.trigger.apply( this, args );

            // triggerHandler不冒泡
            $el && $el.triggerHandler( evt, (args.shift(), args) );

            return this;
        },

        /**
         * @method tpl2html
         * @grammar instance.tpl2html() => String
         * @grammar instance.tpl2html( data ) => String
         * @grammar instance.tpl2html( subpart, data ) => String
         * @desc 将template输出成html字符串，当传入 data 时，html将通过$.parseTpl渲染。
         * template支持指定subpart, 当无subpart时，template本身将为模板，当有subpart时，
         * template[subpart]将作为模板输出。
         */
        tpl2html: function( subpart, data ) {
            var tpl = this.template;

            tpl =  typeof subpart === 'string' ? tpl[ subpart ] :
                    ((data = subpart), tpl);

            return data || ~tpl.indexOf( '<%' ) ? $.parseTpl( tpl, data ) : tpl;
        },

        /**
         * @method destroy
         * @grammar instance.destroy()
         * @desc 注销组件
         */
        destroy: function() {

            // 解绑element上的事件
            this.$el && this.$el.off( this.eventNs );

            this.trigger( 'destroy' );
            // 解绑所有自定义事件
            this.off();


            this.destroyed = true;
        }

    }, Object );

    // 向下兼容
    $.ui = gmu;
})( gmu, gmu.$ );
/**
 * @file 减少对方法、事件的执行频率，多次调用，在指定的时间内只会执行一次
 * @import zepto.js
 * @module GMU
 */

(function ($) {
    /**
     * 减少执行频率, 多次调用，在指定的时间内，只会执行一次。
     * ```
     * ||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
     * X    X    X    X    X    X      X    X    X    X    X    X
     * ```
     * 
     * @method $.throttle
     * @grammar $.throttle(delay, fn) ⇒ function
     * @param {Number} [delay=250] 延时时间
     * @param {Function} fn 被稀释的方法
     * @param {Boolean} [debounce_mode=false] 是否开启防震动模式, true:start, false:end
     * @example var touchmoveHander = function(){
     *     //....
     * }
     * //绑定事件
     * $(document).bind('touchmove', $.throttle(250, touchmoveHander));//频繁滚动，每250ms，执行一次touchmoveHandler
     *
     * //解绑事件
     * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.throttle返回的function, 当然unbind那个也是一样的效果
     *
     */
    $.extend($, {
        throttle: function(delay, fn, debounce_mode) {
            var last = 0,
                timeId;

            if (typeof fn !== 'function') {
                debounce_mode = fn;
                fn = delay;
                delay = 250;
            }

            function wrapper() {
                var that = this,
                    period = Date.now() - last,
                    args = arguments;

                function exec() {
                    last = Date.now();
                    fn.apply(that, args);
                };

                function clear() {
                    timeId = undefined;
                };

                if (debounce_mode && !timeId) {
                    // debounce模式 && 第一次调用
                    exec();
                }

                timeId && clearTimeout(timeId);
                if (debounce_mode === undefined && period > delay) {
                    // throttle, 执行到了delay时间
                    exec();
                } else {
                    // debounce, 如果是start就clearTimeout
                    timeId = setTimeout(debounce_mode ? clear : exec, debounce_mode === undefined ? delay - period : delay);
                }
            };
            // for event bind | unbind
            wrapper._zid = fn._zid = fn._zid || $.proxy(fn)._zid;
            return wrapper;
        },

        /**
         * @desc 减少执行频率, 在指定的时间内, 多次调用，只会执行一次。
         * **options:**
         * - ***delay***: 延时时间
         * - ***fn***: 被稀释的方法
         * - ***t***: 指定是在开始处执行，还是结束是执行, true:start, false:end
         *
         * 非at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         *                         X                                X</code>
         * at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         * X                                X                        </code>
         *
         * @grammar $.debounce(delay, fn[, at_begin]) ⇒ function
         * @name $.debounce
         * @example var touchmoveHander = function(){
         *     //....
         * }
         * //绑定事件
         * $(document).bind('touchmove', $.debounce(250, touchmoveHander));//频繁滚动，只要间隔时间不大于250ms, 在一系列移动后，只会执行一次
         *
         * //解绑事件
         * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.debounce返回的function, 当然unbind那个也是一样的效果
         */
        debounce: function(delay, fn, t) {
            return fn === undefined ? $.throttle(250, delay, false) : $.throttle(delay, fn, t === undefined ? false : t !== false);
        }
    });
})(Zepto);
/**
 * @file 滚动停止事件
 * @name scrollStop
 * @short scrollStop
 * @desc 滚动停止事件
 * @import zepto.js, extend/throttle.js
 */
(function ($, win) {
    /**
     * @name scrollStop
     * @desc 扩展的事件，滚动停止事件
     * - ***scrollStop*** : 在document上派生的scrollStop事件上，scroll停下来时触发, 考虑前进或者后退后scroll事件不触发情况。
     * @example $(document).on('scrollStop', function () {        //scroll停下来时显示scrollStop
     *     console.log('scrollStop');
     * });
     */

    function registerScrollStop() {
        $(win).on('scroll', $.debounce(80, function () {
            $(win).trigger('scrollStop');
        }, false));
    }

    function backEventOffHandler() {
        //在离开页面，前进或后退回到页面后，重新绑定scroll, 需要off掉所有的scroll，否则scroll时间不触发
        $(win).off('scroll');
        registerScrollStop();
    }
    registerScrollStop();

    //todo 待统一解决后退事件触发问题
    $(win).on('pageshow', function (e) {
        //如果是从bfcache中加载页面，为了防止多次注册，需要先off掉
        e.persisted && $(win).off('touchstart', backEventOffHandler).one('touchstart', backEventOffHandler);
    });

})(Zepto, window);
/**
 * @file 媒体查询
 * @import zepto.js
 * @module GMU
 */

(function ($) {

    /**
     * 是原生的window.matchMedia方法的polyfill，对于不支持matchMedia的方法系统和浏览器，按照[w3c window.matchMedia](http://www.w3.org/TR/cssom-view/#dom-window-matchmedia)的接口
     * 定义，对matchMedia方法进行了封装。原理是用css media query及transitionEnd事件来完成的。在页面中插入media query样式及元素，当query条件满足时改变该元素样式，同时这个样式是transition作用的属性，
     * 满足条件后即会触发transitionEnd，由此创建MediaQueryList的事件监听。由于transition的duration time为0.001ms，故若直接使用MediaQueryList对象的matches去判断当前是否与query匹配，会有部分延迟，
     * 建议注册addListener的方式去监听query的改变。$.matchMedia的详细实现原理及采用该方法实现的转屏统一解决方案详见
     * [GMU Pages: 转屏解决方案($.matchMedia)](https://github.com/gmuteam/GMU/wiki/%E8%BD%AC%E5%B1%8F%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88$.matchMedia)
     *
     * 返回值MediaQueryList对象包含的属性<br />
     * - ***matches*** 是否满足query<br />
     * - ***query*** 查询的css query，类似\'screen and (orientation: portrait)\'<br />
     * - ***addListener*** 添加MediaQueryList对象监听器，接收回调函数，回调参数为MediaQueryList对象<br />
     * - ***removeListener*** 移除MediaQueryList对象监听器<br />
     *
     *
     * @method $.matchMedia
     * @grammar $.matchMedia(query)  ⇒ MediaQueryList
     * @param {String} query 查询的css query，类似\'screen and (orientation: portrait)\'
     * @return {Object} MediaQueryList
     * @example
     * $.matchMedia('screen and (orientation: portrait)').addListener(fn);
     */
    $.matchMedia = (function() {
        var mediaId = 0,
            cls = 'gmu-media-detect',
            transitionEnd = $.fx.transitionEnd,
            cssPrefix = $.fx.cssPrefix,
            $style = $('<style></style>').append('.' + cls + '{' + cssPrefix + 'transition: width 0.001ms; width: 0; position: absolute; clip: rect(1px, 1px, 1px, 1px);}\n').appendTo('head');

        return function (query) {
            var id = cls + mediaId++,
                $mediaElem,
                listeners = [],
                ret;

            $style.append('@media ' + query + ' { #' + id + ' { width: 1px; } }\n') ;   //原生matchMedia也需要添加对应的@media才能生效

            // 统一用模拟的，时机更好。
            // if ('matchMedia' in window) {
            //     return window.matchMedia(query);
            // }

            $mediaElem = $('<div class="' + cls + '" id="' + id + '"></div>')
                .appendTo('body')
                .on(transitionEnd, function() {
                    ret.matches = $mediaElem.width() === 1;
                    $.each(listeners, function (i,fn) {
                        $.isFunction(fn) && fn.call(ret, ret);
                    });
                });

            ret = {
                matches: $mediaElem.width() === 1 ,
                media: query,
                addListener: function (callback) {
                    listeners.push(callback);
                    return this;
                },
                removeListener: function (callback) {
                    var index = listeners.indexOf(callback);
                    ~index && listeners.splice(index, 1);
                    return this;
                }
            };

            return ret;
        };
    }());
})(Zepto);

/**
 * @file 扩展转屏事件
 * @name ortchange
 * @short ortchange
 * @desc 扩展转屏事件orientation，解决原生转屏事件的兼容性问题
 * @import zepto.js, extend/matchMedia.js
 */

$(function () {
    /**
     * @name ortchange
     * @desc 扩展转屏事件orientation，解决原生转屏事件的兼容性问题
     * - ***ortchange*** : 当转屏的时候触发，兼容uc和其他不支持orientationchange的设备，利用css media query实现，解决了转屏延时及orientation事件的兼容性问题
     * $(window).on('ortchange', function () {        //当转屏的时候触发
     *     console.log('ortchange');
     * });
     */
    //扩展常用media query
    $.mediaQuery = {
        ortchange: 'screen and (width: ' + window.innerWidth + 'px)'
    };
    //通过matchMedia派生转屏事件
    $.matchMedia($.mediaQuery.ortchange).addListener(function () {
        $(window).trigger('ortchange');
    });
});
/**
 * @file 实现了通用fix方法。
 * @name Fix
 * @import zepto.js, extend/event.scrollStop.js, extend/event.ortchange.js
 */

/**
 * @name fix
 * @grammar fix(options) => self
 * @desc 固顶fix方法，对不支持position:fixed的设备上将元素position设为absolute，
 * 在每次scrollstop时根据opts参数设置当前显示的位置，类似fix效果。
 *
 * Options:
 * - ''top'' {Number}: 距离顶部的px值
 * - ''left'' {Number}: 距离左侧的px值
 * - ''bottom'' {Number}: 距离底部的px值
 * - ''right'' {Number}: 距离右侧的px值
 * @example
 * var div = $('div');
 * div.fix({top:0, left:0}); //将div固顶在左上角
 * div.fix({top:0, right:0}); //将div固顶在右上角
 * div.fix({bottom:0, left:0}); //将div固顶在左下角
 * div.fix({bottom:0, right:0}); //将div固顶在右下角
 *
 */

(function ($, undefined) {
    $.extend($.fn, {
        fix: function(opts) {
            var me = this;                      //如果一个集合中的第一元素已fix，则认为这个集合的所有元素已fix，
            if(me.attr('isFixed')) return me;   //这样在操作时就可以针对集合进行操作，不必单独绑事件去操作
            me.css(opts).css('position', 'fixed').attr('isFixed', true);
            var buff = $('<div style="position:fixed;top:10px;"></div>').appendTo('body'),
                top = buff[0].getBoundingClientRect().top,
                checkFixed = function() {
                    if(window.pageYOffset > 0) {
                        if(buff[0].getBoundingClientRect().top !== top) {
                            me.css('position', 'absolute');
                            doFixed();
                            $(window).on('scrollStop', doFixed);
                            $(window).on('ortchange', doFixed);
                        }
                        $(window).off('scrollStop', checkFixed);
                        buff.remove();
                    }
                },
                doFixed = function() {
                    me.css({
                        top: window.pageYOffset + (opts.bottom !== undefined ? window.innerHeight - me.height() - opts.bottom : (opts.top ||0)),
                        left: opts.right !== undefined ? document.body.offsetWidth - me.width() - opts.right : (opts.left || 0)
                    });
                    opts.width == '100%' && me.css('width', document.body.offsetWidth);
                };

            $(window).on('scrollStop', checkFixed);

            return me;
        }
    });
}(Zepto));
/**
 * @file 在iOS中将页面添加为桌面图标(不支持Android系统)
 * @import core/widget.js, extend/fix.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    /**
     * 在iOS中将页面添加为桌面图标(不支持Android系统)
     * @class Add2desktop
     * @constructor Html部分
     *
     * javascript部分
     * ```javascript
     * gmu.Add2desktop({icon:'../../../examples/assets/icon.png'});
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化工具栏的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Toolbar:options)
     * @grammar  gmu.Add2desktop([el [,options]]) =>instance
     * @grammar  $(el).add2desktop(options) => zepto
     */
    gmu.define('Add2desktop', {
        options: {
            /**
             * @property {String} icon 产品线ICON的URL
             * @namespace options
             */
            icon: '',
            /**
             * @property {selector} [container=document.body] 组件容器
             * @namespace options
             */
            container:  '',
            /**
             * @property {String} [key='_gmu_adddesktop_key'] LocalStorage的key值
             * @namespace options
             */
            key:'_gmu_adddesktop_key',
            /**
             * @property {Boolean} [useFix=true] 是否使用fix固顶效果
             * @namespace options
             */
            useFix: true,
            /**
             * @property {Object} [position={bottom:12,left:50%}] 固顶时使用的位置参数
             * @namespace options
             */
            position: {
                bottom: 12,
                left: '50%'
            },
            /**
             * @property {Function} [beforeshow=fn}] 显示前触发的事件，调用e.preventDefault()可以阻止显示
             * @namespace options
             */
            beforeshow : function(e){
                this.key() && e.preventDefault()
            },
            /**
             * @property {Function} [afterhide=fn}] 隐藏后触发的事件，可以在这里写LocalStorage的值
             * @namespace options
             */
            afterhide : function(){
                this.key(1)
            },
            _isShow:false
        },

        _init: function() {
            var me = this;

            me.on( 'ready', function(){
                me.$el.find('.ui-add2desktop-close').on('click',function () {
                    me.hide();
                });
                me._options['useFix'] && me.$el.fix(me._options['position']);

                me.show();
            } );

            me.on( 'destroy', function(){
                me.$el.remove();
            } );
        },

        _create: function() {
            var me = this,
                $el,
                version = ($.os.version && $.os.version.substr(0, 3) > 4.1 ? 'new' :'old');

            if($.os.version && $.os.version.substr(0, 3) >= 7.0) {
                version = 'iOS7';
            }

            if( me._options.setup ) {
                var src = me.$el.children('img').attr('src');
                src && (me._options['icon'] = src);
            }
            $el = me.$el || (me.$el = $('<div></div>'));
            $el.addClass('ui-add2desktop').appendTo(me._options['container'] || (me.$el.parent().length ? '' : document.body)),

            $el.html('<img src="' + me._options['icon'] + '"/><p>先点击<span class="ui-add2desktop-icon-' + version +'"></span>，<br />再"添加到主屏幕"</p><span class="ui-add2desktop-close"><b></b></span><div class="ui-add2desktop-arrow"><b></b></div>');
        },

        /**
         * 存储/获取LocalStorage的键值
         * @method key
         * @param {String} [value] LocalStorage的键值，不传表示取值
         * @return {self} LocalStorage的值
         */
        key : function(value){
            var ls = window.localStorage;
            return value !== undefined ? ls.setItem(this._options['key'], value) : ls.getItem(this._options['key']);
        },

        /**
         * 显示add2desktop
         * @method show
         * @return {self} 返回本身。
         */

        /**
         * @event beforeshow
         * @param {Event} e gmu.Event对象
         * @description add2desktop显示前触发
         */
        show: function() {
            var me = this;

            if( !me._options['_isShow'] ) {
                if(!$.os.ios || $.browser.uc || $.browser.qq || $.browser.chrome) return me; //todo 添加iOS原生浏览器的判断
                var event = new gmu.Event('beforeshow');
                me.trigger(event);
                if(event.isDefaultPrevented()) return me;
                me.$el.css('display', 'block');
                me._options['_isShow'] = true;
            }

            return me;
        },

        /**
         * 隐藏add2desktop
         * @method hide
         * @return {self} 返回本身。
         */

        /**
         * @event afterhide
         * @param {Event} e gmu.Event对象
         * @description add2desktop显示后触发
         */
        hide: function() {
            var me = this;

            if(me._options['_isShow']) {
                me.$el.css('display', 'none');
                me._options['_isShow'] = false;
                me.trigger('afterhide');
            }

            return me;
        }
        
        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });

})( gmu, gmu.$ );

/**
 *  @file 实现了通用highlight方法。
 *  @name Highlight
 *  @desc 点击高亮效果
 *  @import zepto.js
 */
(function( $ ) {
    var $doc = $( document ),
        $el,    // 当前按下的元素
        timer;    // 考虑到滚动操作时不能高亮，所以用到了100ms延时

    // 负责移除className.
    function dismiss() {
        var cls = $el.attr( 'hl-cls' );

        clearTimeout( timer );
        $el.removeClass( cls ).removeAttr( 'hl-cls' );
        $el = null;
        $doc.off( 'touchend touchmove touchcancel', dismiss );
    }

    /**
     * @name highlight
     * @desc 禁用掉系统的高亮，当手指移动到元素上时添加指定class，手指移开时，移除该class.
     * 当不传入className是，此操作将解除事件绑定。
     * 
     * 此方法支持传入selector, 此方式将用到事件代理，允许dom后加载。
     * @grammar  highlight(className, selector )   ⇒ self
     * @grammar  highlight(className )   ⇒ self
     * @grammar  highlight()   ⇒ self
     * @example var div = $('div');
     * div.highlight('div-hover');
     *
     * $('a').highlight();// 把所有a的自带的高亮效果去掉。
     */
    $.fn.highlight = function( className, selector ) {
        return this.each(function() {
            var $this = $( this );

            $this.css( '-webkit-tap-highlight-color', 'rgba(255,255,255,0)' )
                    .off( 'touchstart.hl' );

            className && $this.on( 'touchstart.hl', function( e ) {
                var match;

                $el = selector ? (match = $( e.target ).closest( selector,
                        this )) && match.length && match : $this;

                // selctor可能找不到元素。
                if ( $el ) {
                    $el.attr( 'hl-cls', className );
                    timer = setTimeout( function() {
                        $el.addClass( className );
                    }, 100 );
                    $doc.on( 'touchend touchmove touchcancel', dismiss );
                }
            } );
        });
    };
})( Zepto );

/**
 * @file Button组件。
 * @module GMU
 * @import core/widget.js, extend/highlight.js
 * @importCss icons.css
 */
(function( gmu, $, undefined ) {

    /**
     * Button组件。支持icon, icon位置设置。
     *
     * [![Live Demo](qrcode:http://gmu.baidu.com/demo/widget/button/button.html)](http://gmu.baidu.com/demo/widget/button/button.html "Live Demo")
     *
     * @class Button
     * @constructor
     * html部分, 可以是以下任意dom实例化button
     * ```html
     * <a class="btn">按钮</a>
     * <span class="btn">按钮</span>
     * <button class="btn">按钮</button>
     * <input class="btn" type="button" value="按钮" />
     * <input class="btn" type="reset" value="按钮" />
     * <input class="btn" type="button" value="按钮" />
     * ```
     *
     * Javascript部分
     * ```javascript
     * $( '.btn' ).button();
     * ```
     *
     * 如果希望支持checkbox radio按钮，请查看[input插件](#GMU:Button.input)。
     * @grammar new gmu.Button( el[, options]) => instance
     * @grammar $( el ).button([ options ]) => zepto
     */
    gmu.define( 'Button', {
        options: {

            /**
             * @property {String} [label] 按钮文字。
             * @namespace options
             */

            /**
             * @property {String} [icon] 图标名称。系统提供以下图标。home, delete, plus, arrow-u, arrow-d, check, gear, grid, star, arrow-r, arrow-l, minus, refresh, forward, back, alert, info, search,
             * @namespace options
             */

            /**
             * @property {String} [iconpos] 图片位置。支持：left, right, top, bottom, notext.
             * @namespace options
             */
            iconpos: 'left'

            /**
             * @property {String} [state]
             * @description 设置初始状态。如果状态值为`disbaled`，按钮将不可点击。
             * @namespace options
             */

            /**
             * @property {String} [{$state}Text]
             * @description 设置对应状态文字，当button进入此状态时，按钮将显示对应的文字。
             * @namespace options
             */
        },

        template: {
            icon: '<span class="ui-icon ui-icon-<%= name %>"></span>',
            text: '<span class="ui-btn-text"><%= text %></span>'
        },

        _getWrap: function( $el ) {
            return $el;
        },

        _init: function(){
            var me = this;

            me.$el = me.$el === undefined ? $('<span/>').appendTo( document.body ) : me.$el;
        },

        _create: function() {
            var me = this,
                opts = me._options,
                $wrap = me.$wrap = me._getWrap( me.getEl() ),
                input = $wrap.is( 'input' ),
                $label = $wrap.find( '.ui-btn-text' ),
                $icon = $wrap.find( '.ui-icon' );

            // 处理label
            // 如果是空字符串，则表示dom中写了data-label=""
            opts.label = opts.label === undefined ? $wrap[ input ? 'val' : 'text' ]() : opts.label;
            input || opts.label === undefined || !$label.length && ($label = $( me.tpl2html( 'text', {
                text: opts.label
            } ) )).appendTo( $wrap.empty() );
            me.$label = $label.length && $label;
            opts.resetText = opts.resetText || opts.label;

            // 如果传入了icon而dom中没有，则创建
            input || opts.icon && !$icon.length && ($icon = $( me.tpl2html( 'icon', {
                name: opts.icon
            } ) )).appendTo( $wrap );
            me.$icon = $icon.length && $icon;

            $wrap.addClass( 'ui-btn ' + (opts.label && opts.icon ?
                    'ui-btn-icon-' + opts.iconpos : opts.label ?
                    'ui-btn-text-only' : 'ui-btn-icon-only') );

            opts.state && setTimeout( function(){
                me.state( opts.state );
            }, 0 );
        },

        /**
         * 设置或者获取按钮状态值。
         *
         * 如果传入的state为"disabled", 此按钮将变成不可点击状态。
         *
         * ```javascript
         * // 初始化的时候可以给diabled状态设置Text
         * var btn = $( '#btn' ).button({
         *     disabledText: '不可点'
         * });
         *
         * // 按钮将变成不可点击状态。同时文字也变成了”不可点“
         * btn.button( 'state', 'disabled' );
         *
         * // 还原按钮状态
         * // 文字也还原。
         * btn.button( 'state', 'reset' );
         *
         * ```
         * @method state
         * @grammar state( value ) => self
         * @grammar state() => String
         * @param  {String} [state] 状态值。
         * @return {String} 当没有传入state值时，此方法行为为getter, 返回当前state值。
         * @return {self} 当传入了state值时，此方法行为为setter, 返回实例本身，方便链式调用。
         */
        state: function( state ) {

            // getter
            if ( state === undefined ) {
                return this._state;
            }

            // setter
            var me = this,
                $wrap = me.$wrap,
                input = $wrap.is( 'input' ),
                text = me._options[ state + 'Text' ];

            me.$wrap.removeClass( 'ui-state-' + me._state )
                    .addClass( 'ui-state-' + state );

            text === undefined || (input ? $wrap : me.$label)[ input ?
                    'val' : 'text' ]( text );

            me._state !== state && me.trigger( 'statechange', state, me._state );
            me._state = state;
            return me;
        },

        /**
         * 切换按钮选中状态
         * @method toggle
         * @grammar toggle() => self
         * @example
         * var btn = $( '#btn' );
         *
         * btn.on( 'click', function() {
         *     btn.button( 'toggle' );
         * } );
         */
        toggle: function() {
            this.state( this._state === 'active' ? 'reset' : 'active' );
            return this;
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event statechange
         * @param {Event} e gmu.Event对象
         * @param {String} state 当前state值
         * @param {String} preState 前一次state的值
         * @description 当组件状态变化时触发。
         */

        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 当组件被销毁的时候触发。
         */
    } );

    // dom ready
    $(function() {

        // 按下态。
        $( document.body ).highlight( 'ui-state-hover', '.ui-btn:not(.ui-state-disabled)' );
    });
})( gmu, gmu.$ );
/**
 * @file Button input插件
 * @module GMU
 * @import widget/button/button.js
 */
(function( gmu, $ ) {
    var uid = 0;

    /**
     * Button input插件，让button支持checkbox和radio来实例化。
     *
     * 如:
     * ```html
     * <input type="checkbox" data-label="按钮" />
     * <input type="radio" data-label="按钮" />
     * ```
     *
     * 且此类按钮，点击的时候回自动切换active状态，对应的input的checked值也会变化。
     *
     * @class input
     * @namespace Button
     * @pluginfor Button
     */
    gmu.Button.register( 'input', {
        _getWrap: function( $el ) {
            var id, el, $wrap;

            // 如果是表单元素。
            if ( $el.is( 'input[type="checkbox"], input[type="radio"]' ) ) {
                el = $el.addClass( 'ui-hidden' )[ 0 ];
                (id = el.id) || (el.id = id = 'input_btn_' + uid++);
                $wrap = $( 'label[for=' + id + ']', el.form || el.ownerDocument || undefined );
                $wrap.length || ($wrap = $( '<label for="' + id + '"></label>' ).insertBefore( $el ));

                $el.prop( 'checked' ) && (this._options.state = 'active');
                return $wrap;
            }

            return $el;
        },

        toggle: function() {
            var $el = this.$el;

            if ( $el.is( 'input[type="radio"]' ) ) {
                $radios = $( "[name='" + $el.attr('name') + "']", $el[ 0 ].form
                        || $el[ 0 ].ownerDocument || undefined );

                $radios.button( 'state', 'reset' );
            }
            return this.origin.apply( this, arguments );
        },

        state: function( state ) {
            var $el = this.$el;

            // 设置disabled状态
            if ( $el.is( 'input[type="checkbox"], input[type="radio"]' ) ) {
                $el.prop( 'disabled', state === 'disabled' );
            }

            return this.origin.apply( this, arguments );
        }
    } );


    // dom ready
    $(function() {
        $( document.body ).on( 'click.button',
                'label.ui-btn:not(.ui-state-disabled)', function() {

            $( '#' + this.getAttribute( 'for' ) ).button( 'toggle' );
        });
    });
})( gmu, gmu.$ );
/**
 * @file 来自zepto/touch.js, zepto自1.0后，已不默认打包此文件。
 * @import zepto.js
 */
//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var touch = {},
    touchTimeout, tapTimeout, swipeTimeout,
    longTapDelay = 750, longTapTimeout

  function parentIfText(node) {
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2) {
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  function longTap() {
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap() {
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  function cancelAll() {
    if (touchTimeout) clearTimeout(touchTimeout)
    if (tapTimeout) clearTimeout(tapTimeout)
    if (swipeTimeout) clearTimeout(swipeTimeout)
    if (longTapTimeout) clearTimeout(longTapTimeout)
    touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
    touch = {}
  }

  $(document).ready(function(){
    var now, delta

    $(document.body)
      .bind('touchstart', function(e){
        now = Date.now()
        delta = now - (touch.last || now)
        touch.el = $(parentIfText(e.touches[0].target))
        touchTimeout && clearTimeout(touchTimeout)
        touch.x1 = e.touches[0].pageX
        touch.y1 = e.touches[0].pageY
        if (delta > 0 && delta <= 250) touch.isDoubleTap = true
        touch.last = now
        longTapTimeout = setTimeout(longTap, longTapDelay)
      })
      .bind('touchmove', function(e){
        cancelLongTap()
        touch.x2 = e.touches[0].pageX
        touch.y2 = e.touches[0].pageY
        if (Math.abs(touch.x1 - touch.x2) > 10)
          e.preventDefault()
      })
      .bind('touchend', function(e){
         cancelLongTap()

        // swipe
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

          swipeTimeout = setTimeout(function() {
            touch.el.trigger('swipe')
            touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
            touch = {}
          }, 0)

        // normal tap
        else if ('last' in touch)

          // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
          // ('tap' fires before 'scroll')
          tapTimeout = setTimeout(function() {

            // trigger universal 'tap' with the option to cancelTouch()
            // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
            var event = $.Event('tap')
            event.cancelTouch = cancelAll
            touch.el.trigger(event)

            // trigger double tap immediately
            if (touch.isDoubleTap) {
              touch.el.trigger('doubleTap')
              touch = {}
            }

            // trigger single tap after 250ms of inactivity
            else {
              touchTimeout = setTimeout(function(){
                touchTimeout = null
                touch.el.trigger('singleTap')
                touch = {}
              }, 250)
            }

          }, 0)

      })
      .bind('touchcancel', cancelAll)

    $(window).bind('scroll', cancelAll)
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto);

/**
 * @file 日历组件
 * @import extend/touch.js, core/widget.js, extend/highlight.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    var monthNames = ["01月", "02月", "03月", "04月", "05月", "06月",
        "07月", "08月", "09月", "10月", "11月", "12月"],

        dayNames = ["日", "一", "二", "三", "四", "五", "六"],
        offsetRE = /^(\+|\-)?(\d+)(M|Y)$/i,

        //获取月份的天数
        getDaysInMonth = function(year, month) {
            return 32 - new Date(year, month, 32).getDate();
        },

        //获取月份中的第一天是所在星期的第几天
        getFirstDayOfMonth = function(year, month) {
            return new Date(year, month, 1).getDay();
        },

        //格式化数字，不足补零.
        formatNumber = function(val, len) {
            var num = "" + val;
            while (num.length < len) {
                num = "0" + num;
            }
            return num;
        },

        getVal = function(elem) {
            return elem.is('select, input') ? elem.val() : elem.attr('data-value');
        },

        prototype;

    /**
     * 日历组件
     *
     * @class Calendar
     * @constructor Html部分
     * ```html
     * <div id="calendar"></div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#calendar').calendar({
     *    swipeable: true
     * });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化日历的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Calendar:options)
     * @grammar $( el ).calendar( options ) => zepto
     * @grammar new gmu.Calendar( el, options ) => instance
     */
    gmu.define( 'Calendar', {
        options: {
            /**
             * @property {Date|String} [date=null] 初始化日期，默认今天
             * @namespace options
             */
            date: null,
            /**
             * @property {Number} [firstDay=1] 设置新的一周从星期几开始，星期天用0表示, 星期一用1表示, 以此类推.
             * @namespace options
             */
            firstDay: 1,
            /**
             * @property {Date|String} [maxDate=null] 设置可以选择的最大日期
             * @namespace options
             */
            maxDate: null,
            /**
             * @property {Date|String} [minDate=null] 设置可以选择的最小日期
             * @namespace options
             */
            minDate: null,
            /**
             * @property {Boolean} [swipeable=false] 设置是否可以通过左右滑动手势来切换日历
             * @namespace options
             */
            swipeable: false,
            /**
             * @property {Boolean} [monthChangeable=false] 设置是否让月份可选择
             * @namespace options
             */
            monthChangeable: false,
            /**
             * @property {Boolean} [yearChangeable=false] 设置是否让年份可选择
             * @namespace options
             */
            yearChangeable: false
        },

        _init: function() {
            this.on('ready', function(){
                var opts = this._options,
                    el = this._container || this.$el,
                    eventHandler = $.proxy(this._eventHandler, this);

                this.minDate(opts.minDate)
                    .maxDate(opts.maxDate)
                    .date(opts.date || new Date())
                    .refresh();

                el.addClass('ui-calendar')
                    .on('click', eventHandler)
                    .highlight();

                opts.swipeable && el.on('swipeLeft swipeRight', eventHandler);
            });
        },

        _create: function() {
            var $el = this.$el;

            //如果没有指定el, 则创建一个空div
            if( !$el ) {
                $el = this.$el = $('<div>');
            }
            $el.appendTo(this._options['container'] || ($el.parent().length ? '' : document.body));
        },

        _eventHandler: function(e) {
            var opts = this._options,
                root = (this._container || this.$el).get(0),
                match,
                target,
                cell,
                date,
                elems;

            switch (e.type) {
                case 'swipeLeft':
                case 'swipeRight':
                    return this.switchMonthTo((e.type == 'swipeRight' ? '-' : '+') + '1M');

                case 'change':
                    elems = $('.ui-calendar-header .ui-calendar-year, ' +
                        '.ui-calendar-header .ui-calendar-month', this._el);

                    return this.switchMonthTo(getVal(elems.eq(1)), getVal(elems.eq(0)));

                default:
                    //click

                    target = e.target;

                    if ((match = $(target).closest('.ui-calendar-calendar tbody a', root)) && match.length) {

                        e.preventDefault();
                        cell = match.parent();

                        this._option('selectedDate',
                        date = new Date(cell.attr('data-year'), cell.attr('data-month'), match.text()));

                        this.trigger('select', date, $.calendar.formatDate(date), this);
                        this.refresh();
                    } else if ((match = $(target).closest('.ui-calendar-prev, .ui-calendar-next', root)) && match.length) {

                        e.preventDefault();
                        this.switchMonthTo((match.is('.ui-calendar-prev') ? '-' : '+') + '1M');
                    }
            }
        },

        /**
         * @ignore
         * @name option
         * @grammar option(key[, value]) ⇒ instance
         * @desc 设置或获取Option，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
         */
        _option: function(key, val) {
            var opts = this._options,
                date, minDate, maxDate;

            //如果是setter
            if (val !== undefined) {

                switch (key) {
                    case 'minDate':
                    case 'maxDate':
                        opts[key] = val ? $.calendar.parseDate(val) : null;
                        break;

                    case 'selectedDate':
                        minDate = opts.minDate;
                        maxDate = opts.maxDate;
                        val = $.calendar.parseDate(val);
                        val = minDate && minDate > val ? minDate : maxDate && maxDate < val ? maxDate : val;
                        opts._selectedYear = opts._drawYear = val.getFullYear();
                        opts._selectedMonth = opts._drawMonth = val.getMonth();
                        opts._selectedDay = val.getDate();
                        break;

                    case 'date':
                        this._option('selectedDate', val);
                        opts[key] = this._option('selectedDate');
                        break;

                    default:
                        opts[key] = val;
                }

                //标记为true, 则表示下次refresh的时候要重绘所有内容。
                opts._invalid = true;

                //如果是setter则要返回instance
                return this;
            }

            return key == 'selectedDate' ? new Date(opts._selectedYear, opts._selectedMonth, opts._selectedDay) : opts[key];
        },

        /**
         * 切换到今天所在月份
         * @method switchToToday
         */
        switchToToday: function() {
            var today = new Date();
            return this.switchMonthTo(today.getMonth(), today.getFullYear());
        },


        /**
         * 切换月份
         * @method switchMonthTo
         * @param {String|Number} month 目标月份，值可以为+1M, +4M, -5Y, +1Y等等。+1M表示在显示的月的基础上显示下一个月，+4m表示下4个月，-5Y表示5年前
         * @param {String|Number} year 目标年份
         * @return {self} 返回本身
         */
        switchMonthTo: function(month, year) {
            var opts = this._options,
                minDate = this.minDate(),
                maxDate = this.maxDate(),
                offset,
                period,
                tmpDate;

            if (Object.prototype.toString.call(month) === '[object String]' && offsetRE.test(month)) {
                offset = RegExp.$1 == '-' ? -parseInt(RegExp.$2, 10) : parseInt(RegExp.$2, 10);
                period = RegExp.$3.toLowerCase();
                month = opts._drawMonth + (period == 'm' ? offset : 0);
                year = opts._drawYear + (period == 'y' ? offset : 0);
            } else {
                month = parseInt(month, 10);
                year = parseInt(year, 10);
            }

            //Date有一定的容错能力，如果传入2012年13月，它会变成2013年1月
            tmpDate = new Date(year, month, 1);

            //不能跳到不可选的月份
            tmpDate = minDate && minDate > tmpDate ? minDate : maxDate && maxDate < tmpDate ? maxDate : tmpDate;

            month = tmpDate.getMonth();
            year = tmpDate.getFullYear();

            if (month != opts._drawMonth || year != opts._drawYear) {
                this.trigger('monthchange', opts._drawMonth = month, opts._drawYear = year, this);

                opts._invalid = true;
                this.refresh();
            }

            return this;
        },

        /**
         * 刷新日历，当修改option后需要调用此方法
         * @method refresh
         * @return {self} 返回本身
         */
        refresh: function() {
            var opts = this._options,
                el = this._container || this.$el,
                eventHandler = $.proxy(this._eventHandler, this);

            //如果数据没有变化厕不重绘了
            if (!opts._invalid) {
                return;
            }

            $('.ui-calendar-calendar td:not(.ui-state-disabled), .ui-calendar-header a', el).highlight();
            $('.ui-calendar-header select', el).off('change', eventHandler);
            el.empty().append(this._generateHTML());
            $('.ui-calendar-calendar td:not(.ui-state-disabled), .ui-calendar-header a', el).highlight('ui-state-hover');
            $('.ui-calendar-header select', el).on('change', eventHandler);
            opts._invalid = false;
            return this;
        },

        /**
         * 销毁组件
         * @method destroy
         */
        destroy: function() {
            var el = this._container || this.$el,
                eventHandler = this._eventHandler;

            $('.ui-calendar-calendar td:not(.ui-state-disabled)', el).highlight();
            $('.ui-calendar-header select', el).off('change', eventHandler);
            el.remove();
            return this.$super('destroy');
        },

        /**
         * 重绘表格
         */
        _generateHTML: function() {
            var opts = this._options,
                drawYear = opts._drawYear,
                drawMonth = opts._drawMonth,
                tempDate = new Date(),
                today = new Date(tempDate.getFullYear(), tempDate.getMonth(),
                tempDate.getDate()),

                minDate = this.minDate(),
                maxDate = this.maxDate(),
                selectedDate = this.selectedDate(),
                html = '',
                i,
                j,
                firstDay,
                day,
                leadDays,
                daysInMonth,
                rows,
                printDate;

            firstDay = (isNaN(firstDay = parseInt(opts.firstDay, 10)) ? 0 : firstDay);

            html += this._renderHead(opts, drawYear, drawMonth, minDate, maxDate) +
                '<table  class="ui-calendar-calendar"><thead><tr>';

            for (i = 0; i < 7; i++) {
                day = (i + firstDay) % 7;

                html += '<th' + ((i + firstDay + 6) % 7 >= 5 ?

                //如果是周末则加上ui-calendar-week-end的class给th
                ' class="ui-calendar-week-end"' : '') + '>' +
                    '<span>' + dayNames[day] + '</span></th>';
            }

            //添加一个间隙，样式需求
            html += '</thead></tr><tbody><tr class="ui-calendar-gap">' +
                '<td colspan="7">&#xa0;</td></tr>';

            daysInMonth = getDaysInMonth(drawYear, drawMonth);
            leadDays = (getFirstDayOfMonth(drawYear, drawMonth) - firstDay + 7) % 7;
            rows = Math.ceil((leadDays + daysInMonth) / 7);
            printDate = new Date(drawYear, drawMonth, 1 - leadDays);

            for (i = 0; i < rows; i++) {
                html += '<tr>';

                for (j = 0; j < 7; j++) {
                    html += this._renderDay(j, printDate, firstDay, drawMonth, selectedDate, today, minDate, maxDate);
                    printDate.setDate(printDate.getDate() + 1);
                }
                html += '</tr>';
            }
            html += '</tbody></table>';
            return html;
        },

        _renderHead: function(data, drawYear, drawMonth, minDate, maxDate) {
            var html = '<div class="ui-calendar-header">',

                //上一个月的最后一天
                lpd = new Date(drawYear, drawMonth, -1),

                //下一个月的第一天
                fnd = new Date(drawYear, drawMonth + 1, 1),
                i,
                max;

            html += '<a class="ui-calendar-prev' + (minDate && minDate > lpd ?
                ' ui-state-disable' : '') + '" href="#">&lt;&lt;</a><div class="ui-calendar-title">';

            if (data.yearChangeable) {
                html += '<select class="ui-calendar-year">';

                for (i = Math.max(1970, drawYear - 10), max = i + 20; i < max; i++) {
                    html += '<option value="' + i + '" ' + (i == drawYear ?
                        'selected="selected"' : '') + '>' + i + '年</option>';
                }
                html += '</select>';
            } else {
                html += '<span class="ui-calendar-year" data-value="' + drawYear + '">' + drawYear + '年' + '</span>';
            }

            if (data.monthChangeable) {
                html += '<select class="ui-calendar-month">';

                for (i = 0; i < 12; i++) {
                    html += '<option value="' + i + '" ' + (i == drawMonth ?
                        'selected="selected"' : '') + '>' + monthNames[i] + '</option>';
                }
                html += '</select>';
            } else {
                html += '<span class="ui-calendar-month" data-value="' + drawMonth + '">' + monthNames[drawMonth] + '</span>';
            }

            html += '</div><a class="ui-calendar-next' + (maxDate && maxDate < fnd ?
                ' ui-state-disable' : '') + '" href="#">&gt;&gt;</a></div>';
            return html;
        },

        _renderDay: function(j, printDate, firstDay, drawMonth, selectedDate, today, minDate, maxDate) {

            var otherMonth = (printDate.getMonth() !== drawMonth),
                unSelectable;

            unSelectable = otherMonth || (minDate && printDate < minDate) || (maxDate && printDate > maxDate);

            return "<td class='" + ((j + firstDay + 6) % 7 >= 5 ? "ui-calendar-week-end" : "") + // 标记周末

            (unSelectable ? " ui-calendar-unSelectable ui-state-disabled" : "") + //标记不可点的天

            (otherMonth || unSelectable ? '' : (printDate.getTime() === selectedDate.getTime() ? " ui-calendar-current-day" : "") + //标记当前选择
            (printDate.getTime() === today.getTime() ? " ui-calendar-today" : "") //标记今天
            ) + "'" +

            (unSelectable ? "" : " data-month='" + printDate.getMonth() + "' data-year='" + printDate.getFullYear() + "'") + ">" +

            (otherMonth ? "&#xa0;" : (unSelectable ? "<span class='ui-state-default'>" + printDate.getDate() + "</span>" :
                "<a class='ui-state-default" + (printDate.getTime() === today.getTime() ? " ui-state-highlight" : "") + (printDate.getTime() === selectedDate.getTime() ? " ui-state-active" : "") +
                "' href='#'>" + printDate.getDate() + "</a>")) + "</td>";
        }
    });

    prototype = gmu.Calendar.prototype;

    //添加更直接的option修改接口
    $.each(['maxDate', 'minDate', 'date', 'selectedDate'], function(i, name) {
        prototype[name] = function(val) {
            return this._option(name, val);
        }
    });

    //补充注释

    /**
     * 设置或获取maxDate，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法
     * @method maxDate
     * @param {String|Date} value 最大日期的值
     * @return {self} 返回本身
     */

    /**
     * 设置或获取minDate，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法
     * @method minDate
     * @param {String|Date} value 最小日期的值
     * @return {self} 返回本身
     */

    /**
     * 设置或获取当前日期，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法
     * @method date
     * @param {String|Date} value 当前日期
     * @return {self} 返回本身
     */

    /**
     * 设置或获取当前选中的日期，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法
     * @method selectedDate
     * @param {String|Date} value 当前日期
     * @return {self} 返回本身
     */


    //@todo 支持各种格式
    //开放接口，如果现有格式不能满足需求，外部可以通过覆写一下两个方法
    $.calendar = {

        /**
         * 解析字符串成日期格式对象。目前支持yyyy-mm-dd格式和yyyy/mm/dd格式。
         * @name $.calendar.parseDate
         * @grammar $.calendar.parseDate( str ) ⇒ Date
         */
        parseDate: function(obj) {
            var dateRE = /^(\d{4})(?:\-|\/)(\d{1,2})(?:\-|\/)(\d{1,2})$/;
            return Object.prototype.toString.call(obj) === '[object Date]' ? obj : dateRE.test(obj) ? new Date(parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10)) : null;
        },

        /**
         * 格式化日期对象为字符串, 输出格式为yyy-mm-dd
         * @name $.calendar.formatDate
         * @grammar $.calendar.formatDate( date ) ⇒ String
         */
        formatDate: function(date) {
            return date.getFullYear() + '-' + formatNumber(date.getMonth() + 1, 2) + '-' + formatNumber(date.getDate(), 2);
        }
    }

    /**
     * @event ready
     * @param {Event} e gmu.Event对象
     * @description 当组件初始化完后触发。
     */

    /**
     * @event select
     * @param {Event} e gmu.Event对象
     * @param {Date} date 当前选中的日期
     * @param {String} dateStr 当前选中日期的格式化字符串
     * @param {Instance} instance 当前日历的实例
     * @description 选中日期的时候触发
     */
    
    /**
     * @event monthchange
     * @param {Event} e gmu.Event对象
     * @param {Date} month 当前月份
     * @param {String} year 当前年份
     * @param {Instance} instance 当前日历的实例
     * @description 前现实月份发生变化时触发
     */
    
    /**
     * @event destroy
     * @param {Event} e gmu.Event对象
     * @description 组件在销毁的时候触发
     */
})( gmu, gmu.$ );

/**
 * @file Calendar Picker插件
 * @desc 默认的Calendar组件，只是在指定容器上生成日历功能，与表单元素的交互功能在此插件中体现.
 * selector将会被认为是可赋值对象，当确认按钮点击后，所选的日期会赋值给selector。
 * @module GMU
 * @import widget/calendar/calendar.js, extend/event.ortchange.js
 */
(function( gmu, $ ) {
    function SlideUp(div, cb) {
        var
            //用来记录div的原始位置的
            holder = $('<span class="ui-holder"></span>'),

            //dom
            root = $('<div class="ui-slideup-wrap">' +
                '   <div class="ui-slideup">' +
                '       <div class="header">' +
                '           <span class="ok-btn">确认</span>' +
                '           <span class="no-btn">取消</span>' +
                '       </div>' +
                '       <div class="frame"></div>' +
                '   </div>' +
                '</div>'),
            sDiv = $('.ui-slideup', root),
            frame = $('.frame', sDiv),

            //对外只公开refresh和close方法
            obj = {

                /**
                 * 刷新日历显示，当屏幕旋转的时候时候需要外部调用
                 */
                refresh: function( callback ){
                    root.css({
                        top: window.pageYOffset + 'px',
                        height: window.innerHeight + 'px'
                    });

                    sDiv.animate({
                        translateY: '-' + sDiv.height() + 'px',
                        translateZ: '0'
                    }, 400, 'ease-out', function () {
                        callback && callback.call(obj);
                    });

                },

                /**
                 * 关闭日历
                 */
                close: function( callback ){
                    var count = SlideUp.count = SlideUp.count - 1;

                    root.off('click.slideup' + id);

                    sDiv
                        .animate({
                            translateY: '0',
                            translateZ: '0'
                        }, 200, 'ease-out', function () {
                            callback && callback();

                            //还原div的位置
                            holder.replaceWith(div);

                            //销毁
                            root.remove();
                            count === 0 && $(document).off('touchmove.slideup');
                        })
                        .find('.ok-btn, .no-btn')
                        .highlight();

                    return obj;
                }
            },

            //为了解绑事件用的
            id = SlideUp.id = ( SlideUp.id >>> 0 ) + 1,

            //记录当前弹出了多少次
            count;

        frame.append( div.replaceWith( holder ) );

        count = SlideUp.count = ( SlideUp.count >>> 0 ) + 1;

        //弹出多个时，只会注册一次
        count === 1 && $(document).on('touchmove.slideup', function (e) {

            //禁用系统滚动
            e.preventDefault();
        });

        root
            .on('click.slideup' + id, '.ok-btn, .no-btn', function () {
                cb.call(obj, $(this).is('.ok-btn')) !== false && obj.close();
            })
            .appendTo(document.body)
            .find('.ok-btn, .no-btn')
            .highlight('ui-state-hover');

        obj.refresh();

        return obj;
    }

    /**
     * Calendar Picker插件
     *
     * 默认的Calendar组件，只是在指定容器上生成日历功能，与表单元素的交互功能在此插件中体现.
     * selector将会被认为是可赋值对象，当确认按钮点击后，所选的日期会赋值给selector。
     *
     * @class picker
     * @namespace Calendar
     * @pluginfor Calendar
     */
    gmu.Calendar.register( 'picker', {

        _create: function () {
            var el = this.$el;

            if( !el ) {
                throw new Error("请指定日期选择器的赋值对象");
            }
        },

        _init: function(){
            var el = this.$el,
                opts = this._options;

            this._container = $('<div></div>');

            //如果有初始值，则把此值赋值给calendar
            opts.date || (opts.date = el[el.is('select, input')?'val':'text']());

            $(window).on('ortchange', $.proxy(this._eventHandler, this));
            this.on('commit', function(e, date){
                var str = $.calendar.formatDate(date);

                el[el.is('select, input')?'val':'text'](str);
            });

            this.on('destroy', function(){
                //解绑ortchange事件
                $(window).off('ortchange', this._eventHandler);
                this._frame && this._frame.close();
            });
        },

        _eventHandler: function(e){
            if(e.type === 'ortchange') {
                this._frame && this._frame.refresh();
            }else {
                this.origin( e );
            }
        },

        /**
         * 显示组件
         * @method show
         * @grammar show() ⇒ instance
         * @param {Function} [callback] 刷新之后的回调函数
         * @for Calendar
         * @uses Calendar.picker
         */
        show: function(){
            var me = this,
                el;

            if( this._visible ) {
                return this;
            }

            el = this._container;

            this._visible = true;
            this.refresh();
            this._frame = SlideUp(el, function( confirm ){
                var date;
                if( confirm) {
                    date = me._option('selectedDate');
                    me.trigger('commit', date, $.calendar.formatDate(date), me);
                    me._option('date', date);
                } else {
                    me._option('selectedDate', me._option('date'));
                }
                me.hide();
                return false;
            });
            return this.trigger('show', this);
        },

        /**
         * 隐藏组件
         * @method hide
         * @grammar hide() ⇒ instance
         * @param {Function} [callback] 刷新之后的回调函数
         * @for Calendar
         * @uses Calendar.picker
         */
        hide: function(){
            var me = this,
                event;

            if (!this._visible) {
                return this;
            }

            event = new gmu.Event('beforehide');
            this.trigger(event, this);

            //如果外部阻止了此事件，则停止往下执行
            if(event.isDefaultPrevented()){
                return this;
            }

            this._visible = false;

            this._frame.close(function(){
                me.trigger && me.trigger('hide');
            });

            this._frame = null;

            return this;
        }

        /**
         * @event show
         * @param {Event} e gmu.Event对象
         * @param {Calendar} ui widget实例
         * @description 当组件显示后触发
         * @for Calendar
         * @uses Calendar.picker
         */

        /**
         * @event hide
         * @param {Event} e gmu.Event对象
         * @param {Calendar} ui widget实例
         * @description 当组件隐藏后触发
         * @for Calendar
         * @uses Calendar.picker
         */

        /**
         * @event beforehide
         * @param {Event} e gmu.Event对象
         * @param {Calendar} ui widget实例
         * @description 组件隐藏之前触发，可以通过e.preventDefault()来阻止
         * @for Calendar
         * @uses Calendar.picker
         */

        /**
         * @event commit
         * @param {Event} e gmu.Event对象
         * @param {Date} date 选中的日期
         * @param {String} dateStr 选中的日期字符格式
         * @param {Calendar} ui widget实例
         * @description 但确认选择某个日期的时候触发
         * @for Calendar
         * @uses Calendar.picker
         */
    } );

})( gmu, gmu.$ );

/**
 * @file 弹出框组件
 * @import core/widget.js, extend/highlight.js, extend/parseTpl.js, extend/event.ortchange.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    var tpl = {
        close: '<a class="ui-dialog-close" title="关闭"><span class="ui-icon ui-icon-delete"></span></a>',
        mask: '<div class="ui-mask"></div>',
        title: '<div class="ui-dialog-title">'+
                    '<h3><%=title%></h3>'+
                '</div>',
        wrap: '<div class="ui-dialog">'+
            '<div class="ui-dialog-content"></div>'+
            '<% if(btns){ %>'+
            '<div class="ui-dialog-btns">'+
            '<% for(var i=0, length=btns.length; i<length; i++){var item = btns[i]; %>'+
            '<a class="ui-btn ui-btn-<%=item.index%>" data-key="<%=item.key%>"><%=item.text%></a>'+
            '<% } %>'+
            '</div>'+
            '<% } %>' +
            '</div> '
    };

    /**
     * 弹出框组件
     *
     * @class Dialog
     * @constructor Html部分
     * ```html
     * <div id="dialog1" title="登陆提示">
     *     <p>请使用百度账号登录后, 获得更多个性化特色功能</p>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     *  $('#dialog1').dialog({
     *      autoOpen: false,
     *      closeBtn: false,
     *      buttons: {
     *          '取消': function(){
     *              this.close();
     *          },
     *          '确定': function(){
     *              this.close();
     *              $('#dialog2').dialog('open');
     *          }
     *      }
     *  });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化对话框的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Dialog:options)
     * @grammar $( el ).dialog( options ) => zepto
     * @grammar new gmu.Dialog( el, options ) => instance
     */
    gmu.define( 'Dialog', {
        options: {
            /**
             * @property {Boolean} [autoOpen=true] 初始化后是否自动弹出
             * @namespace options
             */
            autoOpen: true,
            /**
             * @property {Array} [buttons=null] 弹出框上的按钮
             * @namespace options
             */
            buttons: null,
            /**
             * @property {Boolean} [closeBtn=true] 是否显示关闭按钮
             * @namespace options
             */
            closeBtn: true,
            /**
             * @property {Boolean} [mask=true] 是否有遮罩层
             * @namespace options
             */
            mask: true,
            /**
             * @property {Number} [width=300] 弹出框宽度
             * @namespace options
             */
            width: 300,
            /**
             * @property {Number|String} [height='auto'] 弹出框高度
             * @namespace options
             */
            height: 'auto',
            /**
             * @property {String} [title=null] 弹出框标题
             * @namespace options
             */
            title: null,
            /**
             * @property {String} [content=null] 弹出框内容
             * @namespace options
             */
            content: null,
            /**
             * @property {Boolean} [scrollMove=true] 是否禁用掉scroll，在弹出的时候
             * @namespace options
             */
            scrollMove: true,
            /**
             * @property {Element} [container=null] 弹出框容器
             * @namespace options
             */
            container: null,
            /**
             * @property {Function} [maskClick=null] 在遮罩上点击时触发的事件
             * @namespace options
             */
            maskClick: null,
            position: null //需要dialog.position插件才能用
        },

        /**
         * 获取最外层的节点
         * @method getWrap
         * @return {Element} 最外层的节点
         */
        getWrap: function(){
            return this._options._wrap;
        },

        _init: function(){
            var me = this, opts = me._options, btns,
                i= 0, eventHanlder = $.proxy(me._eventHandler, me), vars = {};

            me.on( 'ready', function() {
                opts._container = $(opts.container || document.body);
                (opts._cIsBody = opts._container.is('body')) || opts._container.addClass('ui-dialog-container');
                vars.btns = btns= [];
                opts.buttons && $.each(opts.buttons, function(key){
                    btns.push({
                        index: ++i,
                        text: key,
                        key: key
                    });
                });
                opts._mask = opts.mask ? $(tpl.mask).appendTo(opts._container) : null;
                opts._wrap = $($.parseTpl(tpl.wrap, vars)).appendTo(opts._container);
                opts._content = $('.ui-dialog-content', opts._wrap);

                opts._title = $(tpl.title);
                opts._close = opts.closeBtn && $(tpl.close).highlight('ui-dialog-close-hover');
                me.$el = me.$el || opts._content;//如果不需要支持render模式，此句要删除

                me.title(opts.title);
                me.content(opts.content);

                btns.length && $('.ui-dialog-btns .ui-btn', opts._wrap).highlight('ui-state-hover');
                opts._wrap.css({
                    width: opts.width,
                    height: opts.height
                });

                //bind events绑定事件
                $(window).on('ortchange', eventHanlder);
                opts._wrap.on('click', eventHanlder);
                opts._mask && opts._mask.on('click', eventHanlder);
                opts.autoOpen && me.open();
            } );
        },

        _create: function(){
            var opts = this._options;

            if( this._options.setup ){
                opts.content = opts.content || this.$el.show();
                opts.title = opts.title || this.$el.attr('title');
            }
        },

        _eventHandler: function(e){
            var me = this, match, wrap, opts = me._options, fn;
            switch(e.type){
                case 'ortchange':
                    this.refresh();
                    break;
                case 'touchmove':
                    opts.scrollMove && e.preventDefault();
                    break;
                case 'click':
                    if(opts._mask && ($.contains(opts._mask[0], e.target) || opts._mask[0] === e.target )){
                        return me.trigger('maskClick');
                    }
                    wrap = opts._wrap.get(0);
                    if( (match = $(e.target).closest('.ui-dialog-close', wrap)) && match.length ){
                        me.close();
                    } else if( (match = $(e.target).closest('.ui-dialog-btns .ui-btn', wrap)) && match.length ) {
                        fn = opts.buttons[match.attr('data-key')];
                        fn && fn.apply(me, arguments);
                    }
            }
        },

        _calculate: function(){
            var me = this, opts = me._options, size, $win, root = document.body,
                ret = {}, isBody = opts._cIsBody, round = Math.round;

            opts.mask && (ret.mask = isBody ? {
                width:  '100%',
                height: Math.max(root.scrollHeight, root.clientHeight)-1//不减1的话uc浏览器再旋转的时候不触发resize.奇葩！
            }:{
                width: '100%',
                height: '100%'
            });

            size = opts._wrap.offset();
            $win = $(window);
            ret.wrap = {
                left: '50%',
                marginLeft: -round(size.width/2) +'px',
                top: isBody?round($win.height() / 2) + window.pageYOffset:'50%',
                marginTop: -round(size.height/2) +'px'
            }
            return ret;
        },

        /**
         * 用来更新弹出框位置和mask大小。如父容器大小发生变化时，可能弹出框位置不对，可以外部调用refresh来修正。
         * @method refresh
         * @return {self} 返回本身
         */
        refresh: function(){
            var me = this, opts = me._options, ret, action;
            if(opts._isOpen) {

                action = function(){
                    ret = me._calculate();
                    ret.mask && opts._mask.css(ret.mask);
                    opts._wrap.css(ret.wrap);
                }

                //如果有键盘在，需要多加延时
                if( $.os.ios &&
                    document.activeElement &&
                    /input|textarea|select/i.test(document.activeElement.tagName)){

                    document.body.scrollLeft = 0;
                    setTimeout(action, 200);//do it later in 200ms.

                } else {
                    action();//do it now
                }
            }
            return me;
        },

        /**
         * 弹出弹出框，如果设置了位置，内部会数值转给[position](widget/dialog.js#position)来处理。
         * @method open
         * @param {String|Number} [x] X轴位置
         * @param {String|Number} [y] Y轴位置
         * @return {self} 返回本身
         */
        open: function(x, y){
            var opts = this._options;
            opts._isOpen = true;

            opts._wrap.css('display', 'block');
            opts._mask && opts._mask.css('display', 'block');

            x !== undefined && this.position ? this.position(x, y) : this.refresh();

            $(document).on('touchmove', $.proxy(this._eventHandler, this));
            return this.trigger('open');
        },

        /**
         * 关闭弹出框
         * @method close
         * @return {self} 返回本身
         */
        close: function(){
            var eventData, opts = this._options;

            eventData = $.Event('beforeClose');
            this.trigger(eventData);
            if(eventData.defaultPrevented)return this;

            opts._isOpen = false;
            opts._wrap.css('display', 'none');
            opts._mask && opts._mask.css('display', 'none');

            $(document).off('touchmove', this._eventHandler);
            return this.trigger('close');
        },

        /**
         * 设置或者获取弹出框标题。value接受带html标签字符串
         * @method title
         * @param {String} [value] 弹出框标题
         * @return {self} 返回本身
         */
        title: function(value) {
            var opts = this._options, setter = value !== undefined;
            if(setter){
                value = (opts.title = value) ? '<h3>'+value+'</h3>' : value;
                opts._title.html(value)[value?'prependTo':'remove'](opts._wrap);
                opts._close && opts._close.prependTo(opts.title? opts._title : opts._wrap);
            }
            return setter ? this : opts.title;
        },

        /**
         * 设置或者获取弹出框内容。value接受带html标签字符串和zepto对象。
         * @method content
         * @param {String|Element} [val] 弹出框内容
         * @return {self} 返回本身
         */
        content: function(val) {
            var opts = this._options, setter = val!==undefined;
            setter && opts._content.empty().append(opts.content = val);
            return setter ? this: opts.content;
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         */
        destroy: function(){
            var opts = this._options, _eventHander = this._eventHandler;
            $(window).off('ortchange', _eventHander);
            $(document).off('touchmove', _eventHander);
            opts._wrap.off('click', _eventHander).remove();
            opts._mask && opts._mask.off('click', _eventHander).remove();
            opts._close && opts._close.highlight();
            return this.$super('destroy');
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event open
         * @param {Event} e gmu.Event对象
         * @description 当弹出框弹出后触发
         */

        /**
         * @event beforeClose
         * @param {Event} e gmu.Event对象
         * @description 在弹出框关闭之前触发，可以通过e.preventDefault()来阻止
         */

        /**
         * @event close
         * @param {Event} e gmu.Event对象
         * @description 在弹出框关闭之后触发
         */

        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });
})( gmu, gmu.$ );

/**
 * @file 修复Zepto中offset setter bug
 * 比如 被定位元素满足以下条件时，会定位不正确
 * 1. 被定位元素不是第一个节点，且prev兄弟节点中有非absolute或者fixed定位的元素
 * 2. 被定位元素为非absolute或者fixed定位。
 * issue: https://github.com/gmuteam/GMU/issues/101
 * @import zepto.js
 * @module GMU
 */

(function( $ ) {
    var _offset = $.fn.offset,
        round = Math.round;

    // zepto的offset bug的主要问题是当position:relative的时候，没有考虑元素的初始值。
    // 初始值，是指positon:relative; top: 0; left: 0; bottom:0; right:0; 的时候
    // 该元素的位置，zepto中的offset是假定了这个值就是{left:0, top: 0}; 实际上前面有兄弟
    // 节点且不为postion: absolute|fixed 定位时时，该元素的初始位置并不是{left:0, top: 0}
    // 会根据前面兄弟节点的内容大小而不一样。
    function setter( coord ) {
        return this.each(function( idx ) {
            var $el = $( this ),
                coords = $.isFunction( coord ) ? coord.call( this, idx,
                    $el.offset() ) : coord,

                position = $el.css( 'position' ),

                // position为absolute或者fixed定位的元素，跟元素的初始位置没有关系
                // 所以不需要取初始位置
                pos = position === 'absolute' || position === 'fixed' ||
                    $el.position();

            // 如果是position为relative, 且存在 top, right, bottom, left值
            // position值还不能代表初始值，需要还原一下
            // 比如 top: 1px, 那要让position取得的值减去1px才是该元素的初始位置
            // 但是如果是top:auto, bottom: 1px; 则是要加1px, 所以下面的代码要乘以个-1
            if ( position === 'relative' ) {
                pos.top -= parseFloat( $el.css( 'top' ) ) ||
                        parseFloat( $el.css( 'bottom' ) ) * -1 || 0;
                pos.left -= parseFloat( $el.css( 'left' ) ) ||
                        parseFloat( $el.css( 'right' ) ) * -1 || 0;
            }

            parentOffset = $el.offsetParent().offset(),

            // 迫于无赖，chrome下如果offset设置的top,left不是整型，会导致popOver中arrow样式有问题。
            props = {
              top:  round( coords.top - (pos.top || 0)  - parentOffset.top ),
              left: round( coords.left - (pos.left || 0) - parentOffset.left )
            }

            if ( position == 'static' ){
                props['position'] = 'relative';
            }

            // 可以考虑改用animate方法。
            if ( coords.using ) {
                coords.using.call( this, props, idx );
            } else {
                $el.css( props );
            }
        });
    }

    $.fn.offset = function( corrd ) {
        return corrd ? setter.call( this, corrd ): _offset.call( this );
    }
})( Zepto );
/**
 * @file 基于Zepto的位置设置获取组件
 * @import zepto.js, extend/offset.js
 * @module GMU
 */

(function ($, undefined) {
    var _position = $.fn.position,
        round = Math.round,
        rhorizontal = /^(left|center|right)([\+\-]\d+%?)?$/,
        rvertical = /^(top|center|bottom)([\+\-]\d+%?)?$/,
        rpercent = /%$/;

    function str2int( persent, totol ) {
        return (parseInt( persent, 10 ) || 0) * (rpercent.test( persent ) ?
                totol / 100 : 1);
    }

    function getOffsets( pos, offset, width, height ) {
        return [
            pos[ 0 ] === 'right' ? width : pos[ 0 ] === 'center' ?
                    width / 2 : 0,

            pos[ 1 ] === 'bottom' ? height : pos[ 1 ] === 'center' ?
                    height / 2 : 0,

            str2int( offset[ 0 ], width ),

            str2int( offset[ 1 ], height )
        ];
    }

    function getDimensions( elem ) {
        var raw = elem[ 0 ],
            isEvent = raw.preventDefault;

        raw = raw.touches && raw.touches[ 0 ] || raw;

        // 特殊处理document, window和event对象
        if ( raw.nodeType === 9 || raw === window || isEvent ) {
            return {
                width: isEvent ? 0 : elem.width(),
                height: isEvent ? 0 : elem.height(),
                top: raw.pageYOffset || raw.pageY ||  0,
                left: raw.pageXOffset || raw.pageX || 0
            };
        }

        return elem.offset();
    }

    function getWithinInfo( el ) {
        var $el = $( el = (el || window) ),
            dim = getDimensions( $el );

        el = $el[ 0 ];

        return {
            $el: $el,
            width: dim.width,
            height: dim.height,
            scrollLeft: el.pageXOffset || el.scrollLeft,
            scrollTop: el.pageYOffset || el.scrollTop
        };
    }

    // 参数检测纠错
    function filterOpts( opts, offsets ) {
        [ 'my', 'at' ].forEach(function( key ) {
            var pos = ( opts[ key ] || '' ).split( ' ' ),
                opt = opts[ key ] = [ 'center', 'center' ],
                offset = offsets[ key ] = [ 0, 0 ];

            pos.length === 1 && pos[ rvertical.test( pos[ 0 ] ) ? 'unshift' :
                    'push' ]( 'center' );

            rhorizontal.test( pos[ 0 ] ) && (opt[ 0 ] = RegExp.$1) &&
                    (offset[ 0 ] = RegExp.$2);

            rvertical.test( pos[ 1 ] ) && (opt[ 1 ] = RegExp.$1) &&
                    (offset[ 1 ] = RegExp.$2);
        });
    }

    /**
     * 获取元素相对于相对父级元素（父级最近为position为relative｜abosolute｜fixed的元素）的坐标位置。
     * @method $.fn.position
     * @grammar position()  ⇒ array
     * @grammar position(opts)  ⇒ self
     * @param {String} [my=center] 设置中心点。可以为'left top', 'center bottom', 'right center'...同时还可以设置偏移量；如 'left+5 center-20%'
     * @param {String} [at=center] 设置定位到目标元素的什么位置。参数格式同my参数一致
     * @param {Object} [of=null] 设置目标元素
     * @param {Function} [collision=null] 碰撞检测回调方法
     * @param {Object} [within=window] 碰撞检测对象
     * @example
     * var position = $('#target').position();
     * $('#target').position({
     *                          my: 'center',
     *                          at: 'center',
     *                          of: document.body
     *                      });
     */
    $.fn.position = function ( opts ) {
        if ( !opts || !opts.of ) {
            return _position.call( this );
        }

        opts = $.extend( {}, opts );

        var target = $( opts.of ),
            collision = opts.collision,
            within = collision && getWithinInfo( opts.within ),
            ofses = {},
            dim = getDimensions( target ),
            bPos = {
                left: dim.left,
                top: dim.top
            },
            atOfs;

        target[ 0 ].preventDefault && (opts.at = 'left top');
        filterOpts( opts, ofses );    // 参数检测纠错

        atOfs = getOffsets( opts.at, ofses.at, dim.width, dim.height );
        bPos.left += atOfs[ 0 ] + atOfs[ 2 ];
        bPos.top += atOfs[ 1 ] + atOfs[ 3 ];

        return this.each(function() {
            var $el = $( this ),
                ofs = $el.offset(),
                pos = $.extend( {}, bPos ),
                myOfs = getOffsets( opts.my, ofses.my, ofs.width, ofs.height );

            pos.left = round( pos.left + myOfs[ 2 ] - myOfs[ 0 ] );
            pos.top = round( pos.top + myOfs[ 3 ] - myOfs[ 1 ] );

            collision && collision.call( this, pos, {
                of: dim,
                offset: ofs,
                my: opts.my,
                at: opts.at,
                within: within,
                $el : $el
            } );

            pos.using = opts.using;
            $el.offset( pos );
        });
    }
})( Zepto );
/**
 * @file Dialog － 父容器插件
 * @module GMU
 * @import widget/dialog/dialog.js, extend/position.js
 */
(function( gmu, $, undefined ) {
    /**
     * @name dialog.position
     * @desc 用zepto.position来定位dialog
     */
    /**
     * 用zepto.position来定位dialog
     *
     * @class position
     * @namespace Dialog
     * @pluginfor Dialog
     */
    gmu.Dialog.register( 'position', {

        _init: function(){
            var opts = this._options;

            opts.position = opts.position || {of: opts.container || window, at: 'center', my: 'center'};
        },

        /**
         * 用来设置弹出框的位置，如果不另外设置，组件默认为上下左右居中对齐。位置参数接受，数值，百分比，带单位的数值，或者'center'。
         * 如: 100， 100px, 100em, 10%, center;暂时不支持 left, right, top, bottom.
         * @method position
         * @param {String|Number} [x] X轴位置
         * @param {String|Number} [y] Y轴位置
         * @for Dialog
         * @uses Dialog.position
         * @return {self} 返回本身。
         */
        position: function(x, y){
            var opts = this._options;
            if(!$.isPlainObject(x)){//兼容老格式！
                opts.position.at = 'left'+(x>0?'+'+x: x)+' top'+(y>0?'+'+y: y);
            } else $.extend(opts.position, x);
            return this.refresh();
        },

        _calculate:function () {
            var me = this,
                opts = me._options,
                position = opts.position,
                ret = me.origin();

            opts._wrap.position($.extend(position, {
                using: function(position){
                    ret.wrap = position;
                }
            }));

            return ret;
        }
    } );
})( gmu, gmu.$);

/**
 * @file 弹出层组件, 基础版本。
 * @import core/widget.js
 * @module GMU
 */
(function( gmu, $, undefined ) {

    /**
     * 弹出层组件，具有点击按钮在周围弹出层的交互效果。至于弹出层内容，可以通过`content`直接设置内容，
     * 也可以通过`container`设置容器节点。按钮和弹出层之间没有位置依赖。
     *
     * 基础版本只有简单的点击显示，再点击隐藏功能。像用更多的功能请参看[插件介绍](#GMU:Popover:plugins)部分.
     *
     * @class Popover
     * @constructor Html部分
     * ```html
     * <a id="btn">按钮<a/>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#btn').popover({
     *     content: 'Hello world'
     * });
     * ```
     * @param {dom | zepto | selector} [el] 按钮节点
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Popover:options)
     * @grammar $( el ).popover( options ) => zepto
     * @grammar new gmu.Popover( el, options ) => instance
     */
    gmu.define( 'Popover', {

        // 默认配置项。
        options: {

            /**
             * @property {Zepto | Selector} [container] 指定容器，如果不传入，组件将在el的后面自动创建一个。
             * @namespace options
             */
            container: null,

            /**
             * @property {String | Zepto | Selector } [content] 弹出框的内容。
             * @namespace options
             */
            content: null,

            /**
             * @property {String} [event="click"] 交互事件名, 可能你会设置成tap。
             * @namespace options
             */
            event: 'click'
        },

        template: {
            frame: '<div>'
        },

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

         // 负责dom的创建。
        _create: function() {
            var me = this,
                opts = me._options,
                $el = opts.target && $( opts.target ) || me.getEl(),
                $root = opts.container && $( opts.container );

            // 没传 或者 就算传入了选择器，但是没有找到节点，还是得创建一个。
            $root && $root.length || ($root = $( me.tpl2html( 'frame' ) )
                    .addClass( 'ui-mark-temp' ));
            me.$root = $root;

            // 如果传入了content, 则作为内容插入到container中
            opts.content && me.setContent( opts.content );
            me.trigger( 'done.dom', $root.addClass( 'ui-' + me.widgetName ),
                    opts );

            // 如果节点是动态创建的，则不在文档树中，就把节点插入到$el后面。
            $root.parent().length || $el.after( $root );

            me.target( $el );
        },

        // 删除标记为组件临时的dom
        _checkTemp: function( $el ) {
            $el.is( '.ui-mark-temp' ) && $el.off( this.eventNs ) &&
                    $el.remove();
        },

        /**
         * @event beforeshow
         * @param {Event} e gmu.Event对象
         * @description 但弹出层打算显示时触发，可以通过`e.preventDefault()`来阻止。
         */


        /**
         * @event show
         * @param {Event} e gmu.Event对象
         * @description 当弹出层显示后触发。
         */


        /**
         * 显示弹出层。
         * @method show
         * @chainable
         * @return {self} 返回本身。
         */
        show: function() {
            var me = this,
                evt = gmu.Event( 'beforeshow' );

            me.trigger( evt );

            // 如果外部阻止了关闭，则什么也不做。
            if ( evt.isDefaultPrevented() ) {
                return;
            }

            me.trigger( 'placement', me.$root.addClass( 'ui-in' ), me.$target );
            me._visible = true;
            return me.trigger( 'show' );
        },

        /**
         * @event beforehide
         * @param {Event} e gmu.Event对象
         * @description 但弹出层打算隐藏时触发，可以通过`e.preventDefault()`来阻止。
         */


        /**
         * @event hide
         * @param {Event} e gmu.Event对象
         * @description 当弹出层隐藏后触发。
         */

        /**
         * 隐藏弹出层。
         * @method hide
         * @chainable
         * @return {self} 返回本身。
         */
        hide: function() {
            var me = this,
                evt = new gmu.Event( 'beforehide' );

            me.trigger( evt );

            // 如果外部阻止了关闭，则什么也不做。
            if ( evt.isDefaultPrevented() ) {
                return;
            }

            me.$root.removeClass( 'ui-in' );
            me._visible = false;
            return me.trigger( 'hide' );
        },

        /**
         * 切换弹出层的显示和隐藏。
         * @method toggle
         * @chainable
         * @return {self} 返回本身。
         */
        toggle: function() {
            var me = this;
            return me[ me._visible ? 'hide' : 'show' ].apply( me, arguments );
        },

        /**
         * 设置或者获取当前`按钮`(被点击的对象)。
         * @method target
         * @param {dom | selector | zepto} [el] target新值。
         * @chainable
         * @return {self} 当传入了el时，此方法为setter, 返回值为self.
         * @return {dom} 当没有传入el时，为getter, 返回当前target值。
         */
        target: function( el ) {

            // getter
            if ( el === undefined ) {
                return this.$target;
            }

            // setter
            var me = this,
                $el = $( el ),
                orig = me.$target,
                click = me._options.event + me.eventNs;

            orig && orig.off( click );

            // 绑定事件
            me.$target = $el.on( click, function( e ) {
                e.preventDefault();
                me.toggle();
            } );

            return me;
        },

        /**
         * 设置当前容器内容。
         * @method setContent
         * @param {dom | selector | zepto} [value] 容器内容
         * @chainable
         * @return {self} 组件本身。
         */
        setContent: function( val ) {
            var container = this.$root;
            container.empty().append( val );
            return this;
        },

        /**
         * 销毁组件，包括事件销毁和删除自动创建的dom.
         * @method destroy
         * @chainable
         * @return {self} 组件本身。
         */
        destroy: function() {
            var me = this;

            me.$target.off( me.eventNs );
            me._checkTemp( me.$root );
            return me.$super( 'destroy' );
        }
    } );
})( gmu, gmu.$ );
/**
 * @file 附近弹出组件
 * @import core/widget.js, widget/popover/popover.js, extend/highlight.js
 * @module GMU
 */
(function( gmu, $ ) {

    /**
     * 附近弹出组件
     *
     * @class Dropmenu
     * @constructor Html部分
     * ```html
     * <a id="btn1" class="btn">Dropmenu</a>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#btn1').dropmenu({
     *  content: [
     *      
     *      'Action',
     *  
     *      'Another Action',
     *  
     *      'Someone else here',
     *  
     *      'divider',
     *  
     *      {
     *          text: 'Open Baidu',
     *          icon: 'grid',
     *          href: 'http://www.baidu.com'
     *      },
     *  ]
     * })
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化组件的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Dropmenu:options)
     * @grammar $( el ).dropmenu( options ) => zepto
     * @grammar new gmu.Dropmenu( el, options ) => instance
     */
    gmu.define( 'Dropmenu', {
        options: {

            // 注意: 以前是叫items, 为了与其他组件统一，所以改名叫content
            /**
             * @property {Array} [content=null] 弹出的内容，每条记录为一个Object，属性有 {text:'', icon: '', href:'' }
             * @namespace options
             */
            content: null
        },

        template: {

            item: '<li><a <% if ( href ) { %>href="<%= href %>"<% } %>>' +
                    '<% if ( icon ) { %><span class="ui-icon ui-icon-' +
                    '<%= icon %>"></span><% } %><%= text %></a></li>',

            divider: '<li class="divider"></li>',

            wrap: '<ul>'
        },

        _init: function() {
            var me = this;

            // 存储ul
            me.on( 'done.dom', function( e, $root ) {
                me.$list = $root.find( 'ul' ).first()
                        .addClass( 'ui-dropmenu-items' )
                        .highlight( 'ui-state-hover',
                                '.ui-dropmenu-items>li:not(.divider)' );
            } );
        },

        _create: function() {
            var me = this,
                opts = me._options,
                content = '';

            // 根据opts.content创建ul>li
            if ( $.type( opts.content ) === 'array' ) {
                
                opts.content.forEach(function( item ) {
                    
                    item = $.extend( {
                        href: '',
                        icon: '',
                        text: ''
                    }, typeof item === 'string' ? {
                        text: item
                    } : item );

                    content += me.tpl2html( item.text === 'divider' ?
                            'divider' : 'item', item );
                });
                opts.content = $( me.tpl2html( 'wrap' ) ).append( content );
            }

            me.$super( '_create' );
            me.$list.on( 'click' + me.eventNs, '.ui-dropmenu-items>li:not(' +
                    '.ui-state-disable):not(.divider)', function( e ) {

                var evt = gmu.Event( 'itemclick', e );
                me.trigger( evt, this );

                if ( evt.isDefaultPrevented() ) {
                    return;
                }
                
                me.hide();
            } );
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event itemclick
         * @param {Event} e gmu.Event对象
         * @param {Element} item 当前点击的条目
         * @description 某个条目被点击时触发
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    }, gmu.Popover );

})( gmu, gmu.$ );
/**
 * @file Dropmenu 支持水平排列插件
 * @module GMU
 * @import widget/dropmenu/dropmenu.js
 */
(function( gmu ) {

    gmu.Dropmenu.options.horizontal = true;

    /**
     * Dropmenu 支持水平排列插件
     *
     * @class horizontal
     * @namespace Dropmenu
     * @pluginfor Dropmenu
     */
    gmu.Dropmenu.option( 'horizontal', true, function() {
        var me = this;

        me.on( 'done.dom', function( e, $root ) {
            $root.addClass( 'ui-horizontal' );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file Dropmenu 简单版定位
 * @module GMU
 * @import widget/dropmenu/dropmenu.js, extend/offset.js
 */
(function( gmu, $ ) {

    // 设置默认Options
    $.extend( gmu.Dropmenu.options, {
        /**
         * @property {String} [placement='bottom'] 默认让其在下方显示
         * @namespace options
         * @for Dropmenu
         * @uses Dropmenu.placement
         */
        placement: 'bottom',

        /**
         * @property {String} [align='center'] 默认居中对齐
         * @namespace options
         * @for Dropmenu
         * @uses Dropmenu.placement
         */
        align: 'center',

        /**
         * @property {Object} [offset=null] 偏移量
         * @namespace options
         * @for Dropmenu
         * @uses Dropmenu.placement
         */
        offset: null
    } );

    /**
     * Dropmenu 简单版定位
     *
     * @class placement
     * @namespace Dropmenu
     * @pluginfor Dropmenu
     */
    gmu.Dropmenu.option( 'placement', function( val ) {
        return ~[ 'top', 'bottom' ].indexOf( val );
    }, function() {
        var config = {
                'top_center': 'center top center bottom',
                'top_left': 'left top left bottom',
                'top_right': 'right top right bottom',
                'bottom_center': 'center bottom center top',
                'bottom_right': 'right bottom right top',
                'bottom_left': 'left bottom left top'
            },
            presets = {},    // 支持的定位方式。

            info;

        $.each( config, function( preset, args ) {
            args = args.split( /\s/g );
            args.unshift( preset );
            presets[ preset ] = function() {
                return placement.apply( null, args );
            };
        } );

        function getPos( pos, len ) {
            return pos === 'right' || pos === 'bottom' ? len :
                        pos === 'center' ? len / 2 : 0;
        }

        // 暂时用简单的方式实现，以后考虑采用position.js
        function placement( preset, atH, atV, myH, myV ) {
            var of = info.of,
                coord = info.coord,
                offset = info.offset,
                top = of.top,
                left = of.left;

            left += getPos( atH, of.width ) - getPos( myH, coord.width );
            top += getPos( atV, of.height ) - getPos( myV, coord.height );

            // offset可以是fn
            offset = typeof offset === 'function' ? offset.call( null, {
                left: left,
                top: top
            }, preset ) : offset || {};

            return {
                left: left + (offset.left || 0),
                top: top + (offset.top || 0)
            };
        }

        this.on( 'placement', function( e, $el, $of ) {
            var me = this,
                opts = me._options,
                placement = opts.placement,
                align = opts.align,
                coord;

            info = {
                coord: $el.offset(),
                of: $of.offset(),
                placement: placement,
                align: align,
                $el: $el,
                $of: $of,
                offset: opts.offset
            };

            // 设置初始值
            coord = presets[ placement + '_' + align ]();

            // 提供机会在设置之前修改位置
            me.trigger( 'before.placement', coord, info, presets );
            
            if ( /^(\w+)_(\w+)$/.test( info.preset ) ) {
                info.placement = RegExp.$1;
                info.align = RegExp.$2;
            }

            $el.offset( coord );

            // 提供给arrow位置定位用
            me.trigger( 'after.placement', coord, info );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 返回顶部组件
 * @import core/widget.js, extend/fix.js, extend/throttle.js, extend/event.scrollStop.js, extend/event.ortchange.js
 * @module GMU
 */
(function( gmu, $, undefined ) {

    /**
     * 返回顶部组件
     *
     * @class Gotop
     * @constructor Html部分
     * ```html
     * <div id="gotop"></div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#gotop').gotop();
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化组件的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Gotop:options)
     * @grammar $( el ).gotop( options ) => zepto
     * @grammar new gmu.Gotop( el, options ) => instance
     */
    gmu.define( 'Gotop', {
        options: {
            /**
             * @property {selector} [container=document.body] 组件容器
             * @namespace options
             */
            container:          '',
            /**
             * @property {Boolean} [useFix=true] 是否使用固顶效果
             * @namespace options
             */
            useFix:             true,
            /**
             * @property {Boolean} [useHide=true] 是否在touchmove的时候隐藏gotop图标
             * @namespace options
             */
            useHide:            true,
            /**
             * @property {Boolean} [useAnimation=false] 返回顶部时是否使用动画,在使用iScroll时,返回顶部的动作由iScroll实例执行,此参数无效
             * @namespace options
             */
            useAnimation:       false,
            /**
             * @property {Object} [position={bottom:10,right:10}] 使用fix效果时，要用的位置参数
             * @namespace options
             */
            position:           {bottom: 10, right: 10},
            /**
             * @property {Function} [afterScroll=null] 返回顶部后执行的回调函数
             * @namespace options
             */
        	afterScroll:        null
        },

        _init: function() {
            var me = this,
                $el,
                _opts = me._options,
                _eventHandler;

            if($.os.version && $.os.version.substr(0, 3) >= 7.0) {
                _opts.position.bottom = 40;
            }

            me.on( 'ready', function(){
                $el = me.$el;
                _eventHandler = $.proxy(me._eventHandler, me);

                _opts['useHide'] && $(document).on('touchmove', _eventHandler);
                $(window).on('touchend touchcancel scrollStop', _eventHandler);
                $(window).on('scroll ortchange', _eventHandler);
                $el.on('click', _eventHandler);
                me.on('destroy', function() {
                    $(window).off('touchend touchcancel scrollStop', _eventHandler);
                    $(document).off('touchmove', _eventHandler);
                    $(window).off('scroll ortchange', _eventHandler);
                });
                _opts['useFix'] && $el.fix(_opts['position']);
                _opts['root'] = $el[0];
            } );

            // 不管是哪种模式创建的，destroy时都将元素移除
            me.on( 'destroy', function() {
                me.$el.remove();
            } );
        },

        _create: function() {
            var me = this;

            if( !me.$el ) {
                me.$el = $('<div></div>');
            }
            me.$el.addClass('ui-gotop').append('<div></div>').appendTo(me._options['container'] || (me.$el.parent().length ? '' : document.body));

            return me;
        },

        /**
         * 事件处理中心
         */
        _eventHandler: function(e) {
            var me = this;

            switch (e.type) {
                case 'touchmove':
                    me.hide();
                    break;
                case 'scroll':
                    clearTimeout(me._options['_TID']);
                    break;
                case 'touchend':
                case 'touchcancel':
                    clearTimeout(me._options['_TID']);
                    me._options['_TID'] = setTimeout(function(){
                        me._check.call(me);
                    }, 300);
                    break;
                case 'scrollStop':
                    me._check();
                    break;
                case 'ortchange':
                    me._check.call(me);
                    break;
                case 'click':
                    me._scrollTo();
                    break;
            }
        },

        /**
         * 判断是否显示gotop
         */
        _check: function(position) {
            var me = this;

            (position !== undefined ? position : window.pageYOffset) > document.documentElement.clientHeight ? me.show() : me.hide();
            
            return  me;
        },

		/**
         * 滚动到顶部或指定节点位置
         */
		_scrollTo: function() {
            var me = this,
                from = window.pageYOffset;

            me.hide();
            clearTimeout(me._options['_TID']);
            if (!me._options['useAnimation']) {
                window.scrollTo(0, 1);
                me.trigger('afterScroll');
            } else {
                me._options['moveToTop'] = setInterval(function() {
                    if (from > 1) {
                        window.scrollBy(0, -Math.min(150,from - 1));
                        from -= 150;
                    } else {
                        clearInterval(me._options['moveToTop']);
                        me.trigger('afterScroll');
                    }
                }, 25, true);
            }
            return me;
		},

        /**
         * 显示gotop
         * @method show
         * @return {self} 返回本身
         */
        show: function() {
            this._options.root.style.display = 'block';

            return this;
        },

        /**
         * 隐藏gotop
         * @method hide
         * @chainable
         * @return {self} 返回本身
         */
        hide: function() {
            this._options.root.style.display = 'none';
            
            return this;
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发
         */

        /**
         * @event afterScroll
         * @param {Event} e gmu.Event对象
         * @description 返回顶部后触发的事件
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });
})( gmu, gmu.$ );

/**
 * @file 历史记录组件
 * @import core/widget.js, extend/touch.js, widget/dialog.js
 * @module GMU
 */

 // TODO 列表区域支持iScroll
(function( gmu, $ ) {
    
    /**
     * 历史记录组件
     *
     * @class Historylist
     * @constructor Html部分
     * ```html
     * <div>
     *     <p><input type="text" class="input-text" id="J_input" /><input type="button" value="取消" class="input-button" /></p>
     *     <div id="J_historyWrap"></div>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     * var instance = new gmu.Historylist({
     *     container: $('#J_historyWrap'), // 页面上需要有一个已经存在的容器来存放组件
     *     items: [
     *             {'value': 'global', 'context': '<b>global</b> adj. 全球的；综合的'},
     *             'google',
     *             {'value': 'visual', 'context': '<b>visual</b> adj. 视觉的'},
     *             'alibaba',
     *             'taobao'
     *            ],   // 历史记录的列表
     *     itemTouch: function(e, data) {  // 某条记录被点击后的响应事件
     *         console.log( 'item touched: ' + data.item );   // data.item是某条记录的内容
     *         $('#J_input').val(data.item);
     *     },
     *     itemDelete: function(e, data) { // 某条记录被删除后的响应事件
     *         console.log( 'item delete:' + data.item );   // data.item是某条记录的内容
     *     },
     *     clear: function() {  // 用户确认清空搜索历史后的响应事件
     *         // 在这里删除localstorage里面存的历史数据
     *         console.log( 'clear triggered' );
     *     }
     * });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化组件的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Historylist:options)
     * @grammar $( el ).historylist( options ) => zepto
     * @grammar new gmu.Historylist( el, options ) => instance
     */
    gmu.define( 'Historylist', {

        options: {

            /**
             * @property {Zepto | Selector | Element} [container=document.body] 容器，默认为 document.body 
             * @namespace options
             */
            container: document.body,

            /**
             * @property {Boolean} [deleteSupport=true] 是否支持滑动删除记录，默认支持
             * @namespace options
             */
            deleteSupport: true,

            /**
             * @property {Array} [items=Array()] 历史记录的数据
             * @namespace options
             */
            items: []
        },

        template: {
            wrap: '<ul class="ui-historylist">',
            item: '<li data-id="<%=id%>"><p class="ui-historylist-itemwrap"><span class="ui-historylist-item"><%=context%></span></p></li>',
            clear: '<p class="ui-historylist-clear">清空搜索历史</p>'
        },

        _init: function() {
            var me = this,
                opts = me._options;

            // js不一定放在页面尾部，所以在init中要重新赋值
            me.$el = opts.container = opts.container || document.body;

            me.items = [];

            me.on( 'ready', function() {
                me._bindUI();
            } );

            me.on( 'itemDelete', function() {
                // 历史记录为空时，隐藏
                if( me.items.length === 0 ) {
                    me.hide();
                }
            } );
        },

        _create: function() {
            var me = this,
                opts = me._options;

            me.$el.hide();
            me.$wrap = $( me.tpl2html( 'wrap' ) ).appendTo( opts.container );

            me.$clear = $( me.tpl2html( 'clear' ) ).appendTo( opts.container );
            !me._options.deleteSupport && me.$clear.hide();

            me.addItems( opts.items );

            me.show();
        },

        _filterItemsById: function( id, callback ) {
            var me = this;

            me.items.forEach( function( _item, index ) {
                if ( _item.id === id ) {
                    callback.call( me, _item, index );

                    return;
                }
            } );
        },

        _bindUI: function() {
            var me = this,
                touch,
                $target,
                itemId,
                startTimestamp,
                endTimestamp,
                wantDelete = false,
                timeout,
                touchstartX,
                currentX,
                touchstartY,
                currentY,
                velocity,
                movedPercentage,
                moved,
                movedDistance;

            me.$clear.on( 'tap' + me.eventNs, function( ev ) {
                // 防止穿透
                setTimeout( function() {
                    gmu.Dialog({
                        closeBtn: false,
                        buttons: {
                            '清空': function(){
                                me.clear();
                                this.destroy();
                            },
                            '取消': function(){
                                this.destroy();
                            }
                        },
                        title: '清空历史',
                        content: '<p>是否清空搜索历史？</p>',
                        open: function(){
                            this._options._wrap.addClass( 'ui-historylist-dialog' );
                        }
                    });
                }, 10 );

                ev.preventDefault();
                ev.stopPropagation();
            } );

            me.$wrap.on( 'tap' + me.eventNs, function(ev) {
                if( me._options.deleteSupport ) {
                    return;
                }

                $target = $( ev.target );

                if( !$target.hasClass( 'ui-historylist-itemwrap' ) && 
                    !($target = $target.parents( '.ui-historylist-itemwrap' )).length ) {
                    $target = null;
                    return;
                }

                itemId = $target.parent().attr( 'data-id' );
                me._filterItemsById( itemId, function( _item ) {
                    me.trigger( 'itemTouch', {'item': _item.value} );
                });

            } );

            me.$wrap.on( 'touchstart' + me.eventNs, function(ev) {

                if( !me._options.deleteSupport ) {
                    return;
                }
                touch = ev.touches[0];
                $target = $( touch.target );
                startTimestamp = ev.timeStamp;
                currentX = touchstartX = parseInt( touch.pageX );
                currentY = touchstartY = parseInt( touch.pageY );
                moved = false;
                wantDelete = false;

                if( !$target.hasClass( 'ui-historylist-itemwrap' ) && 
                    !($target = $target.parents( '.ui-historylist-itemwrap' )).length ) {
                    $target = null;
                    return;
                }

                $target.addClass( 'ui-historylist-ontap' );

                // TODO 用了-webkit-box，就不需要去动态设置width了
                $target.css( 'width',  $target.width() - parseInt( $target.css( 'border-left-width' ) ) - parseInt( $target.css( 'border-right-width' ) ));
            } );

            me.$wrap.on( 'touchmove' + me.eventNs, function(ev) {
                if( !$target ) {
                    return;
                }

                currentX = ev.touches[0].pageX;
                currentY = ev.touches[0].pageY;
                timeout === undefined && (timeout = setTimeout( function() {
                    // 竖向移动的距离大于横向移动距离的一半时，认为用户是企图滚动，而不是删除
                    if( Math.abs( currentY - touchstartY ) > Math.abs (currentX - touchstartX )/2 ){
                        wantDelete = false;
                    }else{
                        wantDelete = true;
                    }

                }, 10 ));
                
                moved = moved || ((currentX - touchstartX >= 3 || currentY - touchstartY >= 3) ? true : false);
                if( !wantDelete ) {
                    setTimeout( function() {
                        $target && $target.removeClass( 'ui-historylist-ontap' );
                    }, 150 );   // 延时长一点，这样不会因为class改变太快，导致闪
                    return;
                }

                movedPercentage = (currentX - touchstartX)/me.$wrap.width();

                // TODO 有些设备上有点卡，需要优化
                $target.addClass( 'ui-historylist-itemmoving' );
                $target.removeClass( 'ui-historylist-ontap' );
                $target.css( '-webkit-transform', 'translate3d(' + (currentX - touchstartX) + 'px, 0, 0)' );
                $target.css( 'opacity', 1 - movedPercentage );
                
                ev.preventDefault();
                ev.stopPropagation();
            } );

            me.$wrap.on( 'touchend' + me.eventNs + ' touchcancel' + me.eventNs, function(ev) {
                if( !$target) {
                    return;
                }

                clearTimeout(timeout);
                timeout = undefined;

                itemId = $target.parent().attr( 'data-id' );
                endTimestamp = ev.timeStamp;
                velocity = (currentX - touchstartX) / (endTimestamp - startTimestamp);
                movedDistance = Math.abs( currentX - touchstartX );

                $target.removeClass( 'ui-historylist-ontap' );
                $target.removeClass( 'ui-historylist-itemmoving' );

                // 当移动的距离小于 1/3 时，速度快则删除，速度慢则还原
                if( ((movedDistance < me.$wrap.width()/3 && Math.abs( velocity ) > 0.1) && wantDelete) ||
                     (movedDistance >= me.$wrap.width()/3 && wantDelete) ) {
                        me.removeItem( itemId, $target );
                } else {
                    $target.css( 'width', 'auto' );
                    $target.css( '-webkit-transform', 'translate3d(0, 0, 0)' );
                    $target.css( 'opacity', 1 );

                    // 移动小于3个像素时，则认为是点击，派发 itemTouch 事件
                    // 如果移出3像素外，再移到3像素内，认为不是点击
                    !moved && movedDistance < 3 && me._filterItemsById( itemId, function( _item ) {
                        me.trigger( 'itemTouch', {'item': _item.value} );
                    });
                }

                $target = null;
            } );
        },

        /**
         * 显示Historylist
         * @method show
         * @return {self} 返回本身。
         */
        show: function() {
            var me = this;

            // 没有历史记录时，不显示
            if( me.items.length === 0 ) {
                return;
            }

            if( me.sync === false ) {
                me.$wrap.html( '' );
                me.addItems( me.syncitems );
                me.sync = true;
            }
            me.$el.show();
            me.isShow = true;

            return me;
        },

        /**
         * 隐藏Historylist
         * @method hide
         * @return {self} 返回本身。
         */
        hide: function() {
            var me = this;

            me.$el.hide();
            me.isShow = false;

            return me;
        },

        _getItemId: function() {
            var me = this;

            me._itemId === undefined ? (me._itemId = 1) : ++me._itemId;

            return '__dd__' + me._itemId;
        },

        _getFormatItem: function( item ) {
            var me = this;

            if( Object.prototype.toString.call( item ) === '[object String]' ) {
                return {
                    'context': item,
                    'value': item,
                    'id': me._getItemId()
                }
            } else {
                return {
                    'context': item.context || item.value,
                    'value': item.value || item.context,
                    'id': me._getItemId()
                }
            }
        },

        /**
         * 添加一条历史记录
         * @method addBtns
         * @param {String|Object} item 历史记录，可以是字符串，也可以是标准格式的对象（包含context和value）
         * @return {self} 返回本身
         */
        addItem: function( item ) {
            var me = this,
                item = me._getFormatItem( item );

            // 检查me.items中是否已存在该项
            me.items.forEach( function( _item, index ) {
                if ( _item.value === item.value ) {
                    me.items.splice( index, 1);
                    $( me.$wrap.children()[index] ).remove();

                    return;
                }
            } );

            me.$wrap.children().length === 0 ? 
                me.$wrap.append( me.tpl2html( 'item', item ) ) : 
                $( me.tpl2html( 'item', item ) ).insertBefore( me.$wrap.children()[0] );
            
            me.items.unshift( item );

            return me;
        },

        /**
         * 添加多条历史记录
         * @method addBtns
         * @param {Array} item 历史记录
         * @return {self} 返回本身
         */
        addItems: function( items ) {
            var me = this;

            items.forEach( function( item ) {
                me.addItem( item );
            } );

            return me;
        },

        /**
         * 更新数据，重新渲染列表
         * @method update
         * @param {Array} item 新的历史记录
         * @return {self} 返回本身
         */
        update: function( items ) {
            var me = this;


            if( me.isShow ) {
                me.$wrap.html( '' );
                me.addItems( items );
                me.sync = true;
            } else {
                me.syncitems = items;
                me.sync = false;
            }

            return me;
        },

        removeItem: function( itemId, $itemTarget ) {
            var me = this,
                distance,
                transform,
                x;

            // 根据当前位移的正负，判断是从右滑出还是从左滑出
            transform = $itemTarget.css( '-webkit-transform');
            x = /translate3d\((.*?),.*/.test(transform) ? RegExp.$1: 0;
            distance = parseInt( x, 10) >= 0 ? $itemTarget.width() : -$itemTarget.width();
            $itemTarget.css( '-webkit-transform', 'translate3d(' + distance + 'px, 0, 0)' );

            // TODO 根据位移改变透明度，感觉不出来，没必要加

            $itemTarget.on( 'transitionEnd' + me.eventNs +  ' webkitTransitionEnd' + me.eventNs, function() {
                $itemTarget.parent().remove();

                me._filterItemsById( itemId, function( _item, index ) {
                    me.items.splice( index, 1);
                    me.trigger( 'itemDelete', {'item': _item.value} );
                });
            } );

        },

        /**
         * 清空历史记录
         * @method clear
         * @return {self} 返回本身
         */
        clear: function() {
            var me = this;

            me.$wrap.html( '' );
            me.items = [];
            me.sync = true;
            me.hide();
            me.trigger( 'clear' );

            return me;
        },

        /**
         * 禁用删除功能
         * @method disableDelete
         * @return {self} 返回本身
         */
        disableDelete: function() {
            var me = this;

            me._options.deleteSupport = false;
            me.$clear.hide();

            return me;
        },

        /**
         * 启用删除功能
         * @method enableDelete
         * @return {self} 返回本身
         */
        enableDelete: function() {
            var me = this;

            me._options.deleteSupport = true;
            me.$clear.show();

            return me;
        },

        /**
         * 销毁组件
         * @method destroy
         */
        destroy: function() {
            var me = this;

            me.$wrap.off( me.eventNs );
            me.$clear.off( me.eventNs );

            me.$wrap.remove();
            me.$clear.remove();

            return me.$super( 'destroy' );
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event itemTouch
         * @param {Event} e gmu.Event对象
         * @param {String} item 被点击的记录的value
         * @description 点击某条历史记录时触发
         */

        /**
         * @event itemDelete
         * @param {Event} e gmu.Event对象
         * @param {String} item 被删除的记录的value
         * @description 删除某条历史记录时触发
         */

        /**
         * @event clear
         * @param {Event} e gmu.Event对象
         * @description 清除历史记录时触发
         */

        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    } );
})( gmu, gmu.$ );


/**
 * @file 导航栏组件
 * @import core/widget.js, extend/highlight.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    
    /**
     * 导航栏组件
     *
     * @class Navigator
     * @constructor Html部分
     * ```html
     * 
     * ```
     *
     * javascript部分
     * ```javascript
     * 
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化导航栏的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Navigator:options)
     * @grammar $( el ).navigator( options ) => zepto
     * @grammar new gmu.Navigator( el, options ) => instance
     */
    gmu.define( 'Navigator', {
        options: {

            /**
             * @property {Array} [content=null] 菜单数组
             * @namespace options
             */
            content: null,

            /**
             * @property {String} [event='click'] 交互事件名
             * @namespace options
             */
            event: 'click'
        },

        template: {
            list: '<ul>',
            item: '<li><a<% if( href ) { %> href="<%= href %>"<% } %>>' +
                    '<%= text %></a></li>'
        },

        _create: function() {
            var me = this,
                opts = me._options,
                $el = me.getEl(),
                $list = $el.find( 'ul' ).first(),
                name = 'ui-' + me.widgetName,
                renderer,
                html;

            // 如果没有包含ul节点，则说明通过指定content来create
            // 建议把create模式给拆出去。很多时候都是先写好在dom中了。
            if ( !$list.length && opts.content ) {
                $list = $( me.tpl2html( 'list' ) );
                renderer = me.tpl2html( 'item' );

                html = '';
                opts.content.forEach(function( item ) {

                    // 如果不提供默认值，然后同时某些key没有传值，parseTpl会报错
                    item = $.extend( {
                        href: '',
                        text: ''
                    }, typeof item === 'string' ? {
                        text: item
                    } : item );

                    html += renderer( item );
                });

                $list.append( html ).appendTo( $el );
            } else {
                
                // 处理直接通过ul初始化的情况
                if ( $el.is( 'ul, ol' ) ) {
                    $list = $el.wrap( '<div>' );
                    $el = $el.parent();
                }

                if ( opts.index === undefined ) {

                    // 如果opts中没有指定index, 则尝试从dom中查看是否有比较为ui-state-active的
                    opts.index = $list.find( '.ui-state-active' ).index();
                    
                    // 没找到还是赋值为0
                    ~opts.index || (opts.index = 0);
                }
            }

            me.$list = $list.addClass( name + '-list' );
            me.trigger( 'done.dom', $el.addClass( name ), opts );

            // bind Events
            $list.highlight( 'ui-state-hover', 'li' );
            $list.on( opts.event + me.eventNs,
                    'li:not(.ui-state-disable)>a', function( e ) {
                me._switchTo( $( this ).parent().index(), e );
            } );

            me.index = -1;
            me.switchTo( opts.index );
        },

        _switchTo: function( to, e ) {
            if ( to === this.index ) {
                return;
            }

            var me = this,
                list = me.$list.children(),
                evt = gmu.Event( 'beforeselect', e ),
                cur;
                
            me.trigger( evt, list.get( to ) );
            
            if ( evt.isDefaultPrevented() ) {
                return;
            }

            cur = list.removeClass( 'ui-state-active' )
                    .eq( to )
                    .addClass( 'ui-state-active' );

            me.index = to;
            return me.trigger( 'select', to, cur[ 0 ] );
        },

        /**
         * 切换到导航栏的某一项
         * @param {Number} to 序号
         * @method switchTo
         */
        switchTo: function( to ) {
            return this._switchTo( ~~to );
        },

        /**
         * 取消选择
         * @method unselect
         */
        unselect: function() {
            this.index = -1;
            this.$list.children().removeClass( 'ui-state-active' );
        },

        /**
         * 获取当前选中的序号
         * @method getIndex
         */
        getIndex: function() {
            return this.index;
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event beforeselect
         * @param {Event} e gmu.Event对象
         * @param {Element} 目标元素
         * @description 当选择的序号发生切换前触发
         */
        
        /**
         * @event select
         * @param {Event} e gmu.Event对象
         * @param {Event} 当前选择的序号
         * @param {Element} 上一次选择的元素
         * @description 当选择的序号发生切换后触发
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    } );
})( gmu, gmu.$ );
/*!
 * iScroll v4.2.2 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(window, doc){
    var m = Math,_bindArr = [],
        dummyStyle = doc.createElement('div').style,
        vendor = (function () {
            var vendors = 'webkitT,MozT,msT,OT,t'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for ( ; i < l; i++ ) {
                t = vendors[i] + 'ransform';
                if ( t in dummyStyle ) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',


    // Style properties
        transform = prefixStyle('transform'),
        transitionProperty = prefixStyle('transitionProperty'),
        transitionDuration = prefixStyle('transitionDuration'),
        transformOrigin = prefixStyle('transformOrigin'),
        transitionTimingFunction = prefixStyle('transitionTimingFunction'),
        transitionDelay = prefixStyle('transitionDelay'),

    // Browser capabilities
        isAndroid = (/android/gi).test(navigator.appVersion),
        isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),

        has3d = prefixStyle('perspective') in dummyStyle,
        hasTouch = 'ontouchstart' in window && !isTouchPad,
        hasTransform = !!vendor,
        hasTransitionEnd = prefixStyle('transition') in dummyStyle,

        RESIZE_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
        START_EV = hasTouch ? 'touchstart' : 'mousedown',
        MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
        END_EV = hasTouch ? 'touchend' : 'mouseup',
        CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
        TRNEND_EV = (function () {
            if ( vendor === false ) return false;

            var transitionEnd = {
                ''			: 'transitionend',
                'webkit'	: 'webkitTransitionEnd',
                'Moz'		: 'transitionend',
                'O'			: 'otransitionend',
                'ms'		: 'MSTransitionEnd'
            };

            return transitionEnd[vendor];
        })(),

        nextFrame = (function() {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) { return setTimeout(callback, 1); };
        })(),
        cancelFrame = (function () {
            return window.cancelRequestAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.webkitCancelRequestAnimationFrame ||
                window.mozCancelRequestAnimationFrame ||
                window.oCancelRequestAnimationFrame ||
                window.msCancelRequestAnimationFrame ||
                clearTimeout;
        })(),

    // Helpers
        translateZ = has3d ? ' translateZ(0)' : '',

    // Constructor
        iScroll = function (el, options) {
            var that = this,
                i;

            that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
            that.wrapper.style.overflow = 'hidden';
            that.scroller = that.wrapper.children[0];

            that.translateZ = translateZ;
            // Default options
            that.options = {
                hScroll: true,
                vScroll: true,
                x: 0,
                y: 0,
                bounce: true,
                bounceLock: false,
                momentum: true,
                lockDirection: true,
                useTransform: true,
                useTransition: false,
                topOffset: 0,
                checkDOMChanges: false,		// Experimental
                handleClick: true,


                // Events
                onRefresh: null,
                onBeforeScrollStart: function (e) { e.preventDefault(); },
                onScrollStart: null,
                onBeforeScrollMove: null,
                onScrollMove: null,
                onBeforeScrollEnd: null,
                onScrollEnd: null,
                onTouchEnd: null,
                onDestroy: null

            };

            // User defined options
            for (i in options) that.options[i] = options[i];

            // Set starting position
            that.x = that.options.x;
            that.y = that.options.y;

            // Normalize options
            that.options.useTransform = hasTransform && that.options.useTransform;

            that.options.useTransition = hasTransitionEnd && that.options.useTransition;



            // Set some default styles
            that.scroller.style[transitionProperty] = that.options.useTransform ? cssVendor + 'transform' : 'top left';
            that.scroller.style[transitionDuration] = '0';
            that.scroller.style[transformOrigin] = '0 0';
            if (that.options.useTransition) that.scroller.style[transitionTimingFunction] = 'cubic-bezier(0.33,0.66,0.66,1)';

            if (that.options.useTransform) that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px)' + translateZ;
            else that.scroller.style.cssText += ';position:absolute;top:' + that.y + 'px;left:' + that.x + 'px';



            that.refresh();

            that._bind(RESIZE_EV, window);
            that._bind(START_EV);


            if (that.options.checkDOMChanges) that.checkDOMTime = setInterval(function () {
                that._checkDOMChanges();
            }, 500);
        };

// Prototype
    iScroll.prototype = {
        enabled: true,
        x: 0,
        y: 0,
        steps: [],
        scale: 1,
        currPageX: 0, currPageY: 0,
        pagesX: [], pagesY: [],
        aniTime: null,
        isStopScrollAction:false,

        handleEvent: function (e) {
            var that = this;
            switch(e.type) {
                case START_EV:
                    if (!hasTouch && e.button !== 0) return;
                    that._start(e);
                    break;
                case MOVE_EV: that._move(e); break;
                case END_EV:
                case CANCEL_EV: that._end(e); break;
                case RESIZE_EV: that._resize(); break;
                case TRNEND_EV: that._transitionEnd(e); break;
            }
        },

        _checkDOMChanges: function () {
            if (this.moved ||  this.animating ||
                (this.scrollerW == this.scroller.offsetWidth * this.scale && this.scrollerH == this.scroller.offsetHeight * this.scale)) return;

            this.refresh();
        },

        _resize: function () {
            var that = this;
            setTimeout(function () { that.refresh(); }, isAndroid ? 200 : 0);
        },

        _pos: function (x, y) {
            x = this.hScroll ? x : 0;
            y = this.vScroll ? y : 0;

            if (this.options.useTransform) {
                this.scroller.style[transform] = 'translate(' + x + 'px,' + y + 'px) scale(' + this.scale + ')' + translateZ;
            } else {
                x = m.round(x);
                y = m.round(y);
                this.scroller.style.left = x + 'px';
                this.scroller.style.top = y + 'px';
            }

            this.x = x;
            this.y = y;

        },



        _start: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                matrix, x, y,
                c1, c2;

            if (!that.enabled) return;

            if (that.options.onBeforeScrollStart) that.options.onBeforeScrollStart.call(that, e);

            if (that.options.useTransition ) that._transitionTime(0);

            that.moved = false;
            that.animating = false;

            that.distX = 0;
            that.distY = 0;
            that.absDistX = 0;
            that.absDistY = 0;
            that.dirX = 0;
            that.dirY = 0;
            that.isStopScrollAction = false;

            if (that.options.momentum) {
                if (that.options.useTransform) {
                    // Very lame general purpose alternative to CSSMatrix
                    matrix = getComputedStyle(that.scroller, null)[transform].replace(/[^0-9\-.,]/g, '').split(',');
                    x = +matrix[4];
                    y = +matrix[5];
                } else {
                    x = +getComputedStyle(that.scroller, null).left.replace(/[^0-9-]/g, '');
                    y = +getComputedStyle(that.scroller, null).top.replace(/[^0-9-]/g, '');
                }

                if (m.round(x) != m.round(that.x) || m.round(y) != m.round(that.y)) {
                    that.isStopScrollAction = true;
                    if (that.options.useTransition) that._unbind(TRNEND_EV);
                    else cancelFrame(that.aniTime);
                    that.steps = [];
                    that._pos(x, y);
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
                }
            }



            that.startX = that.x;
            that.startY = that.y;
            that.pointX = point.pageX;
            that.pointY = point.pageY;

            that.startTime = e.timeStamp || Date.now();

            if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);

            that._bind(MOVE_EV, window);
            that._bind(END_EV, window);
            that._bind(CANCEL_EV, window);
        },

        _move: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                deltaX = point.pageX - that.pointX,
                deltaY = point.pageY - that.pointY,
                newX = that.x + deltaX,
                newY = that.y + deltaY,

                timestamp = e.timeStamp || Date.now();

            if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);

            that.pointX = point.pageX;
            that.pointY = point.pageY;

            // Slow down if outside of the boundaries
            if (newX > 0 || newX < that.maxScrollX) {
                newX = that.options.bounce ? that.x + (deltaX / 2) : newX >= 0 || that.maxScrollX >= 0 ? 0 : that.maxScrollX;
            }
            if (newY > that.minScrollY || newY < that.maxScrollY) {
                newY = that.options.bounce ? that.y + (deltaY / 2) : newY >= that.minScrollY || that.maxScrollY >= 0 ? that.minScrollY : that.maxScrollY;
            }

            that.distX += deltaX;
            that.distY += deltaY;
            that.absDistX = m.abs(that.distX);
            that.absDistY = m.abs(that.distY);

            if (that.absDistX < 6 && that.absDistY < 6) {
                return;
            }

            // Lock direction
            if (that.options.lockDirection) {
                if (that.absDistX > that.absDistY + 5) {
                    newY = that.y;
                    deltaY = 0;
                } else if (that.absDistY > that.absDistX + 5) {
                    newX = that.x;
                    deltaX = 0;
                }
            }

            that.moved = true;

            // internal for header scroll

            that._beforePos ? that._beforePos(newY, deltaY) && that._pos(newX, newY) : that._pos(newX, newY);

            that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

            if (timestamp - that.startTime > 300) {
                that.startTime = timestamp;
                that.startX = that.x;
                that.startY = that.y;
            }

            if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
        },

        _end: function (e) {
            if (hasTouch && e.touches.length !== 0) return;

            var that = this,
                point = hasTouch ? e.changedTouches[0] : e,
                target, ev,
                momentumX = { dist:0, time:0 },
                momentumY = { dist:0, time:0 },
                duration = (e.timeStamp || Date.now()) - that.startTime,
                newPosX = that.x,
                newPosY = that.y,
                newDuration;


            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);

            if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);


            if (!that.moved) {

                if (hasTouch && this.options.handleClick && !that.isStopScrollAction) {
                    that.doubleTapTimer = setTimeout(function () {
                        that.doubleTapTimer = null;

                        // Find the last touched element
                        target = point.target;
                        while (target.nodeType != 1) target = target.parentNode;

                        if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
                            ev = doc.createEvent('MouseEvents');
                            ev.initMouseEvent('click', true, true, e.view, 1,
                                point.screenX, point.screenY, point.clientX, point.clientY,
                                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                                0, null);
                            ev._fake = true;
                            target.dispatchEvent(ev);
                        }
                    },  0);
                }


                that._resetPos(400);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }

            if (duration < 300 && that.options.momentum) {
                momentumX = newPosX ? that._momentum(newPosX - that.startX, duration, -that.x, that.scrollerW - that.wrapperW + that.x, that.options.bounce ? that.wrapperW : 0) : momentumX;
                momentumY = newPosY ? that._momentum(newPosY - that.startY, duration, -that.y, (that.maxScrollY < 0 ? that.scrollerH - that.wrapperH + that.y - that.minScrollY : 0), that.options.bounce ? that.wrapperH : 0) : momentumY;

                newPosX = that.x + momentumX.dist;
                newPosY = that.y + momentumY.dist;

                if ((that.x > 0 && newPosX > 0) || (that.x < that.maxScrollX && newPosX < that.maxScrollX)) momentumX = { dist:0, time:0 };
                if ((that.y > that.minScrollY && newPosY > that.minScrollY) || (that.y < that.maxScrollY && newPosY < that.maxScrollY)) momentumY = { dist:0, time:0 };
            }

            if (momentumX.dist || momentumY.dist) {
                newDuration = m.max(m.max(momentumX.time, momentumY.time), 10);



                that.scrollTo(m.round(newPosX), m.round(newPosY), newDuration);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }



            that._resetPos(200);
            if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
        },

        _resetPos: function (time) {
            var that = this,
                resetX = that.x >= 0 ? 0 : that.x < that.maxScrollX ? that.maxScrollX : that.x,
                resetY = that.y >= that.minScrollY || that.maxScrollY > 0 ? that.minScrollY : that.y < that.maxScrollY ? that.maxScrollY : that.y;

            if (resetX == that.x && resetY == that.y) {
                if (that.moved) {
                    that.moved = false;
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);		// Execute custom code on scroll end
                    if (that._afterPos) that._afterPos();
                }

                return;
            }

            that.scrollTo(resetX, resetY, time || 0);
        },



        _transitionEnd: function (e) {
            var that = this;

            if (e.target != that.scroller) return;

            that._unbind(TRNEND_EV);

            that._startAni();
        },


        /**
         *
         * Utilities
         *
         */
        _startAni: function () {
            var that = this,
                startX = that.x, startY = that.y,
                startTime = Date.now(),
                step, easeOut,
                animate;

            if (that.animating) return;

            if (!that.steps.length) {
                that._resetPos(400);
                return;
            }

            step = that.steps.shift();

            if (step.x == startX && step.y == startY) step.time = 0;

            that.animating = true;
            that.moved = true;

            if (that.options.useTransition) {
                that._transitionTime(step.time);
                that._pos(step.x, step.y);
                that.animating = false;
                if (step.time) that._bind(TRNEND_EV);
                else that._resetPos(0);
                return;
            }

            animate = function () {
                var now = Date.now(),
                    newX, newY;

                if (now >= startTime + step.time) {
                    that._pos(step.x, step.y);
                    that.animating = false;
                    if (that.options.onAnimationEnd) that.options.onAnimationEnd.call(that);			// Execute custom code on animation end
                    that._startAni();
                    return;
                }

                now = (now - startTime) / step.time - 1;
                easeOut = m.sqrt(1 - now * now);
                newX = (step.x - startX) * easeOut + startX;
                newY = (step.y - startY) * easeOut + startY;
                that._pos(newX, newY);
                if (that.animating) that.aniTime = nextFrame(animate);
            };

            animate();
        },

        _transitionTime: function (time) {
            time += 'ms';
            this.scroller.style[transitionDuration] = time;

        },

        _momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
            var deceleration = 0.0006,
                speed = m.abs(dist) * (this.options.speedScale||1) / time,
                newDist = (speed * speed) / (2 * deceleration),
                newTime = 0, outsideDist = 0;

            // Proportinally reduce speed if we are outside of the boundaries
            if (dist > 0 && newDist > maxDistUpper) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistUpper = maxDistUpper + outsideDist;
                speed = speed * maxDistUpper / newDist;
                newDist = maxDistUpper;
            } else if (dist < 0 && newDist > maxDistLower) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistLower = maxDistLower + outsideDist;
                speed = speed * maxDistLower / newDist;
                newDist = maxDistLower;
            }

            newDist = newDist * (dist < 0 ? -1 : 1);
            newTime = speed / deceleration;

            return { dist: newDist, time: m.round(newTime) };
        },

        _offset: function (el) {
            var left = -el.offsetLeft,
                top = -el.offsetTop;

            while (el = el.offsetParent) {
                left -= el.offsetLeft;
                top -= el.offsetTop;
            }

            if (el != this.wrapper) {
                left *= this.scale;
                top *= this.scale;
            }

            return { left: left, top: top };
        },



        _bind: function (type, el, bubble) {
            _bindArr.concat([el || this.scroller, type, this]);
            (el || this.scroller).addEventListener(type, this, !!bubble);
        },

        _unbind: function (type, el, bubble) {
            (el || this.scroller).removeEventListener(type, this, !!bubble);
        },


        /**
         *
         * Public methods
         *
         */
        destroy: function () {
            var that = this;

            that.scroller.style[transform] = '';



            // Remove the event listeners
            that._unbind(RESIZE_EV, window);
            that._unbind(START_EV);
            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);



            if (that.options.useTransition) that._unbind(TRNEND_EV);

            if (that.options.checkDOMChanges) clearInterval(that.checkDOMTime);

            if (that.options.onDestroy) that.options.onDestroy.call(that);

            //清除所有绑定的事件
            for (var i = 0, l = _bindArr.length; i < l;) {
                _bindArr[i].removeEventListener(_bindArr[i + 1], _bindArr[i + 2]);
                _bindArr[i] = null;
                i = i + 3
            }
            _bindArr = [];

            //干掉外边的容器内容
            /*var div = doc.createElement('div');
            div.appendChild(this.wrapper);
            div.innerHTML = '';
            that.wrapper = that.scroller = div = null;*/
        },

        refresh: function () {
            var that = this,
                offset;



            that.wrapperW = that.wrapper.clientWidth || 1;
            that.wrapperH = that.wrapper.clientHeight || 1;

            that.minScrollY = -that.options.topOffset || 0;
            that.scrollerW = m.round(that.scroller.offsetWidth * that.scale);
            that.scrollerH = m.round((that.scroller.offsetHeight + that.minScrollY) * that.scale);
            that.maxScrollX = that.wrapperW - that.scrollerW;
            that.maxScrollY = that.wrapperH - that.scrollerH + that.minScrollY;
            that.dirX = 0;
            that.dirY = 0;

            if (that.options.onRefresh) that.options.onRefresh.call(that);

            that.hScroll = that.options.hScroll && that.maxScrollX < 0;
            that.vScroll = that.options.vScroll && (!that.options.bounceLock && !that.hScroll || that.scrollerH > that.wrapperH);


            offset = that._offset(that.wrapper);
            that.wrapperOffsetLeft = -offset.left;
            that.wrapperOffsetTop = -offset.top;


            that.scroller.style[transitionDuration] = '0';
            that._resetPos(400);
        },

        scrollTo: function (x, y, time, relative) {
            var that = this,
                step = x,
                i, l;

            that.stop();

            if (!step.length) step = [{ x: x, y: y, time: time, relative: relative }];

            for (i=0, l=step.length; i<l; i++) {
                if (step[i].relative) { step[i].x = that.x - step[i].x; step[i].y = that.y - step[i].y; }
                that.steps.push({ x: step[i].x, y: step[i].y, time: step[i].time || 0 });
            }

            that._startAni();
        },

        scrollToElement: function (el, time) {
            var that = this, pos;
            el = el.nodeType ? el : that.scroller.querySelector(el);
            if (!el) return;

            pos = that._offset(el);
            pos.left += that.wrapperOffsetLeft;
            pos.top += that.wrapperOffsetTop;

            pos.left = pos.left > 0 ? 0 : pos.left < that.maxScrollX ? that.maxScrollX : pos.left;
            pos.top = pos.top > that.minScrollY ? that.minScrollY : pos.top < that.maxScrollY ? that.maxScrollY : pos.top;
            time = time === undefined ? m.max(m.abs(pos.left)*2, m.abs(pos.top)*2) : time;

            that.scrollTo(pos.left, pos.top, time);
        },

        scrollToPage: function (pageX, pageY, time) {
            var that = this, x, y;

            time = time === undefined ? 400 : time;

            if (that.options.onScrollStart) that.options.onScrollStart.call(that);


            x = -that.wrapperW * pageX;
            y = -that.wrapperH * pageY;
            if (x < that.maxScrollX) x = that.maxScrollX;
            if (y < that.maxScrollY) y = that.maxScrollY;


            that.scrollTo(x, y, time);
        },

        disable: function () {
            this.stop();
            this._resetPos(0);
            this.enabled = false;

            // If disabled after touchstart we make sure that there are no left over events
            this._unbind(MOVE_EV, window);
            this._unbind(END_EV, window);
            this._unbind(CANCEL_EV, window);
        },

        enable: function () {
            this.enabled = true;
        },

        stop: function () {
            if (this.options.useTransition) this._unbind(TRNEND_EV);
            else cancelFrame(this.aniTime);
            this.steps = [];
            this.moved = false;
            this.animating = false;
        },

        isReady: function () {
            return !this.moved &&  !this.animating;
        }
    };

    function prefixStyle (style) {
        if ( vendor === '' ) return style;

        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }

    dummyStyle = null;	// for the sake of it

    if (typeof exports !== 'undefined') exports.iScroll = iScroll;
    else window.iScroll = iScroll;

    // 给$.fn上挂iScroll方法
    (function( $, ns, undefined ){
        if(!$)return;

        var _iScroll = ns.iScroll,

            slice = [].slice,
            
            record = (function() {
                var data = {},
                    id = 0,
                    ikey = '_sid';    // internal key.

                return function( obj, val ) {
                    var key = obj[ ikey ] || (obj[ ikey ] = ++id);

                    val !== undefined && (data[ key ] = val);
                    val === null && delete data[ key ];

                    return data[ key ];
                };
            })(),

            iScroll;

        ns.iScroll = iScroll = function( el, options ){
            var args = [].slice.call( arguments, 0 ),
                ins = new _iScroll( el, options );

            record( el, ins );
            return ins;
        };
        iScroll.prototype = _iScroll.prototype;


        $.fn.iScroll = function( opts ) {
            var args = slice.call( arguments, 1 ),
                method = typeof opts === 'string' && opts,
                ret,
                obj;

            $.each( this, function( i, el ) {

                // 从缓存中取，没有则创建一个
                obj = record( el ) || iScroll( el, $.isPlainObject( opts ) ?
                        opts : undefined );

                // 取实例
                if ( method === 'this' ) {
                    ret = obj;
                    return false;    // 断开each循环
                } else if ( method ) {

                    // 当取的方法不存在时，抛出错误信息
                    if ( !$.isFunction( obj[ method ] ) ) {
                        throw new Error( 'iScroll没有此方法：' + method );
                    }

                    ret = obj[ method ].apply( obj, args );

                    // 断定它是getter性质的方法，所以需要断开each循环，把结果返回
                    if ( ret !== undefined && ret !== obj ) {
                        return false;
                    }

                    // ret为obj时为无效值，为了不影响后面的返回
                    ret = undefined;
                }
            } );

            return ret !== undefined ? ret : this;
        };

    })( window.Zepto || null, window );
})(window, document);
/**
 * Change list
 * 修改记录
 *
 * 1. 2012-08-14 解决滑动中按住停止滚动，松开后被点元素触发点击事件。
 *
 * 具体修改:
 * a. 202行 添加isStopScrollAction: false 给iScroll的原型上添加变量
 * b. 365行 _start方法里面添加that.isStopScrollAction = false; 默认让这个值为false
 * c. 390行 if (x != that.x || y != that.y)条件语句里面 添加了  that.isStopScrollAction = true; 当目标值与实际值不一致，说明还在滚动动画中
 * d. 554行 that.isStopScrollAction || (that.doubleTapTimer = setTimeout(function () {
 *          ......
 *          ......
 *          }, that.options.zoom ? 250 : 0));
 *   如果isStopScrollAction为true就不派送click事件
 *
 *
 * 2. 2012-08-14 给options里面添加speedScale属性，提供外部控制冲量滚动速度
 *
 * 具体修改
 * a. 108行 添加speedScale: 1, 给options里面添加speedScale属性，默认为1
 * b. 798行 speed = m.abs(dist) * this.options.speedScale / time, 在原来速度的基础上*speedScale来改变速度
 *
 * 3. 2012-08-21 修改部分代码，给iscroll_plugin墙用的
 *
 * 具体修改
 * a. 517行  在_pos之前，调用_beforePos,如果里面不返回true,  将不会调用_pos
 *  // internal for header scroll
 *  if (that._beforePos)
 *      that._beforePos(newY, deltaY) && that._pos(newX, newY);
 *  else
 *      that._pos(newX, newY);
 *
 * b. 680行 在滚动结束后调用 _afterPos.
 * // internal for header scroll
 * if (that._afterPos) that._afterPos();
 *
 * c. 106行构造器里面添加以下代码
 * // add var to this for header scroll
 * that.translateZ = translateZ;
 *
 * 为处理溢出
 * _bind 方法
 * destroy 方法
 * 最开头的 _bindArr = []
 *
 */
/**
 * @file GMU定制版iscroll，基于[iScroll 4.2.2](http://cubiq.org/iscroll-4), 去除zoom, pc兼容，snap, scrollbar等功能。同时把iscroll扩展到了Zepto的原型中。
 * @name iScroll
 * @import zepto.js
 * @desc GMU定制版iscroll，基于{@link[http://cubiq.org/iscroll-4] iScroll 4.2.2}, 去除zoom, pc兼容，snap, scrollbar等功能。同时把iscroll扩展到了***Zepto***的原型中。
 */

/**
 * @name iScroll
 * @grammar new iScroll(el,[options])  ⇒ self
 * @grammar $('selecotr').iScroll([options])  ⇒ zepto实例
 * @desc 将iScroll加入到了***$.fn***中，方便用Zepto的方式调用iScroll。
 * **el**
 * - ***el {String/ElementNode}*** iscroll容器节点
 *
 * **Options**
 * - ***hScroll*** {Boolean}: (可选, 默认: true)横向是否可以滚动
 * - ***vScroll*** {Boolean}: (可选, 默认: true)竖向是否可以滚动
 * - ***momentum*** {Boolean}: (可选, 默认: true)是否带有滚动效果
 * - ***checkDOMChanges*** {Boolean, 默认: false}: (可选)每个500毫秒判断一下滚动区域的容器是否有新追加的内容，如果有就调用refresh重新渲染一次
 * - ***useTransition*** {Boolean, 默认: false}: (可选)是否使用css3来来实现动画，默认是false,建议开启
 * - ***topOffset*** {Number}: (可选, 默认: 0)可滚动区域头部缩紧多少高度，默认是0， ***主要用于头部下拉加载更多时，收起头部的提示按钮***
 * @example
 * $('div').iscroll().find('selector').atrr({'name':'aaa'}) //保持链式调用
 * $('div').iScroll('refresh');//调用iScroll的方法
 * $('div').iScroll('scrollTo', 0, 0, 200);//调用iScroll的方法, 200ms内滚动到顶部
 */


/**
 * @name destroy
 * @desc 销毁iScroll实例，在原iScroll的destroy的基础上对创建的dom元素进行了销毁
 * @grammar destroy()  ⇒ undefined
 */

/**
 * @name refresh
 * @desc 更新iScroll实例，在滚动的内容增减时，或者可滚动区域发生变化时需要调用***refresh***方法来纠正。
 * @grammar refresh()  ⇒ undefined
 */

/**
 * @name scrollTo
 * @desc 使iScroll实例，在指定时间内滚动到指定的位置， 如果relative为true, 说明x, y的值是相对与当前位置的。
 * @grammar scrollTo(x, y, time, relative)  ⇒ undefined
 */
/**
 * @name scrollToElement
 * @desc 滚动到指定内部元素
 * @grammar scrollToElement(element, time)  ⇒ undefined
 * @grammar scrollToElement(selector, time)  ⇒ undefined
 */
/**
 * @name scrollToPage
 * @desc 跟scrollTo很像，这里传入的是百分比。
 * @grammar scrollToPage(pageX, pageY, time)  ⇒ undefined
 */
/**
 * @name disable
 * @desc 禁用iScroll
 * @grammar disable()  ⇒ undefined
 */
/**
 * @name enable
 * @desc 启用iScroll
 * @grammar enable()  ⇒ undefined
 */
/**
 * @name stop
 * @desc 定制iscroll滚动
 * @grammar stop()  ⇒ undefined
 */


/**
 * @file Navigator的可滚插件， 采用iScroll来实现。
 * @module GMU
 * @import widget/navigator/navigator.js, extend/iscroll.js, extend/event.ortchange.js
 */
(function( gmu, $, undefined ) {

    /**
     * @property {Object} [iScroll={}] iScroll配置
     * @namespace options
     * @for Navigator
     * @uses Navigator.scrollable
     */
    gmu.Navigator.options.iScroll = {
        hScroll: true,
        vScroll: false,
        hScrollbar: false,
        vScrollbar: false
    };

    /**
     * Navigator的可滚插件， 采用iScroll来实现。
     *
     * @class scrollable
     * @namespace Navigator
     * @pluginfor Navigator
     */
    gmu.Navigator.register( 'scrollable', {

        _init: function() {
            var me = this,
                opts = me._options;

            me.on( 'done.dom', function() {
                me.$list.wrap( '<div class="ui-scroller"></div>' );

                me.trigger( 'init.iScroll' );
                me.$el.iScroll( $.extend( {}, opts.iScroll ) );
            } );

            $( window ).on( 'ortchange' + me.eventNs,
                    $.proxy( me.refresh, me ) );

            me.on('destroy', function(){
                me.$el.iScroll( 'destroy' );
                $( window ).off( 'ortchange' + me.eventNs );
            } );
        },

        /**
         * 刷新iscroll
         * @method refresh
         * @for Navigator
         * @uses Navigator.scrollable
         */
        refresh: function() {
            this.trigger( 'refresh.iScroll' ).$el.iScroll( 'refresh' );
        }

        /**
         * @event refresh.iScroll
         * @param {Event} e gmu.Event对象
         * @description iscroll刷新前触发
         */
    } );
})( gmu, gmu.$ );
/**
 * @file 平均分配按钮，根据传入的visibleCount, 来平均分配宽度, 此插件主要用来加强
 * scrollable, 如果内容不可滚，用纯样式就能实现这块。
 * @import widget/navigator/navigator.js, widget/navigator/$scrollable.js
 */
(function( gmu, $, undefined ) {
    gmu.Navigator.options.visibleCount = 4;

    /**
     * 平均分配按钮，根据传入的visibleCount, 来平均分配宽度, 此插件主要用来加强
     * scrollable, 如果内容不可滚，用纯样式就能实现这块。
     * @class visibleCount
     * @namespace Navigator
     * @pluginfor Navigator
     */
    gmu.Navigator.option( 'visibleCount', '*', function() {
        var me = this,
            opts = me._options,
            counts = $.type( opts.visibleCount ) === 'number' ? {
                portrait: opts.visibleCount,
                landscape: Math.floor( opts.visibleCount * 3 / 2 )
            } : opts.visibleCount;

        me.on( 'init.iScroll refresh.iScroll', arrage );

        function arrage( e ) {
            
            // todo 采用一种更精准的方法来获取横竖屏
            var ort = window.innerWidth > window.innerHeight ?
                    'landscape' : 'portrait',
                count = counts[ ort ],
                $el = me.$el;
            
            //TODO 横竖屏切换时，不能自动调整宽度
            me.$list.children().width( $el.width() / count );
            me.$list.width($el.width() / count * me.$list.children().length);
        }
    } );
})( gmu, gmu.$ );
/**
 * @file 当滚动到边缘的时候，自动把下一个滚出来
 * @import widget/navigator/navigator.js, widget/navigator/$scrollable.js
 */
(function( gmu, $, undefined ) {
    gmu.Navigator.options.isScrollToNext = true;

    /**
     * 当滚动到边缘的时候，自动把下一个滚出来
     * @class isScrollToNext
     * @namespace Navigator
     * @pluginfor Navigator
     */
    gmu.Navigator.option( 'isScrollToNext', true, function() {
        var me = this,
            prevIndex;

        me.on( 'select', function( e, to, el ) {
            
            // 第一调用的时候没有prevIndex, 固根据this.index来控制方向。
            if ( prevIndex === undefined ) {
                prevIndex = me.index ? 0 : 1;
            }

            var dir = to > prevIndex,

                // 如果是想左则找prev否则找next
                target = $( el )[ dir ? 'next' : 'prev' ](),

                // 如果没有相邻的，自己的位置也需要检测。存在这种情况
                // 被点击的按钮，只显示了一半
                offset = target.offset() || $( el ).offset(),
                within = me.$el.offset(),
                listOffset;

            if ( dir ? offset.left + offset.width > within.left +
                    within.width : offset.left < within.left ) {
                listOffset = me.$list.offset();

                me.$el.iScroll( 'scrollTo', dir ? within.width -
                        offset.left + listOffset.left - offset.width :
                        listOffset.left - offset.left, 0, 400 );
            }

            prevIndex = to;
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file panel组件
 * @import extend/touch.js, core/widget.js, extend/throttle.js, extend/event.scrollStop.js, extend/event.ortchange.js
 * @module GMU
 */
(function( gmu, $, undefined ) {

    var cssPrefix = $.fx.cssPrefix,
        transitionEnd = $.fx.transitionEnd;
    /**
     * panel组件
     *
     * @class Panel
     * @constructor Html部分
     * ```html
     * <div id="page">
     *     <div class="cont">panel内容</div>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('.panel').panel({
     *     contentWrap: $('.cont')
     * });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化Panel的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Panel:options)
     * @grammar $( el ).panel( options ) => zepto
     * @grammar new gmu.Panel( el, options ) => instance
     */
    
    gmu.define( 'Panel', {
        options: {

            /**
             * @property {Dom | Zepto | selector} [contentWrap=''] 主体内容dom，若不传，则默认为panel的next节点
             * @namespace options
             */
            contentWrap: '',

            /**
             * @property {String} [scrollMode='follow'] Panel滑动方式，follow表示跟随页面滑动，hide表示页面滑动时panel消失, fix表示panel固定在页面中
             * @namespace options
             */
            scrollMode: 'follow',

            /**
             * @property {String} [display='push'] 可选值：('overlay' | 'reveal' | 'push') Panel出现模式，overlay表示浮层reveal表示在content下边展示，push表示panel将content推出
             * @namespace options
             */
            display: 'push',

            /**
             * @property {String} [position='right'] 可选值：('left' | 'right'） 在右边或左边
             * @namespace options
             */
            position: 'right',

            /**
             * @property {Boolean} [dismissible=true] (render模式下必填)是否在内容区域点击后，panel消失
             * @namespace options
             */
            dismissible: true,

            /**
             * @property {Boolean} [swipeClose=true] 在panel上滑动，panel是否关闭
             * @namespace options
             */
            swipeClose: true
        },

        _init: function () {
            var me = this,
                opts = me._options;

            me.on( 'ready', function(){
                me.displayFn = me._setDisplay();
                me.$contentWrap.addClass('ui-panel-animate');
                me.$el.on(transitionEnd, $.proxy(me._eventHandler, me)).hide();  //初始状态隐藏panel
                opts.dismissible && me.$panelMask.hide().on('click', $.proxy(me._eventHandler, me));    //绑定mask上的关闭事件
                opts.scrollMode !== 'follow' && $(window).on('scrollStop', $.proxy(me._eventHandler, me));
                $(window).on('ortchange', $.proxy(me._eventHandler, me));
            } );
        },

        _create: function () {
            if(this._options.setup){
                var me = this,
                    opts = me._options,
                    $el = me.$el.addClass('ui-panel ui-panel-'+ opts.position);

                me.panelWidth = $el.width() || 0;
                me.$contentWrap = $(opts.contentWrap || $el.next());
                opts.dismissible && ( me.$panelMask = $('<div class="ui-panel-dismiss"></div>').width(document.body.clientWidth - $el.width()).appendTo('body') || null);
            }else{
                throw new Error('panel组件不支持create模式，请使用setup模式');
            }
        },
        
        /**
         * 生成display模式函数
         * */
        _setDisplay: function () {
            var me = this,
                $panel = me.$el,
                $contentWrap = me.$contentWrap,
                transform = cssPrefix + 'transform',
                posData = me._transDisplayToPos(),
                obj = {}, panelPos, contPos;

            $.each(['push', 'overlay', 'reveal'], function (i,display) {
                obj[display] = function (isOpen, pos, isClear) {   //isOpen:是打开还是关闭操作，pos:从右或从左打开关闭，isClear:是否是初始化操作
                    panelPos = posData[display].panel, contPos = posData[display].cont;
                    $panel.css(transform, 'translate3d(' + me._transDirectionToPos(pos, panelPos[isOpen]) + 'px,0,0)');
                    if (!isClear) {
                        $contentWrap.css(transform, 'translate3d(' + me._transDirectionToPos(pos, contPos[isOpen]) + 'px,0,0)');
                        me.maskTimer = setTimeout(function () {      //防止外界注册tap穿透，故做了延迟
                            me.$panelMask && me.$panelMask.css(pos, $panel.width()).toggle(isOpen);
                        }, 400);    //改变mask left/right值
                    }
                    return me;
                }
            });
            return obj;
        },
        /**
         * 初始化panel位置，每次打开之前由于位置可能不同，所以均需重置
         * */
        _initPanelPos: function (dis, pos) {
            this.displayFn[dis](0, pos, true);
            this.$el.get(0).clientLeft;    //触发页面reflow，使得ui-panel-animate样式不生效
            return this;
        },
        /**
         * 将位置（左或右）转化为数值
         * */
        _transDirectionToPos: function (pos, val) {
            return pos === 'left' ? val : -val;
        },
        /**
         * 将打开模式（push,overlay,reveal）转化为数值
         * */
        _transDisplayToPos: function () {
            var me = this,
                panelWidth = me.panelWidth;
            return {
                push: {
                    panel: [-panelWidth, 0],    //[from, to] for panel
                    cont: [0, panelWidth]       //[from, to] for contentWrap
                },
                overlay: {
                    panel: [-panelWidth, 0],
                    cont: [0, 0]
                },
                reveal: {
                    panel: [0, 0],
                    cont: [0, panelWidth]
                }
            }
        },
        /**
         * 设置显示或关闭，关闭时的操作，包括模式、方向与需与打开时相同
         * */
        _setShow: function (isOpen, dis, pos) {
            var me = this,
                opts = me._options,
                eventName = isOpen ? 'open' : 'close',
                beforeEvent = $.Event('before' + eventName),
                changed = isOpen !== me.state(),
                _eventBinder = isOpen ? 'on' : 'off',
                _eventHandler = isOpen ? $.proxy(me._eventHandler, me) : me._eventHandler,
                _dis = dis || opts.display,
                _pos = pos || opts.position;

            me.trigger(beforeEvent, [dis, pos]);
            if (beforeEvent.isDefaultPrevented()) return me;
            if (changed) {
                me._dealState(isOpen, _dis, _pos);    //关闭或显示时，重置状态
                me.displayFn[_dis](me.isOpen = Number(isOpen), _pos);   //根据模式和打开方向，操作panel
                opts.swipeClose && me.$el[_eventBinder]($.camelCase('swipe-' + _pos), _eventHandler);     //滑动panel关闭
                opts.display = _dis, opts.position = _pos;
            }
            return me;
        },
        /**
         * 打开或关闭前的状态重置操作，包括样式，位置等
         * */
        _dealState: function (isOpen, dis, pos) {
            var me = this,
                opts = me._options,
                $panel = me.$el,
                $contentWrap = me.$contentWrap,
                addCls = 'ui-panel-' + dis + ' ui-panel-' + pos,
                removeCls = 'ui-panel-' + opts.display + ' ui-panel-' + opts.position + ' ui-panel-animate';

            if (isOpen) {
                $panel.removeClass(removeCls).addClass(addCls).show();
                opts.scrollMode === 'fix' && $panel.css('top', $(window).scrollTop());    //fix模式下
                me._initPanelPos(dis, pos);      //panel及contentWrap位置初始化
                if (dis === 'reveal') {
                    $contentWrap.addClass('ui-panel-contentWrap').on(transitionEnd, $.proxy(me._eventHandler, me));    //reveal模式下panel不触发transitionEnd;
                } else {
                    $contentWrap.removeClass('ui-panel-contentWrap').off(transitionEnd, $.proxy(me._eventHandler, me));
                    $panel.addClass('ui-panel-animate');
                }
                me.$panelMask && me.$panelMask.css({     //panel mask状态初始化
                    'left': 'auto',
                    'right': 'auto',
                    'height': document.body.clientHeight
                });
            }
            return me;
        },

        _eventHandler: function (e) {
            var me = this,
                opts = me._options,
                scrollMode = opts.scrollMode,
                eventName = me.state() ? 'open' : 'close';

            switch (e.type) {
                case 'click':
                case 'swipeLeft':
                case 'swipeRight':
                    me.close();
                    break;
                case 'scrollStop':
                    scrollMode === 'fix' ? me.$el.css('top', $(window).scrollTop()) : me.close();
                    break;
                case transitionEnd:
                    me.trigger(eventName, [opts.display, opts.position]);
                    break;
                case 'ortchange':   //增加转屏时对mask的处理
                    me.$panelMask && me.$panelMask.css('height', document.body.clientHeight);
                    scrollMode === 'fix' && me.$el.css('top', $(window).scrollTop());     //转并重设top值
                    break;
            }
        },
        
        /**
         * 打开panel
         * @method open
         * @param {String} [display] 可选值：('overlay' | 'reveal' | 'push')，默认为初始化时设置的值，Panel出现模式，overlay表示浮层reveal表示在content下边展示，push表示panel将content推出
         * @param {String} position 可选值：('left' | 'right'），默认为初始化时设置的值，在右边或左边
         * @chainable
         * @return {self} 返回本身。
         */
        open: function (display, position) {
            return this._setShow(true, display, position);
        },
        
        /**
         * 关闭panel
         * @method close
         * @chainable
         * @return {self} 返回本身。
         */
        close: function () {
            return this._setShow(false);
        },
        
        /**
         * 切换panel的打开或关闭状态
         * @method toggle
         * @param {String} [display] 可选值：('overlay' | 'reveal' | 'push')，默认为初始化时设置的值，Panel出现模式，overlay表示浮层reveal表示在content下边展示，push表示panel将content推出
         * @param {String} position 可选值：('left' | 'right'），默认为初始化时设置的值，在右边或左边
         * @chainable
         * @return {self} 返回本身。
         */
        toggle: function (display, position) {
            return this[this.isOpen ? 'close' : 'open'](display, position);
        },
        
        /**
         * 获取当前panel状态，打开为true,关闭为false
         * @method state
         * @chainable
         * @return {self} 返回本身。
         */
        state: function () {
            return !!this.isOpen;
        },
        
        /**
         * 销毁组件
         * @method destroy
         */
        destroy:function () {
            this.$panelMask && this.$panelMask.off().remove();
            this.maskTimer && clearTimeout(this.maskTimer);
            this.$contentWrap.removeClass('ui-panel-animate');
            $(window).off('scrollStop', this._eventHandler);
            $(window).off('ortchange', this._eventHandler);
            return this.$super('destroy');
        }
        
        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */
        
        /**
         * @event beforeopen
         * @param {Event} e gmu.Event对象
         * @description panel打开前触发，可以通过e.preventDefault()来阻止
         */
        
        /**
         * @event open
         * @param {Event} e gmu.Event对象
         * @description panel打开后触发
         */
        
        /**
         * @event beforeclose
         * @param {Event} e gmu.Event对象
         * @description panel关闭前触发，可以通过e.preventDefault()来阻止
         */
        
        /**
         * @event close
         * @param {Event} e gmu.Event对象
         * @description panel关闭后触发
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });

})( gmu, gmu.$ );

/**
 * @file 是否现实剪头
 * @import widget/popover/popover.js
 */
(function( gmu ) {
    var Popover = gmu.Popover;

    Popover.template.arrow = '<span class="ui-arrow"></span>';

    /**
     * @property {Boolean} [arrow=true] 是否显示剪头
     * @namespace options
     * @for Popover
     * @uses Popover.arrow
     */
    Popover.options.arrow = true;    // 默认开启arrow

    /**
     * 扩展Popover显示剪头功能。当此文件引入后，Popover实例将自动开启显示剪头。
     * 剪头的位置会根据不同的placement显示在不同的位置。
     * @class arrow
     * @namespace Popover
     * @pluginfor Popover
     */
    Popover.option( 'arrow', true, function() {
        var me = this,
            opts = me._options;

        // 在没有传入offset的时候，默认有arrow就会多10px偏移
        opts.offset = opts.offset || function( coord, placement ) {
            placement = placement.split( '_' )[ 0 ];
            return {
                left: (placement === 'left' ? -1 :
                        placement === 'right' ? 1 : 0) * 15,
                top: (placement === 'top' ? -1 :
                        placement === 'bottom' ? 1 : 0) * 15
            };
        };

        me.on( 'done.dom', function( e, $root ) {
            $root.append( me.tpl2html( 'arrow' ) ).addClass( 'ui-pos-default' );
        } );

        me.on( 'after.placement', function( e, coord, info ) {
            var root = this.$root[ 0 ],
                cls = root.className,
                placement = info.placement,
                align = info.align || '';

            root.className = cls.replace( /(?:\s|^)ui-pos-[^\s$]+/g, '' ) +
                ' ui-pos-' + placement + (align ? '-' + align : '');
        } );
    } );
})( gmu );
/**
 * @file 碰撞检测，根据指定的容器，做最优位置显示
 * @import widget/popover/popover.js
 */
(function( gmu, $ ) {

    /**
     * @property {Boolean} [collision=true] 开启碰撞检测。
     * @namespace options
     * @uses Popover.collision
     * @for Popover
     */
    gmu.Popover.options.collision = true;

    /**
     * 碰撞检测，依赖于placement插件，根据是否能完全显示内容的策略，挑选最合适的placement.
     * @class collision
     * @namespace Popover
     * @pluginfor Popover
     */
    gmu.Popover.option( 'collision', true, function() {
        var me = this,
            opts = me._options;

        // 获取within坐标信息
        // 可以是window, document或者element.
        // within为碰撞检测的容器。
        function getWithinInfo( raw ) {
            var $el = $( raw );

            raw = $el[ 0 ];

            if ( raw !== window && raw.nodeType !== 9 ) {
                return $el.offset();
            }

            return {
                width: $el.width(),
                height: $el.height(),
                top: raw.pageYOffset || raw.scrollTop || 0,
                left: raw.pageXOffset || raw.scrollLeft || 0
            };
        }

        // 判断是否没被挡住
        function isInside( coord, width, height, within ) {
            return coord.left >= within.left &&
                    coord.left + width <= within.left + within.width &&
                    coord.top >= within.top &&
                    coord.top + height <= within.top + within.height;
        }

        // 此事件来源于placement.js, 主要用来修改定位最终值。
        me.on( 'before.placement', function( e, coord, info, presets ) {
            var within = getWithinInfo( opts.within || window ),
                now = info.placement,
                orig = info.coord,
                aviable = Object.keys( presets ),
                idx = aviable.indexOf( now ) + 1,
                swap = aviable.splice( idx, aviable.length - idx );

            // 从当前placement的下一个开始，最多尝试一圈。
            // 如果有完全没有被挡住的位置，则跳出循环
            // 如果尝试一圈都没有合适的位置，还是用原来的初始位置定位
            aviable = swap.concat( aviable );

            while ( aviable.length && !isInside( coord, orig.width,
                    orig.height, within ) ) {
                now = aviable.shift();
                $.extend( coord, presets[ now ]() );
            }
            info.preset = now;
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 是否点击其他区域，关闭自己
 * @import widget/popover/popover.js
 */
(function( gmu, $ ) {
    var Popover = gmu.Popover;

    /**
     * @property {Boolean} [dismissible=true] 是否点击其他区域，关闭自己.
     * @namespace options
     * @uses Popover.dismissible
     * @for Popover
     */
    Popover.options.dismissible = true;

    /**
     * 用来实现自动关闭功能，在弹出层打开的条件下，点击其他位置，将自动关闭此弹出层。
     * 此功能包括多个实例间的互斥功能。
     * @class dismissible
     * @namespace Popover
     * @pluginfor Popover
     */
    Popover.option( 'dismissible', true, function() {
        var me = this,
            $doc = $( document ),
            click = 'click' + me.eventNs;

        function isFromSelf( target ) {
            var doms = me.$target.add( me.$root ).get(),
                i = doms.length;

            while ( i-- ) {
                if ( doms[ i ] === target ||
                        $.contains( doms[ i ], target ) ) {
                    return true;
                }
            }
            return false;
        }

        me.on( 'show', function() {
            $doc.off( click ).on( click, function( e ) {
                isFromSelf( e.target ) || me.hide();
            } );
        } );

        me.on( 'hide', function() {
            $doc.off( click );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 简单版定位
 * @import widget/popover/popover.js, extend/offset.js
 */
(function( gmu, $ ) {

    /**
     * @property {String} [placement="bottom"] 设置定位位置。
     * @namespace options
     * @uses Popover.placement
     * @for Popover
     */

    /**
     * @property {Object|Function} [offset=null] 设置偏移量。
     * @namespace options
     * @for Popover
     * @uses Popover.placement
     */
    $.extend( gmu.Popover.options, {
        placement: 'bottom',    // 默认让其在下方显示
        offset: null
    } );

    /**
     * 支持弹出层相对于按钮上下左右定位。
     * @class placement
     * @namespace Popover
     * @pluginfor Popover
     */
    gmu.Popover.option( 'placement', function( val ) {
        return ~[ 'top', 'bottom', 'left', 'right' ].indexOf( val );
    }, function() {

        var me = this,

            // 第一个值：相对于目标位置的水平位置
            // 第二个值：相对于目标位置的垂直位置
            // 第三个值：中心点的水平位置
            // 第四个值：中心点的垂直位置
            config = {
                'top': 'center top center bottom',
                'right': 'right center left center',
                'bottom': 'center bottom center top',
                'left': 'left center right center'
            },
            presets = {},    // 支持的定位方式。

            info;

        // 根据配置项生成方法。
        $.each( config, function( preset, args ) {
            args = args.split( /\s/g );
            args.unshift( preset );
            presets[ preset ] = function() {
                return placement.apply( null, args );
            };
        } );

        function getPos( pos, len ) {
            return pos === 'right' || pos === 'bottom' ? len :
                        pos === 'center' ? len / 2 : 0;
        }

        // 暂时用简单的方式实现，以后考虑采用position.js
        function placement( preset, atH, atV, myH, myV ) {
            var of = info.of,
                coord = info.coord,
                offset = info.offset,
                top = of.top,
                left = of.left;

            left += getPos( atH, of.width ) - getPos( myH, coord.width );
            top += getPos( atV, of.height ) - getPos( myV, coord.height );

            // offset可以是fn
            offset = typeof offset === 'function' ? offset.call( null, {
                left: left,
                top: top
            }, preset ) : offset || {};

            return {
                left: left + (offset.left || 0),
                top: top + (offset.top || 0)
            };
        }

        // 此事件在
        this.on( 'placement', function( e, $el, $of ) {
            var me = this,
                opts = me._options,
                placement = opts.placement,
                coord;

            info = {
                coord: $el.offset(),
                of: $of.offset(),
                placement: placement,
                $el: $el,
                $of: $of,
                offset: opts.offset
            };

            // 设置初始值
            coord = presets[ placement ]();

            // 提供机会在设置之前修改位置
            me.trigger( 'before.placement', coord, info, presets );
            info.preset && (info.placement = info.preset);
            $el.offset( coord );

            // 提供给arrow位置定位用
            me.trigger( 'after.placement', coord, info );
        } );

        // 当屏幕旋转的时候需要需要重新计算。
        $( window ).on( 'ortchange', function() {
            me._visible && me.trigger( 'placement', me.$target, me.$root );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 进度条组件
 * @import extend/touch.js, core/widget.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    
    /**
     * 进度条组件
     *
     * @class Progressbar
     * @constructor Html部分
     * ```html
     * <div id="progressbar"></div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#progressbar').progressbar();
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化进度条的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Progressbar:options)
     * @grammar $( el ).progressbar( options ) => zepto
     * @grammar new gmu.Progressbar( el, options ) => instance
     */
    gmu.define('Progressbar', {

        options: {

            /**
             * @property {Nubmer} [initValue=0] 初始时进度的百分比，不要百分号
             * @namespace options
             */
            initValue:          0,

            /**
             * @property {Boolean} [horizontal=true] 组件是否为横向(若设为false,则为竖向)
             * @namespace options
             */
            horizontal:         true,

            /**
             * @property {Number} [transitionDuration=300] 按钮滑动时动画效果持续的时间,单位为ms,设为0则无动画
             * @namespace options
             */
            transitionDuration: 300,
            _isShow:            true,
            _current:           0,
            _percent:           0
        },

        _init: function() {
            var me = this,
                $el,
                _eventHandler,
                _button,
                _background,
                _offset;

            me.on( 'ready', function(){
                $el = me.$el,
                _eventHandler = $.proxy(me._eventHandler, me),
                _button = $el.find('.ui-progressbar-button'),
                _background = $el.find('.ui-progressbar-bg'),
                _offset = $el.offset();

                _button.on('touchstart touchmove touchend touchcancel', _eventHandler);
                _background.on('touchstart', _eventHandler);
                $.extend( me._options, {
                    _button:        _button[0],
                    $_background:    _background,
                    _filled:        $el.find('.ui-progressbar-filled')[0],
                    _width:         _offset.width,
                    _height:        _offset.height
                });
                me._options['horizontal'] && _offset.width && $el.width(_offset.width);
                me._options['initValue'] > 0 && me.value( me._options['initValue']);
            } );

            me.on( 'destroy', function() {
                if ( !me._options.setup ) {
                    me.$el.remove();
                }
            } );
        },

        _create: function() {
            var me = this,
                direction = me._options['horizontal'] ? 'h' : 'v';

            if ( !me.$el ) {
                me.$el = $('<div></div>');
            }
            me.$el.addClass('ui-progressbar-' + direction).appendTo(me._options['container'] || (me.$el.parent().length ? '' : document.body)).html(
                ('<div class="ui-progressbar-bg"><div class="ui-progressbar-filled"></div><div class="ui-progressbar-button"><div><b></b></div></div></div>'));
        },

        _eventHandler: function(e) {
            var me = this;

            switch (e.type) {
                case 'touchmove':
                    me._touchMove(e);
                    break;
                case 'touchstart':
                    $(e.target).hasClass('ui-progressbar-bg') ? me._click(e) : me._touchStart(e);
                    break;
                case 'touchcancel':
                case 'touchend':
                    me._touchEnd();
                    break;
                case 'tap':
                    me._click(e);
                    break;
            }
        },

        _touchStart: function(e) {
            var me = this,
                opts = me._options;

            $.extend( me._options, {
                pageX:      e.touches[0].pageX,
                pageY:      e.touches[0].pageY,
                S:          false,      //isScrolling
                T:          false,      //isTested
                X:          0,          //horizontal moved
                Y:          0           //vertical moved
            });

            opts._button.style.webkitTransitionDuration = '0ms';
            opts._filled.style.webkitTransitionDuration = '0ms';
            $(opts._button).addClass('ui-progressbar-button-pressed');
            me.trigger('dragStart');
        },

        _touchMove: function(e) {
            var me = this,
                opts = me._options,
                touch = e.touches[0],
                X = touch.pageX - opts.pageX,
                Y = touch.pageY - opts.pageY,
                _percent;

            if(!opts.T) {
                var S = Math.abs(X) < Math.abs(touch.pageY - opts.pageY);
                opts.T = true;
                opts.S = S;
            }
            if(opts.horizontal) {
                if(!opts.S) {
                    e.stopPropagation();
                    e.preventDefault();
                    _percent =  (X + opts._current) / opts._width * 100;
                    if(_percent <= 100 && _percent >= 0) {
                        opts._percent = _percent;
                        opts.X = X;
                        opts._button.style.webkitTransform = 'translate3d(' + (opts.X + opts._current) + 'px,0,0)';
                        opts._filled.style.width = _percent + '%';
                        me.trigger('valueChange');
                    }
                    me.trigger('dragMove');
                }
            } else {
                if(opts.S) {
                    e.stopPropagation();
                    e.preventDefault();
                    _percent = -(opts._current + Y) / opts._height * 100;
                    if(_percent <= 100 && _percent >= 0) {
                        opts._percent = _percent;
                        opts.Y = Y;
                        opts._button.style.webkitTransform = 'translate3d(0,' + (Y + opts._current) + 'px,0)';
                        opts._filled.style.cssText += 'height:' + _percent + '%;top:' + (opts._height + Y + opts._current) + 'px';
                        me.trigger('valueChange');
                    }
                    me.trigger('dragMove');
                }
            }
        },

        _touchEnd: function() {
            var me = this,
                opts = me._options;

            opts._current += opts.horizontal ? opts.X : opts.Y;
            $(opts._button).removeClass('ui-progressbar-button-pressed');
            me.trigger('dragEnd');
        },

        _click: function(e) {
            var me = this,
                opts = me._options,
                rect = opts.$_background.offset(),
                touch = e.touches[0];

            opts.horizontal ?
                me.value((touch.pageX - rect.left) / opts._width * 100) :
                me.value((opts._height - touch.pageY + rect.top) / opts._height * 100);
        },

        /**
         * 获取/设置progressbar的值
         * @method value
         * @param {Number} [opts] 要设置的值，不传表示取值
         * @chainable
         * @return {self} 返回本身。
         */
        value: function(value) {
            var me = this,
                opts = me._options,
                _current, duration;

            if(value === undefined) {
                return opts._percent;
            } else {
                value = parseFloat(value);
                if(isNaN(value)) return me;
                value = value > 100 ? 100 : value < 0 ? 0 : value;
                opts._percent = value;
                duration = ';-webkit-transition-duration:' + opts.transitionDuration + 'ms';
                if(opts.horizontal) {
                    _current = opts._current = opts._width * value / 100;
                    opts._button.style.cssText += '-webkit-transform:translate3d(' + _current + 'px,0,0)' + duration;
                    opts._filled.style.cssText += 'width:'+ value + '%' + duration;
                } else {
                    _current = opts._current = opts._height * value / -100;
                    opts._button.style.cssText += '-webkit-transform:translate3d(0,' + _current + 'px,0)' + duration;
                    opts._filled.style.cssText += 'height:' + value + '%;top:' + (opts._height + _current) + 'px' + duration;
                }
                me.trigger('valueChange');
                return me;
            }
        },

        /**
         * 显示progressbar
         * @method show
         * @chainable
         * @return {self} 返回本身。
         */
        show: function() {
            var me = this;

            if(!me._options['_isShow']){
                me.$el.css('display', 'block');
                me._options['_isShow'] = true;
            }

            return me;
        },

        /**
         * 隐藏progressbar
         * @method hide
         * @chainable
         * @return {self} 返回本身。
         */
        hide: function() {
            var me = this;

            if(me._options['_isShow']) {
                me.$el.css('display', 'none');
                me._options['_isShow'] = false;
            }

            return me;
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */
        
        /**
         * @event dragStart
         * @param {Event} e gmu.Event对象
         * @description 拖动进度条开始时触发的事件
         */
        
        /**
         * @event dragMove
         * @param {Event} e gmu.Event对象
         * @description 拖动进度条过程中触发的事件
         */
        
        /**
         * @event dragEnd
         * @param {Event} e gmu.Event对象
         * @description 拖动进度条结束时触发的事件
         */
        
        /**
         * @event valueChange
         * @param {Event} e gmu.Event对象
         * @description progressbar的值有变化时触发（拖动progressbar时，值不一定会变化）
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });
})( gmu, gmu.$ );

/**
 * @file 加载更多组件
 * @import core/widget.js
 * @importCSS loading.css
 * @module GMU
 */

(function( gmu, $, undefined ) {
    
    /**
     * 加载更多组件
     *
     * @class Refresh
     * @constructor Html部分
     * ```html
     * <div class="ui-refresh">
     *    <ul class="data-list">...</ul>
     *    <div class="ui-refresh-down"></div><!--setup方式带有class为ui-refresh-down或ui-refresh-up的元素必须加上，用于放refresh按钮-->
     * </div>

     * ```
     *
     * javascript部分
     * ```javascript
     * $('.ui-refresh').refresh({
     *      load: function (dir, type) {
     *          var me = this;
     *          $.getJSON('../../data/refresh.php', function (data) {
     *              var $list = $('.data-list'),
     *                      html = (function (data) {      //数据渲染
     *                          var liArr = [];
     *                          $.each(data, function () {
     *                              liArr.push(this.html);
     *                          });
     *                          return liArr.join('');
     *                      })(data);
     *              $list[dir == 'up' ? 'prepend' : 'append'](html);
     *              me.afterDataLoading();    //数据加载完成后改变状态
     *          });
     *      }
     *  });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化Refresh的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Refresh:options)
     * @grammar $( el ).refresh( options ) => zepto
     * @grammar new gmu.Refresh( el, options ) => instance
     */
    gmu.define( 'Refresh', {
        options: {

            /**
             * @property {Function} load 当点击按钮，或者滑动达到可加载内容条件时，此方法会被调用。需要在此方法里面进行ajax内容请求，并在请求完后，调用afterDataLoading()，通知refresh组件，改变状态。
             * @namespace options
             */
            load: null,

            /**
             * @property {Function} [statechange=null] 样式改变时触发，该事件可以被阻止，阻止后可以自定义加载样式，回调参数：event(事件对象), elem(refresh按钮元素), state(状态), dir(方向)
             * @namespace options
             */
            statechange: null
        },

        _init: function() {
            var me = this,
                opts = me._options;

            me.on( 'ready', function(){
                $.each(['up', 'down'], function (i, dir) {
                    var $elem = opts['$' + dir + 'Elem'],
                        elem = $elem.get(0);

                    if ($elem.length) {
                        me._status(dir, true);    //初始设置加载状态为可用
                        if (!elem.childNodes.length || ($elem.find('.ui-refresh-icon').length && $elem.find('.ui-refresh-label').length)) {    //若内容为空则创建，若不满足icon和label的要求，则不做处理
                            !elem.childNodes.length && me._createBtn(dir);
                            opts.refreshInfo || (opts.refreshInfo = {});
                            opts.refreshInfo[dir] = {
                                $icon: $elem.find('.ui-refresh-icon'),
                                $label: $elem.find('.ui-refresh-label'),
                                text: $elem.find('.ui-refresh-label').html()
                            }
                        }
                        $elem.on('click', function () {
                            if (!me._status(dir) || opts._actDir) return;         //检查是否处于可用状态，同一方向上的仍在加载中，或者不同方向的还未加载完成 traceID:FEBASE-569
                            me._setStyle(dir, 'loading');
                            me._loadingAction(dir, 'click');
                        });
                    }
                });
            } );

            me.on( 'destroy', function(){
                me.$el.remove();
            } );
        },

        _create: function(){
            var me = this,
                opts = me._options,
                $el = me.$el;

            if( me._options.setup ) {
                // 值支持setup模式，所以直接从DOM中取元素
                opts.$upElem = $el.find('.ui-refresh-up');
                opts.$downElem = $el.find('.ui-refresh-down');
                $el.addClass('ui-refresh');
            }
        },

        _createBtn: function (dir) {
            this._options['$' + dir + 'Elem'].html('<span class="ui-refresh-icon"></span><span class="ui-refresh-label">加载更多</span>');

            return this;
        },

        _setStyle: function (dir, state) {
            var me = this,
                stateChange = $.Event('statechange');

            me.trigger(stateChange, me._options['$' + dir + 'Elem'], state, dir);
            if ( stateChange.defaultPrevented ) {
                return me;
            }

            return me._changeStyle(dir, state);
        },

        _changeStyle: function (dir, state) {
            var opts = this._options,
                refreshInfo = opts.refreshInfo[dir];

            switch (state) {
                case 'loaded':
                    refreshInfo['$label'].html(refreshInfo['text']);
                    refreshInfo['$icon'].removeClass();
                    opts._actDir = '';
                    break;
                case 'loading':
                    refreshInfo['$label'].html('加载中...');
                    refreshInfo['$icon'].addClass('ui-loading');
                    opts._actDir = dir;
                    break;
                case 'disable':
                    refreshInfo['$label'].html('没有更多内容了');
                    break;
            }

            return this;
        },

        _loadingAction: function (dir, type) {
            var me = this,
                opts = me._options,
                loadFn = opts.load;

            $.isFunction(loadFn) && loadFn.call(me, dir, type);
            me._status(dir, false);

            return me;
        },

        /**
         * 当组件调用load，在load中通过ajax请求内容回来后，需要调用此方法，来改变refresh状态。
         * @method afterDataLoading
         * @param {String} dir 加载的方向（'up' | 'down'）
         * @chainable
         * @return {self} 返回本身。
         */
        afterDataLoading: function (dir) {
            var me = this,
                dir = dir || me._options._actDir;

            me._setStyle(dir, 'loaded');
            me._status(dir, true);

            return me;
        },

        /**
         * 用来设置加载是否可用，分方向的。
         * @param {String} dir 加载的方向（'up' | 'down'）
         * @param {String} status 状态（true | false）
         */
        _status: function(dir, status) {
            var opts = this._options;

            return status === undefined ? opts['_' + dir + 'Open'] : opts['_' + dir + 'Open'] = !!status;
        },

        _setable: function (able, dir, hide) {
            var me = this,
                opts = me._options,
                dirArr = dir ? [dir] : ['up', 'down'];

            $.each(dirArr, function (i, dir) {
                var $elem = opts['$' + dir + 'Elem'];
                if (!$elem.length) return;
                //若是enable操作，直接显示，disable则根据text是否是true来确定是否隐藏
                able ? $elem.show() : (hide ?  $elem.hide() : me._setStyle(dir, 'disable'));
                me._status(dir, able);
            });

            return me;
        },

        /**
         * 如果已无类容可加载时，可以调用此方法来，禁用Refresh。
         * @method disable
         * @param {String} dir 加载的方向（'up' | 'down'）
         * @param {Boolean} hide 是否隐藏按钮。如果此属性为false，将只有文字变化。
         * @chainable
         * @return {self} 返回本身。
         */
        disable: function (dir, hide) {
            return this._setable(false, dir, hide);
        },

        /**
         * 启用组件
         * @method enable
         * @param {String} dir 加载的方向（'up' | 'down'）
         * @chainable
         * @return {self} 返回本身。
         */
        enable: function (dir) {
            return this._setable(true, dir);
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */
        
        /**
         * @event statechange
         * @param {Event} e gmu.Event对象
         * @param {Zepto} elem 按钮元素
         * @param {String} state 当前组件的状态('loaded'：默认状态；'loading'：加载中状态；'disabled'：禁用状态，表示无内容加载了；'beforeload'：在手没有松开前满足加载的条件状态。 需要引入插件才有此状态，lite，iscroll，或者iOS5)
         * @param {String} dir 加载的方向（'up' | 'down'）
         * @description 组件发生状态变化时会触发
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */

    } );
})( gmu, gmu.$ );

/**
 * @file 图片轮播组件
 * @import extend/touch.js, extend/event.ortchange.js, core/widget.js
 * @module GMU
 */
(function( gmu, $, undefined ) {
    var cssPrefix = $.fx.cssPrefix,
        transitionEnd = $.fx.transitionEnd,

        // todo 检测3d是否支持。
        translateZ = ' translateZ(0)';
    
    /**
     * 图片轮播组件
     *
     * @class Slider
     * @constructor Html部分
     * ```html
     * <div id="slider">
     *   <div>
     *       <a href="http://www.baidu.com/"><img lazyload="image1.png"></a>
     *       <p>1,让Coron的太阳把自己晒黑—小天</p>
     *   </div>
     *   <div>
     *       <a href="http://www.baidu.com/"><img lazyload="image2.png"></a>
     *       <p>2,让Coron的太阳把自己晒黑—小天</p>
     *   </div>
     *   <div>
     *       <a href="http://www.baidu.com/"><img lazyload="image3.png"></a>
     *       <p>3,让Coron的太阳把自己晒黑—小天</p>
     *   </div>
     *   <div>
     *       <a href="http://www.baidu.com/"><img lazyload="image4.png"></a>
     *       <p>4,让Coron的太阳把自己晒黑—小天</p>
     *   </div>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#slider').slider();
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化Slider的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Slider:options)
     * @grammar $( el ).slider( options ) => zepto
     * @grammar new gmu.Slider( el, options ) => instance
     */
    gmu.define( 'Slider', {

        options: {

            /**
             * @property {Boolean} [loop=false] 是否连续滑动
             * @namespace options
             */
            loop: false,
            
            /**
             * @property {Number} [speed=400] 动画执行速度
             * @namespace options
             */
            speed: 400,

            /**
             * @property {Number} [index=0] 初始位置
             * @namespace options
             */
            index: 0,

            /**
             * @property {Object} [selector={container:'.ui-slider-group'}] 内部结构选择器定义
             * @namespace options
             */
            selector: {
                container: '.ui-slider-group'    // 容器的选择器
            }
        },

        template: {
            item: '<div class="ui-slider-item"><a href="<%= href %>">' +
                    '<img src="<%= pic %>" alt="" /></a>' +
                    '<% if( title ) { %><p><%= title %></p><% } %>' +
                    '</div>'
        },

        _create: function() {
            var me = this,
                $el = me.getEl(),
                opts = me._options;

            me.index = opts.index;

            // 初始dom结构
            me._initDom( $el, opts );

            // 更新width
            me._initWidth( $el, me.index );
            me._container.on( transitionEnd + me.eventNs,
                    $.proxy( me._tansitionEnd, me ) );

            // 转屏事件检测
            $( window ).on( 'ortchange' + me.eventNs, function() {
                me._initWidth( $el, me.index );
            } );
        },

        _initDom: function( $el, opts ) {
            var selector = opts.selector,
                viewNum = opts.viewNum || 1,
                items,
                container;

            // 检测容器节点是否指定
            container = $el.find( selector.container );

            // 没有指定容器则创建容器
            if ( !container.length ) {
                container = $( '<div></div>' );

                // 如果没有传入content, 则将root的孩子作为可滚动item
                if ( !opts.content ) {

                    // 特殊处理直接用ul初始化slider的case
                    if ( $el.is( 'ul' ) ) {
                        this.$el = container.insertAfter( $el );
                        container = $el;
                        $el = this.$el;
                    } else {
                        container.append( $el.children() );
                    }
                } else {
                    this._createItems( container, opts.content );
                }

                container.appendTo( $el );
            }

            // 检测是否构成循环条件
            if ( (items = container.children()).length < viewNum + 1 ) {
                opts.loop = false;
            }

            // 如果节点少了，需要复制几份
            while ( opts.loop && container.children().length < 3 * viewNum ) {
                container.append( items.clone() );
            }

            this.length = container.children().length;

            this._items = (this._container = container)
                    .addClass( 'ui-slider-group' )
                    .children()
                    .addClass( 'ui-slider-item' )
                    .toArray();

            this.trigger( 'done.dom', $el.addClass( 'ui-slider' ), opts );
        },

        // 根据items里面的数据挨个render插入到container中
        _createItems: function( container, items ) {
            var i = 0,
                len = items.length;

            for ( ; i < len; i++ ) {
                container.append( this.tpl2html( 'item', items[ i ] ) );
            }
        },

        _initWidth: function( $el, index, force ) {
            var me = this,
                width;

            // width没有变化不需要重排
            if ( !force && (width = $el.width()) === me.width ) {
                return;
            }

            me.width = width;
            me._arrange( width, index );
            me.height = $el.height();
            me.trigger( 'width.change' );
        },

        // 重排items
        _arrange: function( width, index ) {
            var items = this._items,
                i = 0,
                item,
                len;

            this._slidePos = new Array( items.length );

            for ( len = items.length; i < len; i++ ) {
                item = items[ i ];
                
                item.style.cssText += 'width:' + width + 'px;' +
                        'left:' + (i * -width) + 'px;';
                item.setAttribute( 'data-index', i );

                this._move( i, i < index ? -width : i > index ? width : 0, 0 );
            }

            this._container.css( 'width', width * len );
        },

        _move: function( index, dist, speed, immediate ) {
            var slidePos = this._slidePos,
                items = this._items;

            if ( slidePos[ index ] === dist || !items[ index ] ) {
                return;
            }

            this._translate( index, dist, speed );
            slidePos[ index ] = dist;    // 记录目标位置

            // 强制一个reflow
            immediate && items[ index ].clientLeft;
        },

        _translate: function( index, dist, speed ) {
            var slide = this._items[ index ],
                style = slide && slide.style;

            if ( !style ) {
                return false;
            }

            style.cssText += cssPrefix + 'transition-duration:' + speed + 
                    'ms;' + cssPrefix + 'transform: translate(' + 
                    dist + 'px, 0)' + translateZ + ';';
        },

        _circle: function( index, arr ) {
            var len;

            arr = arr || this._items;
            len = arr.length;

            return (index % len + len) % arr.length;
        },

        _tansitionEnd: function( e ) {

            // ~~用来类型转换，等价于parseInt( str, 10 );
            if ( ~~e.target.getAttribute( 'data-index' ) !== this.index ) {
                return;
            }
            
            this.trigger( 'slideend', this.index );
        },

        _slide: function( from, diff, dir, width, speed, opts ) {
            var me = this,
                to;

            to = me._circle( from - dir * diff );

            // 如果不是loop模式，以实际位置的方向为准
            if ( !opts.loop ) {
                dir = Math.abs( from - to ) / (from - to);
            }
            
            // 调整初始位置，如果已经在位置上不会重复处理
            this._move( to, -dir * width, 0, true );

            this._move( from, width * dir, speed );
            this._move( to, 0, speed );

            this.index = to;
            return this.trigger( 'slide', to, from );
        },

        /**
         * 切换到第几个slide
         * @method slideTo
         * @chainable
         * @param {Number} to 目标slide的序号
         * @param {Number} [speed] 切换的速度
         * @return {self} 返回本身
         */
        slideTo: function( to, speed ) {
            if ( this.index === to || this.index === this._circle( to ) ) {
                return this;
            }

            var opts = this._options,
                index = this.index,
                diff = Math.abs( index - to ),
                
                // 1向左，-1向右
                dir = diff / (index - to),
                width = this.width;

            speed = speed || opts.speed;

            return this._slide( index, diff, dir, width, speed, opts );
        },

        /**
         * 切换到上一个slide
         * @method prev
         * @chainable
         * @return {self} 返回本身
         */
        prev: function() {
            
            if ( this._options.loop || this.index > 0 ) {
                this.slideTo( this.index - 1 );
            }

            return this;
        },

        /**
         * 切换到下一个slide
         * @method next
         * @chainable
         * @return {self} 返回本身
         */
        next: function() {
            
            if ( this._options.loop || this.index + 1 < this.length ) {
                this.slideTo( this.index + 1 );
            }

            return this;
        },

        /**
         * 返回当前显示的第几个slide
         * @method getIndex
         * @chainable
         * @return {Number} 当前的silde序号
         */
        getIndex: function() {
            return this.index;
        },

        /**
         * 销毁组件
         * @method destroy
         */
        destroy: function() {
            this._container.off( this.eventNs );
            $( window ).off( 'ortchange' + this.eventNs );
            return this.$super( 'destroy' );
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event done.dom
         * @param {Event} e gmu.Event对象
         * @param {Zepto} $el slider元素
         * @param {Object} opts 组件初始化时的配置项
         * @description DOM创建完成后触发
         */
        
        /**
         * @event width.change
         * @param {Event} e gmu.Event对象
         * @description slider容器宽度发生变化时触发
         */
        
        /**
         * @event slideend
         * @param {Event} e gmu.Event对象
         * @param {Number} index 当前slide的序号
         * @description slide切换完成后触发
         */
        
        /**
         * @event slide
         * @param {Event} e gmu.Event对象
         * @param {Number} to 目标slide的序号
         * @param {Number} from 当前slide的序号
         * @description slide切换时触发（如果切换时有动画，此事件触发时，slide不一定已经完成切换）
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    } );

})( gmu, gmu.$ );
/**
 * @file 自动播放插件
 * @import widget/slider/slider.js
 */
(function( gmu, $ ) {
    $.extend( true, gmu.Slider, {
        options: {
            /**
             * @property {Boolean} [autoPlay=true] 是否开启自动播放
             * @namespace options
             * @for Slider
             * @uses Slider.autoplay
             */
            autoPlay: true,
            /**
             * @property {Number} [interval=4000] 自动播放的间隔时间（毫秒）
             * @namespace options
             * @for Slider
             * @uses Slider.autoplay
             */
            interval: 4000
        }
    } );

    /**
     * 自动播放插件
     * @class autoplay
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.register( 'autoplay', {
        _init: function() {
            var me = this;
            me.on( 'slideend ready', me.resume )

                    // 清除timer
                    .on( 'destory', me.stop );

            // 避免滑动时，自动切换
            me.getEl()
                    .on( 'touchstart' + me.eventNs, $.proxy( me.stop, me ) )
                    .on( 'touchend' + me.eventNs, $.proxy( me.resume, me ) );
        },

        /**
         * 恢复自动播放。
         * @method resume
         * @chainable
         * @return {self} 返回本身
         * @for Slider
         * @uses Slider.autoplay
         */
        resume: function() {
            var me = this,
                opts = me._options;

            if ( opts.autoPlay && !me._timer ) {
                me._timer = setTimeout( function() {
                    me.slideTo( me.index + 1 );
                    me._timer = null;
                }, opts.interval );
            }
            return me;
        },

        /**
         * 停止自动播放
         * @method stop
         * @chainable
         * @return {self} 返回本身
         * @for Slider
         * @uses Slider.autoplay
         */
        stop: function() {
            var me = this;

            if ( me._timer ) {
                clearTimeout( me._timer );
                me._timer = null;
            }
            return me;
        }
    } );
})( gmu, gmu.$ );
/**
 * @file 图片懒加载插件
 * @import widget/slider/slider.js
 */
(function( gmu ) {

    gmu.Slider.template.item = '<div class="ui-slider-item">' +
            '<a href="<%= href %>">' +
            '<img lazyload="<%= pic %>" alt="" /></a>' +
            '<% if( title ) { %><p><%= title %></p><% } %>' +
            '</div>';

    /**
     * 图片懒加载插件
     * @class lazyloadimg
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.register( 'lazyloadimg', {
        _init: function() {
            this.on( 'ready slide', this._loadItems );
        },

        _loadItems: function() {
            var opts = this._options,
                loop = opts.loop,
                viewNum = opts.viewNum || 1,
                index = this.index,
                i,
                len;

            for ( i = index - viewNum, len = index + 2 * viewNum; i < len;
                    i++ ) {

                this.loadImage( loop ? this._circle( i ) : i );
            }
        },

        /**
         * 加载指定item中的图片
         * @method loadImage
         * @param {Number} index 要加载的图片的序号
         * @for Slider
         * @uses Slider.lazyloadimg
         */
        loadImage: function( index ) {
            var item = this._items[ index ],
                images;

            if ( !item || !(images = gmu.staticCall( item, 'find',
                    'img[lazyload]' ), images.length) ) {

                return this;
            }

            images.each(function() {
                this.src = this.getAttribute( 'lazyload' );
                this.removeAttribute( 'lazyload' );
            });
        }
    } );
})( gmu );
/**
 * @file 图片轮播手指跟随插件
 * @import widget/slider/slider.js
 */
(function( gmu, $, undefined ) {
    
    var map = {
            touchstart: '_onStart',
            touchmove: '_onMove',
            touchend: '_onEnd',
            touchcancel: '_onEnd',
            click: '_onClick'
        },

        isScrolling,
        start,
        delta,
        moved;

    // 提供默认options
    $.extend( gmu.Slider.options, {

        /**
         * @property {Boolean} [stopPropagation=false] 是否阻止事件冒泡
         * @namespace options
         * @for Slider
         * @uses Slider.touch
         */
        stopPropagation: false,

        /**
         * @property {Boolean} [disableScroll=false] 是否阻止滚动
         * @namespace options
         * @for Slider
         * @uses Slider.touch
         */
        disableScroll: false
    } );

    /**
     * 图片轮播手指跟随插件
     * @class touch
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.register( 'touch', {
        _init: function() {
            var me = this,
                $el = me.getEl();

            me._handler = function( e ) {
                me._options.stopPropagation && e.stopPropagation();
                return map[ e.type ] && me[ map[ e.type ] ].call( me, e );
            };

            me.on( 'ready', function() {

                // 绑定手势
                $el.on( 'touchstart' + me.eventNs, me._handler );
                
                // 阻止误点击, 犹豫touchmove被preventDefault了，导致长按也会触发click
                me._container.on( 'click' + me.eventNs, me._handler );
            } );
        },

        _onClick: function() {
            return !moved;
        },

        _onStart: function( e ) {
                
            // 不处理多指
            if ( e.touches.length > 1 ) {
                return false;
            }

            var me = this,
                touche = e.touches[ 0 ],
                opts = me._options,
                eventNs = me.eventNs,
                num;

            start = {
                x: touche.pageX,
                y: touche.pageY,
                time: +new Date()
            };

            delta = {};
            moved = false;
            isScrolling = undefined;

            num = opts.viewNum || 1;
            me._move( opts.loop ? me._circle( me.index - num ) :
                    me.index - num, -me.width, 0, true );
            me._move( opts.loop ? me._circle( me.index + num ) :
                    me.index + num, me.width, 0, true );

            me.$el.on( 'touchmove' + eventNs + ' touchend' + eventNs +
                    ' touchcancel' + eventNs, me._handler );
        },

        _onMove: function( e ) {

            // 多指或缩放不处理
            if ( e.touches.length > 1 || e.scale &&
                    e.scale !== 1 ) {
                return false;
            }

            var opts = this._options,
                viewNum = opts.viewNum || 1,
                touche = e.touches[ 0 ],
                index = this.index,
                i,
                len,
                pos,
                slidePos;

            opts.disableScroll && e.preventDefault();

            delta.x = touche.pageX - start.x;
            delta.y = touche.pageY - start.y;

            if ( typeof isScrolling === 'undefined' ) {
                isScrolling = Math.abs( delta.x ) <
                        Math.abs( delta.y );
            }

            if ( !isScrolling ) {
                e.preventDefault();

                if ( !opts.loop ) {

                    // 如果左边已经到头
                    delta.x /= (!index && delta.x > 0 ||

                            // 如果右边到头
                            index === this._items.length - 1 && 
                            delta.x < 0) ?

                            // 则来一定的减速
                            (Math.abs( delta.x ) / this.width + 1) : 1;
                }

                slidePos = this._slidePos;

                for ( i = index - viewNum, len = index + 2 * viewNum;
                        i < len; i++ ) {

                    pos = opts.loop ? this._circle( i ) : i;
                    this._translate( pos, delta.x + slidePos[ pos ], 0 );
                }

                moved = true;
            }
        },

        _onEnd: function() {

            // 解除事件
            this.$el.off( 'touchmove' + this.eventNs + ' touchend' +
                    this.eventNs + ' touchcancel' + this.eventNs,
                    this._handler );

            if ( !moved ) {
                return;
            }

            var me = this,
                opts = me._options,
                viewNum = opts.viewNum || 1,
                index = me.index,
                slidePos = me._slidePos,
                duration = +new Date() - start.time,
                absDeltaX = Math.abs( delta.x ),

                // 是否滑出边界
                isPastBounds = !opts.loop && (!index && delta.x > 0 ||
                    index === slidePos.length - viewNum && delta.x < 0),

                // -1 向右 1 向左
                dir = delta.x > 0 ? 1 : -1,
                speed,
                diff,
                i,
                len,
                pos;

            if ( duration < 250 ) {

                // 如果滑动速度比较快，偏移量跟根据速度来算
                speed = absDeltaX / duration;
                diff = Math.min( Math.round( speed * viewNum * 1.2 ),
                        viewNum );
            } else {
                diff = Math.round( absDeltaX / (me.perWidth || me.width) );
            }
            
            if ( diff && !isPastBounds ) {
                me._slide( index, diff, dir, me.width, opts.speed,
                        opts, true );
                
                // 在以下情况，需要多移动一张
                if ( viewNum > 1 && duration >= 250 &&
                        Math.ceil( absDeltaX / me.perWidth ) !== diff ) {

                    me.index < index ? me._move( me.index - 1, -me.perWidth,
                            opts.speed ) : me._move( me.index + viewNum,
                            me.width, opts.speed );
                }
            } else {
                
                // 滑回去
                for ( i = index - viewNum, len = index + 2 * viewNum;
                    i < len; i++ ) {

                    pos = opts.loop ? me._circle( i ) : i;
                    me._translate( pos, slidePos[ pos ], 
                            opts.speed );
                }
            }
        }
    } );
})( gmu, gmu.$ );
/**
 * @file 图片轮播剪头按钮
 * @import widget/slider/slider.js
 */
(function( gmu, $, undefined ) {
    $.extend( true, gmu.Slider, {

        template: {
            prev: '<span class="ui-slider-pre"></span>',
            next: '<span class="ui-slider-next"></span>'
        },

        options: {
            /**
             * @property {Boolean} [arrow=true] 是否显示点
             * @namespace options
             * @for Slider
             * @uses Slider.arrow
             */
            arrow: true,

            /**
             * @property {Object} [select={prev:'.ui-slider-pre',next:'.ui-slider-next'}] 上一张和下一张按钮的选择器
             * @namespace options
             * @for Slider
             * @uses Slider.arrow
             */
            select: {
                prev: '.ui-slider-pre',    // 上一张按钮选择器
                next: '.ui-slider-next'    // 下一张按钮选择器
            }
        }
    } );

    /**
     * 图片轮播剪头按钮
     * @class arrow
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.option( 'arrow', true, function() {
        var me = this,
            arr = [ 'prev', 'next' ];

        this.on( 'done.dom', function( e, $el, opts ) {
            var selector = opts.selector;

            arr.forEach(function( name ) {
                var item = $el.find( selector[ name ] );
                item.length || $el.append( item = $( me.tpl2html( name ) ) );
                me[ '_' + name ] = item;
            });
        } );

        this.on( 'ready', function() {
            arr.forEach(function( name ) {
                me[ '_' + name ].on( 'tap' + me.eventNs, function() {
                    me[ name ].call( me );
                } );
            });
        } );

        this.on( 'destroy', function() {
            me._prev.off( me.eventNs );
            me._next.off( me.eventNs );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 图片轮播显示点功能
 * @import widget/slider/slider.js
 */
(function( gmu, $, undefined ) {
    $.extend( true, gmu.Slider, {

        template: {
            dots: '<p class="ui-slider-dots"><%= new Array( len + 1 )' +
                    '.join("<b></b>") %></p>'
        },

        options: {

            /**
             * @property {Boolean} [dots=true] 是否显示点
             * @namespace options
             * @for Slider
             * @uses Slider.dots
             */
            dots: true,

            /**
             * @property {Object} [selector={dots:'.ui-slider-dots'}] 所有点父级的选择器
             * @namespace options
             * @for Slider
             * @uses Slider.dots
             */
            selector: {
                dots: '.ui-slider-dots'
            }
        }
    } );

    /**
     * 图片轮播显示点功能
     * @class dots
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.option( 'dots', true, function() {
        
        var updateDots = function( to, from ) {
            var dots = this._dots;

            typeof from === 'undefined' || gmu.staticCall( dots[
                from % this.length ], 'removeClass', 'ui-state-active' );
            
            gmu.staticCall( dots[ to % this.length ], 'addClass',
                    'ui-state-active' );
        };

        this.on( 'done.dom', function( e, $el, opts ) {
            var dots = $el.find( opts.selector.dots );

            if ( !dots.length ) {
                dots = this.tpl2html( 'dots', {
                    len: this.length
                } );
                
                dots = $( dots ).appendTo( $el );
            }

            this._dots = dots.children().toArray();
        } );

        this.on( 'slide', function( e, to, from ) {
            updateDots.call( this, to, from );
        } );

        this.on( 'ready', function() {
            updateDots.call( this, this.index );
        } );
    } );
})( gmu, gmu.$ );
/**
 * @file 图片自动适应功能
 * @import widget/slider/slider.js
 */
(function( gmu ) {

    /**
     * @property {Boolean} [imgZoom=true] 是否开启图片自适应
     * @namespace options
     * @for Slider
     * @uses Slider.dots
     */
    gmu.Slider.options.imgZoom = true;

    /**
     * 图片自动适应功能
     * @class imgZoom
     * @namespace Slider
     * @pluginfor Slider
     */
    gmu.Slider.option( 'imgZoom', function() {
        return !!this._options.imgZoom;
    }, function() {
        var me = this,
            selector = me._options.imgZoom,
            watches;

        selector = typeof selector === 'string' ? selector : 'img';

        function unWatch() {
            watches && watches.off( 'load' + me.eventNs, imgZoom );
        }

        function watch() {
            unWatch();
            watches = me._container.find( selector )
                    .on( 'load' + me.eventNs, imgZoom );
        }

        function imgZoom( e ) {
            var img = e.target || this,

                // 只缩放，不拉伸
                scale = Math.min( 1, me.width / img.naturalWidth,
                    me.height / img.naturalHeight );
            
            img.style.width = scale * img.naturalWidth + 'px';
        }

        me.on( 'ready dom.change', watch );
        me.on( 'width.change', function() {
            watches && watches.each( imgZoom );
        } );
        me.on( 'destroy', unWatch );
    } );
})( gmu );
/**
 * @file 搜索建议组件
 * @import core/widget.js, extend/touch.js, extend/highlight.js
 */
(function( $, win ) {

     /**
     * 搜索建议组件
     *
     * @class Suggestion
     * @constructor Html部分
     * ```html
     * <form action="http://www.baidu.com/s" method="get">
     *     <div class="search">
     *         <div class="search-input"><input type="text" id="input" name="wd"></div>
     *         <div class="search-button"><input type="submit" value="百度一下"></div>
     *     </div>
     * </form>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#input').suggestion({
     *      source: "../../data/suggestion.php"
     *  });
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化Suggestion的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Suggestion:options)
     * @grammar $( el ).suggestion( options ) => zepto
     * @grammar new gmu.Suggestion( el, options ) => instance
     */
    
    var guid = 0;

    gmu.define( 'Suggestion', {

        // 默认options
        options: {

            /**
             * @property {Element | Zepto | Selector} container 父元素，若为render模式，则为必选
             * @namespace options
             */
            
            /**
             * @property {String} source 请求数据的url，若不自定义sendRequest，则为必选
             * @namespace options
             */
            
            /**
             * @property {String} [param=''] url附加参数
             * @namespace options
             */
            
            /**
             * @property {String | Element} [form] 提交搜索的表单，默认为包含input框的第一个父级form
             * @namespace options
             */
            
            /**
             * @property {Boolean | String} [historyShare=true] 多个sug之间是否共享历史记录，可传入指定的key值。若传默认传true，则使用默认key：'SUG-Sharing-History'，若传false，即表示不共享history；若传string，则为该值+'-SUG-Sharing-History'作为key值
             * @namespace options
             */
            historyShare: true,

            /**
             * @property {Boolean} [confirmClearHistory=true] 删除历史记录时是否确认
             * @namespace options
             */
            confirmClearHistory: true,

            /**
             * @property {Boolean} [autoClose=true] 点击input之外自动关闭
             * @namespace options
             */
            autoClose: false
        },

        template: {

            // ui-suggestion的class必须有
            // ontent, button, clear, close这几个div必须有，其他的可以更改
            wrapper: '<div class="ui-suggestion">' +
                '<div class="ui-suggestion-content"></div>' +
                '<div class="ui-suggestion-button">' +
                '<span class="ui-suggestion-clear">清除历史记录</span>' +
                '<span class="ui-suggestion-close">关闭</span>' +
                '</div></div>'
        },

        _initDom: function() {
            var me = this,
                $input = me.getEl().attr( 'autocomplete', 'off'),
                $parent = $input.parent('.ui-suggestion-mask');

            $parent.length ? me.$mask = $parent :
                    $input.wrap( me.$mask =
                    $( '<div class="ui-suggestion-mask"></div>' ) );

            // 考采用template的wrapper项渲染列表
            me.$mask.append( me.tpl2html( 'wrapper' ) );

            me.$wrapper = me.$mask.find( '.ui-suggestion' )
                    .prop('id', 'ui-suggestion-' + (guid++));
            me.$content = me.$wrapper
                    .css( 'top', $input.height() + (me.wrapperTop =
                    parseInt( me.$wrapper.css( 'top' ), 10 ) || 0) )
                    .find( '.ui-suggestion-content' );

            me.$btn = me.$wrapper.find( '.ui-suggestion-button' );
            me.$clearBtn = me.$btn.find( '.ui-suggestion-clear' );
            me.$closeBtn = me.$btn.find( '.ui-suggestion-close' );

            return me.trigger('initdom');
        },

        _bindEvent: function() {
            var me = this,
                $el = me.getEl(),
                ns = me.eventNs;

            me._options.autoClose && $( document ).on( 'tap' + ns, function( e ) {

                // 若点击是的sug外边则关闭sug
                !$.contains( me.$mask.get( 0 ), e.target ) && me.hide();
            } );

            $el.on( 'focus' + ns, function() {

                // 当sug已经处于显示状态时，不需要次showlist
                !me.isShow && me._showList().trigger( 'open' );
            } );

            $el.on( 'input' + ns, function() {

                // 考虑到在手机上输入比较慢，故未进行稀释处理
                me._showList();
            } );

            me.$clearBtn.on( 'click' + ns, function() {

                //清除历史记录
                me.history( null );
            } ).highlight( 'ui-suggestion-highlight' );

            me.$closeBtn.on( 'click' + ns, function() {

                // 隐藏sug
                me.getEl().blur();
                me.hide().trigger( 'close' );
            } ).highlight( 'ui-suggestion-highlight' );

            return me;
        },

        _create: function() {
            var me = this,
                opts = me._options,
                hs = opts.historyShare;

            opts.container && (me.$el = $(opts.container));

            // 若传默认传true，则使用默认key：'SUG-Sharing-History'
            // 若传false，即表示不共享history，以该sug的id作为key值
            // 若传string，则在此基础上加上'SUG-Sharing-History'
            me.key = hs ?
                    (($.type( hs ) === 'boolean' ? '' : hs + '-') +
                    'SUG-Sharing-History') :
                    me.getEl().attr( 'id' ) || ('ui-suggestion-' + (guid++));

            // localStorage中数据分隔符
            me.separator = encodeURIComponent( ',' );

            // 创建dom，绑定事件
            me._initDom()._bindEvent();

            return me;
        },

        /**
         * 展示suglist，分为query存在和不存在
         * @private
         */
        _showList: function() {
            var me = this,
                query = me.value(),
                data;

            if ( query ) {

                // 当query不为空，即input或focus时,input有值
                // 用户自己发送请求或直接本地数据处理，可以在sendrequest中处理
                me.trigger( 'sendrequest', query, $.proxy( me._render, me ),
                        $.proxy( me._cacheData, me ));

            } else {

                // query为空，即刚开始focus时，读取localstorage中的数据渲染
                (data = me._localStorage()) ?
                        me._render( query, data.split( me.separator ) ) :
                        me.hide();
            }

            return me;
        },

        _render: function( query, data ) {

            this.trigger( 'renderlist', data, query, $.proxy( this._fillWrapper, this ) );
        },

        /**
         * 根据数据填充sug wrapper
         * @listHtml 填充的sug片段，默认为'<ul><li>...</li>...</ul>'
         * @private
         */
        _fillWrapper: function( listHtml ) {

            // 数据不是来自历史记录时隐藏清除历史记录按钮
            this.$clearBtn[ this.value() ? 'hide' : 'show' ]();
            listHtml ? (this.$content.html( listHtml ), this.show()) :
                    this.hide();

            return this;
        },

        _localStorage: function( value ) {
            var me = this,
                key = me.key,
                separator = me.separator,
                localStorage,
                data;

            try {

                localStorage = win.localStorage;

                if ( value === undefined ) {    // geter
                    return localStorage[ key ];

                } else if ( value === null ) {    // setter clear
                    localStorage[ key ] = '';

                } else if ( value ) {    // setter
                    data = localStorage[ key ] ?
                            localStorage[ key ].split( separator ) : [];

                    // 数据去重处理
                    // todo 对于兼容老格式的数据中有一项会带有\u001e，暂未做判断
                    if ( !~$.inArray( value, data ) ) {
                        data.unshift( value );
                        localStorage[ key ] = data.join( separator );
                    }
                }

            } catch ( ex ) {
                console.log( ex.message );
            }

            return me;
        },

        _cacheData: function( key, value ) {
            this.cacheData || (this.cacheData = {});

            return value !== undefined ?
                this.cacheData[ key ] = value : this.cacheData[ key ];
        },

        /**
         * 获取input值
         * @method value
         * @return {String} input中的值
         */
        value: function() {
            return this.getEl().val();
        },

        /**
         * 设置|获取|清空历史记录
         * @method history
         * @param {String} [value] 不传value表示清除sug历史记录，传value表示存值
         */
        history: function( value ) {
            var me = this,
                clearHistory = value !== null || function() {
                    return me._localStorage( null).hide();
                };

            return value === null ? (me._options.confirmClearHistory ?
                win.confirm( '清除全部查询历史记录？' ) && clearHistory() :
                clearHistory()) : me._localStorage( value )
        },

        /**
         * 显示sug
         * @method show
         */
        show: function() {

            if ( !this.isShow ) {
                this.$wrapper.show();
                this.isShow = true;
                return this.trigger( 'show' );
            }else{
                return this;
            }

        },

        /**
         * 隐藏sug
         * @method hide
         */
        hide: function() {

            if ( this.isShow ) {
                this.$wrapper.hide();
                this.isShow = false;
                return this.trigger( 'hide' );
            }else{
                return this;
            }

        },

        /**
         * 销毁组件
         * @method destroy
         */
        destroy: function() {
            var me = this,
                $el = me.getEl(),
                ns = me.ns;

            // 先执行父级destroy，保证插件或option中的destroy先执行
            me.trigger( 'destroy' );

            $el.off( ns );
            me.$mask.replaceWith( $el );
            me.$clearBtn.off( ns );
            me.$closeBtn.off( ns );
            me.$wrapper.children().off().remove();
            me.$wrapper.remove();
            me._options.autoClose && $( document ).off( ns );

            this.destroyed = true;

            return me;
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event initdom
         * @param {Event} e gmu.Event对象
         * @param {Zepto} $el slider元素
         * @description DOM创建完成后触发
         */
        
        /**
         * @event show
         * @param {Event} e gmu.Event对象
         * @description 显示sug时触发
         */
        
        /**
         * @event hide
         * @param {Event} e gmu.Event对象
         * @param {Number} index 当前slide的序号
         * @description 隐藏sug时触发
         */
        
        /**
         * @event sendrequest
         * @param {Event} e gmu.Event对象
         * @param {String} query 用户输入查询串
         * @param {Function} render 数据请求完成后的渲染回调函数，其参数为query,data
         * @param {Function} cacheData 缓存query的回调函数，其参数为query, data
         * @description 发送请求时触发
         */
        
        /**
         * @event renderlist
         * @param {Event} e gmu.Event对象
         * @param {Array} data 渲染的数据
         * @param {String} query 用户输入的查询串
         * @param {Function} fillWrapper 列表渲染完成后的回调函数，参数为listHtml片段
         * @description 渲染sug list时触发
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    } );
})( gmu.$, window );

/**
 * @file iScroll插件，sug列表使用iScroll展示
 * @import widget/suggestion/suggestion.js, extend/iscroll.js
 */
(function( gmu, $ ) {

    /**
     * iScroll插件，sug列表使用iScroll展示
     * @class iscroll
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.register( 'iscroll', {

        _init: function() {
            var me = this;

            me.on( 'ready', function() {

                // 增加一层scroller结构
                me.$scroller =
                        $( '<div class="ui-suggestion-scroller"></div>' );

                // 初始化iScroll，若需要设置wrapper高度，可在样式中设max-height
                me.$content
                        .wrapInner( me.$scroller )
                        .iScroll({

                            hScroll: false,

                            onRefresh: function() {

                                // 更新iScroll时滚回顶部
                                this.y && this.scrollTo( 0, 0 );
                            }
                        });

                // 调用iscroll的destroy
                me.on( 'destroy', function() {
                    me.$content.iScroll('destroy');
                } );
            } );

            return me;
        },

        /**
         * 复写_fillWrapper方法，数据及按钮调整顺序
         * */
        _fillWrapper: function( listHtml ) {

            // 数据不是来自历史记录时隐藏清除历史记录按钮
            this.$clearBtn[ this.value() ? 'hide' : 'show' ]();

            if ( listHtml ) {
                this.show().$scroller.html( listHtml );
                this.$content.iScroll( 'refresh' );

            } else {
                this.hide();
            }

            return this;
        }
    } );

})( gmu, gmu.$ );
/**
 * @file 位置自适应插件
 * @import widget/suggestion/suggestion.js, extend/event.ortchange.js
 */
(function( $, win ) {
    var reverse = Array.prototype.reverse;

    // 指明sug list的item项selector，用于item项的反转
    // 基于list最外层的$content元素进行查找的
    gmu.Suggestion.options.listSelector = 'li';

    /**
     * 位置自适应插件，主要需求用于当sug放在页面底部时，需将sug翻转到上面来显示
     * @class posadapt
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.register( 'posadapt', {

        _init: function() {
            var me = this,
                $list;

            me.on( 'show ortchange', function() {

                if ( me._checkPos() ) {

                    me.$wrapper.css( 'top', - me.$wrapper.height()- me.wrapperTop );

                    // sug list反转
                    reverse.call( $list =
                        me.$content.find( me._options.listSelector ) );
                    $list.appendTo( $list.parent() );

                    // 调整按钮位置
                    me.$btn.prependTo( me.$wrapper );
                }

            } );
        },

        _checkPos: function() {
            var sugH = this._options.height || 66,
                upDis = this.getEl().offset().top - win.pageYOffset;

            // 当下边的高度小于sug的高度并且上边的高度大于sug的高度
            return $( win ).height() - upDis < sugH && upDis >= sugH;
        }

    } );
})( gmu.$, window );
/**
 * @file quickdelete插件
 * @import widget/suggestion/suggestion.js
 */
(function( gmu, $ ) {

    /**
     * quickdelete插件
     * @class quickdelete
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.register( 'quickdelete', {

        _init: function() {
            var me = this,
                $input,
                ns;

            me.on( 'ready', function() {
                $input = me.getEl();
                ns = me.eventNs;

                me.$mask.append( me.$quickDel =
                    $( '<div class="ui-suggestion-quickdel"></div>' ) );

                $input.on('focus' + ns + ' input' + ns, function() {
                    me[ '_quickDel' +
                        ($.trim( $input.val() ) ? 'Show' : 'Hide') ]();
                });

                $input.on( 'blur' + ns, function() {
                    me._quickDelHide();
                });

                // 绑tap事件，touchend会失焦点，键盘收起，故绑touchstart并阻止默认行为
                me.$quickDel.on( 'touchstart' + ns, function( e ) {
                    e.preventDefault();    // 阻止默认事件，否则会触发blur，键盘收起
                    e.formDelete = true;    // suggestion解决删除问题
                    $input.val('');
                    me.trigger('delete').trigger('input')._quickDelHide();

                    // 中文输入时，focus失效 trace:FEBASE-779
                    $input.blur().focus();
                } );

                me.on( 'destroy', function() {
                    me.$quickDel.off().remove();
                } );
            } );
        },

        _quickDelShow: function() {

            if ( !this.quickDelShow ) {

                gmu.staticCall( this.$quickDel.get(0),
                        'css', 'visibility', 'visible' );

                this.quickDelShow = true
            }
        },

        _quickDelHide: function() {

            if ( this.quickDelShow ) {

                gmu.staticCall( this.$quickDel.get(0),
                    'css', 'visibility', 'hidden' );

                this.quickDelShow = false
            }
        }
    } );

})( gmu, gmu.$ );
/**
 * @file compatData
 * @import widget/suggestion/suggestion.js
 */
(function( $, win ) {

    // 是否兼容1.x版本中的历史数据
    gmu.Suggestion.options.compatdata = true;


    /**
     * compatdata插件，兼容用户历史localstorge，gmu 1.x版本用户搜索历史通过','分隔数据，为了解决','不能被存入的问题，现在采用encodeURIComponent(',')来存入数据，故需要兼容老的历史数据。该配置项为true，则开启数据兼容处理
     * @class compatdata
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.option( 'compatdata', true, function() {

        this.on( 'ready', function() {
            var key = this.key,
                flagKey = 'SUG-History-DATATRANS',
                localdata,
                dataArr;

            try {
                localdata = win.localStorage[ key ];

                // 兼容老数据，以前以“,”分隔localstorage中的数据，现在改为encodeURIComponent(',')分隔
                if ( localdata && !win.localStorage[ flagKey ] ) {

                    // 存储是否转换过历史数据的标记
                    win.localStorage[ flagKey ] = '\u001e';

                    dataArr = localdata.split( ',' );
                    win.localStorage[ key ] = dataArr.join( this.separator );
                }

            }catch ( e ) {
                console.log( e.message );
            }
        } )
    } );
})( gmu.$, window );
/**
 * @file renderList
 * @import widget/suggestion/suggestion.js, extend/highlight.js
 */
(function( $ ) {

    $.extend( gmu.Suggestion.options, {

        /**
         * @property {Boolean} [isHistory=true] 是否在localstorage中存储用户查询记录，相当于2.0.5以前版本中的isStorage
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.renderlist
         */
        isHistory: true,

        /**
         * @property {Boolean} [usePlus=false] 是否使用+来使sug item进入input框
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.renderlist
         */
        usePlus: false,

        /**
         * @property {Number} [listCount=5] sug列表条数
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.renderlist
         */
        listCount: 5,

        /**
         * @property {Function} [renderlist=null] 自定义渲染列表函数，可以覆盖默认渲染列表的方法
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.renderlist
         */
        renderlist: null
    } );

    /**
     * renderList，提供默认列表渲染，若需要自己渲染sug列表，即renderList为Function类型，则不需要使用此插件<br />
     * 默认以jsonp发送请求，当用户在option中配置了renderList时，需要调用用e.preventDefault来阻默认请求数据方法
     * @class renderlist
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.option( 'renderlist', function() {

        // 当renderList不是Function类型时，该option操作生效
        return $.type( this._options.renderlist ) !== 'function';

    }, function() {

        var me = this,
            $xssElem = $( '<div></div>'),
            _xssFilter = function( str ) {
                return $xssElem.text( str ).html();
            },

            // 渲染sug list列表，返回list array
            _createList = function( query, sugs ) {
                var opts = me._options,
                    html = [],
                    str = '',
                    sug,
                    len,
                    i;

                if ( !sugs || !sugs.length ) {
                    me.hide();
                    return html;
                }

                sugs = sugs.slice( 0, opts.listCount );

                // 防止xss注入，通过text()方法转换一下
                query = _xssFilter( query || '' );

                // sug列表渲染比较频繁，故不采用模板来解析
                for ( i = 0, len = sugs.length; i < len; i++ ) {
                    str = _xssFilter( sug = sugs[ i ] );

                    // 若是query为空则不需要进行替换
                    query && (str = $.trim( sug )
                        .replace( query, '<span>' + query + '</span>' ));

                    opts.usePlus &&
                            (str += '<div class="ui-suggestion-plus" ' +
                                'data-item="' + sug + '"></div>');

                    html.push( '<li>' + str + '</li>' );
                }

                return html;
            };

        me.on( 'ready', function() {
            var me = this,
                ns = me.eventNs,
                $form = $( me._options.form || me.getEl().closest( 'form' ));

            // 绑定form的submit事件
            $form.size() && (me.$form = $form .on( 'submit' + ns,
                    function( e ) {
                        var submitEvent = gmu.Event('submit');

                        me._options.isHistory &&
                        me._localStorage( me.value() );

                        me.trigger( submitEvent );

                        // 阻止表单默认提交事件
                        submitEvent.isDefaultPrevented() && e.preventDefault();
                    }));

            // todo 待验证，新闻页面不会有该bug，待排查原因，中文输入不跳转的bug
            me.$content.on( 'touchstart' + ns, function(e) {
                e.preventDefault();
            });

            // 注册tap事件由于中文输入法时，touch事件不能submit
            me.$content.on( 'tap' + ns, function(e) {
                var $input = me.getEl(),
                    $elem = $( e.target );

                // 点击加号，input值上框
                if ( $elem.hasClass( 'ui-suggestion-plus' ) ) {
                    $input.val( $elem.attr( 'data-item' ) );
                } else if ( $.contains( me.$content.get( 0 ),
                    $elem.get( 0 ) ) ) {

                    // 点击sug item, 防止使用tap造成穿透
                    setTimeout( function() {
                        $input.val( $elem.text() );
                        me.trigger( 'select', $elem )
                            .hide().$form.submit();
                    }, 400 );
                }
            }).highlight( 'ui-suggestion-highlight' );

            me.on( 'destroy', function() {
                $form.size() && $form.off( ns );
                me.$content.off();
            } );
        } );

        me.on( 'renderlist', function( e, data, query, callback ) {
            var ret = _createList( query, data );

            // 回调渲染suglist
            return callback( ret.length ?
                        '<ul>' + ret.join( ' ' ) + '</ul>' : '' );
        } );
    } );

})( gmu.$ );
/**
 * @file sendRequest
 * @import widget/suggestion/suggestion.js
 */

(function( $, win ) {

    $.extend( gmu.Suggestion.options, {

        /**
         * @property {Boolean} [isCache=true] 发送请求返回数据后是否缓存query请求结果
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.sendrequest
         */
        isCache: true,

        /**
         * @property {String} [queryKey='wd'] 发送请求时query的key值
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.sendrequest
         */
        
        queryKey: 'wd',

        /**
         * @property {String} [cbKey='cb'] 发送请求时callback的name
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.sendrequest
         */
        cbKey: 'cb',

        /**
         * @property {Function} [sendrequest=null] 自定义发送请求函数，可以覆盖默认发送请求的方法
         * @namespace options
         * @for Suggestion
         * @uses Suggestion.sendrequest
         */
        sendrequest: null
    } );

    /**
     * sendRequest，默认sendRequest为jsonp方式取数据，若用户自己用数据填充sug，即该option为Function类型，则不需要使用此插件<br />
     * 默认以jsonp发送请求，当用户在option中配置了sendRequest时，需要调用用e.preventDefault来阻默认请求数据方法
     * @class sendrequest
     * @namespace Suggestion
     * @pluginfor Suggestion
     */
    gmu.Suggestion.option( 'sendrequest', function() {

        // 当sendRequest不是Function类型时，该option操作生效
        return $.type( this._options.sendrequest ) !== 'function';

    }, function() {
        var me = this,
            opts = me._options,
            queryKey = opts.queryKey,
            cbKey = opts.cbKey,
            param = opts.param,
            isCache = opts.isCache,
            cdata;

        this.on( 'sendrequest', function( e, query, callback, cacheData ) {

            var url = opts.source,

            // 以date作为后缀，应该不会重复，故不作origin
                cb = 'suggestion_' + (+new Date());

            // 若缓存中存数请求的query数据，则不发送请求
            if ( isCache && (cdata = cacheData( query )) ) {
                callback( query, cdata );
                return me;

            }

            // 替换url后第一个参数的连接符?&或&为?
            url = (url + '&' + queryKey + '=' + encodeURIComponent( query ))
                    .replace( /[&?]{1,2}/, '?' );

            !~url.indexOf( '&' + cbKey ) &&  (url += '&' + cbKey + '=' + cb);

            param && (url += '&' + param);

            win[ cb ] = function( data ) {

                /*
                 * 渲染数据并缓存请求数据
                 * 返回的数据格式如下：
                 * {
                 *     q: "a",
                 *     p: false,
                 *     s: ["angelababy", "akb48", "after school",
                 *     "android", "angel beats!", "a pink", "app"]
                 * }
                 */
                callback( query, data.s );

                // 缓存请求的query
                isCache && cacheData( query, data.s );

                delete win[ cb ];
            };

            // 以jsonp形式发送请求
            $.ajax({
                url: url,
                dataType: 'jsonp'
            });

            return me;
        } );

    } );
})( gmu.$, window );
/**
 * @file 选项卡组件
 * @import extend/touch.js, core/widget.js, extend/highlight.js, extend/event.ortchange.js
 * @importCSS transitions.css, loading.css
 * @module GMU
 */

(function( gmu, $, undefined ) {
    var _uid = 1,
        uid = function(){
            return _uid++;
        },
        idRE = /^#(.+)$/;

    /**
     * 选项卡组件
     *
     * @class Tabs
     * @constructor Html部分
     * ```html
     * <div id="tabs">
     *      <ul>
     *         <li><a href="#conten1">Tab1</a></li>
     *         <li><a href="#conten2">Tab2</a></li>
     *         <li><a href="#conten3">Tab3</a></li>
     *     </ul>
     *     <div id="conten1">content1</div>
     *     <div id="conten2"><input type="checkbox" id="input1" /><label for="input1">选中我后tabs不可切换</label></div>
     *     <div id="conten3">content3</div>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#tabs').tabs();
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化Tab的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Tabs:options)
     * @grammar $( el ).tabs( options ) => zepto
     * @grammar new gmu.Tabs( el, options ) => instance
     */
    gmu.define( 'Tabs', {
        options: {

            /**
             * @property {Number} [active=0] 初始时哪个为选中状态，如果时setup模式，如果第2个li上加了ui-state-active样式时，active值为1
             * @namespace options
             */
            active: 0,

            /**
             * @property {Array} [items=null] 在render模式下需要必须设置 格式为\[{title:\'\', content:\'\', href:\'\'}\], href可以不设，可以用来设置ajax内容
             * @namespace options
             */
            items:null,

            /**
             * @property {String} [transition='slide'] 设置切换动画，目前只支持slide动画，或无动画
             * @namespace options
             */
            transition: 'slide'
        },

        template: {
            nav:'<ul class="ui-tabs-nav">'+
                '<% var item; for(var i=0, length=items.length; i<length; i++) { item=items[i]; %>'+
                    '<li<% if(i==active){ %> class="ui-state-active"<% } %>><a href="javascript:;"><%=item.title%></a></li>'+
                '<% } %></ul>',
            content:'<div class="ui-viewport ui-tabs-content">' +
                '<% var item; for(var i=0, length=items.length; i<length; i++) { item=items[i]; %>'+
                    '<div<% if(item.id){ %> id="<%=item.id%>"<% } %> class="ui-tabs-panel <%=transition%><% if(i==active){ %> ui-state-active<% } %>"><%=item.content%></div>'+
                '<% } %></div>'
        },

        _init:function () {
            var me = this, _opts = me._options, $el, eventHandler = $.proxy(me._eventHandler, me);

            me.on( 'ready', function(){
                $el = me.$el;
                $el.addClass('ui-tabs');
                _opts._nav.on('tap', eventHandler).children().highlight('ui-state-hover');
            } );

            $(window).on('ortchange', eventHandler);
        },

        _create:function () {
            var me = this, _opts = me._options;

            if( me._options.setup && me.$el.children().length > 0 ) {
                me._prepareDom('setup', _opts);
            } else {
                _opts.setup = false;
                me.$el = me.$el || $('<div></div>');
                me._prepareDom('create', _opts);
            }
        },

        _prepareDom:function (mode, _opts) {
            var me = this, content, $el = me.$el, items, nav, contents, id;
            switch (mode) {
                case 'setup':
                    _opts._nav =  me._findElement('ul').first();
                    if(_opts._nav) {
                        _opts._content = me._findElement('div.ui-tabs-content');
                        _opts._content = ((_opts._content && _opts._content.first()) || $('<div></div>').appendTo($el)).addClass('ui-viewport ui-tabs-content');
                        items = [];
                        _opts._nav.addClass('ui-tabs-nav').children().each(function(){
                            var $a = me._findElement('a', this), href = $a?$a.attr('href'):$(this).attr('data-url'), id, $content;
                            id = idRE.test(href)? RegExp.$1: 'tabs_'+uid();
                            ($content = me._findElement('#'+id) || $('<div id="'+id+'"></div>'))
                                .addClass('ui-tabs-panel'+(_opts.transition?' '+_opts.transition:''))
                                .appendTo(_opts._content);
                            items.push({
                                id: id,
                                href: href,
                                title: $a?$a.attr('href', 'javascript:;').text():$(this).text(),//如果href不删除的话，地址栏会出现，然后一会又消失。
                                content: $content
                            });
                        });
                        _opts.items = items;
                        _opts.active = Math.max(0, Math.min(items.length-1, _opts.active || $('.ui-state-active', _opts._nav).index()||0));
                        me._getPanel().add(_opts._nav.children().eq(_opts.active)).addClass('ui-state-active');
                        break;
                    } //if cannot find the ul, switch this to create mode. Doing this by remove the break centence.
                default:
                    items = _opts.items = _opts.items || [];
                    nav = [];
                    contents = [];
                    _opts.active = Math.max(0, Math.min(items.length-1, _opts.active));
                    $.each(items, function(key, val){
                        id = 'tabs_'+uid();
                        nav.push({
                            href: val.href || '#'+id,
                            title: val.title
                        });
                        contents.push({
                            content: val.content || '',
                            id: id
                        });
                        items[key].id = id;
                    });
                    _opts._nav = $( this.tpl2html( 'nav', {items: nav, active: _opts.active} ) ).prependTo($el);
                    _opts._content = $( this.tpl2html( 'content', {items: contents, active: _opts.active, transition: _opts.transition} ) ).appendTo($el);
                    _opts.container = _opts.container || ($el.parent().length ? null : 'body');
            }
            _opts.container && $el.appendTo(_opts.container);
            me._fitToContent(me._getPanel());
        },

        _getPanel: function(index){
            var _opts = this._options;
            return $('#' + _opts.items[index === undefined ? _opts.active : index].id);
        },

        _findElement:function (selector, el) {
            var ret = $(el || this.$el).find(selector);
            return ret.length ? ret : null;
        },

        _eventHandler:function (e) {
            var match, _opts = this._options;
            switch(e.type) {
                case 'ortchange':
                    this.refresh();
                    break;
                default:
                    if((match = $(e.target).closest('li', _opts._nav.get(0))) && match.length) {
                        e.preventDefault();
                        this.switchTo(match.index());
                    }
            }
        },

        _fitToContent: function(div) {
            var _opts = this._options, $content = _opts._content;
            _opts._plus === undefined && (_opts._plus = parseFloat($content.css('border-top-width'))+parseFloat($content.css('border-bottom-width')))
            $content.height( div.height() + _opts._plus);
            return this;
        },

        /**
         * 切换到某个Tab
         * @method switchTo
         * @param {Number} index Tab编号
         * @chainable
         * @return {self} 返回本身。
         */
        switchTo: function(index) {
            var me = this, _opts = me._options, items = _opts.items, eventData, to, from, reverse, endEvent;
            if(!_opts._buzy && _opts.active != (index = Math.max(0, Math.min(items.length-1, index)))) {
                to = $.extend({}, items[index]);//copy it.
                to.div = me._getPanel(index);
                to.index = index;

                from = $.extend({}, items[_opts.active]);//copy it.
                from.div = me._getPanel();
                from.index = _opts.active;

                eventData = gmu.Event('beforeActivate');
                me.trigger(eventData, to, from);
                if(eventData.isDefaultPrevented()) return me;

                _opts._content.children().removeClass('ui-state-active');
                to.div.addClass('ui-state-active');
                _opts._nav.children().removeClass('ui-state-active').eq(to.index).addClass('ui-state-active');
                if(_opts.transition) { //use transition
                    _opts._buzy = true;
                    endEvent = $.fx.animationEnd + '.tabs';
                    reverse = index>_opts.active?'':' reverse';
                    _opts._content.addClass('ui-viewport-transitioning');
                    from.div.addClass('out'+reverse);
                    to.div.addClass('in'+reverse).on(endEvent, function(e){
                        if (e.target != e.currentTarget) return //如果是冒泡上来的，则不操作
                        to.div.off(endEvent, arguments.callee);//解除绑定
                        _opts._buzy = false;
                        from.div.removeClass('out reverse');
                        to.div.removeClass('in reverse');
                        _opts._content.removeClass('ui-viewport-transitioning');
                        me.trigger('animateComplete', to, from);
                        me._fitToContent(to.div);
                    });
                }
                _opts.active = index;
                me.trigger('activate', to, from);
                _opts.transition ||  me._fitToContent(to.div);
            }
            return me;
        },

        /**
         * 当外部修改tabs内容好，需要调用refresh让tabs自动更新高度
         * @method refresh
         * @chainable
         * @return {self} 返回本身。
         */
        refresh: function(){
            return this._fitToContent(this._getPanel());
        },

        /**
         * 销毁组件
         * @method destroy
         */
        destroy:function () {
            var _opts = this._options, eventHandler = this._eventHandler;
            _opts._nav.off('tap', eventHandler).children().highlight();
            _opts.swipe && _opts._content.off('swipeLeft swipeRight', eventHandler);

            if( !_opts.setup ) {
                this.$el.remove();
            }
            return this.$super('destroy');
        }

        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */

        /**
         * @event beforeActivate
         * @param {Event} e gmu.Event对象
         * @param {Object} to 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @param {Object} from 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @description 内容切换之前触发，可以通过e.preventDefault()来阻止
         */

        /**
         * @event activate
         * @param {Event} e gmu.Event对象
         * @param {Object} to 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @param {Object} from 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @description 内容切换之后触发
         */

        /**
         * @event animateComplete
         * @param {Event} e gmu.Event对象
         * @param {Object} to 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @param {Object} from 包含如下属性：div(内容div), index(位置), title(标题), content(内容), href(链接)
         * @description 动画完成后执行，如果没有设置动画，此时间不会触发
         */

        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    });
})( gmu, gmu.$ );
/**
 * @file ajax插件
 * @import widget/tabs/tabs.js
 */
(function ($, undefined) {
    var idRE = /^#.+$/,
        loaded = {},
        tpl = {
            loading: '<div class="ui-loading">Loading</div>',
            error: '<p class="ui-load-error">内容加载失败!</p>'
        };

    /**
     * 在a上面href设置的是地址，而不是id，则组件认为这个为ajax类型的。在options上传入ajax对象可以配置[ajax选项](#$.ajax)
     * @class ajax
     * @namespace Tabs
     * @pluginfor Tabs
     */
    gmu.Tabs.register( 'ajax', {
        _init:function () {
            var _opts = this._options, items, i, length;

            this.on( 'ready', function(){
                items = _opts.items;
                for (i = 0, length = items.length; i < length; i++) {
                    items[i].href && !idRE.test(items[i].href) && (items[i].isAjax = true);
                }
                this.on('activate', this._onActivate);
                items[_opts.active].isAjax && this.load(_opts.active);//如果当前是ajax
            } );
        },

        destroy:function () {
            this.off('activate', this._onActivate);
            this.xhr && this.xhr.abort();
            return this.origin();
        },

        _fitToContent: function(div) {
            var _opts = this._options;

            if(!_opts._fitLock)return this.origin(div);
        },

        _onActivate:function (e, to) {
            to.isAjax && this.load(to.index);
        },

        /**
         * 加载内容，指定的tab必须是ajax类型。加载的内容会缓存起来，如果要强行再次加载，第二个参数传入true
         * @method load
         * @param {Number} index Tab编号
         * @param {Boolean} [force=false] 是否强制重新加载
         * @for Tabs
         * @uses Tabs.ajax
         * @return {self} 返回本身。
         */
        load:function (index, force) {
            var me = this, _opts = me._options, items = _opts.items, item, $panel, prevXHR;

            if (index < 0 ||
                index > items.length - 1 ||
                !(item = items[index]) || //如果范围错误
                !item.isAjax || //如果不是ajax类型的
                ( ( $panel = me._getPanel(index)).text() && !force && loaded[index] ) //如果没有加载过，并且tab内容为空
                )return this;

            (prevXHR = me.xhr) && setTimeout(function(){//把切出去没有加载玩的xhr abort了
                prevXHR.abort();
            }, 400);

            _opts._loadingTimer = setTimeout(function () {//如果加载在50ms内完成了，就没必要再去显示 loading了
                $panel.html(tpl.loading);
            }, 50);

            _opts._fitLock = true;

            me.xhr = $.ajax($.extend(_opts.ajax || {}, {
                url:item.href,
                context:me.$el.get(0),
                beforeSend:function (xhr, settings) {
                    var eventData = gmu.Event('beforeLoad');
                    me.trigger(eventData, xhr, settings);
                    if (eventData.isDefaultPrevented())return false;
                },
                success:function (response, xhr) {
                    var eventData = gmu.Event('beforeRender');
                    clearTimeout(_opts._loadingTimer);//清除显示loading的计时器
                    me.trigger(eventData, response, $panel, index, xhr)//外部可以修改data，或者直接把pannel修改了
                    if (!eventData.isDefaultPrevented()) {
                        $panel.html(response);
                    }
                    _opts._fitLock = false;
                    loaded[index] = true;
                    me.trigger('load', $panel);
                    delete me.xhr;
                    me._fitToContent($panel);
                },
                error:function () {
                    var eventData = gmu.Event('loadError');
                    clearTimeout(_opts._loadingTimer);//清除显示loading的计时器
                    loaded[index] = false;
                    me.trigger(eventData, $panel);
                    if(!eventData.isDefaultPrevented()){
                        $panel.html(tpl.error);
                    }
                    delete me.xhr;
                }
            }));
        }
        
        /**
         * @event beforeLoad
         * @param {Event} e gmu.Event对象
         * @param {Object} xhr xhr对象
         * @param {Object} settings ajax请求的参数
         * @description 在请求前触发，可以通过e.preventDefault()来取消此次ajax请求
         * @for Tabs
         * @uses Tabs.ajax
         */
        
        /**
         * @event beforeRender
         * @param {Event} e gmu.Event对象
         * @param {Object} response 返回值
         * @param {Object} panel 对应的Tab内容的容器
         * @param {Number} index Tab的序号
         * @param {Object} xhr xhr对象
         * @description ajax请求进来数据，在render到div上之前触发，对于json数据，可以通过此方来自行写render，然后通过e.preventDefault()来阻止，将response输出在div上
         * @for Tabs
         * @uses Tabs.ajax
         */
        
        /**
         * @event load
         * @param {Event} e gmu.Event对象
         * @param {Zepto} panel 对应的Tab内容的容器
         * @description 当ajax请求到的内容过来后，平已经Render到div上了后触发
         * @for Tabs
         * @uses Tabs.ajax
         */
        
        /**
         * @event loadError
         * @param {Event} e gmu.Event对象
         * @param {Zepto} panel 对应的Tab内容的容器
         * @description 当ajax请求内容失败时触发，如果此事件被preventDefault了，则不会把自带的错误信息Render到div上
         * @for Tabs
         * @uses Tabs.ajax
         */
    } );
})(Zepto);

/**
 * @file 左右滑动手势插件
 * @import widget/tabs/tabs.js
 */

(function ($, undefined) {
    var durationThreshold = 1000, // 时间大于1s就不算。
        horizontalDistanceThreshold = 30, // x方向必须大于30
        verticalDistanceThreshold = 70, // y方向上只要大于70就不算
        scrollSupressionThreshold = 30, //如果x方向移动大于这个直就禁掉滚动
        tabs = [],
        eventBinded = false,
        isFromTabs = function (target) {
            for (var i = tabs.length; i--;) {
                if ($.contains(tabs[i], target)) return true;
            }
            return false;
        }

    function tabsSwipeEvents() {
        $(document).on('touchstart.tabs', function (e) {
            var point = e.touches ? e.touches[0] : e, start, stop;

            start = {
                x:point.clientX,
                y:point.clientY,
                time:Date.now(),
                el:$(e.target)
            }

            $(document).on('touchmove.tabs',function (e) {
                var point = e.touches ? e.touches[0] : e, xDelta;
                if (!start)return;
                stop = {
                    x:point.clientX,
                    y:point.clientY,
                    time:Date.now()
                }
                if ((xDelta = Math.abs(start.x - stop.x)) > scrollSupressionThreshold ||
                    xDelta > Math.abs(start.y - stop.y)) {
                    isFromTabs(e.target) && e.preventDefault();
                } else {//如果系统滚动开始了，就不触发swipe事件
                    $(document).off('touchmove.tabs touchend.tabs');
                }
            }).one('touchend.tabs', function () {
                    $(document).off('touchmove.tabs');
                    if (start && stop) {
                        if (stop.time - start.time < durationThreshold &&
                            Math.abs(start.x - stop.x) > horizontalDistanceThreshold &&
                            Math.abs(start.y - stop.y) < verticalDistanceThreshold) {
                            start.el.trigger(start.x > stop.x ? "tabsSwipeLeft" : "tabsSwipeRight");
                        }
                    }
                    start = stop = undefined;
                });
        });
    }
    
    /**
     * 添加 swipe功能，zepto的swipeLeft, swipeRight不太准，所以在这另外实现了一套。
     * @class swipe
     * @namespace Tabs
     * @pluginfor Tabs
     */
    gmu.Tabs.register( 'swipe', {
        _init:function () {
            var _opts = this._options;

            this.on( 'ready', function(){
                tabs.push(_opts._content.get(0));
                eventBinded =  eventBinded || (tabsSwipeEvents(), true);
                this.$el.on('tabsSwipeLeft tabsSwipeRight', $.proxy(this._eventHandler, this));
            } );
        },
        _eventHandler:function (e) {
            var _opts = this._options, items, index;
            switch (e.type) {
                case 'tabsSwipeLeft':
                case 'tabsSwipeRight':
                    items = _opts.items;
                    if (e.type == 'tabsSwipeLeft' && _opts.active < items.length - 1) {
                        index = _opts.active + 1;
                    } else if (e.type == 'tabsSwipeRight' && _opts.active > 0) {
                        index = _opts.active - 1;
                    }
                    index !== undefined && (e.stopPropagation(), this.switchTo(index));
                    break;
                default://tap
                    return this.origin(e);
            }
        },
        destroy: function(){
            var _opts = this._options, idx;
            ~(idx = $.inArray(_opts._content.get(0), tabs)) && tabs.splice(idx, 1);
            this.$el.off('tabsSwipeLeft tabsSwipeRight', this._eventHandler);
            tabs.length || ($(document).off('touchstart.tabs'), eventBinded = false);
            return this.origin();
        }
    } );
})(Zepto);
/**
 * @file 工具栏组件
 * @import core/widget.js
 * @module GMU
 */
(function( gmu, $ ) {
    /**
     * 工具栏组件
     *
     * @class Toolbar
     * @constructor Html部分
     * ```html
     * <div id="J_toolbar">
     *      <a href="../">返回</a>
     *      <h2>工具栏</h2>
     *     <span class="btn_1"><span>百科</span></span>
     *     <span class="btn_1">知道</span>
     * </div>
     * ```
     *
     * javascript部分
     * ```javascript
     * $('#J_toolbar').toolbar({});
     * ```
     * @param {dom | zepto | selector} [el] 用来初始化工具栏的元素
     * @param {Object} [options] 组件配置项。具体参数请查看[Options](#GMU:Toolbar:options)
     * @grammar $( el ).toolbar( options ) => zepto
     * @grammar new gmu.Toolbar( el, options ) => instance
     */
    gmu.define( 'Toolbar', {

        options: {

            /**
             * @property {Zepto | Selector | Element} [container=document.body] toolbar的最外层元素
             * @namespace options
             */
            container: document.body,

            /**
             * @property {String} [title='标题'] toolbar的标题
             * @namespace options
             */
            title: '标题',

            /**
             * @property {Array} [leftBtns] 标题左侧的按钮组，支持html、gmu button实例
             * @namespace options
             */
            leftBtns: [],

            /**
             * @property {Array} [rightBtns] 标题右侧的按钮组，支持html、gmu button实例
             * @namespace options
             */
            rightBtns: [],

            /**
             * @property {Boolean} [fixed=false] toolbar是否固定位置
             * @namespace options
             */
            fixed: false
        },

        _init: function() {
            var me = this,
                opts = me._options,
                $el;

            // 设置container的默认值
            if( !opts.container ) {
                opts.container = document.body;
            }

            me.on( 'ready', function() {
                $el = me.$el;

                if( opts.fixed ) {
                    // TODO 元素id的处理
                    var placeholder = $( '<div class="ui-toolbar-placeholder"></div>' ).height( $el.offset().height ).
                        insertBefore( $el ).append( $el ).append( $el.clone().css({'z-index': 1, position: 'absolute',top: 0}) ),
                        top = $el.offset().top,
                        check = function() {
                            document.body.scrollTop > top ? $el.css({position:'fixed', top: 0}) : $el.css('position', 'absolute');
                        },
                        offHandle;

                    $(window).on( 'touchmove touchend touchcancel scroll scrollStop', check );
                    $(document).on( 'touchend touchcancel', offHandle = function() {
                        setTimeout( function() {
                            check();
                        }, 200 );
                    } );
                    me.on( 'destroy', function() {
                        $(window).off('touchmove touchend touchcancel scroll scrollStop', check);
                        $(document).off('touchend touchcancel', offHandle);
                        
                        // 删除placeholder，保留原来的Toolbar节点
                        $el.insertBefore(placeholder);
                        placeholder.remove();
                        me._removeDom();
                    } );

                    check();
                }
            } );

            me.on( 'destroy', function() {
                me._removeDom();
            } );
        },

        _create: function() {
            var me = this,
                opts = me._options,
                $el = me.getEl(),
                container = $( opts.container ),
                children = [],
                btnGroups = me.btnGroups = {
                    left: [],
                    right: []
                },
                currentGroup = btnGroups['left'];

            // render方式，需要先创建Toolbar节点
            if( !opts.setup ) {
                ($el && $el.length > 0) ?
                    $el.appendTo(container) :   // 如果el是一个HTML片段，将其插入container中
                    ($el = me.$el = $('<div>').appendTo( container ));  // 否则，创建一个空div，将其插入container中
            }

            // 从DOM中取出按钮组
            children = $el.children();
            $toolbarWrap = $el.find('.ui-toolbar-wrap');
            if( $toolbarWrap.length === 0 ){
                $toolbarWrap = $('<div class="ui-toolbar-wrap"></div>').appendTo($el);
            }else{
                children = $toolbarWrap.children();
            }

            children.forEach( function( child ) {
                $toolbarWrap.append(child);

                /^[hH]/.test( child.tagName ) ? 
                    (currentGroup = btnGroups['right'], me.title = child) :
                    currentGroup.push( child );
            } );

            // 创建左侧按钮组的容器
            var leftBtnContainer = $toolbarWrap.find('.ui-toolbar-left');
            var rightBtnContainer = $toolbarWrap.find('.ui-toolbar-right');
            if( leftBtnContainer.length === 0 ) {
                leftBtnContainer = children.length ? $('<div class="ui-toolbar-left">').insertBefore(children[0]) : $('<div class="ui-toolbar-left">').appendTo($toolbarWrap);
                btnGroups['left'].forEach( function( btn ) {
                    $(btn).addClass('ui-toolbar-button');
                    leftBtnContainer.append( btn );
                } );
                
                // 没有左侧容器，则认为也没有右侧容器，不需要再判断是否存在右侧容器
                rightBtnContainer = $('<div class="ui-toolbar-right">').appendTo($toolbarWrap);
                btnGroups['right'].forEach( function( btn ) {
                    $(btn).addClass('ui-toolbar-button');
                    rightBtnContainer.append( btn );
                } );
            }

            $el.addClass( 'ui-toolbar' );
            $(me.title).length ? $(me.title).addClass( 'ui-toolbar-title' ) : $('<h1 class="ui-toolbar-title">' + opts.title + '</h1>').insertAfter(leftBtnContainer);;

            me.btnContainer = {
                'left': leftBtnContainer,
                'right': rightBtnContainer
            };

            me.addBtns( 'left', opts.leftBtns );
            me.addBtns( 'right', opts.rightBtns );
        },

        _addBtn: function( container, btn ) {
            var me = this;

            $( btn ).appendTo( container ).addClass('ui-toolbar-button');
        },

        /**
         * 添加按钮组
         * @method addBtns
         * @param {String} [position=right] 按钮添加的位置，left或者right
         * @param {Array} btns 要添加的按钮组，每个按钮可以是一个gmu Button实例，或者元素，或者HTML片段
         * @return {self} 返回本身
         */
        addBtns: function( position, btns ) {
            var me = this,
                btnContainer = me.btnContainer[position],
                toString = Object.prototype.toString;

            // 向下兼容：如果没有传position，认为在右侧添加按钮
            if( toString.call(position) != '[object String]' ) {
                btns = position;
                btnContainer = me.btnContainer['right'];
            }

            btns.forEach( function( btn, index ) {
                // 如果是gmu组件实例，取实例的$el
                if( btn instanceof gmu.Base ) {
                    btn = btn.getEl();
                }
                me._addBtn( btnContainer, btn );
            });

            return me;
        },

        /**
         * 显示Toolbar
         * @method show
         * @return {self} 返回本身。
         */
        
        /**
         * @event show
         * @param {Event} e gmu.Event对象
         * @description Toolbar显示时触发
         */
        show: function() {
            var me = this;

            me.$el.show();
            me.trigger( 'show' );
            me.isShowing = true;

            return me;
        },

        /**
         * 隐藏Toolbar
         * @method hide
         * @return {self} 返回本身。
         */
        
        /**
         * @event hide
         * @param {Event} e gmu.Event对象
         * @description Toolbar隐藏时触发
         */
        hide: function() {
            var me = this;

            me.$el.hide();
            me.trigger( 'hide' );
            me.isShowing = false;

            return me;
        },

        /**
         * 交换Toolbar（显示/隐藏）状态
         * @method toggle
         * @return {self} 返回本身。
         */
        toggle: function() {
            var me = this;

            me.isShowing === false ? 
                me.show() : me.hide();

            return me;
        },

        _removeDom: function(){
            var me = this,
                $el = me.$el;

            if( me._options.setup === false ) {   // 如果是通过render模式创建，移除节点
                $el.remove();
            } else {    // 如果是通过setup模式创建，保留节点
                $el.css('position', 'static').css('top', 'auto');
            }
        }


        /**
         * @event ready
         * @param {Event} e gmu.Event对象
         * @description 当组件初始化完后触发。
         */
        
        /**
         * @event destroy
         * @param {Event} e gmu.Event对象
         * @description 组件在销毁的时候触发
         */
    } );
})( gmu, gmu.$ );

/**
 * @file Toolbar fix插件
 * @module GMU
 * @import widget/toolbar/toolbar.js, extend/fix.js
 */
(function( gmu, $ ) {
    /**
     * Toolbar position插件，调用position方法可以将Toolbar固定在某个位置。
     *
     * @class position
     * @namespace Toolbar
     * @pluginfor Toolbar
     */
    gmu.Toolbar.register( 'position', {
        /**
         * 定位Toolbar
         * @method position
         * @param {Object} opts 定位参数，格式与$.fn.fix参数格式相同
         * @for Toolbar
         * @uses Toolbar.position
         * @return {self} 返回本身。
         */
        position: function( opts ) {
            this.$el.fix( opts );

            return this;
        }
    } );
})( gmu, gmu.$ );
/**
 * @file iOS5插件，适用于iOS5及以上
 * @import widget/refresh/refresh.js,extend/throttle.js
 */
(function( gmu, $, undefined ) {
    
    /**
     * iOS5插件，支持iOS5和以上设备，使用系统自带的内滚功能
     * @class iOS5
     * @namespace Refresh
     * @pluginfor Refresh
     */
    /**
     * @property {Number} [threshold=5] 加载的阀值，默认向上或向下拉动距离超过5px，即可触发拉动操作，该值只能为正值，若该值是10，则需要拉动距离大于15px才可触发加载操作
     * @namespace options
     * @for Refresh
     * @uses Refresh.iOS5
     */
    /**
     * @property {Number} [topOffset=0] 上边缩进的距离，默认为refresh按钮的高度，建议不要修改
     * @namespace options
     * @for Refresh
     * @uses Refresh.iOS5
     */
    gmu.Refresh.register( 'iOS5', {
        _init: function () {
            var me = this,
                opts = me._options,
                $el = me.$el;

            $el.css({
                'overflow': 'scroll',
                '-webkit-overflow-scrolling': 'touch'
            });
            opts.topOffset = opts['$upElem'] ? opts['$upElem'].height() : 0;
            opts.iScroll = me._getiScroll();
            $el.get(0).scrollTop = opts.topOffset;
            $el.on('touchstart touchmove touchend', $.proxy(me._eventHandler, me));
        },
        _changeStyle: function (dir, state) {
            var me = this,
                opts = me._options,
                refreshInfo = opts.refreshInfo[dir];

            me.origin(dir, state);
            switch (state) {
                case 'loaded':
                    refreshInfo['$icon'].addClass('ui-refresh-icon');
                    opts._actDir = '';
                    break;
                case 'beforeload':
                    refreshInfo['$label'].html('松开立即加载');
                    refreshInfo['$icon'].addClass('ui-refresh-flip');
                    break;
                case 'loading':
                    refreshInfo['$icon'].removeClass().addClass('ui-loading');
                    break;
            }
            return me;
        },

        _scrollStart: function (e) {
            var me = this,
                opts = me._options,
                topOffset = opts.topOffset,
                $upElem = opts.$upElem,
                wrapper = me.$el.get(0),
                _scrollFn = function () {
                    clearTimeout(opts.topOffsetTimer);
                    if ($upElem && $upElem.length && wrapper.scrollTop <= topOffset && !opts['_upRefreshed']) {

                        wrapper.scrollTop = topOffset;
                    }
                };

            me.trigger('scrollstart', e);
            me._enableScroll()._bindScrollStop(wrapper, _scrollFn);      //保证wrapper不会滑到最底部或最顶部，使其处于可滑动状态
            opts.maxScrollY = wrapper.offsetHeight - wrapper.scrollHeight;
            opts._scrollFn = _scrollFn;

            return me;
        },

        _scrollMove: function () {
            var me = this,
                opts = me._options,
                up = opts.$upElem && opts.$upElem.length ,
                down = opts.$downElem && opts.$downElem.length,
                wrapper = me.$el.get(0),
                threshold = opts.threshold || 5;

            me._scrollMove = function (e) {
                var maxScrollY = opts.maxScrollY,
                    scrollY = wrapper.scrollTop,
                    lastMoveY = opts.lastMoveY || scrollY,
                    upRefreshed = opts['_upRefreshed'],
                    downRefreshed = opts['_downRefreshed'],
                    upStatus = me._status('up'),
                    downStatus = me._status('down');

                if (up && !upStatus || down && !downStatus) return;    //处于数据正在加载中，即上次加载还未完成，直接返回, 增加上下按钮的同时加载处理 traceID:FEBASE-569, trace:FEBASE-775
                opts.iScroll.deltaY = scrollY - lastMoveY;    //每次在touchmove时更新偏移量的值
                if (downStatus && down && !downRefreshed && -scrollY < (maxScrollY - threshold)) {      //下边按钮，上拉加载
                    me._setMoveState('down', 'beforeload', 'pull');
                } else if (downStatus && down && downRefreshed && -scrollY > (maxScrollY - threshold) && -scrollY !== maxScrollY) {   //下边按钮，上拉恢复  -scrollY !== maxScrollY for trace784
                    me._setMoveState('down', 'loaded', 'restore');
                } else if (upStatus && up && !upRefreshed && -scrollY > threshold ) {      //上边按钮，下拉加载
                    me._setMoveState('up', 'beforeload', 'pull');
                } else if (upStatus && up && upRefreshed && -scrollY < threshold && scrollY) {       //上边按钮，下拉恢复，scrollY !== 0  for trace784
                    me._setMoveState('up', 'loaded', 'restore');
                }

                opts.lastMoveY = scrollY;
                opts._moved = true;
                return me.trigger('scrollmove', e, scrollY, scrollY - lastMoveY);
            };
            me._scrollMove.apply(me, arguments);
        },

        _scrollEnd: function (e) {
            var me = this,
                opts = me._options,
                wrapper = me.$el.get(0),
                topOffset = opts.topOffset,
                actDir = opts._actDir,
                restoreDir = opts._restoreDir;

            /*上边的铵钮隐藏，隐藏条件分以下几种
             1.上边按钮复原操作: restoreDir == 'up'，延迟200ms
             2.上边按钮向下拉，小距离，未触发加载: scrollTop <= topOffset，延迟800ms
             3.上边按钮向下拉，小距离，未触发加载，惯性回弹：scrollTop <= topOffset，延迟800ms
             4.上边按钮向下拉，大距离，再回向上拉，惯性回弹scrollTop <= topOffset不触发，走touchstart时的绑定的scroll事件
             5.上边按钮向下拉，触发加载，走action中的回弹
             */
            if ((restoreDir == 'up' || wrapper.scrollTop <= topOffset) && !actDir && opts._moved) {
                me._options['topOffsetTimer'] = setTimeout( function () {
                    $(wrapper).off('scroll', opts._scrollFn);     //scroll事件不需要再触发
                    wrapper.scrollTop = topOffset;
                }, 800);
            }

            if (actDir && me._status(actDir)) {
                me._setStyle(actDir, 'loading');
                me._loadingAction(actDir, 'pull');
            }

            opts._moved = false;
            return me.trigger('scrollend', e);
        },

        _enableScroll: function () {
            var me = this,
                wrapper = me.$el.get(0),
                scrollY = wrapper.scrollTop;

            scrollY <= 0 && (wrapper.scrollTop = 1);       //滑动到最上方
            if (scrollY + wrapper.offsetHeight >= wrapper.scrollHeight) {    //滑动到最下方
                wrapper.scrollTop = wrapper.scrollHeight - wrapper.offsetHeight - 1;
            }

            return me;
        },

        _bindScrollStop: function (elem, fn) {
            var me = this,
                $elem = $(elem);

            $elem.off('scroll', me._options._scrollFn).on('scroll', $.debounce(100, function(){
                $elem.off('scroll', arguments.callee).one('scroll', fn);
            }, false));

            return me;
        },

        _getiScroll: function () {
            var me = this,
                $wrapper = me.$el,
                wrapper = $wrapper[0];
            return {
                el: wrapper,
                deltaY: 0,
                scrollTo: function (y, time, relative) {
                    if (relative) {
                        y = wrapper.scrollTop + y;
                    }
                    $wrapper.css({
                        '-webkit-transition-property':'scrollTop',
                        '-webkit-transition-duration':y + 'ms'
                    });
                    wrapper.scrollTop = y;
                },

                disable: function (destroy) {
                    destroy && me.destroy();
                    $wrapper.css('overflow', 'hidden');
                },

                enable:function () {
                    $wrapper.css('overflow', 'scroll');
                }
            }
        },

        _setMoveState: function (dir, state, actType) {
            var me = this,
                opts = me._options;

            me._setStyle(dir, state);
            opts['_' + dir + 'Refreshed'] = actType == 'pull';
            opts['_actDir'] = actType == 'pull' ? dir : '';
            opts['_restoreDir'] = dir == 'up' && actType == 'restore' ? dir : ''
            return me;
        },

        _eventHandler: function (e) {
            var me = this;
            switch(e.type) {
                case 'touchstart':
                    me._scrollStart(e);
                    break;
                case 'touchmove':
                    me._scrollMove(e);
                    break;
                case 'touchend':
                    me._scrollEnd(e);
                    break;
            }
        },
        afterDataLoading: function (dir) {
            var me = this,
                opts = me._options,
                dir = dir || opts._actDir;

            opts['_' + dir + 'Refreshed'] = false;
            dir == 'up' && (me.$el.get(0).scrollTop = opts.topOffset);
            return me.origin(dir);
        }
    } );
})( gmu, gmu.$ );
/**
 * @file lite插件，上拉加载更多，利用原生滚动，不使用iscroll
 * @import widget/refresh/refresh.js
 */

(function( gmu, $, undefined ) {
    
    /**
     * lite插件，上拉加载更多，利用原生滚动，不使用iscroll
     * @class lite
     * @namespace Refresh
     * @pluginfor Refresh
     */
    /**
     * @property {Number} [threshold=5] 加载的阀值，默认手指在屏幕的一半，并且拉动距离超过10px即可触发加载操作，配置该值后，可以将手指在屏幕位置进行修重情重改，若需要实现连续加载效果，可将该值配置很大，如1000等
     * @namespace options
     * @for Refresh
     * @uses Refresh.lite
     */
    /**
     * @property {Boolean} [seamless=false] 是否连续加载，解决设置threshold在部分手机上惯性滚动，或滚动较快时不触发touchmove的问题
     * @namespace options
     * @for Refresh
     * @uses Refresh.lite
     */
    gmu.Refresh.register( 'lite', {
        _init: function () {
            var me = this,
                opts = me._options,
                $el = me.$el;

            opts.seamless && $(document).on('scrollStop', $.proxy(me._eventHandler, me));
            $el.on('touchstart touchmove touchend touchcancel', $.proxy(me._eventHandler, me));
            opts.wrapperH = $el.height();
            opts.wrapperTop = $el.offset().top;
            opts._win = window;
            opts._body = document.body;
            return me;
        },
        _changeStyle: function (dir, state) {
            var me = this,
                refreshInfo = me._options.refreshInfo[dir];

            if (state == 'beforeload') {
                refreshInfo['$icon'].removeClass('ui-loading');
                refreshInfo['$label'].html('松开立即加载');
            }
            return me.origin(dir, state);
        },
        _startHandler: function (e) {
            this._options._startY = e.touches[0].pageY;
        },
        _moveHandler: function (e) {
            var me = this,
                opts = me._options,
                startY = opts._startY,
                movedY = startY - e.touches[0].pageY,
                winHeight = opts._win.innerHeight,
                threshold = opts.threshold || (opts.wrapperH < winHeight ? (opts.wrapperH / 2 + opts.wrapperTop || 0) : winHeight / 2);     //默认值为可视区域高度的一半，若wrapper高度不足屏幕一半时，则为list的一半

            if (!me._status('down') || movedY < 0) return;
            if (!opts['_refreshing'] && (startY >= opts._body.scrollHeight - winHeight + threshold) && movedY > 10) {    //下边按钮，上拉加载
                me._setStyle('down', 'beforeload');
                opts['_refreshing'] = true;
            }
            return me;
        },

        _endHandler: function () {
            var me = this,
                opts = me._options;
            me._setStyle('down', 'loading');
            me._loadingAction('down', 'pull');
            opts['_refreshing'] = false;
            return me;
        },

        _eventHandler: function (e) {
            var me = this,
                opts = me._options;

            switch (e.type) {
                case 'touchstart':
                    me._startHandler(e);
                    break;
                case 'touchmove':
                    clearTimeout(opts._endTimer);        //解决部分android上，touchmove未禁用时，touchend不触发问题
                    opts._endTimer = setTimeout( function () {
                        me._endHandler();
                    }, 300);
                    me._moveHandler(e);
                    break;
                case 'touchend':
                case 'touchcancel':
                    clearTimeout(opts._endTimer);
                    opts._refreshing && me._endHandler();
                    break;
                case 'scrollStop':
                    (!opts._refreshing && opts._win.pageYOffset >= opts._body.scrollHeight - opts._win.innerHeight + (opts.threshold || -1)) && me._endHandler();
                    break;
            }
            return me;
        }
    } );
})( gmu, gmu.$ );
/*!art-template - Template Engine | http://aui.github.com/artTemplate/*/
!function(){function a(a){return a.replace(t,"").replace(u,",").replace(v,"").replace(w,"").replace(x,"").split(y)}function b(a){return"'"+a.replace(/('|\\)/g,"\\$1").replace(/\r/g,"\\r").replace(/\n/g,"\\n")+"'"}function c(c,d){function e(a){return m+=a.split(/\n/).length-1,k&&(a=a.replace(/\s+/g," ").replace(/<!--[\w\W]*?-->/g,"")),a&&(a=s[1]+b(a)+s[2]+"\n"),a}function f(b){var c=m;if(j?b=j(b,d):g&&(b=b.replace(/\n/g,function(){return m++,"$line="+m+";"})),0===b.indexOf("=")){var e=l&&!/^=[=#]/.test(b);if(b=b.replace(/^=[=#]?|[\s;]*$/g,""),e){var f=b.replace(/\s*\([^\)]+\)/,"");n[f]||/^(include|print)$/.test(f)||(b="$escape("+b+")")}else b="$string("+b+")";b=s[1]+b+s[2]}return g&&(b="$line="+c+";"+b),r(a(b),function(a){if(a&&!p[a]){var b;b="print"===a?u:"include"===a?v:n[a]?"$utils."+a:o[a]?"$helpers."+a:"$data."+a,w+=a+"="+b+",",p[a]=!0}}),b+"\n"}var g=d.debug,h=d.openTag,i=d.closeTag,j=d.parser,k=d.compress,l=d.escape,m=1,p={$data:1,$filename:1,$utils:1,$helpers:1,$out:1,$line:1},q="".trim,s=q?["$out='';","$out+=",";","$out"]:["$out=[];","$out.push(",");","$out.join('')"],t=q?"$out+=text;return $out;":"$out.push(text);",u="function(){var text=''.concat.apply('',arguments);"+t+"}",v="function(filename,data){data=data||$data;var text=$utils.$include(filename,data,$filename);"+t+"}",w="'use strict';var $utils=this,$helpers=$utils.$helpers,"+(g?"$line=0,":""),x=s[0],y="return new String("+s[3]+");";r(c.split(h),function(a){a=a.split(i);var b=a[0],c=a[1];1===a.length?x+=e(b):(x+=f(b),c&&(x+=e(c)))});var z=w+x+y;g&&(z="try{"+z+"}catch(e){throw {filename:$filename,name:'Render Error',message:e.message,line:$line,source:"+b(c)+".split(/\\n/)[$line-1].replace(/^\\s+/,'')};}");try{var A=new Function("$data","$filename",z);return A.prototype=n,A}catch(B){throw B.temp="function anonymous($data,$filename) {"+z+"}",B}}var d=function(a,b){return"string"==typeof b?q(b,{filename:a}):g(a,b)};d.version="3.0.0",d.config=function(a,b){e[a]=b};var e=d.defaults={openTag:"<%",closeTag:"%>",escape:!0,cache:!0,compress:!1,parser:null},f=d.cache={};d.render=function(a,b){return q(a,b)};var g=d.renderFile=function(a,b){var c=d.get(a)||p({filename:a,name:"Render Error",message:"Template not found"});return b?c(b):c};d.get=function(a){var b;if(f[a])b=f[a];else if("object"==typeof document){var c=document.getElementById(a);if(c){var d=(c.value||c.innerHTML).replace(/^\s*|\s*$/g,"");b=q(d,{filename:a})}}return b};var h=function(a,b){return"string"!=typeof a&&(b=typeof a,"number"===b?a+="":a="function"===b?h(a.call(a)):""),a},i={"<":"&#60;",">":"&#62;",'"':"&#34;","'":"&#39;","&":"&#38;"},j=function(a){return i[a]},k=function(a){return h(a).replace(/&(?![\w#]+;)|[<>"']/g,j)},l=Array.isArray||function(a){return"[object Array]"==={}.toString.call(a)},m=function(a,b){var c,d;if(l(a))for(c=0,d=a.length;d>c;c++)b.call(a,a[c],c,a);else for(c in a)b.call(a,a[c],c)},n=d.utils={$helpers:{},$include:g,$string:h,$escape:k,$each:m};d.helper=function(a,b){o[a]=b};var o=d.helpers=n.$helpers;d.onerror=function(a){var b="Template Error\n\n";for(var c in a)b+="<"+c+">\n"+a[c]+"\n\n";"object"==typeof console&&console.error(b)};var p=function(a){return d.onerror(a),function(){return"{Template Error}"}},q=d.compile=function(a,b){function d(c){try{return new i(c,h)+""}catch(d){return b.debug?p(d)():(b.debug=!0,q(a,b)(c))}}b=b||{};for(var g in e)void 0===b[g]&&(b[g]=e[g]);var h=b.filename;try{var i=c(a,b)}catch(j){return j.filename=h||"anonymous",j.name="Syntax Error",p(j)}return d.prototype=i.prototype,d.toString=function(){return i.toString()},h&&b.cache&&(f[h]=d),d},r=n.$each,s="break,case,catch,continue,debugger,default,delete,do,else,false,finally,for,function,if,in,instanceof,new,null,return,switch,this,throw,true,try,typeof,var,void,while,with,abstract,boolean,byte,char,class,const,double,enum,export,extends,final,float,goto,implements,import,int,interface,long,native,package,private,protected,public,short,static,super,synchronized,throws,transient,volatile,arguments,let,yield,undefined",t=/\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|\s*\.\s*[$\w\.]+/g,u=/[^\w$]+/g,v=new RegExp(["\\b"+s.replace(/,/g,"\\b|\\b")+"\\b"].join("|"),"g"),w=/^\d[^,]*|,\d[^,]*/g,x=/^,+|,+$/g,y=/^$|,+/;e.openTag="{{",e.closeTag="}}";var z=function(a,b){var c=b.split(":"),d=c.shift(),e=c.join(":")||"";return e&&(e=", "+e),"$helpers."+d+"("+a+e+")"};e.parser=function(a){a=a.replace(/^\s/,"");var b=a.split(" "),c=b.shift(),e=b.join(" ");switch(c){case"if":a="if("+e+"){";break;case"else":b="if"===b.shift()?" if("+b.join(" ")+")":"",a="}else"+b+"{";break;case"/if":a="}";break;case"each":var f=b[0]||"$data",g=b[1]||"as",h=b[2]||"$value",i=b[3]||"$index",j=h+","+i;"as"!==g&&(f="[]"),a="$each("+f+",function("+j+"){";break;case"/each":a="});";break;case"echo":a="print("+e+");";break;case"print":case"include":a=c+"("+b.join(",")+");";break;default:if(/^\s*\|\s*[\w\$]/.test(e)){var k=!0;0===a.indexOf("#")&&(a=a.substr(1),k=!1);for(var l=0,m=a.split("|"),n=m.length,o=m[l++];n>l;l++)o=z(o,m[l]);a=(k?"=":"=#")+o}else a=d.helpers[c]?"=#"+c+"("+b.join(",")+");":"="+a}return a},"function"==typeof define?define(function(){return d}):"undefined"!=typeof exports?module.exports=d:this.template=d}();

!function(t){var e,i;!function(){function t(t,e){if(!e)return t;if(0===t.indexOf(".")){var i=e.split("/"),o=t.split("/"),n=i.length-1,r=o.length,s=0,a=0;t:for(var h=0;r>h;h++)switch(o[h]){case"..":if(!(n>s))break t;s++,a++;break;case".":a++;break;default:break t}return i.length=n-s,o=o.slice(a),i.concat(o).join("/")}return t}function o(e){function i(i,s){if("string"==typeof i){var a=o[i];return a||(a=r(t(i,e)),o[i]=a),a}i instanceof Array&&(s=s||function(){},s.apply(this,n(i,s,e)))}var o={};return i}function n(i,o,n){for(var a=[],h=s[n],l=0,c=Math.min(i.length,o.length);c>l;l++){var d,u=t(i[l],n);switch(u){case"require":d=h&&h.require||e;break;case"exports":d=h.exports;break;case"module":d=h;break;default:d=r(u)}a.push(d)}return a}function r(t){var e=s[t];if(!e)throw new Error("No "+t);if(!e.defined){var i=e.factory,o=i.apply(this,n(e.deps||[],i,t));"undefined"!=typeof o&&(e.exports=o),e.defined=1}return e.exports}var s={};i=function(t,e,i){s[t]={id:t,deps:e,factory:i,defined:0,exports:{},require:o(t)}},e=o("")}(),i("echarts/chart/line",["require","./base","zrender/shape/Polyline","../util/shape/Icon","../util/shape/HalfSmoothPolygon","../component/axis","../component/grid","../component/dataZoom","../config","../util/ecData","zrender/tool/util","zrender/tool/color","../chart"],function(t){function e(t,e,i,n,r){o.call(this,t,e,i,n,r),this.refresh(n)}function i(t,e,i){var o=e.x,n=e.y,s=e.width,a=e.height,h=a/2;e.symbol.match("empty")&&(t.fillStyle="#fff"),e.brushType="both";var l=e.symbol.replace("empty","").toLowerCase();l.match("star")?(h=l.replace("star","")-0||5,n-=1,l="star"):("rectangle"===l||"arrow"===l)&&(o+=(s-a)/2,s=a);var c="";if(l.match("image")&&(c=l.replace(new RegExp("^image:\\/\\/"),""),l="image",o+=Math.round((s-a)/2)-1,s=a+=2),l=r.prototype.iconLibrary[l]){var d=e.x,u=e.y;t.moveTo(d,u+h),t.lineTo(d+5,u+h),t.moveTo(d+e.width-5,u+h),t.lineTo(d+e.width,u+h);var p=this;l(t,{x:o+4,y:n+4,width:s-8,height:a-8,n:h,image:c},function(){p.modSelf(),i()})}else t.moveTo(o,n+h),t.lineTo(o+s,n+h)}var o=t("./base"),n=t("zrender/shape/Polyline"),r=t("../util/shape/Icon"),s=t("../util/shape/HalfSmoothPolygon");t("../component/axis"),t("../component/grid"),t("../component/dataZoom");var a=t("../config");a.line={zlevel:0,z:2,clickable:!0,legendHoverLink:!0,xAxisIndex:0,yAxisIndex:0,dataFilter:"nearest",itemStyle:{normal:{label:{show:!1},lineStyle:{width:2,type:"solid",shadowColor:"rgba(0,0,0,0)",shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0}},emphasis:{label:{show:!1}}},symbolSize:2,showAllSymbol:!1};var h=t("../util/ecData"),l=t("zrender/tool/util"),c=t("zrender/tool/color");return e.prototype={type:a.CHART_TYPE_LINE,_buildShape:function(){this.finalPLMap={},this._buildPosition()},_buildHorizontal:function(t,e,i,o){for(var n,r,s,a,h,l,c,d,u,p=this.series,f=i[0][0],g=p[f],m=this.component.xAxis.getAxis(g.xAxisIndex||0),_={},y=0,v=e;v>y&&null!=m.getNameByIndex(y);y++){r=m.getCoordByIndex(y);for(var x=0,b=i.length;b>x;x++){n=this.component.yAxis.getAxis(p[i[x][0]].yAxisIndex||0),h=a=c=l=n.getCoord(0);for(var T=0,S=i[x].length;S>T;T++)f=i[x][T],g=p[f],d=g.data[y],u=this.getDataFromOption(d,"-"),_[f]=_[f]||[],o[f]=o[f]||{min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY,sum:0,counter:0,average:0},"-"!==u?(u>=0?(a-=T>0?n.getCoordSize(u):h-n.getCoord(u),s=a):0>u&&(l+=T>0?n.getCoordSize(u):n.getCoord(u)-c,s=l),_[f].push([r,s,y,m.getNameByIndex(y),r,h]),o[f].min>u&&(o[f].min=u,o[f].minY=s,o[f].minX=r),o[f].max<u&&(o[f].max=u,o[f].maxY=s,o[f].maxX=r),o[f].sum+=u,o[f].counter++):_[f].length>0&&(this.finalPLMap[f]=this.finalPLMap[f]||[],this.finalPLMap[f].push(_[f]),_[f]=[])}a=this.component.grid.getY();for(var z,x=0,b=i.length;b>x;x++)for(var T=0,S=i[x].length;S>T;T++)f=i[x][T],g=p[f],d=g.data[y],u=this.getDataFromOption(d,"-"),"-"==u&&this.deepQuery([d,g,this.option],"calculable")&&(z=this.deepQuery([d,g],"symbolSize"),a+=2*z+5,s=a,this.shapeList.push(this._getCalculableItem(f,y,m.getNameByIndex(y),r,s,"horizontal")))}for(var C in _)_[C].length>0&&(this.finalPLMap[C]=this.finalPLMap[C]||[],this.finalPLMap[C].push(_[C]),_[C]=[]);this._calculMarkMapXY(o,i,"y"),this._buildBorkenLine(t,this.finalPLMap,m,"horizontal")},_buildVertical:function(t,e,i,o){for(var n,r,s,a,h,l,c,d,u,p=this.series,f=i[0][0],g=p[f],m=this.component.yAxis.getAxis(g.yAxisIndex||0),_={},y=0,v=e;v>y&&null!=m.getNameByIndex(y);y++){s=m.getCoordByIndex(y);for(var x=0,b=i.length;b>x;x++){n=this.component.xAxis.getAxis(p[i[x][0]].xAxisIndex||0),h=a=c=l=n.getCoord(0);for(var T=0,S=i[x].length;S>T;T++)f=i[x][T],g=p[f],d=g.data[y],u=this.getDataFromOption(d,"-"),_[f]=_[f]||[],o[f]=o[f]||{min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY,sum:0,counter:0,average:0},"-"!==u?(u>=0?(a+=T>0?n.getCoordSize(u):n.getCoord(u)-h,r=a):0>u&&(l-=T>0?n.getCoordSize(u):c-n.getCoord(u),r=l),_[f].push([r,s,y,m.getNameByIndex(y),h,s]),o[f].min>u&&(o[f].min=u,o[f].minX=r,o[f].minY=s),o[f].max<u&&(o[f].max=u,o[f].maxX=r,o[f].maxY=s),o[f].sum+=u,o[f].counter++):_[f].length>0&&(this.finalPLMap[f]=this.finalPLMap[f]||[],this.finalPLMap[f].push(_[f]),_[f]=[])}a=this.component.grid.getXend();for(var z,x=0,b=i.length;b>x;x++)for(var T=0,S=i[x].length;S>T;T++)f=i[x][T],g=p[f],d=g.data[y],u=this.getDataFromOption(d,"-"),"-"==u&&this.deepQuery([d,g,this.option],"calculable")&&(z=this.deepQuery([d,g],"symbolSize"),a-=2*z+5,r=a,this.shapeList.push(this._getCalculableItem(f,y,m.getNameByIndex(y),r,s,"vertical")))}for(var C in _)_[C].length>0&&(this.finalPLMap[C]=this.finalPLMap[C]||[],this.finalPLMap[C].push(_[C]),_[C]=[]);this._calculMarkMapXY(o,i,"x"),this._buildBorkenLine(t,this.finalPLMap,m,"vertical")},_buildOther:function(t,e,i,o){for(var n,r=this.series,s={},a=0,h=i.length;h>a;a++)for(var l=0,c=i[a].length;c>l;l++){var d=i[a][l],u=r[d];n=this.component.xAxis.getAxis(u.xAxisIndex||0);var p=this.component.yAxis.getAxis(u.yAxisIndex||0),f=p.getCoord(0);s[d]=s[d]||[],o[d]=o[d]||{min0:Number.POSITIVE_INFINITY,min1:Number.POSITIVE_INFINITY,max0:Number.NEGATIVE_INFINITY,max1:Number.NEGATIVE_INFINITY,sum0:0,sum1:0,counter0:0,counter1:0,average0:0,average1:0};for(var g=0,m=u.data.length;m>g;g++){var _=u.data[g],y=this.getDataFromOption(_,"-");if(y instanceof Array){var v=n.getCoord(y[0]),x=p.getCoord(y[1]);s[d].push([v,x,g,y[0],v,f]),o[d].min0>y[0]&&(o[d].min0=y[0],o[d].minY0=x,o[d].minX0=v),o[d].max0<y[0]&&(o[d].max0=y[0],o[d].maxY0=x,o[d].maxX0=v),o[d].sum0+=y[0],o[d].counter0++,o[d].min1>y[1]&&(o[d].min1=y[1],o[d].minY1=x,o[d].minX1=v),o[d].max1<y[1]&&(o[d].max1=y[1],o[d].maxY1=x,o[d].maxX1=v),o[d].sum1+=y[1],o[d].counter1++}}}for(var b in s)s[b].length>0&&(this.finalPLMap[b]=this.finalPLMap[b]||[],this.finalPLMap[b].push(s[b]),s[b]=[]);this._calculMarkMapXY(o,i,"xy"),this._buildBorkenLine(t,this.finalPLMap,n,"other")},_buildBorkenLine:function(t,e,i,o){for(var r,a="other"==o?"horizontal":o,d=this.series,u=t.length-1;u>=0;u--){var p=t[u],f=d[p],g=e[p];if(f.type===this.type&&null!=g)for(var m=this._getBbox(p,a),_=this._sIndex2ColorMap[p],y=this.query(f,"itemStyle.normal.lineStyle.width"),v=this.query(f,"itemStyle.normal.lineStyle.type"),x=this.query(f,"itemStyle.normal.lineStyle.color"),b=this.getItemStyleColor(this.query(f,"itemStyle.normal.color"),p,-1),T=null!=this.query(f,"itemStyle.normal.areaStyle"),S=this.query(f,"itemStyle.normal.areaStyle.color"),z=0,C=g.length;C>z;z++){var E=g[z],w="other"!=o&&this._isLarge(a,E);if(w)E=this._getLargePointList(a,E,f.dataFilter);else for(var L=0,A=E.length;A>L;L++)r=f.data[E[L][2]],(this.deepQuery([r,f,this.option],"calculable")||this.deepQuery([r,f],"showAllSymbol")||"categoryAxis"===i.type&&i.isMainAxis(E[L][2])&&"none"!=this.deepQuery([r,f],"symbol"))&&this.shapeList.push(this._getSymbol(p,E[L][2],E[L][3],E[L][0],E[L][1],a));var M=new n({zlevel:f.zlevel,z:f.z,style:{miterLimit:y,pointList:E,strokeColor:x||b||_,lineWidth:y,lineType:v,smooth:this._getSmooth(f.smooth),smoothConstraint:m,shadowColor:this.query(f,"itemStyle.normal.lineStyle.shadowColor"),shadowBlur:this.query(f,"itemStyle.normal.lineStyle.shadowBlur"),shadowOffsetX:this.query(f,"itemStyle.normal.lineStyle.shadowOffsetX"),shadowOffsetY:this.query(f,"itemStyle.normal.lineStyle.shadowOffsetY")},hoverable:!1,_main:!0,_seriesIndex:p,_orient:a});if(h.pack(M,d[p],p,0,z,d[p].name),this.shapeList.push(M),T){var k=new s({zlevel:f.zlevel,z:f.z,style:{miterLimit:y,pointList:l.clone(E).concat([[E[E.length-1][4],E[E.length-1][5]],[E[0][4],E[0][5]]]),brushType:"fill",smooth:this._getSmooth(f.smooth),smoothConstraint:m,color:S?S:c.alpha(_,.5)},highlightStyle:{brushType:"fill"},hoverable:!1,_main:!0,_seriesIndex:p,_orient:a});h.pack(k,d[p],p,0,z,d[p].name),this.shapeList.push(k)}}}},_getBbox:function(t,e){var i=this.component.grid.getBbox(),o=this.xMarkMap[t];return null!=o.minX0?[[Math.min(o.minX0,o.maxX0,o.minX1,o.maxX1),Math.min(o.minY0,o.maxY0,o.minY1,o.maxY1)],[Math.max(o.minX0,o.maxX0,o.minX1,o.maxX1),Math.max(o.minY0,o.maxY0,o.minY1,o.maxY1)]]:("horizontal"===e?(i[0][1]=Math.min(o.minY,o.maxY),i[1][1]=Math.max(o.minY,o.maxY)):(i[0][0]=Math.min(o.minX,o.maxX),i[1][0]=Math.max(o.minX,o.maxX)),i)},_isLarge:function(t,e){return e.length<2?!1:"horizontal"===t?Math.abs(e[0][0]-e[1][0])<.5:Math.abs(e[0][1]-e[1][1])<.5},_getLargePointList:function(t,e,i){var o;o="horizontal"===t?this.component.grid.getWidth():this.component.grid.getHeight();var n=e.length,r=[];if("function"!=typeof i)switch(i){case"min":i=function(t){return Math.max.apply(null,t)};break;case"max":i=function(t){return Math.min.apply(null,t)};break;case"average":i=function(t){for(var e=0,i=0;i<t.length;i++)e+=t[i];return e/t.length};break;default:i=function(t){return t[0]}}for(var s=[],a=0;o>a;a++){var h=Math.floor(n/o*a),l=Math.min(Math.floor(n/o*(a+1)),n);if(!(h>=l)){for(var c=h;l>c;c++)s[c-h]="horizontal"===t?e[c][1]:e[c][0];s.length=l-h;for(var d=i(s),u=-1,p=1/0,c=h;l>c;c++){var f="horizontal"===t?e[c][1]:e[c][0],g=Math.abs(f-d);p>g&&(u=c,p=g)}var m=e[u].slice();"horizontal"===t?m[1]=d:m[0]=d,r.push(m)}}return r},_getSmooth:function(t){return t?.3:0},_getCalculableItem:function(t,e,i,o,n,r){var s=this.series,h=s[t].calculableHolderColor||this.ecTheme.calculableHolderColor||a.calculableHolderColor,l=this._getSymbol(t,e,i,o,n,r);return l.style.color=h,l.style.strokeColor=h,l.rotation=[0,0],l.hoverable=!1,l.draggable=!1,l.style.text=void 0,l},_getSymbol:function(t,e,i,o,n,r){var s=this.series,a=s[t],h=a.data[e],l=this.getSymbolShape(a,t,h,e,i,o,n,this._sIndex2ShapeMap[t],this._sIndex2ColorMap[t],"#fff","vertical"===r?"horizontal":"vertical");return l.zlevel=a.zlevel,l.z=a.z+1,this.deepQuery([h,a,this.option],"calculable")&&(this.setCalculable(l),l.draggable=!0),l},getMarkCoord:function(t,e){var i=this.series[t],o=this.xMarkMap[t],n=this.component.xAxis.getAxis(i.xAxisIndex),r=this.component.yAxis.getAxis(i.yAxisIndex);if(e.type&&("max"===e.type||"min"===e.type||"average"===e.type)){var s=null!=e.valueIndex?e.valueIndex:null!=o.maxX0?"1":"";return[o[e.type+"X"+s],o[e.type+"Y"+s],o[e.type+"Line"+s],o[e.type+s]]}return["string"!=typeof e.xAxis&&n.getCoordByIndex?n.getCoordByIndex(e.xAxis||0):n.getCoord(e.xAxis||0),"string"!=typeof e.yAxis&&r.getCoordByIndex?r.getCoordByIndex(e.yAxis||0):r.getCoord(e.yAxis||0)]},refresh:function(t){t&&(this.option=t,this.series=t.series),this.backupShapeList(),this._buildShape()},ontooltipHover:function(t,e){for(var i,o,n=t.seriesIndex,r=t.dataIndex,s=n.length;s--;)if(i=this.finalPLMap[n[s]])for(var a=0,h=i.length;h>a;a++){o=i[a];for(var l=0,c=o.length;c>l;l++)r===o[l][2]&&e.push(this._getSymbol(n[s],o[l][2],o[l][3],o[l][0],o[l][1],"horizontal"))}},addDataAnimation:function(t,e){function i(){g--,0===g&&e&&e()}function o(t){t.style.controlPointList=null}for(var n=this.series,r={},s=0,a=t.length;a>s;s++)r[t[s][0]]=t[s];for(var h,l,c,d,u,p,f,g=0,s=this.shapeList.length-1;s>=0;s--)if(u=this.shapeList[s]._seriesIndex,r[u]&&!r[u][3]){if(this.shapeList[s]._main&&this.shapeList[s].style.pointList.length>1){if(p=this.shapeList[s].style.pointList,l=Math.abs(p[0][0]-p[1][0]),d=Math.abs(p[0][1]-p[1][1]),f="horizontal"===this.shapeList[s]._orient,r[u][2]){if("half-smooth-polygon"===this.shapeList[s].type){var m=p.length;this.shapeList[s].style.pointList[m-3]=p[m-2],this.shapeList[s].style.pointList[m-3][f?0:1]=p[m-4][f?0:1],this.shapeList[s].style.pointList[m-2]=p[m-1]}this.shapeList[s].style.pointList.pop(),f?(h=l,c=0):(h=0,c=-d)}else{if(this.shapeList[s].style.pointList.shift(),"half-smooth-polygon"===this.shapeList[s].type){var _=this.shapeList[s].style.pointList.pop();f?_[0]=p[0][0]:_[1]=p[0][1],this.shapeList[s].style.pointList.push(_)}f?(h=-l,c=0):(h=0,c=d)}this.shapeList[s].style.controlPointList=null,this.zr.modShape(this.shapeList[s])}else{if(r[u][2]&&this.shapeList[s]._dataIndex===n[u].data.length-1){this.zr.delShape(this.shapeList[s].id);continue}if(!r[u][2]&&0===this.shapeList[s]._dataIndex){this.zr.delShape(this.shapeList[s].id);continue}}this.shapeList[s].position=[0,0],g++,this.zr.animate(this.shapeList[s].id,"").when(this.query(this.option,"animationDurationUpdate"),{position:[h,c]}).during(o).done(i).start()}g||e&&e()}},r.prototype.iconLibrary.legendLineIcon=i,l.inherits(e,o),t("../chart").define("line",e),e}),i("echarts/echarts",["require","./config","zrender/tool/util","zrender/tool/event","zrender/tool/env","zrender","zrender/config","./chart/island","./component/toolbox","./component","./component/title","./component/tooltip","./component/legend","./util/ecData","./chart","zrender/tool/color","./component/timeline","zrender/shape/Image","zrender/loadingEffect/Bar","zrender/loadingEffect/Bubble","zrender/loadingEffect/DynamicLine","zrender/loadingEffect/Ring","zrender/loadingEffect/Spin","zrender/loadingEffect/Whirling","./theme/macarons","./theme/infographic"],function(t){function e(){s.Dispatcher.call(this)}function i(t){t.innerHTML="",this._themeConfig={},this.dom=t,this._connected=!1,this._status={dragIn:!1,dragOut:!1,needRefresh:!1},this._curEventType=!1,this._chartList=[],this._messageCenter=new e,this._messageCenterOutSide=new e,this.resize=this.resize(),this._init()}function o(t,e,i,o,n){for(var r=t._chartList,s=r.length;s--;){var a=r[s];"function"==typeof a[e]&&a[e](i,o,n)}}var n=t("./config"),r=t("zrender/tool/util"),s=t("zrender/tool/event"),a={},h=t("zrender/tool/env").canvasSupported,l=new Date-0,c={},d="_echarts_instance_";a.version="2.2.7",a.dependencies={zrender:"2.1.1"},a.init=function(e,o){var n=t("zrender");n.version.replace(".","")-0<a.dependencies.zrender.replace(".","")-0&&console.error("ZRender "+n.version+" is too old for ECharts "+a.version+". Current version need ZRender "+a.dependencies.zrender+"+"),e=e instanceof Array?e[0]:e;var r=e.getAttribute(d);return r||(r=l++,e.setAttribute(d,r)),c[r]&&c[r].dispose(),c[r]=new i(e),c[r].id=r,c[r].canvasSupported=h,c[r].setTheme(o),c[r]},a.getInstanceById=function(t){return c[t]},r.merge(e.prototype,s.Dispatcher.prototype,!0);var u=t("zrender/config").EVENT,p=["CLICK","DBLCLICK","MOUSEOVER","MOUSEOUT","DRAGSTART","DRAGEND","DRAGENTER","DRAGOVER","DRAGLEAVE","DROP"];return i.prototype={_init:function(){var e=this,i=t("zrender").init(this.dom);this._zr=i,this._messageCenter.dispatch=function(t,i,o,n){o=o||{},o.type=t,o.event=i,e._messageCenter.dispatchWithContext(t,o,n),e._messageCenterOutSide.dispatchWithContext(t,o,n)},this._onevent=function(t){return e.__onevent(t)};for(var o in n.EVENT)"CLICK"!=o&&"DBLCLICK"!=o&&"HOVER"!=o&&"MOUSEOUT"!=o&&"MAP_ROAM"!=o&&this._messageCenter.bind(n.EVENT[o],this._onevent,this);var r={};this._onzrevent=function(t){return e[r[t.type]](t)};for(var s=0,a=p.length;a>s;s++){var h=p[s],l=u[h];r[l]="_on"+h.toLowerCase(),i.on(l,this._onzrevent)}this.chart={},this.component={};var c=t("./chart/island");this._island=new c(this._themeConfig,this._messageCenter,i,{},this),this.chart.island=this._island;var d=t("./component/toolbox");this._toolbox=new d(this._themeConfig,this._messageCenter,i,{},this),this.component.toolbox=this._toolbox;var f=t("./component");f.define("title",t("./component/title")),f.define("tooltip",t("./component/tooltip")),f.define("legend",t("./component/legend")),(0===i.getWidth()||0===i.getHeight())&&console.error("Dom’s width & height should be ready before init.")},__onevent:function(t){t.__echartsId=t.__echartsId||this.id;var e=t.__echartsId===this.id;switch(this._curEventType||(this._curEventType=t.type),t.type){case n.EVENT.LEGEND_SELECTED:this._onlegendSelected(t);break;case n.EVENT.DATA_ZOOM:if(!e){var i=this.component.dataZoom;i&&(i.silence(!0),i.absoluteZoom(t.zoom),i.silence(!1))}this._ondataZoom(t);break;case n.EVENT.DATA_RANGE:e&&this._ondataRange(t);break;case n.EVENT.MAGIC_TYPE_CHANGED:if(!e){var o=this.component.toolbox;o&&(o.silence(!0),o.setMagicType(t.magicType),o.silence(!1))}this._onmagicTypeChanged(t);break;case n.EVENT.DATA_VIEW_CHANGED:e&&this._ondataViewChanged(t);break;case n.EVENT.TOOLTIP_HOVER:e&&this._tooltipHover(t);break;case n.EVENT.RESTORE:this._onrestore();break;case n.EVENT.REFRESH:e&&this._onrefresh(t);break;case n.EVENT.TOOLTIP_IN_GRID:case n.EVENT.TOOLTIP_OUT_GRID:if(e){if(this._connected){var r=this.component.grid;r&&(t.x=(t.event.zrenderX-r.getX())/r.getWidth(),t.y=(t.event.zrenderY-r.getY())/r.getHeight())}}else{var r=this.component.grid;r&&this._zr.trigger("mousemove",{connectTrigger:!0,zrenderX:r.getX()+t.x*r.getWidth(),zrenderY:r.getY()+t.y*r.getHeight()})}}if(this._connected&&e&&this._curEventType===t.type){for(var s in this._connected)this._connected[s].connectedEventHandler(t);this._curEventType=null}(!e||!this._connected&&e)&&(this._curEventType=null)},_onclick:function(t){if(o(this,"onclick",t),t.target){var e=this._eventPackage(t.target);e&&null!=e.seriesIndex&&this._messageCenter.dispatch(n.EVENT.CLICK,t.event,e,this)}},_ondblclick:function(t){if(o(this,"ondblclick",t),t.target){var e=this._eventPackage(t.target);e&&null!=e.seriesIndex&&this._messageCenter.dispatch(n.EVENT.DBLCLICK,t.event,e,this)}},_onmouseover:function(t){if(t.target){var e=this._eventPackage(t.target);e&&null!=e.seriesIndex&&this._messageCenter.dispatch(n.EVENT.HOVER,t.event,e,this)}},_onmouseout:function(t){if(t.target){var e=this._eventPackage(t.target);e&&null!=e.seriesIndex&&this._messageCenter.dispatch(n.EVENT.MOUSEOUT,t.event,e,this)}},_ondragstart:function(t){this._status={dragIn:!1,dragOut:!1,needRefresh:!1},o(this,"ondragstart",t)},_ondragenter:function(t){o(this,"ondragenter",t)},_ondragover:function(t){o(this,"ondragover",t)},_ondragleave:function(t){o(this,"ondragleave",t)},_ondrop:function(t){o(this,"ondrop",t,this._status),this._island.ondrop(t,this._status)},_ondragend:function(t){if(o(this,"ondragend",t,this._status),this._timeline&&this._timeline.ondragend(t,this._status),this._island.ondragend(t,this._status),this._status.needRefresh){this._syncBackupData(this._option);var e=this._messageCenter;e.dispatch(n.EVENT.DATA_CHANGED,t.event,this._eventPackage(t.target),this),e.dispatch(n.EVENT.REFRESH,null,null,this)}},_onlegendSelected:function(t){this._status.needRefresh=!1,o(this,"onlegendSelected",t,this._status),this._status.needRefresh&&this._messageCenter.dispatch(n.EVENT.REFRESH,null,null,this)},_ondataZoom:function(t){this._status.needRefresh=!1,o(this,"ondataZoom",t,this._status),this._status.needRefresh&&this._messageCenter.dispatch(n.EVENT.REFRESH,null,null,this)},_ondataRange:function(t){this._clearEffect(),this._status.needRefresh=!1,o(this,"ondataRange",t,this._status),this._status.needRefresh&&this._zr.refreshNextFrame()},_onmagicTypeChanged:function(){this._clearEffect(),this._render(this._toolbox.getMagicOption())},_ondataViewChanged:function(t){this._syncBackupData(t.option),this._messageCenter.dispatch(n.EVENT.DATA_CHANGED,null,t,this),this._messageCenter.dispatch(n.EVENT.REFRESH,null,null,this)},_tooltipHover:function(t){var e=[];o(this,"ontooltipHover",t,e)},_onrestore:function(){this.restore()},_onrefresh:function(t){this._refreshInside=!0,this.refresh(t),this._refreshInside=!1},_syncBackupData:function(t){this.component.dataZoom&&this.component.dataZoom.syncBackupData(t)},_eventPackage:function(e){if(e){var i=t("./util/ecData"),o=i.get(e,"seriesIndex"),n=i.get(e,"dataIndex");return n=-1!=o&&this.component.dataZoom?this.component.dataZoom.getRealDataIndex(o,n):n,{seriesIndex:o,seriesName:(i.get(e,"series")||{}).name,dataIndex:n,data:i.get(e,"data"),name:i.get(e,"name"),value:i.get(e,"value"),special:i.get(e,"special")}}},_noDataCheck:function(t){for(var e=t.series,i=0,o=e.length;o>i;i++)if(e[i].type==n.CHART_TYPE_MAP||e[i].data&&e[i].data.length>0||e[i].markPoint&&e[i].markPoint.data&&e[i].markPoint.data.length>0||e[i].markLine&&e[i].markLine.data&&e[i].markLine.data.length>0||e[i].nodes&&e[i].nodes.length>0||e[i].links&&e[i].links.length>0||e[i].matrix&&e[i].matrix.length>0||e[i].eventList&&e[i].eventList.length>0)return!1;var r=this._option&&this._option.noDataLoadingOption||this._themeConfig.noDataLoadingOption||n.noDataLoadingOption||{text:this._option&&this._option.noDataText||this._themeConfig.noDataText||n.noDataText,effect:this._option&&this._option.noDataEffect||this._themeConfig.noDataEffect||n.noDataEffect};return this.clear(),this.showLoading(r),!0},_render:function(e){if(this._mergeGlobalConifg(e),!this._noDataCheck(e)){var i=e.backgroundColor;if(i)if(h||-1==i.indexOf("rgba"))this.dom.style.backgroundColor=i;else{var o=i.split(",");this.dom.style.filter="alpha(opacity="+100*o[3].substring(0,o[3].lastIndexOf(")"))+")",o.length=3,o[0]=o[0].replace("a",""),this.dom.style.backgroundColor=o.join(",")+")"}this._zr.clearAnimation(),this._chartList=[];var r=t("./chart"),s=t("./component");(e.xAxis||e.yAxis)&&(e.grid=e.grid||{},e.dataZoom=e.dataZoom||{});for(var a,l,c,d=["title","legend","tooltip","dataRange","roamController","grid","dataZoom","xAxis","yAxis","polar"],u=0,p=d.length;p>u;u++)l=d[u],c=this.component[l],e[l]?(c?c.refresh&&c.refresh(e):(a=s.get(/^[xy]Axis$/.test(l)?"axis":l),c=new a(this._themeConfig,this._messageCenter,this._zr,e,this,l),this.component[l]=c),this._chartList.push(c)):c&&(c.dispose(),this.component[l]=null,delete this.component[l]);for(var f,g,m,_={},u=0,p=e.series.length;p>u;u++)g=e.series[u].type,g?_[g]||(_[g]=!0,f=r.get(g),f?(this.chart[g]?(m=this.chart[g],m.refresh(e)):m=new f(this._themeConfig,this._messageCenter,this._zr,e,this),this._chartList.push(m),this.chart[g]=m):console.error(g+" has not been required.")):console.error("series["+u+"] chart type has not been defined.");for(g in this.chart)g==n.CHART_TYPE_ISLAND||_[g]||(this.chart[g].dispose(),this.chart[g]=null,delete this.chart[g]);this.component.grid&&this.component.grid.refixAxisShape(this.component),this._island.refresh(e),this._toolbox.refresh(e),e.animation&&!e.renderAsImage?this._zr.refresh():this._zr.render();var y="IMG"+this.id,v=document.getElementById(y);e.renderAsImage&&h?(v?v.src=this.getDataURL(e.renderAsImage):(v=this.getImage(e.renderAsImage),v.id=y,v.style.position="absolute",v.style.left=0,v.style.top=0,this.dom.firstChild.appendChild(v)),this.un(),this._zr.un(),this._disposeChartList(),this._zr.clear()):v&&v.parentNode.removeChild(v),v=null,this._option=e}},restore:function(){this._clearEffect(),this._option=r.clone(this._optionRestore),this._disposeChartList(),this._island.clear(),this._toolbox.reset(this._option,!0),this._render(this._option)},refresh:function(t){this._clearEffect(),t=t||{};var e=t.option;!this._refreshInside&&e&&(e=this.getOption(),r.merge(e,t.option,!0),r.merge(this._optionRestore,t.option,!0),this._toolbox.reset(e)),this._island.refresh(e),this._toolbox.refresh(e),this._zr.clearAnimation();for(var i=0,o=this._chartList.length;o>i;i++)this._chartList[i].refresh&&this._chartList[i].refresh(e);this.component.grid&&this.component.grid.refixAxisShape(this.component),this._zr.refresh()},_disposeChartList:function(){this._clearEffect(),this._zr.clearAnimation();for(var t=this._chartList.length;t--;){var e=this._chartList[t];if(e){var i=e.type;this.chart[i]&&delete this.chart[i],this.component[i]&&delete this.component[i],e.dispose&&e.dispose()}}this._chartList=[]},_mergeGlobalConifg:function(e){for(var i=["backgroundColor","calculable","calculableColor","calculableHolderColor","nameConnector","valueConnector","animation","animationThreshold","animationDuration","animationDurationUpdate","animationEasing","addDataAnimation","symbolList","DRAG_ENABLE_TIME"],o=i.length;o--;){var r=i[o];null==e[r]&&(e[r]=null!=this._themeConfig[r]?this._themeConfig[r]:n[r])}var s=e.color;s&&s.length||(s=this._themeConfig.color||n.color),this._zr.getColor=function(e){var i=t("zrender/tool/color");return i.getColor(e,s)},h||(e.animation=!1,e.addDataAnimation=!1)},setOption:function(t,e){return t.timeline?this._setTimelineOption(t):this._setOption(t,e)},_setOption:function(t,e,i){return!e&&this._option?this._option=r.merge(this.getOption(),r.clone(t),!0):(this._option=r.clone(t),!i&&this._timeline&&this._timeline.dispose()),this._optionRestore=r.clone(this._option),this._option.series&&0!==this._option.series.length?(this.component.dataZoom&&(this._option.dataZoom||this._option.toolbox&&this._option.toolbox.feature&&this._option.toolbox.feature.dataZoom&&this._option.toolbox.feature.dataZoom.show)&&this.component.dataZoom.syncOption(this._option),this._toolbox.reset(this._option),this._render(this._option),this):void this._zr.clear()},getOption:function(){function t(t){var o=i._optionRestore[t];if(o)if(o instanceof Array)for(var n=o.length;n--;)e[t][n].data=r.clone(o[n].data);else e[t].data=r.clone(o.data)}var e=r.clone(this._option),i=this;return t("xAxis"),t("yAxis"),t("series"),e},setSeries:function(t,e){return e?(this._option.series=t,this.setOption(this._option,e)):this.setOption({series:t}),this},getSeries:function(){return this.getOption().series},_setTimelineOption:function(e){this._timeline&&this._timeline.dispose();var i=t("./component/timeline"),o=new i(this._themeConfig,this._messageCenter,this._zr,e,this);return this._timeline=o,this.component.timeline=this._timeline,this},addData:function(t,e,i,o,s){function a(){if(d._zr){d._zr.clearAnimation();for(var t=0,e=E.length;e>t;t++)E[t].motionlessOnce=l.addDataAnimation&&E[t].addDataAnimation;d._messageCenter.dispatch(n.EVENT.REFRESH,null,{option:l},d)}}for(var h=t instanceof Array?t:[[t,e,i,o,s]],l=this.getOption(),c=this._optionRestore,d=this,u=0,p=h.length;p>u;u++){t=h[u][0],e=h[u][1],i=h[u][2],o=h[u][3],s=h[u][4];var f=c.series[t],g=i?"unshift":"push",m=i?"pop":"shift";if(f){var _=f.data,y=l.series[t].data;if(_[g](e),y[g](e),o||(_[m](),e=y[m]()),null!=s){var v,x;if(f.type===n.CHART_TYPE_PIE&&(v=c.legend)&&(x=v.data)){var b=l.legend.data;if(x[g](s),b[g](s),!o){var T=r.indexOf(x,e.name);-1!=T&&x.splice(T,1),T=r.indexOf(b,e.name),-1!=T&&b.splice(T,1)}}else if(null!=c.xAxis&&null!=c.yAxis){var S,z,C=f.xAxisIndex||0;(null==c.xAxis[C].type||"category"===c.xAxis[C].type)&&(S=c.xAxis[C].data,z=l.xAxis[C].data,S[g](s),z[g](s),o||(S[m](),z[m]())),C=f.yAxisIndex||0,"category"===c.yAxis[C].type&&(S=c.yAxis[C].data,z=l.yAxis[C].data,S[g](s),z[g](s),o||(S[m](),z[m]()))}}this._option.series[t].data=l.series[t].data}}this._zr.clearAnimation();for(var E=this._chartList,w=0,L=function(){w--,0===w&&a()},u=0,p=E.length;p>u;u++)l.addDataAnimation&&E[u].addDataAnimation&&(w++,E[u].addDataAnimation(h,L));return this.component.dataZoom&&this.component.dataZoom.syncOption(l),this._option=l,l.addDataAnimation||setTimeout(a,0),this},addMarkPoint:function(t,e){return this._addMark(t,e,"markPoint")},addMarkLine:function(t,e){return this._addMark(t,e,"markLine")},_addMark:function(t,e,i){var o,n=this._option.series;if(n&&(o=n[t])){var s=this._optionRestore.series,a=s[t],h=o[i],l=a[i];h=o[i]=h||{data:[]},l=a[i]=l||{data:[]};for(var c in e)"data"===c?(h.data=h.data.concat(e.data),l.data=l.data.concat(e.data)):"object"!=typeof e[c]||null==h[c]?h[c]=l[c]=e[c]:(r.merge(h[c],e[c],!0),r.merge(l[c],e[c],!0));var d=this.chart[o.type];d&&d.addMark(t,e,i)}return this},delMarkPoint:function(t,e){return this._delMark(t,e,"markPoint")},delMarkLine:function(t,e){return this._delMark(t,e,"markLine")},_delMark:function(t,e,i){var o,n,r,s=this._option.series;if(!(s&&(o=s[t])&&(n=o[i])&&(r=n.data)))return this;e=e.split(" > ");for(var a=-1,h=0,l=r.length;l>h;h++){var c=r[h];if(c instanceof Array){if(c[0].name===e[0]&&c[1].name===e[1]){a=h;break}}else if(c.name===e[0]){a=h;break}}if(a>-1){r.splice(a,1),this._optionRestore.series[t][i].data.splice(a,1);var d=this.chart[o.type];d&&d.delMark(t,e.join(" > "),i)}return this},getDom:function(){return this.dom},getZrender:function(){return this._zr},getDataURL:function(t){if(!h)return"";if(0===this._chartList.length){var e="IMG"+this.id,i=document.getElementById(e);if(i)return i.src}var o=this.component.tooltip;switch(o&&o.hideTip(),t){case"jpeg":break;default:t="png"}var n=this._option.backgroundColor;return n&&"rgba(0,0,0,0)"===n.replace(" ","")&&(n="#fff"),this._zr.toDataURL("image/"+t,n)},getImage:function(t){var e=this._optionRestore.title,i=document.createElement("img");return i.src=this.getDataURL(t),i.title=e&&e.text||"ECharts",i},getConnectedDataURL:function(e){if(!this.isConnected())return this.getDataURL(e);var i=this.dom,o={self:{img:this.getDataURL(e),left:i.offsetLeft,top:i.offsetTop,right:i.offsetLeft+i.offsetWidth,bottom:i.offsetTop+i.offsetHeight}},n=o.self.left,r=o.self.top,s=o.self.right,a=o.self.bottom;for(var h in this._connected)i=this._connected[h].getDom(),o[h]={img:this._connected[h].getDataURL(e),left:i.offsetLeft,top:i.offsetTop,right:i.offsetLeft+i.offsetWidth,bottom:i.offsetTop+i.offsetHeight},n=Math.min(n,o[h].left),r=Math.min(r,o[h].top),s=Math.max(s,o[h].right),a=Math.max(a,o[h].bottom);var l=document.createElement("div");l.style.position="absolute",l.style.left="-4000px",l.style.width=s-n+"px",l.style.height=a-r+"px",document.body.appendChild(l);var c=t("zrender").init(l),d=t("zrender/shape/Image");for(var h in o)c.addShape(new d({style:{x:o[h].left-n,y:o[h].top-r,image:o[h].img}}));c.render();var u=this._option.backgroundColor;u&&"rgba(0,0,0,0)"===u.replace(/ /g,"")&&(u="#fff");var p=c.toDataURL("image/png",u);return setTimeout(function(){c.dispose(),l.parentNode.removeChild(l),l=null},100),p},getConnectedImage:function(t){var e=this._optionRestore.title,i=document.createElement("img");return i.src=this.getConnectedDataURL(t),i.title=e&&e.text||"ECharts",i},on:function(t,e){return this._messageCenterOutSide.bind(t,e,this),this},un:function(t,e){return this._messageCenterOutSide.unbind(t,e),this},connect:function(t){if(!t)return this;if(this._connected||(this._connected={}),t instanceof Array)for(var e=0,i=t.length;i>e;e++)this._connected[t[e].id]=t[e];else this._connected[t.id]=t;return this},disConnect:function(t){if(!t||!this._connected)return this;if(t instanceof Array)for(var e=0,i=t.length;i>e;e++)delete this._connected[t[e].id];else delete this._connected[t.id];for(var o in this._connected)return this;return this._connected=!1,this},connectedEventHandler:function(t){t.__echartsId!=this.id&&this._onevent(t)},isConnected:function(){return!!this._connected},showLoading:function(e){var i={bar:t("zrender/loadingEffect/Bar"),bubble:t("zrender/loadingEffect/Bubble"),dynamicLine:t("zrender/loadingEffect/DynamicLine"),ring:t("zrender/loadingEffect/Ring"),spin:t("zrender/loadingEffect/Spin"),whirling:t("zrender/loadingEffect/Whirling")};this._toolbox.hideDataView(),e=e||{};var o=e.textStyle||{};e.textStyle=o;var s=r.merge(r.merge(r.clone(o),this._themeConfig.textStyle),n.textStyle);o.textFont=s.fontStyle+" "+s.fontWeight+" "+s.fontSize+"px "+s.fontFamily,o.text=e.text||this._option&&this._option.loadingText||this._themeConfig.loadingText||n.loadingText,null!=e.x&&(o.x=e.x),null!=e.y&&(o.y=e.y),e.effectOption=e.effectOption||{},e.effectOption.textStyle=o;var a=e.effect;return("string"==typeof a||null==a)&&(a=i[e.effect||this._option&&this._option.loadingEffect||this._themeConfig.loadingEffect||n.loadingEffect]||i.spin),this._zr.showLoading(new a(e.effectOption)),this},hideLoading:function(){return this._zr.hideLoading(),this
},setTheme:function(e){if(e){if("string"==typeof e)switch(e){case"macarons":e=t("./theme/macarons");break;case"infographic":e=t("./theme/infographic");break;default:e={}}else e=e||{};this._themeConfig=e}if(!h){var i=this._themeConfig.textStyle;i&&i.fontFamily&&i.fontFamily2&&(i.fontFamily=i.fontFamily2),i=n.textStyle,i.fontFamily=i.fontFamily2}this._timeline&&this._timeline.setTheme(!0),this._optionRestore&&this.restore()},resize:function(){var t=this;return function(){if(t._clearEffect(),t._zr.resize(),t._option&&t._option.renderAsImage&&h)return t._render(t._option),t;t._zr.clearAnimation(),t._island.resize(),t._toolbox.resize(),t._timeline&&t._timeline.resize();for(var e=0,i=t._chartList.length;i>e;e++)t._chartList[e].resize&&t._chartList[e].resize();return t.component.grid&&t.component.grid.refixAxisShape(t.component),t._zr.refresh(),t._messageCenter.dispatch(n.EVENT.RESIZE,null,null,t),t}},_clearEffect:function(){this._zr.modLayer(n.EFFECT_ZLEVEL,{motionBlur:!1}),this._zr.painter.clearLayer(n.EFFECT_ZLEVEL)},clear:function(){return this._disposeChartList(),this._zr.clear(),this._option={},this._optionRestore={},this.dom.style.backgroundColor=null,this},dispose:function(){var t=this.dom.getAttribute(d);t&&delete c[t],this._island.dispose(),this._toolbox.dispose(),this._timeline&&this._timeline.dispose(),this._messageCenter.unbind(),this.clear(),this._zr.dispose(),this._zr=null}},a}),i("zrender/shape/Polyline",["require","./Base","./util/smoothSpline","./util/smoothBezier","./util/dashedLineTo","./Polygon","../tool/util"],function(t){var e=t("./Base"),i=t("./util/smoothSpline"),o=t("./util/smoothBezier"),n=t("./util/dashedLineTo"),r=function(t){this.brushTypeOnly="stroke",this.textPosition="end",e.call(this,t)};return r.prototype={type:"polyline",buildPath:function(t,e){var o=e.pointList;if(!(o.length<2)){var r=Math.min(e.pointList.length,Math.round(e.pointListLength||e.pointList.length));if(e.smooth&&"spline"!==e.smooth){e.controlPointList||this.updateControlPoints(e);var s=e.controlPointList;t.moveTo(o[0][0],o[0][1]);for(var a,h,l,c=0;r-1>c;c++)a=s[2*c],h=s[2*c+1],l=o[c+1],t.bezierCurveTo(a[0],a[1],h[0],h[1],l[0],l[1])}else if("spline"===e.smooth&&(o=i(o),r=o.length),e.lineType&&"solid"!=e.lineType){if("dashed"==e.lineType||"dotted"==e.lineType){var d=(e.lineWidth||1)*("dashed"==e.lineType?5:1);t.moveTo(o[0][0],o[0][1]);for(var c=1;r>c;c++)n(t,o[c-1][0],o[c-1][1],o[c][0],o[c][1],d)}}else{t.moveTo(o[0][0],o[0][1]);for(var c=1;r>c;c++)t.lineTo(o[c][0],o[c][1])}}},updateControlPoints:function(t){t.controlPointList=o(t.pointList,t.smooth,!1,t.smoothConstraint)},getRect:function(e){return t("./Polygon").prototype.getRect(e)}},t("../tool/util").inherits(r,e),r}),i("echarts/util/shape/Icon",["require","zrender/tool/util","zrender/shape/Star","zrender/shape/Heart","zrender/shape/Droplet","zrender/shape/Image","zrender/shape/Base"],function(t){function e(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o+e.height),t.lineTo(i+5*n,o+14*r),t.lineTo(i+e.width,o+3*r),t.lineTo(i+13*n,o),t.lineTo(i+2*n,o+11*r),t.lineTo(i,o+e.height),t.moveTo(i+6*n,o+10*r),t.lineTo(i+14*n,o+2*r),t.moveTo(i+10*n,o+13*r),t.lineTo(i+e.width,o+13*r),t.moveTo(i+13*n,o+10*r),t.lineTo(i+13*n,o+e.height)}function i(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o+e.height),t.lineTo(i+5*n,o+14*r),t.lineTo(i+e.width,o+3*r),t.lineTo(i+13*n,o),t.lineTo(i+2*n,o+11*r),t.lineTo(i,o+e.height),t.moveTo(i+6*n,o+10*r),t.lineTo(i+14*n,o+2*r),t.moveTo(i+10*n,o+13*r),t.lineTo(i+e.width,o+13*r)}function o(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i+4*n,o+15*r),t.lineTo(i+9*n,o+13*r),t.lineTo(i+14*n,o+8*r),t.lineTo(i+11*n,o+5*r),t.lineTo(i+6*n,o+10*r),t.lineTo(i+4*n,o+15*r),t.moveTo(i+5*n,o),t.lineTo(i+11*n,o),t.moveTo(i+5*n,o+r),t.lineTo(i+11*n,o+r),t.moveTo(i,o+2*r),t.lineTo(i+e.width,o+2*r),t.moveTo(i,o+5*r),t.lineTo(i+3*n,o+e.height),t.lineTo(i+13*n,o+e.height),t.lineTo(i+e.width,o+5*r)}function n(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o+3*r),t.lineTo(i+6*n,o+3*r),t.moveTo(i+3*n,o),t.lineTo(i+3*n,o+6*r),t.moveTo(i+3*n,o+8*r),t.lineTo(i+3*n,o+e.height),t.lineTo(i+e.width,o+e.height),t.lineTo(i+e.width,o+3*r),t.lineTo(i+8*n,o+3*r)}function r(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i+6*n,o),t.lineTo(i+2*n,o+3*r),t.lineTo(i+6*n,o+6*r),t.moveTo(i+2*n,o+3*r),t.lineTo(i+14*n,o+3*r),t.lineTo(i+14*n,o+11*r),t.moveTo(i+2*n,o+5*r),t.lineTo(i+2*n,o+13*r),t.lineTo(i+14*n,o+13*r),t.moveTo(i+10*n,o+10*r),t.lineTo(i+14*n,o+13*r),t.lineTo(i+10*n,o+e.height)}function s(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16,s=e.width/2;t.lineWidth=1.5,t.arc(i+s,o+s,s-n,0,2*Math.PI/3),t.moveTo(i+3*n,o+e.height),t.lineTo(i+0*n,o+12*r),t.lineTo(i+5*n,o+11*r),t.moveTo(i,o+8*r),t.arc(i+s,o+s,s-n,Math.PI,5*Math.PI/3),t.moveTo(i+13*n,o),t.lineTo(i+e.width,o+4*r),t.lineTo(i+11*n,o+5*r)}function a(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o),t.lineTo(i,o+e.height),t.lineTo(i+e.width,o+e.height),t.moveTo(i+2*n,o+14*r),t.lineTo(i+7*n,o+6*r),t.lineTo(i+11*n,o+11*r),t.lineTo(i+15*n,o+2*r)}function h(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o),t.lineTo(i,o+e.height),t.lineTo(i+e.width,o+e.height),t.moveTo(i+3*n,o+14*r),t.lineTo(i+3*n,o+6*r),t.lineTo(i+4*n,o+6*r),t.lineTo(i+4*n,o+14*r),t.moveTo(i+7*n,o+14*r),t.lineTo(i+7*n,o+2*r),t.lineTo(i+8*n,o+2*r),t.lineTo(i+8*n,o+14*r),t.moveTo(i+11*n,o+14*r),t.lineTo(i+11*n,o+9*r),t.lineTo(i+12*n,o+9*r),t.lineTo(i+12*n,o+14*r)}function l(t,e){var i=e.x,o=e.y,n=e.width-2,r=e.height-2,s=Math.min(n,r)/2;o+=2,t.moveTo(i+s+3,o+s-3),t.arc(i+s+3,o+s-3,s-1,0,-Math.PI/2,!0),t.lineTo(i+s+3,o+s-3),t.moveTo(i+s,o),t.lineTo(i+s,o+s),t.arc(i+s,o+s,s,-Math.PI/2,2*Math.PI,!0),t.lineTo(i+s,o+s),t.lineWidth=1.5}function c(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;o-=r,t.moveTo(i+1*n,o+2*r),t.lineTo(i+15*n,o+2*r),t.lineTo(i+14*n,o+3*r),t.lineTo(i+2*n,o+3*r),t.moveTo(i+3*n,o+6*r),t.lineTo(i+13*n,o+6*r),t.lineTo(i+12*n,o+7*r),t.lineTo(i+4*n,o+7*r),t.moveTo(i+5*n,o+10*r),t.lineTo(i+11*n,o+10*r),t.lineTo(i+10*n,o+11*r),t.lineTo(i+6*n,o+11*r),t.moveTo(i+7*n,o+14*r),t.lineTo(i+9*n,o+14*r),t.lineTo(i+8*n,o+15*r),t.lineTo(i+7*n,o+15*r)}function d(t,e){var i=e.x,o=e.y,n=e.width,r=e.height,s=n/16,a=r/16,h=2*Math.min(s,a);t.moveTo(i+s+h,o+a+h),t.arc(i+s,o+a,h,Math.PI/4,3*Math.PI),t.lineTo(i+7*s-h,o+6*a-h),t.arc(i+7*s,o+6*a,h,Math.PI/4*5,4*Math.PI),t.arc(i+7*s,o+6*a,h/2,Math.PI/4*5,4*Math.PI),t.moveTo(i+7*s-h/2,o+6*a+h),t.lineTo(i+s+h,o+14*a-h),t.arc(i+s,o+14*a,h,-Math.PI/4,2*Math.PI),t.moveTo(i+7*s+h/2,o+6*a),t.lineTo(i+14*s-h,o+10*a-h/2),t.moveTo(i+16*s,o+10*a),t.arc(i+14*s,o+10*a,h,0,3*Math.PI),t.lineWidth=1.5}function u(t,e){var i=e.x,o=e.y,n=e.width,r=e.height,s=Math.min(n,r)/2;t.moveTo(i+n,o+r/2),t.arc(i+s,o+s,s,0,2*Math.PI),t.arc(i+s,o,s,Math.PI/4,Math.PI/5*4),t.arc(i,o+s,s,-Math.PI/3,Math.PI/3),t.arc(i+n,o+r,s,Math.PI,Math.PI/2*3),t.lineWidth=1.5}function p(t,e){for(var i=e.x,o=e.y,n=e.width,r=e.height,s=Math.round(r/3),a=Math.round((s-2)/2),h=3;h--;)t.rect(i,o+s*h+a,n,2)}function f(t,e){for(var i=e.x,o=e.y,n=e.width,r=e.height,s=Math.round(n/3),a=Math.round((s-2)/2),h=3;h--;)t.rect(i+s*h+a,o,2,r)}function g(t,e){var i=e.x,o=e.y,n=e.width/16;t.moveTo(i+n,o),t.lineTo(i+n,o+e.height),t.lineTo(i+15*n,o+e.height),t.lineTo(i+15*n,o),t.lineTo(i+n,o),t.moveTo(i+3*n,o+3*n),t.lineTo(i+13*n,o+3*n),t.moveTo(i+3*n,o+6*n),t.lineTo(i+13*n,o+6*n),t.moveTo(i+3*n,o+9*n),t.lineTo(i+13*n,o+9*n),t.moveTo(i+3*n,o+12*n),t.lineTo(i+9*n,o+12*n)}function m(t,e){var i=e.x,o=e.y,n=e.width/16,r=e.height/16;t.moveTo(i,o),t.lineTo(i,o+e.height),t.lineTo(i+e.width,o+e.height),t.lineTo(i+e.width,o),t.lineTo(i,o),t.moveTo(i+4*n,o),t.lineTo(i+4*n,o+8*r),t.lineTo(i+12*n,o+8*r),t.lineTo(i+12*n,o),t.moveTo(i+6*n,o+11*r),t.lineTo(i+6*n,o+13*r),t.lineTo(i+10*n,o+13*r),t.lineTo(i+10*n,o+11*r),t.lineTo(i+6*n,o+11*r)}function _(t,e){var i=e.x,o=e.y,n=e.width,r=e.height;t.moveTo(i,o+r/2),t.lineTo(i+n,o+r/2),t.moveTo(i+n/2,o),t.lineTo(i+n/2,o+r)}function y(t,e){var i=e.width/2,o=e.height/2,n=Math.min(i,o);t.moveTo(e.x+i+n,e.y+o),t.arc(e.x+i,e.y+o,n,0,2*Math.PI),t.closePath()}function v(t,e){t.rect(e.x,e.y,e.width,e.height),t.closePath()}function x(t,e){var i=e.width/2,o=e.height/2,n=e.x+i,r=e.y+o,s=Math.min(i,o);t.moveTo(n,r-s),t.lineTo(n+s,r+s),t.lineTo(n-s,r+s),t.lineTo(n,r-s),t.closePath()}function b(t,e){var i=e.width/2,o=e.height/2,n=e.x+i,r=e.y+o,s=Math.min(i,o);t.moveTo(n,r-s),t.lineTo(n+s,r),t.lineTo(n,r+s),t.lineTo(n-s,r),t.lineTo(n,r-s),t.closePath()}function T(t,e){var i=e.x,o=e.y,n=e.width/16;t.moveTo(i+8*n,o),t.lineTo(i+n,o+e.height),t.lineTo(i+8*n,o+e.height/4*3),t.lineTo(i+15*n,o+e.height),t.lineTo(i+8*n,o),t.closePath()}function S(e,i){var o=t("zrender/shape/Star"),n=i.width/2,r=i.height/2;o.prototype.buildPath(e,{x:i.x+n,y:i.y+r,r:Math.min(n,r),n:i.n||5})}function z(e,i){var o=t("zrender/shape/Heart");o.prototype.buildPath(e,{x:i.x+i.width/2,y:i.y+.2*i.height,a:i.width/2,b:.8*i.height})}function C(e,i){var o=t("zrender/shape/Droplet");o.prototype.buildPath(e,{x:i.x+.5*i.width,y:i.y+.5*i.height,a:.5*i.width,b:.8*i.height})}function E(t,e){var i=e.x,o=e.y-e.height/2*1.5,n=e.width/2,r=e.height/2,s=Math.min(n,r);t.arc(i+n,o+r,s,Math.PI/5*4,Math.PI/5),t.lineTo(i+n,o+r+1.5*s),t.closePath()}function w(e,i,o){var n=t("zrender/shape/Image");this._imageShape=this._imageShape||new n({style:{}});for(var r in i)this._imageShape.style[r]=i[r];this._imageShape.brush(e,!1,o)}function L(t){M.call(this,t)}var A=t("zrender/tool/util"),M=t("zrender/shape/Base");return L.prototype={type:"icon",iconLibrary:{mark:e,markUndo:i,markClear:o,dataZoom:n,dataZoomReset:r,restore:s,lineChart:a,barChart:h,pieChart:l,funnelChart:c,forceChart:d,chordChart:u,stackChart:p,tiledChart:f,dataView:g,saveAsImage:m,cross:_,circle:y,rectangle:v,triangle:x,diamond:b,arrow:T,star:S,heart:z,droplet:C,pin:E,image:w},brush:function(e,i,o){var n=i?this.highlightStyle:this.style;n=n||{};var r=n.iconType||this.style.iconType;if("image"===r){var s=t("zrender/shape/Image");s.prototype.brush.call(this,e,i,o)}else{var n=this.beforeBrush(e,i);switch(e.beginPath(),this.buildPath(e,n,o),n.brushType){case"both":e.fill();case"stroke":n.lineWidth>0&&e.stroke();break;default:e.fill()}this.drawText(e,n,this.style),this.afterBrush(e)}},buildPath:function(t,e,i){this.iconLibrary[e.iconType]?this.iconLibrary[e.iconType].call(this,t,e,i):(t.moveTo(e.x,e.y),t.lineTo(e.x+e.width,e.y),t.lineTo(e.x+e.width,e.y+e.height),t.lineTo(e.x,e.y+e.height),t.lineTo(e.x,e.y),t.closePath())},getRect:function(t){return t.__rect?t.__rect:(t.__rect={x:Math.round(t.x),y:Math.round(t.y-("pin"==t.iconType?t.height/2*1.5:0)),width:t.width,height:t.height*("pin"===t.iconType?1.25:1)},t.__rect)},isCover:function(t,e){var i=this.transformCoordToLocal(t,e);t=i[0],e=i[1];var o=this.style.__rect;o||(o=this.style.__rect=this.getRect(this.style));var n=o.height<8||o.width<8?4:0;return t>=o.x-n&&t<=o.x+o.width+n&&e>=o.y-n&&e<=o.y+o.height+n}},A.inherits(L,M),L}),i("echarts/util/shape/HalfSmoothPolygon",["require","zrender/shape/Base","zrender/shape/util/smoothBezier","zrender/tool/util","zrender/shape/Polygon"],function(t){function e(t){i.call(this,t)}var i=t("zrender/shape/Base"),o=t("zrender/shape/util/smoothBezier"),n=t("zrender/tool/util");return e.prototype={type:"half-smooth-polygon",buildPath:function(e,i){var n=i.pointList;if(!(n.length<2))if(i.smooth){var r=o(n.slice(0,-2),i.smooth,!1,i.smoothConstraint);e.moveTo(n[0][0],n[0][1]);for(var s,a,h,l=n.length,c=0;l-3>c;c++)s=r[2*c],a=r[2*c+1],h=n[c+1],e.bezierCurveTo(s[0],s[1],a[0],a[1],h[0],h[1]);e.lineTo(n[l-2][0],n[l-2][1]),e.lineTo(n[l-1][0],n[l-1][1]),e.lineTo(n[0][0],n[0][1])}else t("zrender/shape/Polygon").prototype.buildPath(e,i)}},n.inherits(e,i),e}),i("echarts/component/axis",["require","./base","zrender/shape/Line","../config","../util/ecData","zrender/tool/util","zrender/tool/color","./categoryAxis","./valueAxis","../component"],function(t){function e(t,e,o,n,r,s){i.call(this,t,e,o,n,r),this.axisType=s,this._axisList=[],this.refresh(n)}var i=t("./base"),o=t("zrender/shape/Line"),n=t("../config"),r=t("../util/ecData"),s=t("zrender/tool/util"),a=t("zrender/tool/color");return e.prototype={type:n.COMPONENT_TYPE_AXIS,axisBase:{_buildAxisLine:function(){var t=this.option.axisLine.lineStyle.width,e=t/2,i={_axisShape:"axisLine",zlevel:this.getZlevelBase(),z:this.getZBase()+3,hoverable:!1},n=this.grid;switch(this.option.position){case"left":i.style={xStart:n.getX()-e,yStart:n.getYend(),xEnd:n.getX()-e,yEnd:n.getY(),lineCap:"round"};break;case"right":i.style={xStart:n.getXend()+e,yStart:n.getYend(),xEnd:n.getXend()+e,yEnd:n.getY(),lineCap:"round"};break;case"bottom":i.style={xStart:n.getX(),yStart:n.getYend()+e,xEnd:n.getXend(),yEnd:n.getYend()+e,lineCap:"round"};break;case"top":i.style={xStart:n.getX(),yStart:n.getY()-e,xEnd:n.getXend(),yEnd:n.getY()-e,lineCap:"round"}}var r=i.style;""!==this.option.name&&(r.text=this.option.name,r.textPosition=this.option.nameLocation,r.textFont=this.getFont(this.option.nameTextStyle),this.option.nameTextStyle.align&&(r.textAlign=this.option.nameTextStyle.align),this.option.nameTextStyle.baseline&&(r.textBaseline=this.option.nameTextStyle.baseline),this.option.nameTextStyle.color&&(r.textColor=this.option.nameTextStyle.color)),r.strokeColor=this.option.axisLine.lineStyle.color,r.lineWidth=t,this.isHorizontal()?r.yStart=r.yEnd=this.subPixelOptimize(r.yEnd,t):r.xStart=r.xEnd=this.subPixelOptimize(r.xEnd,t),r.lineType=this.option.axisLine.lineStyle.type,i=new o(i),this.shapeList.push(i)},_axisLabelClickable:function(t,e){return t?(r.pack(e,void 0,-1,void 0,-1,e.style.text),e.hoverable=!0,e.clickable=!0,e.highlightStyle={color:a.lift(e.style.color,1),brushType:"fill"},e):e},refixAxisShape:function(t,e){if(this.option.axisLine.onZero){var i;if(this.isHorizontal()&&null!=e)for(var o=0,n=this.shapeList.length;n>o;o++)"axisLine"===this.shapeList[o]._axisShape?(this.shapeList[o].style.yStart=this.shapeList[o].style.yEnd=this.subPixelOptimize(e,this.shapeList[o].stylelineWidth),this.zr.modShape(this.shapeList[o].id)):"axisTick"===this.shapeList[o]._axisShape&&(i=this.shapeList[o].style.yEnd-this.shapeList[o].style.yStart,this.shapeList[o].style.yStart=e-i,this.shapeList[o].style.yEnd=e,this.zr.modShape(this.shapeList[o].id));if(!this.isHorizontal()&&null!=t)for(var o=0,n=this.shapeList.length;n>o;o++)"axisLine"===this.shapeList[o]._axisShape?(this.shapeList[o].style.xStart=this.shapeList[o].style.xEnd=this.subPixelOptimize(t,this.shapeList[o].stylelineWidth),this.zr.modShape(this.shapeList[o].id)):"axisTick"===this.shapeList[o]._axisShape&&(i=this.shapeList[o].style.xEnd-this.shapeList[o].style.xStart,this.shapeList[o].style.xStart=t,this.shapeList[o].style.xEnd=t+i,this.zr.modShape(this.shapeList[o].id))}},getPosition:function(){return this.option.position},isHorizontal:function(){return"bottom"===this.option.position||"top"===this.option.position}},reformOption:function(t){if(!t||t instanceof Array&&0===t.length?t=[{type:n.COMPONENT_TYPE_AXIS_VALUE}]:t instanceof Array||(t=[t]),t.length>2&&(t=[t[0],t[1]]),"xAxis"===this.axisType){(!t[0].position||"bottom"!=t[0].position&&"top"!=t[0].position)&&(t[0].position="bottom"),t.length>1&&(t[1].position="bottom"===t[0].position?"top":"bottom");for(var e=0,i=t.length;i>e;e++)t[e].type=t[e].type||"category",t[e].xAxisIndex=e,t[e].yAxisIndex=-1}else{(!t[0].position||"left"!=t[0].position&&"right"!=t[0].position)&&(t[0].position="left"),t.length>1&&(t[1].position="left"===t[0].position?"right":"left");for(var e=0,i=t.length;i>e;e++)t[e].type=t[e].type||"value",t[e].xAxisIndex=-1,t[e].yAxisIndex=e}return t},refresh:function(e){var i;e&&(this.option=e,"xAxis"===this.axisType?(this.option.xAxis=this.reformOption(e.xAxis),i=this.option.xAxis):(this.option.yAxis=this.reformOption(e.yAxis),i=this.option.yAxis),this.series=e.series);for(var o=t("./categoryAxis"),n=t("./valueAxis"),r=Math.max(i&&i.length||0,this._axisList.length),s=0;r>s;s++)!this._axisList[s]||!e||i[s]&&this._axisList[s].type==i[s].type||(this._axisList[s].dispose&&this._axisList[s].dispose(),this._axisList[s]=!1),this._axisList[s]?this._axisList[s].refresh&&this._axisList[s].refresh(i?i[s]:!1,this.series):i&&i[s]&&(this._axisList[s]="category"===i[s].type?new o(this.ecTheme,this.messageCenter,this.zr,i[s],this.myChart,this.axisBase):new n(this.ecTheme,this.messageCenter,this.zr,i[s],this.myChart,this.axisBase,this.series))},getAxis:function(t){return this._axisList[t]},getAxisCount:function(){return this._axisList.length},clear:function(){for(var t=0,e=this._axisList.length;e>t;t++)this._axisList[t].dispose&&this._axisList[t].dispose();this._axisList=[]}},s.inherits(e,i),t("../component").define("axis",e),e}),i("echarts/component/grid",["require","./base","zrender/shape/Rectangle","../config","zrender/tool/util","../component"],function(t){function e(t,e,o,n,r){i.call(this,t,e,o,n,r),this.refresh(n)}var i=t("./base"),o=t("zrender/shape/Rectangle"),n=t("../config");n.grid={zlevel:0,z:0,x:80,y:60,x2:80,y2:60,backgroundColor:"rgba(0,0,0,0)",borderWidth:1,borderColor:"#ccc"};var r=t("zrender/tool/util");return e.prototype={type:n.COMPONENT_TYPE_GRID,getX:function(){return this._x},getY:function(){return this._y},getWidth:function(){return this._width},getHeight:function(){return this._height},getXend:function(){return this._x+this._width},getYend:function(){return this._y+this._height},getArea:function(){return{x:this._x,y:this._y,width:this._width,height:this._height}},getBbox:function(){return[[this._x,this._y],[this.getXend(),this.getYend()]]},refixAxisShape:function(t){for(var e,i,o,r=t.xAxis._axisList.concat(t.yAxis?t.yAxis._axisList:[]),s=r.length;s--;)o=r[s],o.type==n.COMPONENT_TYPE_AXIS_VALUE&&o._min<0&&o._max>=0&&(o.isHorizontal()?e=o.getCoord(0):i=o.getCoord(0));if("undefined"!=typeof e||"undefined"!=typeof i)for(s=r.length;s--;)r[s].refixAxisShape(e,i)},refresh:function(t){if(t||this._zrWidth!=this.zr.getWidth()||this._zrHeight!=this.zr.getHeight()){this.clear(),this.option=t||this.option,this.option.grid=this.reformOption(this.option.grid);var e=this.option.grid;this._zrWidth=this.zr.getWidth(),this._zrHeight=this.zr.getHeight(),this._x=this.parsePercent(e.x,this._zrWidth),this._y=this.parsePercent(e.y,this._zrHeight);var i=this.parsePercent(e.x2,this._zrWidth),n=this.parsePercent(e.y2,this._zrHeight);this._width="undefined"==typeof e.width?this._zrWidth-this._x-i:this.parsePercent(e.width,this._zrWidth),this._width=this._width<=0?10:this._width,this._height="undefined"==typeof e.height?this._zrHeight-this._y-n:this.parsePercent(e.height,this._zrHeight),this._height=this._height<=0?10:this._height,this._x=this.subPixelOptimize(this._x,e.borderWidth),this._y=this.subPixelOptimize(this._y,e.borderWidth),this.shapeList.push(new o({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._x,y:this._y,width:this._width,height:this._height,brushType:e.borderWidth>0?"both":"fill",color:e.backgroundColor,strokeColor:e.borderColor,lineWidth:e.borderWidth}})),this.zr.addShape(this.shapeList[0])}}},r.inherits(e,i),t("../component").define("grid",e),e}),i("echarts/chart/base",["require","zrender/shape/Image","../util/shape/Icon","../util/shape/MarkLine","../util/shape/Symbol","zrender/shape/Polyline","zrender/shape/ShapeBundle","../config","../util/ecData","../util/ecAnimation","../util/ecEffect","../util/accMath","../component/base","../layout/EdgeBundling","zrender/tool/util","zrender/tool/area"],function(t){function e(t){return null!=t.x&&null!=t.y}function i(t,e,i,o,n){f.call(this,t,e,i,o,n);var r=this;this.selectedMap={},this.lastShapeList=[],this.shapeHandler={onclick:function(){r.isClick=!0},ondragover:function(t){var e=t.target;e.highlightStyle=e.highlightStyle||{};var i=e.highlightStyle,o=i.brushTyep,n=i.strokeColor,s=i.lineWidth;i.brushType="stroke",i.strokeColor=r.ecTheme.calculableColor||l.calculableColor,i.lineWidth="icon"===e.type?30:10,r.zr.addHoverShape(e),setTimeout(function(){i&&(i.brushType=o,i.strokeColor=n,i.lineWidth=s)},20)},ondrop:function(t){null!=c.get(t.dragged,"data")&&(r.isDrop=!0)},ondragend:function(){r.isDragend=!0}}}var o=t("zrender/shape/Image"),n=t("../util/shape/Icon"),r=t("../util/shape/MarkLine"),s=t("../util/shape/Symbol"),a=t("zrender/shape/Polyline"),h=t("zrender/shape/ShapeBundle"),l=t("../config"),c=t("../util/ecData"),d=t("../util/ecAnimation"),u=t("../util/ecEffect"),p=t("../util/accMath"),f=t("../component/base"),g=t("../layout/EdgeBundling"),m=t("zrender/tool/util"),_=t("zrender/tool/area");return i.prototype={setCalculable:function(t){return t.dragEnableTime=this.ecTheme.DRAG_ENABLE_TIME||l.DRAG_ENABLE_TIME,t.ondragover=this.shapeHandler.ondragover,t.ondragend=this.shapeHandler.ondragend,t.ondrop=this.shapeHandler.ondrop,t},ondrop:function(t,e){if(this.isDrop&&t.target&&!e.dragIn){var i,o=t.target,n=t.dragged,r=c.get(o,"seriesIndex"),s=c.get(o,"dataIndex"),a=this.series,h=this.component.legend;if(-1===s){if(c.get(n,"seriesIndex")==r)return e.dragOut=e.dragIn=e.needRefresh=!0,void(this.isDrop=!1);i={value:c.get(n,"value"),name:c.get(n,"name")},this.type===l.CHART_TYPE_PIE&&i.value<0&&(i.value=0);for(var d=!1,u=a[r].data,f=0,g=u.length;g>f;f++)u[f].name===i.name&&"-"===u[f].value&&(a[r].data[f].value=i.value,d=!0);!d&&a[r].data.push(i),h&&h.add(i.name,n.style.color||n.style.strokeColor)}else i=a[r].data[s]||"-",null!=i.value?(a[r].data[s].value="-"!=i.value?p.accAdd(a[r].data[s].value,c.get(n,"value")):c.get(n,"value"),(this.type===l.CHART_TYPE_FUNNEL||this.type===l.CHART_TYPE_PIE)&&(h&&1===h.getRelatedAmount(i.name)&&this.component.legend.del(i.name),i.name+=this.option.nameConnector+c.get(n,"name"),h&&h.add(i.name,n.style.color||n.style.strokeColor))):a[r].data[s]="-"!=i?p.accAdd(a[r].data[s],c.get(n,"value")):c.get(n,"value");e.dragIn=e.dragIn||!0,this.isDrop=!1;var m=this;setTimeout(function(){m.zr.trigger("mousemove",t.event)},300)}},ondragend:function(t,e){if(this.isDragend&&t.target&&!e.dragOut){var i=t.target,o=c.get(i,"seriesIndex"),n=c.get(i,"dataIndex"),r=this.series;if(null!=r[o].data[n].value){r[o].data[n].value="-";var s=r[o].data[n].name,a=this.component.legend;a&&0===a.getRelatedAmount(s)&&a.del(s)}else r[o].data[n]="-";e.dragOut=!0,e.needRefresh=!0,this.isDragend=!1}},onlegendSelected:function(t,e){var i=t.selected;for(var o in this.selectedMap)this.selectedMap[o]!=i[o]&&(e.needRefresh=!0),this.selectedMap[o]=i[o]},_buildPosition:function(){this._symbol=this.option.symbolList,this._sIndex2ShapeMap={},this._sIndex2ColorMap={},this.selectedMap={},this.xMarkMap={};for(var t,e,i,o,n=this.series,r={top:[],bottom:[],left:[],right:[],other:[]},s=0,a=n.length;a>s;s++)n[s].type===this.type&&(n[s]=this.reformOption(n[s]),this.legendHoverLink=n[s].legendHoverLink||this.legendHoverLink,t=n[s].xAxisIndex,e=n[s].yAxisIndex,i=this.component.xAxis.getAxis(t),o=this.component.yAxis.getAxis(e),i.type===l.COMPONENT_TYPE_AXIS_CATEGORY?r[i.getPosition()].push(s):o.type===l.COMPONENT_TYPE_AXIS_CATEGORY?r[o.getPosition()].push(s):r.other.push(s));for(var h in r)r[h].length>0&&this._buildSinglePosition(h,r[h]);this.addShapeList()},_buildSinglePosition:function(t,e){var i=this._mapData(e),o=i.locationMap,n=i.maxDataLength;if(0!==n&&0!==o.length){switch(t){case"bottom":case"top":this._buildHorizontal(e,n,o,this.xMarkMap);break;case"left":case"right":this._buildVertical(e,n,o,this.xMarkMap);break;case"other":this._buildOther(e,n,o,this.xMarkMap)}for(var r=0,s=e.length;s>r;r++)this.buildMark(e[r])}},_mapData:function(t){for(var e,i,o,n,r=this.series,s=0,a={},h="__kener__stack__",c=this.component.legend,d=[],u=0,p=0,f=t.length;f>p;p++){if(e=r[t[p]],o=e.name,this._sIndex2ShapeMap[t[p]]=this._sIndex2ShapeMap[t[p]]||this.query(e,"symbol")||this._symbol[p%this._symbol.length],c){if(this.selectedMap[o]=c.isSelected(o),this._sIndex2ColorMap[t[p]]=c.getColor(o),n=c.getItemShape(o)){var g=n.style;if(this.type==l.CHART_TYPE_LINE)g.iconType="legendLineIcon",g.symbol=this._sIndex2ShapeMap[t[p]];else if(e.itemStyle.normal.barBorderWidth>0){var m=n.highlightStyle;g.brushType="both",g.x+=1,g.y+=1,g.width-=2,g.height-=2,g.strokeColor=m.strokeColor=e.itemStyle.normal.barBorderColor,m.lineWidth=3}c.setItemShape(o,n)}}else this.selectedMap[o]=!0,this._sIndex2ColorMap[t[p]]=this.zr.getColor(t[p]);this.selectedMap[o]&&(i=e.stack||h+t[p],null==a[i]?(a[i]=s,d[s]=[t[p]],s++):d[a[i]].push(t[p])),u=Math.max(u,e.data.length)}return{locationMap:d,maxDataLength:u}},_calculMarkMapXY:function(t,e,i){for(var o=this.series,n=0,r=e.length;r>n;n++)for(var s=0,a=e[n].length;a>s;s++){var h=e[n][s],l="xy"==i?0:"",c=this.component.grid,d=t[h];if("-1"!=i.indexOf("x")){d["counter"+l]>0&&(d["average"+l]=d["sum"+l]/d["counter"+l]);var u=this.component.xAxis.getAxis(o[h].xAxisIndex||0).getCoord(d["average"+l]);d["averageLine"+l]=[[u,c.getYend()],[u,c.getY()]],d["minLine"+l]=[[d["minX"+l],c.getYend()],[d["minX"+l],c.getY()]],d["maxLine"+l]=[[d["maxX"+l],c.getYend()],[d["maxX"+l],c.getY()]],d.isHorizontal=!1}if(l="xy"==i?1:"","-1"!=i.indexOf("y")){d["counter"+l]>0&&(d["average"+l]=d["sum"+l]/d["counter"+l]);var p=this.component.yAxis.getAxis(o[h].yAxisIndex||0).getCoord(d["average"+l]);d["averageLine"+l]=[[c.getX(),p],[c.getXend(),p]],d["minLine"+l]=[[c.getX(),d["minY"+l]],[c.getXend(),d["minY"+l]]],d["maxLine"+l]=[[c.getX(),d["maxY"+l]],[c.getXend(),d["maxY"+l]]],d.isHorizontal=!0}}},addLabel:function(t,e,i,o,n){var r=[i,e],s=this.deepMerge(r,"itemStyle.normal.label"),a=this.deepMerge(r,"itemStyle.emphasis.label"),h=s.textStyle||{},l=a.textStyle||{};if(s.show){var c=t.style;c.text=this._getLabelText(e,i,o,"normal"),c.textPosition=null==s.position?"horizontal"===n?"right":"top":s.position,c.textColor=h.color,c.textFont=this.getFont(h),c.textAlign=h.align,c.textBaseline=h.baseline}if(a.show){var d=t.highlightStyle;d.text=this._getLabelText(e,i,o,"emphasis"),d.textPosition=s.show?t.style.textPosition:null==a.position?"horizontal"===n?"right":"top":a.position,d.textColor=l.color,d.textFont=this.getFont(l),d.textAlign=l.align,d.textBaseline=l.baseline}return t},_getLabelText:function(t,e,i,o){var n=this.deepQuery([e,t],"itemStyle."+o+".label.formatter");n||"emphasis"!==o||(n=this.deepQuery([e,t],"itemStyle.normal.label.formatter"));var r=this.getDataFromOption(e,"-");return n?"function"==typeof n?n.call(this.myChart,{seriesName:t.name,series:t,name:i,value:r,data:e,status:o}):"string"==typeof n?n=n.replace("{a}","{a0}").replace("{b}","{b0}").replace("{c}","{c0}").replace("{a0}",t.name).replace("{b0}",i).replace("{c0}",this.numAddCommas(r)):void 0:r instanceof Array?null!=r[2]?this.numAddCommas(r[2]):r[0]+" , "+r[1]:this.numAddCommas(r)},buildMark:function(t){var e=this.series[t];this.selectedMap[e.name]&&(e.markLine&&this._buildMarkLine(t),e.markPoint&&this._buildMarkPoint(t))},_buildMarkPoint:function(t){for(var e,i,o=(this.markAttachStyle||{})[t],n=this.series[t],r=m.clone(n.markPoint),s=0,a=r.data.length;a>s;s++)e=r.data[s],i=this.getMarkCoord(t,e),e.x=null!=e.x?e.x:i[0],e.y=null!=e.y?e.y:i[1],!e.type||"max"!==e.type&&"min"!==e.type||(e.value=i[3],e.name=e.name||e.type,e.symbolSize=e.symbolSize||_.getTextWidth(i[3],this.getFont())/2+5);for(var h=this._markPoint(t,r),s=0,a=h.length;a>s;s++){var c=h[s];c.zlevel=n.zlevel,c.z=n.z+1;for(var d in o)c[d]=m.clone(o[d]);this.shapeList.push(c)}if(this.type===l.CHART_TYPE_FORCE||this.type===l.CHART_TYPE_CHORD)for(var s=0,a=h.length;a>s;s++)this.zr.addShape(h[s])},_buildMarkLine:function(t){for(var e,i=(this.markAttachStyle||{})[t],o=this.series[t],n=m.clone(o.markLine),r=0,s=n.data.length;s>r;r++){var a=n.data[r];!a.type||"max"!==a.type&&"min"!==a.type&&"average"!==a.type?e=[this.getMarkCoord(t,a[0]),this.getMarkCoord(t,a[1])]:(e=this.getMarkCoord(t,a),n.data[r]=[m.clone(a),{}],n.data[r][0].name=a.name||a.type,n.data[r][0].value="average"!==a.type?e[3]:+e[3].toFixed(null!=n.precision?n.precision:this.deepQuery([this.ecTheme,l],"markLine.precision")),e=e[2],a=[{},{}]),null!=e&&null!=e[0]&&null!=e[1]&&(n.data[r][0].x=null!=a[0].x?a[0].x:e[0][0],n.data[r][0].y=null!=a[0].y?a[0].y:e[0][1],n.data[r][1].x=null!=a[1].x?a[1].x:e[1][0],n.data[r][1].y=null!=a[1].y?a[1].y:e[1][1])}var c=this._markLine(t,n),d=n.large;if(d){var u=new h({style:{shapeList:c}}),p=c[0];if(p){m.merge(u.style,p.style),m.merge(u.highlightStyle={},p.highlightStyle),u.style.brushType="stroke",u.zlevel=o.zlevel,u.z=o.z+1,u.hoverable=!1;for(var f in i)u[f]=m.clone(i[f])}this.shapeList.push(u),this.zr.addShape(u),u._mark="largeLine";var g=n.effect;g.show&&(u.effect=g)}else{for(var r=0,s=c.length;s>r;r++){var _=c[r];_.zlevel=o.zlevel,_.z=o.z+1;for(var f in i)_[f]=m.clone(i[f]);this.shapeList.push(_)}if(this.type===l.CHART_TYPE_FORCE||this.type===l.CHART_TYPE_CHORD)for(var r=0,s=c.length;s>r;r++)this.zr.addShape(c[r])}},_markPoint:function(t,e){var i=this.series[t],o=this.component;m.merge(m.merge(e,m.clone(this.ecTheme.markPoint||{})),m.clone(l.markPoint)),e.name=i.name;var n,r,s,a,h,d,u,p=[],f=e.data,g=o.dataRange,_=o.legend,y=this.zr.getWidth(),v=this.zr.getHeight();if(e.large)n=this.getLargeMarkPointShape(t,e),n._mark="largePoint",n&&p.push(n);else for(var x=0,b=f.length;b>x;x++)null!=f[x].x&&null!=f[x].y&&(s=null!=f[x].value?f[x].value:"",_&&(r=_.getColor(i.name)),g&&(r=isNaN(s)?r:g.getColor(s),a=[f[x],e],h=this.deepQuery(a,"itemStyle.normal.color")||r,d=this.deepQuery(a,"itemStyle.emphasis.color")||h,null==h&&null==d)||(r=null==r?this.zr.getColor(t):r,f[x].tooltip=f[x].tooltip||e.tooltip||{trigger:"item"},f[x].name=null!=f[x].name?f[x].name:"",f[x].value=s,n=this.getSymbolShape(e,t,f[x],x,f[x].name,this.parsePercent(f[x].x,y),this.parsePercent(f[x].y,v),"pin",r,"rgba(0,0,0,0)","horizontal"),n._mark="point",u=this.deepMerge([f[x],e],"effect"),u.show&&(n.effect=u),i.type===l.CHART_TYPE_MAP&&(n._geo=this.getMarkGeo(f[x])),c.pack(n,i,t,f[x],x,f[x].name,s),p.push(n)));return p},_markLine:function(){function t(t,e){t[e]=t[e]instanceof Array?t[e].length>1?t[e]:[t[e][0],t[e][0]]:[t[e],t[e]]}return function(i,o){var n=this.series[i],r=this.component,s=r.dataRange,a=r.legend;m.merge(m.merge(o,m.clone(this.ecTheme.markLine||{})),m.clone(l.markLine));var h=a?a.getColor(n.name):this.zr.getColor(i);t(o,"symbol"),t(o,"symbolSize"),t(o,"symbolRotate");for(var d=o.data,u=[],p=this.zr.getWidth(),f=this.zr.getHeight(),_=0;_<d.length;_++){var y=d[_];if(e(y[0])&&e(y[1])){var v=this.deepMerge(y),x=[v,o],b=h,T=null!=v.value?v.value:"";if(s){b=isNaN(T)?b:s.getColor(T);var S=this.deepQuery(x,"itemStyle.normal.color")||b,z=this.deepQuery(x,"itemStyle.emphasis.color")||S;if(null==S&&null==z)continue}y[0].tooltip=v.tooltip||o.tooltip||{trigger:"item"},y[0].name=y[0].name||"",y[1].name=y[1].name||"",y[0].value=T,u.push({points:[[this.parsePercent(y[0].x,p),this.parsePercent(y[0].y,f)],[this.parsePercent(y[1].x,p),this.parsePercent(y[1].y,f)]],rawData:y,color:b})}}var C=this.query(o,"bundling.enable");if(C){var E=new g;E.maxTurningAngle=this.query(o,"bundling.maxTurningAngle")/180*Math.PI,u=E.run(u)}o.name=n.name;for(var w=[],_=0,L=u.length;L>_;_++){var A=u[_],M=A.rawEdge||A,y=M.rawData,T=null!=y.value?y.value:"",k=this.getMarkLineShape(o,i,y,_,A.points,C,M.color);k._mark="line";var P=this.deepMerge([y[0],y[1],o],"effect");P.show&&(k.effect=P,k.effect.large=o.large),n.type===l.CHART_TYPE_MAP&&(k._geo=[this.getMarkGeo(y[0]),this.getMarkGeo(y[1])]),c.pack(k,n,i,y[0],_,y[0].name+(""!==y[1].name?" > "+y[1].name:""),T),w.push(k)}return w}}(),getMarkCoord:function(){return[0,0]},getSymbolShape:function(t,e,i,r,s,a,h,l,d,u,p){var f=[i,t],g=this.getDataFromOption(i,"-");l=this.deepQuery(f,"symbol")||l;var m=this.deepQuery(f,"symbolSize");m="function"==typeof m?m(g):m,"number"==typeof m&&(m=[m,m]);var _=this.deepQuery(f,"symbolRotate"),y=this.deepMerge(f,"itemStyle.normal"),v=this.deepMerge(f,"itemStyle.emphasis"),x=null!=y.borderWidth?y.borderWidth:y.lineStyle&&y.lineStyle.width;null==x&&(x=l.match("empty")?2:0);var b=null!=v.borderWidth?v.borderWidth:v.lineStyle&&v.lineStyle.width;null==b&&(b=x+2);var T=this.getItemStyleColor(y.color,e,r,i),S=this.getItemStyleColor(v.color,e,r,i),z=m[0],C=m[1],E=new n({style:{iconType:l.replace("empty","").toLowerCase(),x:a-z,y:h-C,width:2*z,height:2*C,brushType:"both",color:l.match("empty")?u:T||d,strokeColor:y.borderColor||T||d,lineWidth:x},highlightStyle:{color:l.match("empty")?u:S||T||d,strokeColor:v.borderColor||y.borderColor||S||T||d,lineWidth:b},clickable:this.deepQuery(f,"clickable")});
return l.match("image")&&(E.style.image=l.replace(new RegExp("^image:\\/\\/"),""),E=new o({style:E.style,highlightStyle:E.highlightStyle,clickable:this.deepQuery(f,"clickable")})),null!=_&&(E.rotation=[_*Math.PI/180,a,h]),l.match("star")&&(E.style.iconType="star",E.style.n=l.replace("empty","").replace("star","")-0||5),"none"===l&&(E.invisible=!0,E.hoverable=!1),E=this.addLabel(E,t,i,s,p),l.match("empty")&&(null==E.style.textColor&&(E.style.textColor=E.style.strokeColor),null==E.highlightStyle.textColor&&(E.highlightStyle.textColor=E.highlightStyle.strokeColor)),c.pack(E,t,e,i,r,s),E._x=a,E._y=h,E._dataIndex=r,E._seriesIndex=e,E},getMarkLineShape:function(t,e,i,o,n,s,h){var l=null!=i[0].value?i[0].value:"-",c=null!=i[1].value?i[1].value:"-",d=[i[0].symbol||t.symbol[0],i[1].symbol||t.symbol[1]],u=[i[0].symbolSize||t.symbolSize[0],i[1].symbolSize||t.symbolSize[1]];u[0]="function"==typeof u[0]?u[0](l):u[0],u[1]="function"==typeof u[1]?u[1](c):u[1];var p=[this.query(i[0],"symbolRotate")||t.symbolRotate[0],this.query(i[1],"symbolRotate")||t.symbolRotate[1]],f=[i[0],i[1],t],g=this.deepMerge(f,"itemStyle.normal");g.color=this.getItemStyleColor(g.color,e,o,i);var m=this.deepMerge(f,"itemStyle.emphasis");m.color=this.getItemStyleColor(m.color,e,o,i);var _=g.lineStyle,y=m.lineStyle,v=_.width;null==v&&(v=g.borderWidth);var x=y.width;null==x&&(x=null!=m.borderWidth?m.borderWidth:v+2);var b=this.deepQuery(f,"smoothness");this.deepQuery(f,"smooth")||(b=0);var T=s?a:r,S=new T({style:{symbol:d,symbolSize:u,symbolRotate:p,brushType:"both",lineType:_.type,shadowColor:_.shadowColor||_.color||g.borderColor||g.color||h,shadowBlur:_.shadowBlur,shadowOffsetX:_.shadowOffsetX,shadowOffsetY:_.shadowOffsetY,color:g.color||h,strokeColor:_.color||g.borderColor||g.color||h,lineWidth:v,symbolBorderColor:g.borderColor||g.color||h,symbolBorder:g.borderWidth},highlightStyle:{shadowColor:y.shadowColor,shadowBlur:y.shadowBlur,shadowOffsetX:y.shadowOffsetX,shadowOffsetY:y.shadowOffsetY,color:m.color||g.color||h,strokeColor:y.color||_.color||m.borderColor||g.borderColor||m.color||g.color||h,lineWidth:x,symbolBorderColor:m.borderColor||g.borderColor||m.color||g.color||h,symbolBorder:null==m.borderWidth?g.borderWidth+2:m.borderWidth},clickable:this.deepQuery(f,"clickable")}),z=S.style;return s?(z.pointList=n,z.smooth=b):(z.xStart=n[0][0],z.yStart=n[0][1],z.xEnd=n[1][0],z.yEnd=n[1][1],z.curveness=b,S.updatePoints(S.style)),S=this.addLabel(S,t,i[0],i[0].name+" : "+i[1].name)},getLargeMarkPointShape:function(t,e){var i,o,n,r,a,h,l=this.series[t],c=this.component,d=e.data,u=c.dataRange,p=c.legend,f=[d[0],e];if(p&&(o=p.getColor(l.name)),!u||(n=null!=d[0].value?d[0].value:"",o=isNaN(n)?o:u.getColor(n),r=this.deepQuery(f,"itemStyle.normal.color")||o,a=this.deepQuery(f,"itemStyle.emphasis.color")||r,null!=r||null!=a)){o=this.deepMerge(f,"itemStyle.normal").color||o;var g=this.deepQuery(f,"symbol")||"circle";g=g.replace("empty","").replace(/\d/g,""),h=this.deepMerge([d[0],e],"effect");var m=window.devicePixelRatio||1;return i=new s({style:{pointList:d,color:o,strokeColor:o,shadowColor:h.shadowColor||o,shadowBlur:(null!=h.shadowBlur?h.shadowBlur:8)*m,size:this.deepQuery(f,"symbolSize"),iconType:g,brushType:"fill",lineWidth:1},draggable:!1,hoverable:!1}),h.show&&(i.effect=h),i}},backupShapeList:function(){this.shapeList&&this.shapeList.length>0?(this.lastShapeList=this.shapeList,this.shapeList=[]):this.lastShapeList=[]},addShapeList:function(){var t,e,i=this.option.animationThreshold/(this.canvasSupported?2:4),o=this.lastShapeList,n=this.shapeList,r=o.length>0,s=r?this.query(this.option,"animationDurationUpdate"):this.query(this.option,"animationDuration"),a=this.query(this.option,"animationEasing"),h={},c={};if(this.option.animation&&!this.option.renderAsImage&&n.length<i&&!this.motionlessOnce){for(var d=0,u=o.length;u>d;d++)e=this._getAnimationKey(o[d]),e.match("undefined")?this.zr.delShape(o[d].id):(e+=o[d].type,h[e]?this.zr.delShape(o[d].id):h[e]=o[d]);for(var d=0,u=n.length;u>d;d++)e=this._getAnimationKey(n[d]),e.match("undefined")?this.zr.addShape(n[d]):(e+=n[d].type,c[e]=n[d]);for(e in h)c[e]||this.zr.delShape(h[e].id);for(e in c)h[e]?(this.zr.delShape(h[e].id),this._animateMod(h[e],c[e],s,a,0,r)):(t=this.type!=l.CHART_TYPE_LINE&&this.type!=l.CHART_TYPE_RADAR||0===e.indexOf("icon")?0:s/2,this._animateMod(!1,c[e],s,a,t,r));this.zr.refresh(),this.animationEffect()}else{this.motionlessOnce=!1,this.zr.delShape(o);for(var d=0,u=n.length;u>d;d++)this.zr.addShape(n[d])}},_getAnimationKey:function(t){return this.type!=l.CHART_TYPE_MAP&&this.type!=l.CHART_TYPE_TREEMAP&&this.type!=l.CHART_TYPE_VENN&&this.type!=l.CHART_TYPE_TREE?c.get(t,"seriesIndex")+"_"+c.get(t,"dataIndex")+(t._mark?t._mark:"")+(this.type===l.CHART_TYPE_RADAR?c.get(t,"special"):""):c.get(t,"seriesIndex")+"_"+c.get(t,"dataIndex")+(t._mark?t._mark:"undefined")},_animateMod:function(t,e,i,o,n,r){switch(e.type){case"polyline":case"half-smooth-polygon":d.pointList(this.zr,t,e,i,o);break;case"rectangle":d.rectangle(this.zr,t,e,i,o);break;case"image":case"icon":d.icon(this.zr,t,e,i,o,n);break;case"candle":r?this.zr.addShape(e):d.candle(this.zr,t,e,i,o);break;case"ring":case"sector":case"circle":r?"sector"===e.type?d.sector(this.zr,t,e,i,o):this.zr.addShape(e):d.ring(this.zr,t,e,i+(c.get(e,"dataIndex")||0)%20*100,o);break;case"text":d.text(this.zr,t,e,i,o);break;case"polygon":r?d.pointList(this.zr,t,e,i,o):d.polygon(this.zr,t,e,i,o);break;case"ribbon":d.ribbon(this.zr,t,e,i,o);break;case"gauge-pointer":d.gaugePointer(this.zr,t,e,i,o);break;case"mark-line":d.markline(this.zr,t,e,i,o);break;case"bezier-curve":case"line":d.line(this.zr,t,e,i,o);break;default:this.zr.addShape(e)}},animationMark:function(t,e,i){for(var i=i||this.shapeList,o=0,n=i.length;n>o;o++)i[o]._mark&&this._animateMod(!1,i[o],t,e,0,!0);this.animationEffect(i)},animationEffect:function(t){if(!t&&this.clearEffectShape(),t=t||this.shapeList,null!=t){var e=l.EFFECT_ZLEVEL;this.canvasSupported&&this.zr.modLayer(e,{motionBlur:!0,lastFrameAlpha:this.option.effectBlendAlpha||l.effectBlendAlpha});for(var i,o=0,n=t.length;n>o;o++)i=t[o],i._mark&&i.effect&&i.effect.show&&u[i._mark]&&(u[i._mark](this.zr,this.effectList,i,e),this.effectList[this.effectList.length-1]._mark=i._mark)}},clearEffectShape:function(t){var e=this.effectList;if(this.zr&&e&&e.length>0){t&&this.zr.modLayer(l.EFFECT_ZLEVEL,{motionBlur:!1}),this.zr.delShape(e);for(var i=0;i<e.length;i++)e[i].effectAnimator&&e[i].effectAnimator.stop()}this.effectList=[]},addMark:function(t,e,i){var o=this.series[t];if(this.selectedMap[o.name]){var n=this.query(this.option,"animationDurationUpdate"),r=this.query(this.option,"animationEasing"),s=o[i].data,a=this.shapeList.length;if(o[i].data=e.data,this["_build"+i.replace("m","M")](t),this.option.animation&&!this.option.renderAsImage)this.animationMark(n,r,this.shapeList.slice(a));else{for(var h=a,l=this.shapeList.length;l>h;h++)this.zr.addShape(this.shapeList[h]);this.zr.refreshNextFrame()}o[i].data=s}},delMark:function(t,e,i){i=i.replace("mark","").replace("large","").toLowerCase();var o=this.series[t];if(this.selectedMap[o.name]){for(var n=!1,r=[this.shapeList,this.effectList],s=2;s--;)for(var a=0,h=r[s].length;h>a;a++)if(r[s][a]._mark==i&&c.get(r[s][a],"seriesIndex")==t&&c.get(r[s][a],"name")==e){this.zr.delShape(r[s][a].id),r[s].splice(a,1),n=!0;break}n&&this.zr.refreshNextFrame()}}},m.inherits(i,f),i}),i("zrender/tool/util",["require","../dep/excanvas"],function(t){function e(t){return t&&1===t.nodeType&&"string"==typeof t.nodeName}function i(t){if("object"==typeof t&&null!==t){var o=t;if(t instanceof Array){o=[];for(var n=0,r=t.length;r>n;n++)o[n]=i(t[n])}else if(!_[y.call(t)]&&!e(t)){o={};for(var s in t)t.hasOwnProperty(s)&&(o[s]=i(t[s]))}return o}return t}function o(t,i,o,r){if(i.hasOwnProperty(o)){var s=t[o];"object"!=typeof s||_[y.call(s)]||e(s)?!r&&o in t||(t[o]=i[o]):n(t[o],i[o],r)}}function n(t,e,i){for(var n in e)o(t,e,n,i);return t}function r(){if(!u)if(t("../dep/excanvas"),window.G_vmlCanvasManager){var e=document.createElement("div");e.style.position="absolute",e.style.top="-1000px",document.body.appendChild(e),u=G_vmlCanvasManager.initElement(e).getContext("2d")}else u=document.createElement("canvas").getContext("2d");return u}function s(t,e){if(t.indexOf)return t.indexOf(e);for(var i=0,o=t.length;o>i;i++)if(t[i]===e)return i;return-1}function a(t,e){function i(){}var o=t.prototype;i.prototype=e.prototype,t.prototype=new i;for(var n in o)t.prototype[n]=o[n];t.constructor=t}function h(t,e,i){if(t&&e)if(t.forEach&&t.forEach===f)t.forEach(e,i);else if(t.length===+t.length)for(var o=0,n=t.length;n>o;o++)e.call(i,t[o],o,t);else for(var r in t)t.hasOwnProperty(r)&&e.call(i,t[r],r,t)}function l(t,e,i){if(t&&e){if(t.map&&t.map===g)return t.map(e,i);for(var o=[],n=0,r=t.length;r>n;n++)o.push(e.call(i,t[n],n,t));return o}}function c(t,e,i){if(t&&e){if(t.filter&&t.filter===m)return t.filter(e,i);for(var o=[],n=0,r=t.length;r>n;n++)e.call(i,t[n],n,t)&&o.push(t[n]);return o}}function d(t,e){return function(){t.apply(e,arguments)}}var u,p=Array.prototype,f=p.forEach,g=p.map,m=p.filter,_={"[object Function]":1,"[object RegExp]":1,"[object Date]":1,"[object Error]":1,"[object CanvasGradient]":1},y=Object.prototype.toString;return{inherits:a,clone:i,merge:n,getContext:r,indexOf:s,each:h,map:l,filter:c,bind:d}}),i("echarts/component/dataZoom",["require","./base","zrender/shape/Rectangle","zrender/shape/Polygon","../util/shape/Icon","../config","../util/date","zrender/tool/util","../component"],function(t){function e(t,e,o,n,r){i.call(this,t,e,o,n,r);var s=this;s._ondrift=function(t,e){return s.__ondrift(this,t,e)},s._ondragend=function(){return s.__ondragend()},this._fillerSize=30,this._isSilence=!1,this._zoom={},this.option.dataZoom=this.reformOption(this.option.dataZoom),this.zoomOption=this.option.dataZoom,this._handleSize=this.zoomOption.handleSize,this.myChart.canvasSupported||(this.zoomOption.realtime=!1),this._location=this._getLocation(),this._zoom=this._getZoom(),this._backupData(),this.option.dataZoom.show&&this._buildShape(),this._syncData()}var i=t("./base"),o=t("zrender/shape/Rectangle"),n=t("zrender/shape/Polygon"),r=t("../util/shape/Icon"),s=t("../config");s.dataZoom={zlevel:0,z:4,show:!1,orient:"horizontal",backgroundColor:"rgba(0,0,0,0)",dataBackgroundColor:"#eee",fillerColor:"rgba(144,197,237,0.2)",handleColor:"rgba(70,130,180,0.8)",handleSize:8,showDetail:!0,realtime:!0};var a=t("../util/date"),h=t("zrender/tool/util");return e.prototype={type:s.COMPONENT_TYPE_DATAZOOM,_buildShape:function(){this._buildBackground(),this._buildFiller(),this._buildHandle(),this._buildFrame();for(var t=0,e=this.shapeList.length;e>t;t++)this.zr.addShape(this.shapeList[t]);this._syncFrameShape()},_getLocation:function(){var t,e,i,o,n=this.component.grid;return"horizontal"==this.zoomOption.orient?(i=this.zoomOption.width||n.getWidth(),o=this.zoomOption.height||this._fillerSize,t=null!=this.zoomOption.x?this.zoomOption.x:n.getX(),e=null!=this.zoomOption.y?this.zoomOption.y:this.zr.getHeight()-o-2):(i=this.zoomOption.width||this._fillerSize,o=this.zoomOption.height||n.getHeight(),t=null!=this.zoomOption.x?this.zoomOption.x:2,e=null!=this.zoomOption.y?this.zoomOption.y:n.getY()),{x:t,y:e,width:i,height:o}},_getZoom:function(){var t=this.option.series,e=this.option.xAxis;!e||e instanceof Array||(e=[e],this.option.xAxis=e);var i=this.option.yAxis;!i||i instanceof Array||(i=[i],this.option.yAxis=i);var o,n,r=[],a=this.zoomOption.xAxisIndex;if(e&&null==a){o=[];for(var h=0,l=e.length;l>h;h++)("category"==e[h].type||null==e[h].type)&&o.push(h)}else o=a instanceof Array?a:null!=a?[a]:[];if(a=this.zoomOption.yAxisIndex,i&&null==a){n=[];for(var h=0,l=i.length;l>h;h++)"category"==i[h].type&&n.push(h)}else n=a instanceof Array?a:null!=a?[a]:[];for(var c,h=0,l=t.length;l>h;h++)if(c=t[h],c.type==s.CHART_TYPE_LINE||c.type==s.CHART_TYPE_BAR||c.type==s.CHART_TYPE_SCATTER||c.type==s.CHART_TYPE_K){for(var d=0,u=o.length;u>d;d++)if(o[d]==(c.xAxisIndex||0)){r.push(h);break}for(var d=0,u=n.length;u>d;d++)if(n[d]==(c.yAxisIndex||0)){r.push(h);break}null==this.zoomOption.xAxisIndex&&null==this.zoomOption.yAxisIndex&&c.data&&this.getDataFromOption(c.data[0])instanceof Array&&(c.type==s.CHART_TYPE_SCATTER||c.type==s.CHART_TYPE_LINE||c.type==s.CHART_TYPE_BAR)&&r.push(h)}var p=null!=this._zoom.start?this._zoom.start:null!=this.zoomOption.start?this.zoomOption.start:0,f=null!=this._zoom.end?this._zoom.end:null!=this.zoomOption.end?this.zoomOption.end:100;p>f&&(p+=f,f=p-f,p-=f);var g=Math.round((f-p)/100*("horizontal"==this.zoomOption.orient?this._location.width:this._location.height));return{start:p,end:f,start2:0,end2:100,size:g,xAxisIndex:o,yAxisIndex:n,seriesIndex:r,scatterMap:this._zoom.scatterMap||{}}},_backupData:function(){this._originalData={xAxis:{},yAxis:{},series:{}};for(var t=this.option.xAxis,e=this._zoom.xAxisIndex,i=0,o=e.length;o>i;i++)this._originalData.xAxis[e[i]]=t[e[i]].data;for(var n=this.option.yAxis,r=this._zoom.yAxisIndex,i=0,o=r.length;o>i;i++)this._originalData.yAxis[r[i]]=n[r[i]].data;for(var a,h=this.option.series,l=this._zoom.seriesIndex,i=0,o=l.length;o>i;i++)a=h[l[i]],this._originalData.series[l[i]]=a.data,a.data&&this.getDataFromOption(a.data[0])instanceof Array&&(a.type==s.CHART_TYPE_SCATTER||a.type==s.CHART_TYPE_LINE||a.type==s.CHART_TYPE_BAR)&&(this._backupScale(),this._calculScatterMap(l[i]))},_calculScatterMap:function(e){this._zoom.scatterMap=this._zoom.scatterMap||{},this._zoom.scatterMap[e]=this._zoom.scatterMap[e]||{};var i=t("../component"),o=i.get("axis"),n=h.clone(this.option.xAxis);"category"==n[0].type&&(n[0].type="value"),n[1]&&"category"==n[1].type&&(n[1].type="value");var r=new o(this.ecTheme,null,!1,{xAxis:n,series:this.option.series},this,"xAxis"),s=this.option.series[e].xAxisIndex||0;this._zoom.scatterMap[e].x=r.getAxis(s).getExtremum(),r.dispose(),n=h.clone(this.option.yAxis),"category"==n[0].type&&(n[0].type="value"),n[1]&&"category"==n[1].type&&(n[1].type="value"),r=new o(this.ecTheme,null,!1,{yAxis:n,series:this.option.series},this,"yAxis"),s=this.option.series[e].yAxisIndex||0,this._zoom.scatterMap[e].y=r.getAxis(s).getExtremum(),r.dispose()},_buildBackground:function(){var t=this._location.width,e=this._location.height;this.shapeList.push(new o({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._location.x,y:this._location.y,width:t,height:e,color:this.zoomOption.backgroundColor}}));for(var i=0,r=this._originalData.xAxis,a=this._zoom.xAxisIndex,h=0,l=a.length;l>h;h++)i=Math.max(i,r[a[h]].length);for(var c=this._originalData.yAxis,d=this._zoom.yAxisIndex,h=0,l=d.length;l>h;h++)i=Math.max(i,c[d[h]].length);for(var u,p=this._zoom.seriesIndex[0],f=this._originalData.series[p],g=Number.MIN_VALUE,m=Number.MAX_VALUE,h=0,l=f.length;l>h;h++)u=this.getDataFromOption(f[h],0),this.option.series[p].type==s.CHART_TYPE_K&&(u=u[1]),isNaN(u)&&(u=0),g=Math.max(g,u),m=Math.min(m,u);var _=g-m,y=[],v=t/(i-(i>1?1:0)),x=e/(i-(i>1?1:0)),b=1;"horizontal"==this.zoomOption.orient&&1>v?b=Math.floor(3*i/t):"vertical"==this.zoomOption.orient&&1>x&&(b=Math.floor(3*i/e));for(var h=0,l=i;l>h;h+=b)u=this.getDataFromOption(f[h],0),this.option.series[p].type==s.CHART_TYPE_K&&(u=u[1]),isNaN(u)&&(u=0),y.push("horizontal"==this.zoomOption.orient?[this._location.x+v*h,this._location.y+e-1-Math.round((u-m)/_*(e-10))]:[this._location.x+1+Math.round((u-m)/_*(t-10)),this._location.y+x*(l-h-1)]);"horizontal"==this.zoomOption.orient?(y.push([this._location.x+t,this._location.y+e]),y.push([this._location.x,this._location.y+e])):(y.push([this._location.x,this._location.y]),y.push([this._location.x,this._location.y+e])),this.shapeList.push(new n({zlevel:this.getZlevelBase(),z:this.getZBase(),style:{pointList:y,color:this.zoomOption.dataBackgroundColor},hoverable:!1}))},_buildFiller:function(){this._fillerShae={zlevel:this.getZlevelBase(),z:this.getZBase(),draggable:!0,ondrift:this._ondrift,ondragend:this._ondragend,_type:"filler"},this._fillerShae.style="horizontal"==this.zoomOption.orient?{x:this._location.x+Math.round(this._zoom.start/100*this._location.width)+this._handleSize,y:this._location.y,width:this._zoom.size-2*this._handleSize,height:this._location.height,color:this.zoomOption.fillerColor,text:":::",textPosition:"inside"}:{x:this._location.x,y:this._location.y+Math.round(this._zoom.start/100*this._location.height)+this._handleSize,width:this._location.width,height:this._zoom.size-2*this._handleSize,color:this.zoomOption.fillerColor,text:"::",textPosition:"inside"},this._fillerShae.highlightStyle={brushType:"fill",color:"rgba(0,0,0,0)"},this._fillerShae=new o(this._fillerShae),this.shapeList.push(this._fillerShae)},_buildHandle:function(){var t=this.zoomOption.showDetail?this._getDetail():{start:"",end:""};this._startShape={zlevel:this.getZlevelBase(),z:this.getZBase(),draggable:!0,style:{iconType:"rectangle",x:this._location.x,y:this._location.y,width:this._handleSize,height:this._handleSize,color:this.zoomOption.handleColor,text:"=",textPosition:"inside"},highlightStyle:{text:t.start,brushType:"fill",textPosition:"left"},ondrift:this._ondrift,ondragend:this._ondragend},"horizontal"==this.zoomOption.orient?(this._startShape.style.height=this._location.height,this._endShape=h.clone(this._startShape),this._startShape.style.x=this._fillerShae.style.x-this._handleSize,this._endShape.style.x=this._fillerShae.style.x+this._fillerShae.style.width,this._endShape.highlightStyle.text=t.end,this._endShape.highlightStyle.textPosition="right"):(this._startShape.style.width=this._location.width,this._endShape=h.clone(this._startShape),this._startShape.style.y=this._fillerShae.style.y+this._fillerShae.style.height,this._startShape.highlightStyle.textPosition="bottom",this._endShape.style.y=this._fillerShae.style.y-this._handleSize,this._endShape.highlightStyle.text=t.end,this._endShape.highlightStyle.textPosition="top"),this._startShape=new r(this._startShape),this._endShape=new r(this._endShape),this.shapeList.push(this._startShape),this.shapeList.push(this._endShape)},_buildFrame:function(){var t=this.subPixelOptimize(this._location.x,1),e=this.subPixelOptimize(this._location.y,1);this._startFrameShape={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:t,y:e,width:this._location.width-(t>this._location.x?1:0),height:this._location.height-(e>this._location.y?1:0),lineWidth:1,brushType:"stroke",strokeColor:this.zoomOption.handleColor}},this._endFrameShape=h.clone(this._startFrameShape),this._startFrameShape=new o(this._startFrameShape),this._endFrameShape=new o(this._endFrameShape),this.shapeList.push(this._startFrameShape),this.shapeList.push(this._endFrameShape)},_syncHandleShape:function(){"horizontal"==this.zoomOption.orient?(this._startShape.style.x=this._fillerShae.style.x-this._handleSize,this._endShape.style.x=this._fillerShae.style.x+this._fillerShae.style.width,this._zoom.start=(this._startShape.style.x-this._location.x)/this._location.width*100,this._zoom.end=(this._endShape.style.x+this._handleSize-this._location.x)/this._location.width*100):(this._startShape.style.y=this._fillerShae.style.y+this._fillerShae.style.height,this._endShape.style.y=this._fillerShae.style.y-this._handleSize,this._zoom.start=(this._location.y+this._location.height-this._startShape.style.y)/this._location.height*100,this._zoom.end=(this._location.y+this._location.height-this._endShape.style.y-this._handleSize)/this._location.height*100),this.zr.modShape(this._startShape.id),this.zr.modShape(this._endShape.id),this._syncFrameShape(),this.zr.refreshNextFrame()},_syncFillerShape:function(){var t,e;"horizontal"==this.zoomOption.orient?(t=this._startShape.style.x,e=this._endShape.style.x,this._fillerShae.style.x=Math.min(t,e)+this._handleSize,this._fillerShae.style.width=Math.abs(t-e)-this._handleSize,this._zoom.start=(Math.min(t,e)-this._location.x)/this._location.width*100,this._zoom.end=(Math.max(t,e)+this._handleSize-this._location.x)/this._location.width*100):(t=this._startShape.style.y,e=this._endShape.style.y,this._fillerShae.style.y=Math.min(t,e)+this._handleSize,this._fillerShae.style.height=Math.abs(t-e)-this._handleSize,this._zoom.start=(this._location.y+this._location.height-Math.max(t,e))/this._location.height*100,this._zoom.end=(this._location.y+this._location.height-Math.min(t,e)-this._handleSize)/this._location.height*100),this.zr.modShape(this._fillerShae.id),this._syncFrameShape(),this.zr.refreshNextFrame()},_syncFrameShape:function(){"horizontal"==this.zoomOption.orient?(this._startFrameShape.style.width=this._fillerShae.style.x-this._location.x,this._endFrameShape.style.x=this._fillerShae.style.x+this._fillerShae.style.width,this._endFrameShape.style.width=this._location.x+this._location.width-this._endFrameShape.style.x):(this._startFrameShape.style.y=this._fillerShae.style.y+this._fillerShae.style.height,this._startFrameShape.style.height=this._location.y+this._location.height-this._startFrameShape.style.y,this._endFrameShape.style.height=this._fillerShae.style.y-this._location.y),this.zr.modShape(this._startFrameShape.id),this.zr.modShape(this._endFrameShape.id)},_syncShape:function(){this.zoomOption.show&&("horizontal"==this.zoomOption.orient?(this._startShape.style.x=this._location.x+this._zoom.start/100*this._location.width,this._endShape.style.x=this._location.x+this._zoom.end/100*this._location.width-this._handleSize,this._fillerShae.style.x=this._startShape.style.x+this._handleSize,this._fillerShae.style.width=this._endShape.style.x-this._startShape.style.x-this._handleSize):(this._startShape.style.y=this._location.y+this._location.height-this._zoom.start/100*this._location.height,this._endShape.style.y=this._location.y+this._location.height-this._zoom.end/100*this._location.height-this._handleSize,this._fillerShae.style.y=this._endShape.style.y+this._handleSize,this._fillerShae.style.height=this._startShape.style.y-this._endShape.style.y-this._handleSize),this.zr.modShape(this._startShape.id),this.zr.modShape(this._endShape.id),this.zr.modShape(this._fillerShae.id),this._syncFrameShape(),this.zr.refresh())},_syncData:function(t){var e,i,o,n,r;for(var a in this._originalData){e=this._originalData[a];for(var h in e)r=e[h],null!=r&&(n=r.length,i=Math.floor(this._zoom.start/100*n),o=Math.ceil(this._zoom.end/100*n),this.getDataFromOption(r[0])instanceof Array&&this.option[a][h].type!=s.CHART_TYPE_K?(this._setScale(),this.option[a][h].data=this._synScatterData(h,r)):this.option[a][h].data=r.slice(i,o))}this._isSilence||!this.zoomOption.realtime&&!t||this.messageCenter.dispatch(s.EVENT.DATA_ZOOM,null,{zoom:this._zoom},this.myChart)},_synScatterData:function(t,e){if(0===this._zoom.start&&100==this._zoom.end&&0===this._zoom.start2&&100==this._zoom.end2)return e;var i,o,n,r,s,a=[],h=this._zoom.scatterMap[t];"horizontal"==this.zoomOption.orient?(i=h.x.max-h.x.min,o=this._zoom.start/100*i+h.x.min,n=this._zoom.end/100*i+h.x.min,i=h.y.max-h.y.min,r=this._zoom.start2/100*i+h.y.min,s=this._zoom.end2/100*i+h.y.min):(i=h.x.max-h.x.min,o=this._zoom.start2/100*i+h.x.min,n=this._zoom.end2/100*i+h.x.min,i=h.y.max-h.y.min,r=this._zoom.start/100*i+h.y.min,s=this._zoom.end/100*i+h.y.min);var l;(l=h.x.dataMappingMethods)&&(o=l.coord2Value(o),n=l.coord2Value(n)),(l=h.y.dataMappingMethods)&&(r=l.coord2Value(r),s=l.coord2Value(s));for(var c,d=0,u=e.length;u>d;d++)c=e[d].value||e[d],c[0]>=o&&c[0]<=n&&c[1]>=r&&c[1]<=s&&a.push(e[d]);return a},_setScale:function(){var t=0!==this._zoom.start||100!==this._zoom.end||0!==this._zoom.start2||100!==this._zoom.end2,e={xAxis:this.option.xAxis,yAxis:this.option.yAxis};for(var i in e)for(var o=0,n=e[i].length;n>o;o++)e[i][o].scale=t||e[i][o]._scale},_backupScale:function(){var t={xAxis:this.option.xAxis,yAxis:this.option.yAxis};for(var e in t)for(var i=0,o=t[e].length;o>i;i++)t[e][i]._scale=t[e][i].scale},_getDetail:function(){for(var t=["xAxis","yAxis"],e=0,i=t.length;i>e;e++){var o=this._originalData[t[e]];for(var n in o){var r=o[n];if(null!=r){var s=r.length,h=Math.floor(this._zoom.start/100*s),l=Math.ceil(this._zoom.end/100*s);return l-=l>0?1:0,{start:this.getDataFromOption(r[h]),end:this.getDataFromOption(r[l])}}}}t="horizontal"==this.zoomOption.orient?"xAxis":"yAxis";var c=this._zoom.seriesIndex[0],d=this.option.series[c][t+"Index"]||0,u=this.option[t][d].type,p=this._zoom.scatterMap[c][t.charAt(0)].min,f=this._zoom.scatterMap[c][t.charAt(0)].max,g=f-p;if("value"==u)return{start:p+g*this._zoom.start/100,end:p+g*this._zoom.end/100};if("time"==u){f=p+g*this._zoom.end/100,p+=g*this._zoom.start/100;var m=a.getAutoFormatter(p,f).formatter;return{start:a.format(m,p),end:a.format(m,f)}}return{start:"",end:""}},__ondrift:function(t,e,i){this.zoomOption.zoomLock&&(t=this._fillerShae);var o="filler"==t._type?this._handleSize:0;if("horizontal"==this.zoomOption.orient?t.style.x+e-o<=this._location.x?t.style.x=this._location.x+o:t.style.x+e+t.style.width+o>=this._location.x+this._location.width?t.style.x=this._location.x+this._location.width-t.style.width-o:t.style.x+=e:t.style.y+i-o<=this._location.y?t.style.y=this._location.y+o:t.style.y+i+t.style.height+o>=this._location.y+this._location.height?t.style.y=this._location.y+this._location.height-t.style.height-o:t.style.y+=i,"filler"==t._type?this._syncHandleShape():this._syncFillerShape(),this.zoomOption.realtime&&this._syncData(),this.zoomOption.showDetail){var n=this._getDetail();this._startShape.style.text=this._startShape.highlightStyle.text=n.start,this._endShape.style.text=this._endShape.highlightStyle.text=n.end,this._startShape.style.textPosition=this._startShape.highlightStyle.textPosition,this._endShape.style.textPosition=this._endShape.highlightStyle.textPosition}return!0},__ondragend:function(){this.zoomOption.showDetail&&(this._startShape.style.text=this._endShape.style.text="=",this._startShape.style.textPosition=this._endShape.style.textPosition="inside",this.zr.modShape(this._startShape.id),this.zr.modShape(this._endShape.id),this.zr.refreshNextFrame()),this.isDragend=!0},ondragend:function(t,e){this.isDragend&&t.target&&(!this.zoomOption.realtime&&this._syncData(),e.dragOut=!0,e.dragIn=!0,this._isSilence||this.zoomOption.realtime||this.messageCenter.dispatch(s.EVENT.DATA_ZOOM,null,{zoom:this._zoom},this.myChart),e.needRefresh=!1,this.isDragend=!1)},ondataZoom:function(t,e){e.needRefresh=!0},absoluteZoom:function(t){this._zoom.start=t.start,this._zoom.end=t.end,this._zoom.start2=t.start2,this._zoom.end2=t.end2,this._syncShape(),this._syncData(!0)},rectZoom:function(t){if(!t)return this._zoom.start=this._zoom.start2=0,this._zoom.end=this._zoom.end2=100,this._syncShape(),this._syncData(!0),this._zoom;var e=this.component.grid.getArea(),i={x:t.x,y:t.y,width:t.width,height:t.height};if(i.width<0&&(i.x+=i.width,i.width=-i.width),i.height<0&&(i.y+=i.height,i.height=-i.height),i.x>e.x+e.width||i.y>e.y+e.height)return!1;i.x<e.x&&(i.x=e.x),i.x+i.width>e.x+e.width&&(i.width=e.x+e.width-i.x),i.y+i.height>e.y+e.height&&(i.height=e.y+e.height-i.y);var o,n=(i.x-e.x)/e.width,r=1-(i.x+i.width-e.x)/e.width,s=1-(i.y+i.height-e.y)/e.height,a=(i.y-e.y)/e.height;return"horizontal"==this.zoomOption.orient?(o=this._zoom.end-this._zoom.start,this._zoom.start+=o*n,this._zoom.end-=o*r,o=this._zoom.end2-this._zoom.start2,this._zoom.start2+=o*s,this._zoom.end2-=o*a):(o=this._zoom.end-this._zoom.start,this._zoom.start+=o*s,this._zoom.end-=o*a,o=this._zoom.end2-this._zoom.start2,this._zoom.start2+=o*n,this._zoom.end2-=o*r),this._syncShape(),this._syncData(!0),this._zoom},syncBackupData:function(t){for(var e,i,o=this._originalData.series,n=t.series,r=0,s=n.length;s>r;r++){i=n[r].data||n[r].eventList,e=o[r]?Math.floor(this._zoom.start/100*o[r].length):0;for(var a=0,h=i.length;h>a;a++)o[r]&&(o[r][a+e]=i[a])}},syncOption:function(t){this.silence(!0),this.option=t,this.option.dataZoom=this.reformOption(this.option.dataZoom),this.zoomOption=this.option.dataZoom,this.myChart.canvasSupported||(this.zoomOption.realtime=!1),this.clear(),this._location=this._getLocation(),this._zoom=this._getZoom(),this._backupData(),this.option.dataZoom&&this.option.dataZoom.show&&this._buildShape(),this._syncData(),this.silence(!1)},silence:function(t){this._isSilence=t},getRealDataIndex:function(t,e){if(!this._originalData||0===this._zoom.start&&100==this._zoom.end)return e;var i=this._originalData.series;return i[t]?Math.floor(this._zoom.start/100*i[t].length)+e:-1},resize:function(){this.clear(),this._location=this._getLocation(),this._zoom=this._getZoom(),this.option.dataZoom.show&&this._buildShape()}},h.inherits(e,i),t("../component").define("dataZoom",e),e}),i("echarts/config",[],function(){var t={CHART_TYPE_LINE:"line",CHART_TYPE_BAR:"bar",CHART_TYPE_SCATTER:"scatter",CHART_TYPE_PIE:"pie",CHART_TYPE_RADAR:"radar",CHART_TYPE_VENN:"venn",CHART_TYPE_TREEMAP:"treemap",CHART_TYPE_TREE:"tree",CHART_TYPE_MAP:"map",CHART_TYPE_K:"k",CHART_TYPE_ISLAND:"island",CHART_TYPE_FORCE:"force",CHART_TYPE_CHORD:"chord",CHART_TYPE_GAUGE:"gauge",CHART_TYPE_FUNNEL:"funnel",CHART_TYPE_EVENTRIVER:"eventRiver",CHART_TYPE_WORDCLOUD:"wordCloud",CHART_TYPE_HEATMAP:"heatmap",COMPONENT_TYPE_TITLE:"title",COMPONENT_TYPE_LEGEND:"legend",COMPONENT_TYPE_DATARANGE:"dataRange",COMPONENT_TYPE_DATAVIEW:"dataView",COMPONENT_TYPE_DATAZOOM:"dataZoom",COMPONENT_TYPE_TOOLBOX:"toolbox",COMPONENT_TYPE_TOOLTIP:"tooltip",COMPONENT_TYPE_GRID:"grid",COMPONENT_TYPE_AXIS:"axis",COMPONENT_TYPE_POLAR:"polar",COMPONENT_TYPE_X_AXIS:"xAxis",COMPONENT_TYPE_Y_AXIS:"yAxis",COMPONENT_TYPE_AXIS_CATEGORY:"categoryAxis",COMPONENT_TYPE_AXIS_VALUE:"valueAxis",COMPONENT_TYPE_TIMELINE:"timeline",COMPONENT_TYPE_ROAMCONTROLLER:"roamController",backgroundColor:"rgba(0,0,0,0)",color:["#ff7f50","#87cefa","#da70d6","#32cd32","#6495ed","#ff69b4","#ba55d3","#cd5c5c","#ffa500","#40e0d0","#1e90ff","#ff6347","#7b68ee","#00fa9a","#ffd700","#6699FF","#ff6666","#3cb371","#b8860b","#30e0e0"],markPoint:{clickable:!0,symbol:"pin",symbolSize:10,large:!1,effect:{show:!1,loop:!0,period:15,type:"scale",scaleSize:2,bounceDistance:10},itemStyle:{normal:{borderWidth:2,label:{show:!0,position:"inside"}},emphasis:{label:{show:!0}}}},markLine:{clickable:!0,symbol:["circle","arrow"],symbolSize:[2,4],smoothness:.2,precision:2,effect:{show:!1,loop:!0,period:15,scaleSize:2},bundling:{enable:!1,maxTurningAngle:45},itemStyle:{normal:{borderWidth:1.5,label:{show:!0,position:"end"},lineStyle:{type:"dashed"}},emphasis:{label:{show:!1},lineStyle:{}}}},textStyle:{decoration:"none",fontFamily:"Arial, Verdana, sans-serif",fontFamily2:"微软雅黑",fontSize:12,fontStyle:"normal",fontWeight:"normal"},EVENT:{REFRESH:"refresh",RESTORE:"restore",RESIZE:"resize",CLICK:"click",DBLCLICK:"dblclick",HOVER:"hover",MOUSEOUT:"mouseout",DATA_CHANGED:"dataChanged",DATA_ZOOM:"dataZoom",DATA_RANGE:"dataRange",DATA_RANGE_SELECTED:"dataRangeSelected",DATA_RANGE_HOVERLINK:"dataRangeHoverLink",LEGEND_SELECTED:"legendSelected",LEGEND_HOVERLINK:"legendHoverLink",MAP_SELECTED:"mapSelected",PIE_SELECTED:"pieSelected",MAGIC_TYPE_CHANGED:"magicTypeChanged",DATA_VIEW_CHANGED:"dataViewChanged",TIMELINE_CHANGED:"timelineChanged",MAP_ROAM:"mapRoam",FORCE_LAYOUT_END:"forceLayoutEnd",TOOLTIP_HOVER:"tooltipHover",TOOLTIP_IN_GRID:"tooltipInGrid",TOOLTIP_OUT_GRID:"tooltipOutGrid",ROAMCONTROLLER:"roamController"},DRAG_ENABLE_TIME:120,EFFECT_ZLEVEL:10,effectBlendAlpha:.95,symbolList:["circle","rectangle","triangle","diamond","emptyCircle","emptyRectangle","emptyTriangle","emptyDiamond"],loadingEffect:"spin",loadingText:"数据读取中...",noDataEffect:"bubble",noDataText:"暂无数据",calculable:!1,calculableColor:"rgba(255,165,0,0.6)",calculableHolderColor:"#ccc",nameConnector:" & ",valueConnector:": ",animation:!0,addDataAnimation:!0,animationThreshold:2e3,animationDuration:2e3,animationDurationUpdate:500,animationEasing:"ExponentialOut"};return t}),i("echarts/util/ecData",[],function(){function t(t,e,i,o,n,r,s,a){var h;return"undefined"!=typeof o&&(h=null==o.value?o:o.value),t._echartsData={_series:e,_seriesIndex:i,_data:o,_dataIndex:n,_name:r,_value:h,_special:s,_special2:a},t._echartsData
}function e(t,e){var i=t._echartsData;if(!e)return i;switch(e){case"series":case"seriesIndex":case"data":case"dataIndex":case"name":case"value":case"special":case"special2":return i&&i["_"+e]}return null}function i(t,e,i){switch(t._echartsData=t._echartsData||{},e){case"series":case"seriesIndex":case"data":case"dataIndex":case"name":case"value":case"special":case"special2":t._echartsData["_"+e]=i}}function o(t,e){e._echartsData={_series:t._echartsData._series,_seriesIndex:t._echartsData._seriesIndex,_data:t._echartsData._data,_dataIndex:t._echartsData._dataIndex,_name:t._echartsData._name,_value:t._echartsData._value,_special:t._echartsData._special,_special2:t._echartsData._special2}}return{pack:t,set:i,get:e,clone:o}}),i("echarts/chart",[],function(){var t={},e={};return t.define=function(i,o){return e[i]=o,t},t.get=function(t){return e[t]},t}),i("zrender/tool/event",["require","../mixin/Eventful"],function(t){"use strict";function e(t){return"undefined"!=typeof t.zrenderX&&t.zrenderX||"undefined"!=typeof t.offsetX&&t.offsetX||"undefined"!=typeof t.layerX&&t.layerX||"undefined"!=typeof t.clientX&&t.clientX}function i(t){return"undefined"!=typeof t.zrenderY&&t.zrenderY||"undefined"!=typeof t.offsetY&&t.offsetY||"undefined"!=typeof t.layerY&&t.layerY||"undefined"!=typeof t.clientY&&t.clientY}function o(t){return"undefined"!=typeof t.zrenderDelta&&t.zrenderDelta||"undefined"!=typeof t.wheelDelta&&t.wheelDelta||"undefined"!=typeof t.detail&&-t.detail}var n=t("../mixin/Eventful"),r="function"==typeof window.addEventListener?function(t){t.preventDefault(),t.stopPropagation(),t.cancelBubble=!0}:function(t){t.returnValue=!1,t.cancelBubble=!0};return{getX:e,getY:i,getDelta:o,stop:r,Dispatcher:n}}),i("zrender/tool/env",[],function(){function t(t){var e=this.os={},i=this.browser={},o=t.match(/Web[kK]it[\/]{0,1}([\d.]+)/),n=t.match(/(Android);?[\s\/]+([\d.]+)?/),r=t.match(/(iPad).*OS\s([\d_]+)/),s=t.match(/(iPod)(.*OS\s([\d_]+))?/),a=!r&&t.match(/(iPhone\sOS)\s([\d_]+)/),h=t.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),l=h&&t.match(/TouchPad/),c=t.match(/Kindle\/([\d.]+)/),d=t.match(/Silk\/([\d._]+)/),u=t.match(/(BlackBerry).*Version\/([\d.]+)/),p=t.match(/(BB10).*Version\/([\d.]+)/),f=t.match(/(RIM\sTablet\sOS)\s([\d.]+)/),g=t.match(/PlayBook/),m=t.match(/Chrome\/([\d.]+)/)||t.match(/CriOS\/([\d.]+)/),_=t.match(/Firefox\/([\d.]+)/),y=t.match(/MSIE ([\d.]+)/),v=o&&t.match(/Mobile\//)&&!m,x=t.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/)&&!m,y=t.match(/MSIE\s([\d.]+)/);return(i.webkit=!!o)&&(i.version=o[1]),n&&(e.android=!0,e.version=n[2]),a&&!s&&(e.ios=e.iphone=!0,e.version=a[2].replace(/_/g,".")),r&&(e.ios=e.ipad=!0,e.version=r[2].replace(/_/g,".")),s&&(e.ios=e.ipod=!0,e.version=s[3]?s[3].replace(/_/g,"."):null),h&&(e.webos=!0,e.version=h[2]),l&&(e.touchpad=!0),u&&(e.blackberry=!0,e.version=u[2]),p&&(e.bb10=!0,e.version=p[2]),f&&(e.rimtabletos=!0,e.version=f[2]),g&&(i.playbook=!0),c&&(e.kindle=!0,e.version=c[1]),d&&(i.silk=!0,i.version=d[1]),!d&&e.android&&t.match(/Kindle Fire/)&&(i.silk=!0),m&&(i.chrome=!0,i.version=m[1]),_&&(i.firefox=!0,i.version=_[1]),y&&(i.ie=!0,i.version=y[1]),v&&(t.match(/Safari/)||e.ios)&&(i.safari=!0),x&&(i.webview=!0),y&&(i.ie=!0,i.version=y[1]),e.tablet=!!(r||g||n&&!t.match(/Mobile/)||_&&t.match(/Tablet/)||y&&!t.match(/Phone/)&&t.match(/Touch/)),e.phone=!(e.tablet||e.ipod||!(n||a||h||u||p||m&&t.match(/Android/)||m&&t.match(/CriOS\/([\d.]+)/)||_&&t.match(/Mobile/)||y&&t.match(/Touch/))),{browser:i,os:e,canvasSupported:document.createElement("canvas").getContext?!0:!1}}return t(navigator.userAgent)}),i("zrender/config",[],function(){var t={EVENT:{RESIZE:"resize",CLICK:"click",DBLCLICK:"dblclick",MOUSEWHEEL:"mousewheel",MOUSEMOVE:"mousemove",MOUSEOVER:"mouseover",MOUSEOUT:"mouseout",MOUSEDOWN:"mousedown",MOUSEUP:"mouseup",GLOBALOUT:"globalout",DRAGSTART:"dragstart",DRAGEND:"dragend",DRAGENTER:"dragenter",DRAGOVER:"dragover",DRAGLEAVE:"dragleave",DROP:"drop",touchClickDelay:300},elementClassName:"zr-element",catchBrushException:!1,debugMode:0,devicePixelRatio:Math.max(window.devicePixelRatio||1,1)};return t}),i("zrender/zrender",["require","./dep/excanvas","./tool/util","./tool/log","./tool/guid","./Handler","./Painter","./Storage","./animation/Animation","./tool/env"],function(t){function e(t){return function(){t._needsRefreshNextFrame&&t.refresh()}}t("./dep/excanvas");var i=t("./tool/util"),o=t("./tool/log"),n=t("./tool/guid"),r=t("./Handler"),s=t("./Painter"),a=t("./Storage"),h=t("./animation/Animation"),l={},c={};c.version="2.1.1",c.init=function(t){var e=new d(n(),t);return l[e.id]=e,e},c.dispose=function(t){if(t)t.dispose();else{for(var e in l)l[e].dispose();l={}}return c},c.getInstance=function(t){return l[t]},c.delInstance=function(t){return delete l[t],c};var d=function(i,o){this.id=i,this.env=t("./tool/env"),this.storage=new a,this.painter=new s(o,this.storage),this.handler=new r(o,this.storage,this.painter),this.animation=new h({stage:{update:e(this)}}),this.animation.start();var n=this;this.painter.refreshNextFrame=function(){n.refreshNextFrame()},this._needsRefreshNextFrame=!1;var n=this,l=this.storage,c=l.delFromMap;l.delFromMap=function(t){var e=l.get(t);n.stopAnimation(e),c.call(l,t)}};return d.prototype.getId=function(){return this.id},d.prototype.addShape=function(t){return this.addElement(t),this},d.prototype.addGroup=function(t){return this.addElement(t),this},d.prototype.delShape=function(t){return this.delElement(t),this},d.prototype.delGroup=function(t){return this.delElement(t),this},d.prototype.modShape=function(t,e){return this.modElement(t,e),this},d.prototype.modGroup=function(t,e){return this.modElement(t,e),this},d.prototype.addElement=function(t){return this.storage.addRoot(t),this._needsRefreshNextFrame=!0,this},d.prototype.delElement=function(t){return this.storage.delRoot(t),this._needsRefreshNextFrame=!0,this},d.prototype.modElement=function(t,e){return this.storage.mod(t,e),this._needsRefreshNextFrame=!0,this},d.prototype.modLayer=function(t,e){return this.painter.modLayer(t,e),this._needsRefreshNextFrame=!0,this},d.prototype.addHoverShape=function(t){return this.storage.addHover(t),this},d.prototype.render=function(t){return this.painter.render(t),this._needsRefreshNextFrame=!1,this},d.prototype.refresh=function(t){return this.painter.refresh(t),this._needsRefreshNextFrame=!1,this},d.prototype.refreshNextFrame=function(){return this._needsRefreshNextFrame=!0,this},d.prototype.refreshHover=function(t){return this.painter.refreshHover(t),this},d.prototype.refreshShapes=function(t,e){return this.painter.refreshShapes(t,e),this},d.prototype.resize=function(){return this.painter.resize(),this},d.prototype.animate=function(t,e,n){var r=this;if("string"==typeof t&&(t=this.storage.get(t)),t){var s;if(e){for(var a=e.split("."),h=t,l=0,c=a.length;c>l;l++)h&&(h=h[a[l]]);h&&(s=h)}else s=t;if(!s)return void o('Property "'+e+'" is not existed in element '+t.id);null==t.__animators&&(t.__animators=[]);var d=t.__animators,u=this.animation.animate(s,{loop:n}).during(function(){r.modShape(t)}).done(function(){var e=i.indexOf(t.__animators,u);e>=0&&d.splice(e,1)});return d.push(u),u}o("Element not existed")},d.prototype.stopAnimation=function(t){if(t.__animators){for(var e=t.__animators,i=e.length,o=0;i>o;o++)e[o].stop();e.length=0}return this},d.prototype.clearAnimation=function(){return this.animation.clear(),this},d.prototype.showLoading=function(t){return this.painter.showLoading(t),this},d.prototype.hideLoading=function(){return this.painter.hideLoading(),this},d.prototype.getWidth=function(){return this.painter.getWidth()},d.prototype.getHeight=function(){return this.painter.getHeight()},d.prototype.toDataURL=function(t,e,i){return this.painter.toDataURL(t,e,i)},d.prototype.shapeToImage=function(t,e,i){var o=n();return this.painter.shapeToImage(o,t,e,i)},d.prototype.on=function(t,e,i){return this.handler.on(t,e,i),this},d.prototype.un=function(t,e){return this.handler.un(t,e),this},d.prototype.trigger=function(t,e){return this.handler.trigger(t,e),this},d.prototype.clear=function(){return this.storage.delRoot(),this.painter.clear(),this},d.prototype.dispose=function(){this.animation.stop(),this.clear(),this.storage.dispose(),this.painter.dispose(),this.handler.dispose(),this.animation=this.storage=this.painter=this.handler=null,c.delInstance(this.id)},c}),i("zrender/tool/color",["require","../tool/util"],function(t){function e(t){W=t}function i(){W=X}function o(t,e){return t=0|t,e=e||W,e[t%e.length]}function n(t){q=t}function r(){G=q}function s(){return q}function a(t,e,i,o,n,r,s){N||(N=Y.getContext());for(var a=N.createRadialGradient(t,e,i,o,n,r),h=0,l=s.length;l>h;h++)a.addColorStop(s[h][0],s[h][1]);return a.__nonRecursion=!0,a}function h(t,e,i,o,n){N||(N=Y.getContext());for(var r=N.createLinearGradient(t,e,i,o),s=0,a=n.length;a>s;s++)r.addColorStop(n[s][0],n[s][1]);return r.__nonRecursion=!0,r}function l(t,e,i){t=f(t),e=f(e),t=M(t),e=M(e);for(var o=[],n=(e[0]-t[0])/i,r=(e[1]-t[1])/i,s=(e[2]-t[2])/i,a=(e[3]-t[3])/i,h=0,l=t[0],c=t[1],u=t[2],p=t[3];i>h;h++)o[h]=d([I(Math.floor(l),[0,255]),I(Math.floor(c),[0,255]),I(Math.floor(u),[0,255]),p.toFixed(4)-0],"rgba"),l+=n,c+=r,u+=s,p+=a;return l=e[0],c=e[1],u=e[2],p=e[3],o[h]=d([l,c,u,p],"rgba"),o}function c(t,e){var i=[],o=t.length;if(void 0===e&&(e=20),1===o)i=l(t[0],t[0],e);else if(o>1)for(var n=0,r=o-1;r>n;n++){var s=l(t[n],t[n+1],e);r-1>n&&s.pop(),i=i.concat(s)}return i}function d(t,e){if(e=e||"rgb",t&&(3===t.length||4===t.length)){if(t=P(t,function(t){return t>1?Math.ceil(t):t}),e.indexOf("hex")>-1)return"#"+((1<<24)+(t[0]<<16)+(t[1]<<8)+ +t[2]).toString(16).slice(1);if(e.indexOf("hs")>-1){var i=P(t.slice(1,3),function(t){return t+"%"});t[1]=i[0],t[2]=i[1]}return e.indexOf("a")>-1?(3===t.length&&t.push(1),t[3]=I(t[3],[0,1]),e+"("+t.slice(0,4).join(",")+")"):e+"("+t.slice(0,3).join(",")+")"}}function u(t){t=z(t),t.indexOf("rgba")<0&&(t=f(t));var e=[],i=0;return t.replace(/[\d.]+/g,function(t){t=3>i?0|t:+t,e[i++]=t}),e}function p(t,e){if(!O(t))return t;var i=M(t),o=i[3];return"undefined"==typeof o&&(o=1),t.indexOf("hsb")>-1?i=D(i):t.indexOf("hsl")>-1&&(i=R(i)),e.indexOf("hsb")>-1||e.indexOf("hsv")>-1?i=B(i):e.indexOf("hsl")>-1&&(i=F(i)),i[3]=o,d(i,e)}function f(t){return p(t,"rgba")}function g(t){return p(t,"rgb")}function m(t){return p(t,"hex")}function _(t){return p(t,"hsva")}function y(t){return p(t,"hsv")}function v(t){return p(t,"hsba")}function x(t){return p(t,"hsb")}function b(t){return p(t,"hsla")}function T(t){return p(t,"hsl")}function S(t){for(var e in Z)if(m(Z[e])===m(t))return e;return null}function z(t){return String(t).replace(/\s+/g,"")}function C(t){if(Z[t]&&(t=Z[t]),t=z(t),t=t.replace(/hsv/i,"hsb"),/^#[\da-f]{3}$/i.test(t)){t=parseInt(t.slice(1),16);var e=(3840&t)<<8,i=(240&t)<<4,o=15&t;t="#"+((1<<24)+(e<<4)+e+(i<<4)+i+(o<<4)+o).toString(16).slice(1)}return t}function E(t,e){if(!O(t))return t;var i=e>0?1:-1;"undefined"==typeof e&&(e=0),e=Math.abs(e)>1?1:Math.abs(e),t=g(t);for(var o=M(t),n=0;3>n;n++)o[n]=1===i?o[n]*(1-e)|0:(255-o[n])*e+o[n]|0;return"rgb("+o.join(",")+")"}function w(t){if(!O(t))return t;var e=M(f(t));return e=P(e,function(t){return 255-t}),d(e,"rgb")}function L(t,e,i){if(!O(t)||!O(e))return t;"undefined"==typeof i&&(i=.5),i=1-I(i,[0,1]);for(var o=2*i-1,n=M(f(t)),r=M(f(e)),s=n[3]-r[3],a=((o*s===-1?o:(o+s)/(1+o*s))+1)/2,h=1-a,l=[],c=0;3>c;c++)l[c]=n[c]*a+r[c]*h;var u=n[3]*i+r[3]*(1-i);return u=Math.max(0,Math.min(1,u)),1===n[3]&&1===r[3]?d(l,"rgb"):(l[3]=u,d(l,"rgba"))}function A(){return"#"+(Math.random().toString(16)+"0000").slice(2,8)}function M(t){t=C(t);var e=t.match(V);if(null===e)throw new Error("The color format error");var i,o,n,r=[];if(e[2])i=e[2].replace("#","").split(""),n=[i[0]+i[1],i[2]+i[3],i[4]+i[5]],r=P(n,function(t){return I(parseInt(t,16),[0,255])});else if(e[4]){var s=e[4].split(",");o=s[3],n=s.slice(0,3),r=P(n,function(t){return t=Math.floor(t.indexOf("%")>0?2.55*parseInt(t,0):t),I(t,[0,255])}),"undefined"!=typeof o&&r.push(I(parseFloat(o),[0,1]))}else if(e[5]||e[6]){var a=(e[5]||e[6]).split(","),h=parseInt(a[0],0)/360,l=a[1],c=a[2];o=a[3],r=P([l,c],function(t){return I(parseFloat(t)/100,[0,1])}),r.unshift(h),"undefined"!=typeof o&&r.push(I(parseFloat(o),[0,1]))}return r}function k(t,e){if(!O(t))return t;null===e&&(e=1);var i=M(f(t));return i[3]=I(Number(e).toFixed(4),[0,1]),d(i,"rgba")}function P(t,e){if("function"!=typeof e)throw new TypeError;for(var i=t?t.length:0,o=0;i>o;o++)t[o]=e(t[o]);return t}function I(t,e){return t<=e[0]?t=e[0]:t>=e[1]&&(t=e[1]),t}function O(t){return t instanceof Array||"string"==typeof t}function D(t){var e,i,o,n=t[0],r=t[1],s=t[2];if(0===r)e=255*s,i=255*s,o=255*s;else{var a=6*n;6===a&&(a=0);var h=0|a,l=s*(1-r),c=s*(1-r*(a-h)),d=s*(1-r*(1-(a-h))),u=0,p=0,f=0;0===h?(u=s,p=d,f=l):1===h?(u=c,p=s,f=l):2===h?(u=l,p=s,f=d):3===h?(u=l,p=c,f=s):4===h?(u=d,p=l,f=s):(u=s,p=l,f=c),e=255*u,i=255*p,o=255*f}return[e,i,o]}function R(t){var e,i,o,n=t[0],r=t[1],s=t[2];if(0===r)e=255*s,i=255*s,o=255*s;else{var a;a=.5>s?s*(1+r):s+r-r*s;var h=2*s-a;e=255*H(h,a,n+1/3),i=255*H(h,a,n),o=255*H(h,a,n-1/3)}return[e,i,o]}function H(t,e,i){return 0>i&&(i+=1),i>1&&(i-=1),1>6*i?t+6*(e-t)*i:1>2*i?e:2>3*i?t+(e-t)*(2/3-i)*6:t}function B(t){var e,i,o=t[0]/255,n=t[1]/255,r=t[2]/255,s=Math.min(o,n,r),a=Math.max(o,n,r),h=a-s,l=a;if(0===h)e=0,i=0;else{i=h/a;var c=((a-o)/6+h/2)/h,d=((a-n)/6+h/2)/h,u=((a-r)/6+h/2)/h;o===a?e=u-d:n===a?e=1/3+c-u:r===a&&(e=2/3+d-c),0>e&&(e+=1),e>1&&(e-=1)}return e=360*e,i=100*i,l=100*l,[e,i,l]}function F(t){var e,i,o=t[0]/255,n=t[1]/255,r=t[2]/255,s=Math.min(o,n,r),a=Math.max(o,n,r),h=a-s,l=(a+s)/2;if(0===h)e=0,i=0;else{i=.5>l?h/(a+s):h/(2-a-s);var c=((a-o)/6+h/2)/h,d=((a-n)/6+h/2)/h,u=((a-r)/6+h/2)/h;o===a?e=u-d:n===a?e=1/3+c-u:r===a&&(e=2/3+d-c),0>e&&(e+=1),e>1&&(e-=1)}return e=360*e,i=100*i,l=100*l,[e,i,l]}var N,Y=t("../tool/util"),W=["#ff9277"," #dddd00"," #ffc877"," #bbe3ff"," #d5ffbb","#bbbbff"," #ddb000"," #b0dd00"," #e2bbff"," #ffbbe3","#ff7777"," #ff9900"," #83dd00"," #77e3ff"," #778fff","#c877ff"," #ff77ab"," #ff6600"," #aa8800"," #77c7ff","#ad77ff"," #ff77ff"," #dd0083"," #777700"," #00aa00","#0088aa"," #8400dd"," #aa0088"," #dd0000"," #772e00"],X=W,q="rgba(255,255,0,0.5)",G=q,V=/^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i,Z={aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#0ff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000",blanchedalmond:"#ffebcd",blue:"#00f",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#0ff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgrey:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#f0f",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",grey:"#808080",green:"#008000",greenyellow:"#adff2f",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgrey:"#d3d3d3",lightgreen:"#90ee90",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#789",lightslategrey:"#789",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#0f0",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#f0f",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370d8",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#d87093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#f00",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#fff",whitesmoke:"#f5f5f5",yellow:"#ff0",yellowgreen:"#9acd32"};return{customPalette:e,resetPalette:i,getColor:o,getHighlightColor:s,customHighlight:n,resetHighlight:r,getRadialGradient:a,getLinearGradient:h,getGradientColors:c,getStepColors:l,reverse:w,mix:L,lift:E,trim:z,random:A,toRGB:g,toRGBA:f,toHex:m,toHSL:T,toHSLA:b,toHSB:x,toHSBA:v,toHSV:y,toHSVA:_,toName:S,toColor:d,toArray:u,alpha:k,getData:M}}),i("echarts/chart/island",["require","./base","zrender/shape/Circle","../config","../util/ecData","zrender/tool/util","zrender/tool/event","zrender/tool/color","../util/accMath","../chart"],function(t){function e(t,e,o,n,s){i.call(this,t,e,o,n,s),this._nameConnector,this._valueConnector,this._zrHeight=this.zr.getHeight(),this._zrWidth=this.zr.getWidth();var h=this;h.shapeHandler.onmousewheel=function(t){var e=t.target,i=t.event,o=a.getDelta(i);o=o>0?-1:1,e.style.r-=o,e.style.r=e.style.r<5?5:e.style.r;var n=r.get(e,"value"),s=n*h.option.island.calculateStep;n=s>1?Math.round(n-s*o):+(n-s*o).toFixed(2);var l=r.get(e,"name");e.style.text=l+":"+n,r.set(e,"value",n),r.set(e,"name",l),h.zr.modShape(e.id),h.zr.refreshNextFrame(),a.stop(i)}}var i=t("./base"),o=t("zrender/shape/Circle"),n=t("../config");n.island={zlevel:0,z:5,r:15,calculateStep:.1};var r=t("../util/ecData"),s=t("zrender/tool/util"),a=t("zrender/tool/event");return e.prototype={type:n.CHART_TYPE_ISLAND,_combine:function(e,i){var o=t("zrender/tool/color"),n=t("../util/accMath"),s=n.accAdd(r.get(e,"value"),r.get(i,"value")),a=r.get(e,"name")+this._nameConnector+r.get(i,"name");e.style.text=a+this._valueConnector+s,r.set(e,"value",s),r.set(e,"name",a),e.style.r=this.option.island.r,e.style.color=o.mix(e.style.color,i.style.color)},refresh:function(t){t&&(t.island=this.reformOption(t.island),this.option=t,this._nameConnector=this.option.nameConnector,this._valueConnector=this.option.valueConnector)},getOption:function(){return this.option},resize:function(){var t=this.zr.getWidth(),e=this.zr.getHeight(),i=t/(this._zrWidth||t),o=e/(this._zrHeight||e);if(1!==i||1!==o){this._zrWidth=t,this._zrHeight=e;for(var n=0,r=this.shapeList.length;r>n;n++)this.zr.modShape(this.shapeList[n].id,{style:{x:Math.round(this.shapeList[n].style.x*i),y:Math.round(this.shapeList[n].style.y*o)}})}},add:function(t){var e=r.get(t,"name"),i=r.get(t,"value"),n=null!=r.get(t,"series")?r.get(t,"series").name:"",s=this.getFont(this.option.island.textStyle),a=this.option.island,h={zlevel:a.zlevel,z:a.z,style:{x:t.style.x,y:t.style.y,r:this.option.island.r,color:t.style.color||t.style.strokeColor,text:e+this._valueConnector+i,textFont:s},draggable:!0,hoverable:!0,onmousewheel:this.shapeHandler.onmousewheel,_type:"island"};"#fff"===h.style.color&&(h.style.color=t.style.strokeColor),this.setCalculable(h),h.dragEnableTime=0,r.pack(h,{name:n},-1,i,-1,e),h=new o(h),this.shapeList.push(h),this.zr.addShape(h)},del:function(t){this.zr.delShape(t.id);for(var e=[],i=0,o=this.shapeList.length;o>i;i++)this.shapeList[i].id!=t.id&&e.push(this.shapeList[i]);this.shapeList=e},ondrop:function(t,e){if(this.isDrop&&t.target){var i=t.target,o=t.dragged;this._combine(i,o),this.zr.modShape(i.id),e.dragIn=!0,this.isDrop=!1}},ondragend:function(t,e){var i=t.target;this.isDragend?e.dragIn&&(this.del(i),e.needRefresh=!0):e.dragIn||(i.style.x=a.getX(t.event),i.style.y=a.getY(t.event),this.add(i),e.needRefresh=!0),this.isDragend=!1}},s.inherits(e,i),t("../chart").define("island",e),e}),i("echarts/component",[],function(){var t={},e={};return t.define=function(i,o){return e[i]=o,t},t.get=function(t){return e[t]},t}),i("echarts/component/title",["require","./base","zrender/shape/Text","zrender/shape/Rectangle","../config","zrender/tool/util","zrender/tool/area","zrender/tool/color","../component"],function(t){function e(t,e,o,n,r){i.call(this,t,e,o,n,r),this.refresh(n)}var i=t("./base"),o=t("zrender/shape/Text"),n=t("zrender/shape/Rectangle"),r=t("../config");r.title={zlevel:0,z:6,show:!0,text:"",subtext:"",x:"left",y:"top",backgroundColor:"rgba(0,0,0,0)",borderColor:"#ccc",borderWidth:0,padding:5,itemGap:5,textStyle:{fontSize:18,fontWeight:"bolder",color:"#333"},subtextStyle:{color:"#aaa"}};var s=t("zrender/tool/util"),a=t("zrender/tool/area"),h=t("zrender/tool/color");return e.prototype={type:r.COMPONENT_TYPE_TITLE,_buildShape:function(){if(this.titleOption.show){this._itemGroupLocation=this._getItemGroupLocation(),this._buildBackground(),this._buildItem();for(var t=0,e=this.shapeList.length;e>t;t++)this.zr.addShape(this.shapeList[t])}},_buildItem:function(){var t=this.titleOption.text,e=this.titleOption.link,i=this.titleOption.target,n=this.titleOption.subtext,r=this.titleOption.sublink,s=this.titleOption.subtarget,a=this.getFont(this.titleOption.textStyle),l=this.getFont(this.titleOption.subtextStyle),c=this._itemGroupLocation.x,d=this._itemGroupLocation.y,u=this._itemGroupLocation.width,p=this._itemGroupLocation.height,f={zlevel:this.getZlevelBase(),z:this.getZBase(),style:{y:d,color:this.titleOption.textStyle.color,text:t,textFont:a,textBaseline:"top"},highlightStyle:{color:h.lift(this.titleOption.textStyle.color,1),brushType:"fill"},hoverable:!1};e&&(f.hoverable=!0,f.clickable=!0,f.onclick=function(){i&&"self"==i?window.location=e:window.open(e)});var g={zlevel:this.getZlevelBase(),z:this.getZBase(),style:{y:d+p,color:this.titleOption.subtextStyle.color,text:n,textFont:l,textBaseline:"bottom"},highlightStyle:{color:h.lift(this.titleOption.subtextStyle.color,1),brushType:"fill"},hoverable:!1};switch(r&&(g.hoverable=!0,g.clickable=!0,g.onclick=function(){s&&"self"==s?window.location=r:window.open(r)}),this.titleOption.x){case"center":f.style.x=g.style.x=c+u/2,f.style.textAlign=g.style.textAlign="center";break;case"left":f.style.x=g.style.x=c,f.style.textAlign=g.style.textAlign="left";break;case"right":f.style.x=g.style.x=c+u,f.style.textAlign=g.style.textAlign="right";break;default:c=this.titleOption.x-0,c=isNaN(c)?0:c,f.style.x=g.style.x=c}this.titleOption.textAlign&&(f.style.textAlign=g.style.textAlign=this.titleOption.textAlign),this.shapeList.push(new o(f)),""!==n&&this.shapeList.push(new o(g))},_buildBackground:function(){var t=this.reformCssArray(this.titleOption.padding);this.shapeList.push(new n({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._itemGroupLocation.x-t[3],y:this._itemGroupLocation.y-t[0],width:this._itemGroupLocation.width+t[3]+t[1],height:this._itemGroupLocation.height+t[0]+t[2],brushType:0===this.titleOption.borderWidth?"fill":"both",color:this.titleOption.backgroundColor,strokeColor:this.titleOption.borderColor,lineWidth:this.titleOption.borderWidth}}))},_getItemGroupLocation:function(){var t,e=this.reformCssArray(this.titleOption.padding),i=this.titleOption.text,o=this.titleOption.subtext,n=this.getFont(this.titleOption.textStyle),r=this.getFont(this.titleOption.subtextStyle),s=Math.max(a.getTextWidth(i,n),a.getTextWidth(o,r)),h=a.getTextHeight(i,n)+(""===o?0:this.titleOption.itemGap+a.getTextHeight(o,r)),l=this.zr.getWidth();switch(this.titleOption.x){case"center":t=Math.floor((l-s)/2);break;case"left":t=e[3]+this.titleOption.borderWidth;break;case"right":t=l-s-e[1]-this.titleOption.borderWidth;break;default:t=this.titleOption.x-0,t=isNaN(t)?0:t}var c,d=this.zr.getHeight();switch(this.titleOption.y){case"top":c=e[0]+this.titleOption.borderWidth;break;case"bottom":c=d-h-e[2]-this.titleOption.borderWidth;break;case"center":c=Math.floor((d-h)/2);break;default:c=this.titleOption.y-0,c=isNaN(c)?0:c}return{x:t,y:c,width:s,height:h}},refresh:function(t){t&&(this.option=t,this.option.title=this.reformOption(this.option.title),this.titleOption=this.option.title,this.titleOption.textStyle=this.getTextStyle(this.titleOption.textStyle),this.titleOption.subtextStyle=this.getTextStyle(this.titleOption.subtextStyle)),this.clear(),this._buildShape()}},s.inherits(e,i),t("../component").define("title",e),e}),i("echarts/component/tooltip",["require","./base","../util/shape/Cross","zrender/shape/Line","zrender/shape/Rectangle","../config","../util/ecData","zrender/config","zrender/tool/event","zrender/tool/area","zrender/tool/color","zrender/tool/util","zrender/shape/Base","../component"],function(t){function e(t,e,r,s,a){i.call(this,t,e,r,s,a),this.dom=a.dom;var h=this;h._onmousemove=function(t){return h.__onmousemove(t)},h._onglobalout=function(t){return h.__onglobalout(t)},this.zr.on(l.EVENT.MOUSEMOVE,h._onmousemove),this.zr.on(l.EVENT.GLOBALOUT,h._onglobalout),h._hide=function(t){return h.__hide(t)},h._tryShow=function(t){return h.__tryShow(t)},h._refixed=function(t){return h.__refixed(t)},h._setContent=function(t,e){return h.__setContent(t,e)},this._tDom=this._tDom||document.createElement("div"),this._tDom.onselectstart=function(){return!1},this._tDom.onmouseover=function(){h._mousein=!0},this._tDom.onmouseout=function(){h._mousein=!1},this._tDom.className="echarts-tooltip",this._tDom.style.position="absolute",this.hasAppend=!1,this._axisLineShape&&this.zr.delShape(this._axisLineShape.id),this._axisLineShape=new n({zlevel:this.getZlevelBase(),z:this.getZBase(),invisible:!0,hoverable:!1}),this.shapeList.push(this._axisLineShape),this.zr.addShape(this._axisLineShape),this._axisShadowShape&&this.zr.delShape(this._axisShadowShape.id),this._axisShadowShape=new n({zlevel:this.getZlevelBase(),z:1,invisible:!0,hoverable:!1}),this.shapeList.push(this._axisShadowShape),this.zr.addShape(this._axisShadowShape),this._axisCrossShape&&this.zr.delShape(this._axisCrossShape.id),this._axisCrossShape=new o({zlevel:this.getZlevelBase(),z:this.getZBase(),invisible:!0,hoverable:!1}),this.shapeList.push(this._axisCrossShape),this.zr.addShape(this._axisCrossShape),this.showing=!1,this.refresh(s)}var i=t("./base"),o=t("../util/shape/Cross"),n=t("zrender/shape/Line"),r=t("zrender/shape/Rectangle"),s=new r({}),a=t("../config");a.tooltip={zlevel:1,z:8,show:!0,showContent:!0,trigger:"item",islandFormatter:"{a} <br/>{b} : {c}",showDelay:20,hideDelay:100,transitionDuration:.4,enterable:!1,backgroundColor:"rgba(0,0,0,0.7)",borderColor:"#333",borderRadius:4,borderWidth:0,padding:5,axisPointer:{type:"line",lineStyle:{color:"#48b",width:2,type:"solid"},crossStyle:{color:"#1e90ff",width:1,type:"dashed"},shadowStyle:{color:"rgba(150,150,150,0.3)",width:"auto",type:"default"}},textStyle:{color:"#fff"}};var h=t("../util/ecData"),l=t("zrender/config"),c=t("zrender/tool/event"),d=t("zrender/tool/area"),u=t("zrender/tool/color"),p=t("zrender/tool/util"),f=t("zrender/shape/Base");return e.prototype={type:a.COMPONENT_TYPE_TOOLTIP,_gCssText:"position:absolute;display:block;border-style:solid;white-space:nowrap;",_style:function(t){if(!t)return"";var e=[];if(t.transitionDuration){var i="left "+t.transitionDuration+"s,top "+t.transitionDuration+"s";e.push("transition:"+i),e.push("-moz-transition:"+i),e.push("-webkit-transition:"+i),e.push("-o-transition:"+i)}t.backgroundColor&&(e.push("background-Color:"+u.toHex(t.backgroundColor)),e.push("filter:alpha(opacity=70)"),e.push("background-Color:"+t.backgroundColor)),null!=t.borderWidth&&e.push("border-width:"+t.borderWidth+"px"),null!=t.borderColor&&e.push("border-color:"+t.borderColor),null!=t.borderRadius&&(e.push("border-radius:"+t.borderRadius+"px"),e.push("-moz-border-radius:"+t.borderRadius+"px"),e.push("-webkit-border-radius:"+t.borderRadius+"px"),e.push("-o-border-radius:"+t.borderRadius+"px"));var o=t.textStyle;o&&(o.color&&e.push("color:"+o.color),o.decoration&&e.push("text-decoration:"+o.decoration),o.align&&e.push("text-align:"+o.align),o.fontFamily&&e.push("font-family:"+o.fontFamily),o.fontSize&&e.push("font-size:"+o.fontSize+"px"),o.fontSize&&e.push("line-height:"+Math.round(3*o.fontSize/2)+"px"),o.fontStyle&&e.push("font-style:"+o.fontStyle),o.fontWeight&&e.push("font-weight:"+o.fontWeight));var n=t.padding;return null!=n&&(n=this.reformCssArray(n),e.push("padding:"+n[0]+"px "+n[1]+"px "+n[2]+"px "+n[3]+"px")),e=e.join(";")+";"},__hide:function(){this._lastDataIndex=-1,this._lastSeriesIndex=-1,this._lastItemTriggerId=-1,this._tDom&&(this._tDom.style.display="none");var t=!1;this._axisLineShape.invisible||(this._axisLineShape.invisible=!0,this.zr.modShape(this._axisLineShape.id),t=!0),this._axisShadowShape.invisible||(this._axisShadowShape.invisible=!0,this.zr.modShape(this._axisShadowShape.id),t=!0),this._axisCrossShape.invisible||(this._axisCrossShape.invisible=!0,this.zr.modShape(this._axisCrossShape.id),t=!0),this._lastTipShape&&this._lastTipShape.tipShape.length>0&&(this.zr.delShape(this._lastTipShape.tipShape),this._lastTipShape=!1,this.shapeList.length=2),t&&this.zr.refreshNextFrame(),this.showing=!1},_show:function(t,e,i,o){var n=this._tDom.offsetHeight,r=this._tDom.offsetWidth;t&&("function"==typeof t&&(t=t([e,i])),t instanceof Array&&(e=t[0],i=t[1])),e+r>this._zrWidth&&(e-=r+40),i+n>this._zrHeight&&(i-=n-20),20>i&&(i=0),this._tDom.style.cssText=this._gCssText+this._defaultCssText+(o?o:"")+"left:"+e+"px;top:"+i+"px;",(10>n||10>r)&&setTimeout(this._refixed,20),this.showing=!0},__refixed:function(){if(this._tDom){var t="",e=this._tDom.offsetHeight,i=this._tDom.offsetWidth;this._tDom.offsetLeft+i>this._zrWidth&&(t+="left:"+(this._zrWidth-i-20)+"px;"),this._tDom.offsetTop+e>this._zrHeight&&(t+="top:"+(this._zrHeight-e-10)+"px;"),""!==t&&(this._tDom.style.cssText+=t)}},__tryShow:function(){var t,e;if(this._curTarget){if("island"===this._curTarget._type&&this.option.tooltip.show)return void this._showItemTrigger();var i=h.get(this._curTarget,"series"),o=h.get(this._curTarget,"data");t=this.deepQuery([o,i,this.option],"tooltip.show"),null!=i&&null!=o&&t?(e=this.deepQuery([o,i,this.option],"tooltip.trigger"),"axis"===e?this._showAxisTrigger(i.xAxisIndex,i.yAxisIndex,h.get(this._curTarget,"dataIndex")):this._showItemTrigger()):(clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),this._hidingTicket=setTimeout(this._hide,this._hideDelay))}else this._findPolarTrigger()||this._findAxisTrigger()},_findAxisTrigger:function(){if(!this.component.xAxis||!this.component.yAxis)return void(this._hidingTicket=setTimeout(this._hide,this._hideDelay));for(var t,e,i=this.option.series,o=0,n=i.length;n>o;o++)if("axis"===this.deepQuery([i[o],this.option],"tooltip.trigger"))return t=i[o].xAxisIndex||0,e=i[o].yAxisIndex||0,this.component.xAxis.getAxis(t)&&this.component.xAxis.getAxis(t).type===a.COMPONENT_TYPE_AXIS_CATEGORY?void this._showAxisTrigger(t,e,this._getNearestDataIndex("x",this.component.xAxis.getAxis(t))):this.component.yAxis.getAxis(e)&&this.component.yAxis.getAxis(e).type===a.COMPONENT_TYPE_AXIS_CATEGORY?void this._showAxisTrigger(t,e,this._getNearestDataIndex("y",this.component.yAxis.getAxis(e))):void this._showAxisTrigger(t,e,-1);
"cross"===this.option.tooltip.axisPointer.type&&this._showAxisTrigger(-1,-1,-1)},_findPolarTrigger:function(){if(!this.component.polar)return!1;var t,e=c.getX(this._event),i=c.getY(this._event),o=this.component.polar.getNearestIndex([e,i]);return o?(t=o.valueIndex,o=o.polarIndex):o=-1,-1!=o?this._showPolarTrigger(o,t):!1},_getNearestDataIndex:function(t,e){var i=-1,o=c.getX(this._event),n=c.getY(this._event);if("x"===t){for(var r,s,a=this.component.grid.getXend(),h=e.getCoordByIndex(i);a>h&&(s=h,o>=h);)r=h,h=e.getCoordByIndex(++i);return 0>=i?i=0:s-o>=o-r?i-=1:null==e.getNameByIndex(i)&&(i-=1),i}for(var l,d,u=this.component.grid.getY(),h=e.getCoordByIndex(i);h>u&&(l=h,h>=n);)d=h,h=e.getCoordByIndex(++i);return 0>=i?i=0:n-l>=d-n?i-=1:null==e.getNameByIndex(i)&&(i-=1),i},_showAxisTrigger:function(t,e,i){if(!this._event.connectTrigger&&this.messageCenter.dispatch(a.EVENT.TOOLTIP_IN_GRID,this._event,null,this.myChart),null==this.component.xAxis||null==this.component.yAxis||null==t||null==e)return clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),void(this._hidingTicket=setTimeout(this._hide,this._hideDelay));var o,n,r,s,h=this.option.series,l=[],d=[],u="";if("axis"===this.option.tooltip.trigger){if(!this.option.tooltip.show)return;n=this.option.tooltip.formatter,r=this.option.tooltip.position}var p,f,g=-1!=t&&this.component.xAxis.getAxis(t).type===a.COMPONENT_TYPE_AXIS_CATEGORY?"xAxis":-1!=e&&this.component.yAxis.getAxis(e).type===a.COMPONENT_TYPE_AXIS_CATEGORY?"yAxis":!1;if(g){var m="xAxis"==g?t:e;o=this.component[g].getAxis(m);for(var _=0,y=h.length;y>_;_++)this._isSelected(h[_].name)&&h[_][g+"Index"]===m&&"axis"===this.deepQuery([h[_],this.option],"tooltip.trigger")&&(s=this.query(h[_],"tooltip.showContent")||s,n=this.query(h[_],"tooltip.formatter")||n,r=this.query(h[_],"tooltip.position")||r,u+=this._style(this.query(h[_],"tooltip")),null!=h[_].stack&&"xAxis"==g?(l.unshift(h[_]),d.unshift(_)):(l.push(h[_]),d.push(_)));this.messageCenter.dispatch(a.EVENT.TOOLTIP_HOVER,this._event,{seriesIndex:d,dataIndex:i},this.myChart);var v;"xAxis"==g?(p=this.subPixelOptimize(o.getCoordByIndex(i),this._axisLineWidth),f=c.getY(this._event),v=[p,this.component.grid.getY(),p,this.component.grid.getYend()]):(p=c.getX(this._event),f=this.subPixelOptimize(o.getCoordByIndex(i),this._axisLineWidth),v=[this.component.grid.getX(),f,this.component.grid.getXend(),f]),this._styleAxisPointer(l,v[0],v[1],v[2],v[3],o.getGap(),p,f)}else p=c.getX(this._event),f=c.getY(this._event),this._styleAxisPointer(h,this.component.grid.getX(),f,this.component.grid.getXend(),f,0,p,f),i>=0?this._showItemTrigger(!0):(clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),this._tDom.style.display="none");if(l.length>0){if(this._lastItemTriggerId=-1,this._lastDataIndex!=i||this._lastSeriesIndex!=d[0]){this._lastDataIndex=i,this._lastSeriesIndex=d[0];var x,b;if("function"==typeof n){for(var T=[],_=0,y=l.length;y>_;_++)x=l[_].data[i],b=this.getDataFromOption(x,"-"),T.push({seriesIndex:d[_],seriesName:l[_].name||"",series:l[_],dataIndex:i,data:x,name:o.getNameByIndex(i),value:b,0:l[_].name||"",1:o.getNameByIndex(i),2:b,3:x});this._curTicket="axis:"+i,this._tDom.innerHTML=n.call(this.myChart,T,this._curTicket,this._setContent)}else if("string"==typeof n){this._curTicket=0/0,n=n.replace("{a}","{a0}").replace("{b}","{b0}").replace("{c}","{c0}");for(var _=0,y=l.length;y>_;_++)n=n.replace("{a"+_+"}",this._encodeHTML(l[_].name||"")),n=n.replace("{b"+_+"}",this._encodeHTML(o.getNameByIndex(i))),x=l[_].data[i],x=this.getDataFromOption(x,"-"),n=n.replace("{c"+_+"}",x instanceof Array?x:this.numAddCommas(x));this._tDom.innerHTML=n}else{this._curTicket=0/0,n=this._encodeHTML(o.getNameByIndex(i));for(var _=0,y=l.length;y>_;_++)n+="<br/>"+this._encodeHTML(l[_].name||"")+" : ",x=l[_].data[i],x=this.getDataFromOption(x,"-"),n+=x instanceof Array?x:this.numAddCommas(x);this._tDom.innerHTML=n}}if(s===!1||!this.option.tooltip.showContent)return;this.hasAppend||(this._tDom.style.left=this._zrWidth/2+"px",this._tDom.style.top=this._zrHeight/2+"px",this.dom.firstChild.appendChild(this._tDom),this.hasAppend=!0),this._show(r,p+10,f+10,u)}},_showPolarTrigger:function(t,e){if(null==this.component.polar||null==t||null==e||0>e)return!1;var i,o,n,r=this.option.series,s=[],a=[],h="";if("axis"===this.option.tooltip.trigger){if(!this.option.tooltip.show)return!1;i=this.option.tooltip.formatter,o=this.option.tooltip.position}for(var l=this.option.polar[t].indicator[e].text,d=0,u=r.length;u>d;d++)this._isSelected(r[d].name)&&r[d].polarIndex===t&&"axis"===this.deepQuery([r[d],this.option],"tooltip.trigger")&&(n=this.query(r[d],"tooltip.showContent")||n,i=this.query(r[d],"tooltip.formatter")||i,o=this.query(r[d],"tooltip.position")||o,h+=this._style(this.query(r[d],"tooltip")),s.push(r[d]),a.push(d));if(s.length>0){for(var p,f,g,m=[],d=0,u=s.length;u>d;d++){p=s[d].data;for(var _=0,y=p.length;y>_;_++)f=p[_],this._isSelected(f.name)&&(f=null!=f?f:{name:"",value:{dataIndex:"-"}},g=this.getDataFromOption(f.value[e]),m.push({seriesIndex:a[d],seriesName:s[d].name||"",series:s[d],dataIndex:e,data:f,name:f.name,indicator:l,value:g,0:s[d].name||"",1:f.name,2:g,3:l}))}if(m.length<=0)return;if(this._lastItemTriggerId=-1,this._lastDataIndex!=e||this._lastSeriesIndex!=a[0])if(this._lastDataIndex=e,this._lastSeriesIndex=a[0],"function"==typeof i)this._curTicket="axis:"+e,this._tDom.innerHTML=i.call(this.myChart,m,this._curTicket,this._setContent);else if("string"==typeof i){i=i.replace("{a}","{a0}").replace("{b}","{b0}").replace("{c}","{c0}").replace("{d}","{d0}");for(var d=0,u=m.length;u>d;d++)i=i.replace("{a"+d+"}",this._encodeHTML(m[d].seriesName)),i=i.replace("{b"+d+"}",this._encodeHTML(m[d].name)),i=i.replace("{c"+d+"}",this.numAddCommas(m[d].value)),i=i.replace("{d"+d+"}",this._encodeHTML(m[d].indicator));this._tDom.innerHTML=i}else{i=this._encodeHTML(m[0].name)+"<br/>"+this._encodeHTML(m[0].indicator)+" : "+this.numAddCommas(m[0].value);for(var d=1,u=m.length;u>d;d++)i+="<br/>"+this._encodeHTML(m[d].name)+"<br/>",i+=this._encodeHTML(m[d].indicator)+" : "+this.numAddCommas(m[d].value);this._tDom.innerHTML=i}if(n===!1||!this.option.tooltip.showContent)return;return this.hasAppend||(this._tDom.style.left=this._zrWidth/2+"px",this._tDom.style.top=this._zrHeight/2+"px",this.dom.firstChild.appendChild(this._tDom),this.hasAppend=!0),this._show(o,c.getX(this._event),c.getY(this._event),h),!0}},_showItemTrigger:function(t){if(this._curTarget){var e,i,o,n=h.get(this._curTarget,"series"),r=h.get(this._curTarget,"seriesIndex"),s=h.get(this._curTarget,"data"),l=h.get(this._curTarget,"dataIndex"),d=h.get(this._curTarget,"name"),u=h.get(this._curTarget,"value"),p=h.get(this._curTarget,"special"),f=h.get(this._curTarget,"special2"),g=[s,n,this.option],m="";if("island"!=this._curTarget._type){var _=t?"axis":"item";this.option.tooltip.trigger===_&&(e=this.option.tooltip.formatter,i=this.option.tooltip.position),this.query(n,"tooltip.trigger")===_&&(o=this.query(n,"tooltip.showContent")||o,e=this.query(n,"tooltip.formatter")||e,i=this.query(n,"tooltip.position")||i,m+=this._style(this.query(n,"tooltip"))),o=this.query(s,"tooltip.showContent")||o,e=this.query(s,"tooltip.formatter")||e,i=this.query(s,"tooltip.position")||i,m+=this._style(this.query(s,"tooltip"))}else this._lastItemTriggerId=0/0,o=this.deepQuery(g,"tooltip.showContent"),e=this.deepQuery(g,"tooltip.islandFormatter"),i=this.deepQuery(g,"tooltip.islandPosition");this._lastDataIndex=-1,this._lastSeriesIndex=-1,this._lastItemTriggerId!==this._curTarget.id&&(this._lastItemTriggerId=this._curTarget.id,"function"==typeof e?(this._curTicket=(n.name||"")+":"+l,this._tDom.innerHTML=e.call(this.myChart,{seriesIndex:r,seriesName:n.name||"",series:n,dataIndex:l,data:s,name:d,value:u,percent:p,indicator:p,value2:f,indicator2:f,0:n.name||"",1:d,2:u,3:p,4:f,5:s,6:r,7:l},this._curTicket,this._setContent)):"string"==typeof e?(this._curTicket=0/0,e=e.replace("{a}","{a0}").replace("{b}","{b0}").replace("{c}","{c0}"),e=e.replace("{a0}",this._encodeHTML(n.name||"")).replace("{b0}",this._encodeHTML(d)).replace("{c0}",u instanceof Array?u:this.numAddCommas(u)),e=e.replace("{d}","{d0}").replace("{d0}",p||""),e=e.replace("{e}","{e0}").replace("{e0}",h.get(this._curTarget,"special2")||""),this._tDom.innerHTML=e):(this._curTicket=0/0,this._tDom.innerHTML=n.type===a.CHART_TYPE_RADAR&&p?this._itemFormatter.radar.call(this,n,d,u,p):n.type===a.CHART_TYPE_EVENTRIVER?this._itemFormatter.eventRiver.call(this,n,d,u,s):""+(null!=n.name?this._encodeHTML(n.name)+"<br/>":"")+(""===d?"":this._encodeHTML(d)+" : ")+(u instanceof Array?u:this.numAddCommas(u))));var y=c.getX(this._event),v=c.getY(this._event);this.deepQuery(g,"tooltip.axisPointer.show")&&this.component.grid?this._styleAxisPointer([n],this.component.grid.getX(),v,this.component.grid.getXend(),v,0,y,v):this._hide(),o!==!1&&this.option.tooltip.showContent&&(this.hasAppend||(this._tDom.style.left=this._zrWidth/2+"px",this._tDom.style.top=this._zrHeight/2+"px",this.dom.firstChild.appendChild(this._tDom),this.hasAppend=!0),this._show(i,y+20,v-20,m))}},_itemFormatter:{radar:function(t,e,i,o){var n="";n+=this._encodeHTML(""===e?t.name||"":e),n+=""===n?"":"<br />";for(var r=0;r<o.length;r++)n+=this._encodeHTML(o[r].text)+" : "+this.numAddCommas(i[r])+"<br />";return n},chord:function(t,e,i,o,n){if(null==n)return this._encodeHTML(e)+" ("+this.numAddCommas(i)+")";var r=this._encodeHTML(e),s=this._encodeHTML(o);return""+(null!=t.name?this._encodeHTML(t.name)+"<br/>":"")+r+" -> "+s+" ("+this.numAddCommas(i)+")<br />"+s+" -> "+r+" ("+this.numAddCommas(n)+")"},eventRiver:function(t,e,i,o){var n="";n+=this._encodeHTML(""===t.name?"":t.name+" : "),n+=this._encodeHTML(e),n+=""===n?"":"<br />",o=o.evolution;for(var r=0,s=o.length;s>r;r++)n+='<div style="padding-top:5px;">',o[r].detail&&(o[r].detail.img&&(n+='<img src="'+o[r].detail.img+'" style="float:left;width:40px;height:40px;">'),n+='<div style="margin-left:45px;">'+o[r].time+"<br/>",n+='<a href="'+o[r].detail.link+'" target="_blank">',n+=o[r].detail.text+"</a></div>",n+="</div>");return n}},_styleAxisPointer:function(t,e,i,o,n,r,s,a){if(t.length>0){var h,l,c=this.option.tooltip.axisPointer,d=c.type,u={line:{},cross:{},shadow:{}};for(var p in u)u[p].color=c[p+"Style"].color,u[p].width=c[p+"Style"].width,u[p].type=c[p+"Style"].type;for(var f=0,g=t.length;g>f;f++)h=t[f],l=this.query(h,"tooltip.axisPointer.type"),d=l||d,l&&(u[l].color=this.query(h,"tooltip.axisPointer."+l+"Style.color")||u[l].color,u[l].width=this.query(h,"tooltip.axisPointer."+l+"Style.width")||u[l].width,u[l].type=this.query(h,"tooltip.axisPointer."+l+"Style.type")||u[l].type);if("line"===d){var m=u.line.width,_=e==o;this._axisLineShape.style={xStart:_?this.subPixelOptimize(e,m):e,yStart:_?i:this.subPixelOptimize(i,m),xEnd:_?this.subPixelOptimize(o,m):o,yEnd:_?n:this.subPixelOptimize(n,m),strokeColor:u.line.color,lineWidth:m,lineType:u.line.type},this._axisLineShape.invisible=!1,this.zr.modShape(this._axisLineShape.id)}else if("cross"===d){var y=u.cross.width;this._axisCrossShape.style={brushType:"stroke",rect:this.component.grid.getArea(),x:this.subPixelOptimize(s,y),y:this.subPixelOptimize(a,y),text:("( "+this.component.xAxis.getAxis(0).getValueFromCoord(s)+" , "+this.component.yAxis.getAxis(0).getValueFromCoord(a)+" )").replace("  , "," ").replace(" ,  "," "),textPosition:"specific",strokeColor:u.cross.color,lineWidth:y,lineType:u.cross.type},this.component.grid.getXend()-s>100?(this._axisCrossShape.style.textAlign="left",this._axisCrossShape.style.textX=s+10):(this._axisCrossShape.style.textAlign="right",this._axisCrossShape.style.textX=s-10),a-this.component.grid.getY()>50?(this._axisCrossShape.style.textBaseline="bottom",this._axisCrossShape.style.textY=a-10):(this._axisCrossShape.style.textBaseline="top",this._axisCrossShape.style.textY=a+10),this._axisCrossShape.invisible=!1,this.zr.modShape(this._axisCrossShape.id)}else"shadow"===d&&((null==u.shadow.width||"auto"===u.shadow.width||isNaN(u.shadow.width))&&(u.shadow.width=r),e===o?Math.abs(this.component.grid.getX()-e)<2?(u.shadow.width/=2,e=o+=u.shadow.width/2):Math.abs(this.component.grid.getXend()-e)<2&&(u.shadow.width/=2,e=o-=u.shadow.width/2):i===n&&(Math.abs(this.component.grid.getY()-i)<2?(u.shadow.width/=2,i=n+=u.shadow.width/2):Math.abs(this.component.grid.getYend()-i)<2&&(u.shadow.width/=2,i=n-=u.shadow.width/2)),this._axisShadowShape.style={xStart:e,yStart:i,xEnd:o,yEnd:n,strokeColor:u.shadow.color,lineWidth:u.shadow.width},this._axisShadowShape.invisible=!1,this.zr.modShape(this._axisShadowShape.id));this.zr.refreshNextFrame()}},__onmousemove:function(t){if(clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),!this._mousein||!this._enterable){var e=t.target,i=c.getX(t.event),o=c.getY(t.event);if(e){this._curTarget=e,this._event=t.event,this._event.zrenderX=i,this._event.zrenderY=o;var n;if(this._needAxisTrigger&&this.component.polar&&-1!=(n=this.component.polar.isInside([i,o])))for(var r=this.option.series,h=0,l=r.length;l>h;h++)if(r[h].polarIndex===n&&"axis"===this.deepQuery([r[h],this.option],"tooltip.trigger")){this._curTarget=null;break}this._showingTicket=setTimeout(this._tryShow,this._showDelay)}else this._curTarget=!1,this._event=t.event,this._event.zrenderX=i,this._event.zrenderY=o,this._needAxisTrigger&&this.component.grid&&d.isInside(s,this.component.grid.getArea(),i,o)?this._showingTicket=setTimeout(this._tryShow,this._showDelay):this._needAxisTrigger&&this.component.polar&&-1!=this.component.polar.isInside([i,o])?this._showingTicket=setTimeout(this._tryShow,this._showDelay):(!this._event.connectTrigger&&this.messageCenter.dispatch(a.EVENT.TOOLTIP_OUT_GRID,this._event,null,this.myChart),this._hidingTicket=setTimeout(this._hide,this._hideDelay))}},__onglobalout:function(){clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),this._hidingTicket=setTimeout(this._hide,this._hideDelay)},__setContent:function(t,e){this._tDom&&(t===this._curTicket&&(this._tDom.innerHTML=e),setTimeout(this._refixed,20))},ontooltipHover:function(t,e){if(!this._lastTipShape||this._lastTipShape&&this._lastTipShape.dataIndex!=t.dataIndex){this._lastTipShape&&this._lastTipShape.tipShape.length>0&&(this.zr.delShape(this._lastTipShape.tipShape),this.shapeList.length=2);for(var i=0,o=e.length;o>i;i++)e[i].zlevel=this.getZlevelBase(),e[i].z=this.getZBase(),e[i].style=f.prototype.getHighlightStyle(e[i].style,e[i].highlightStyle),e[i].draggable=!1,e[i].hoverable=!1,e[i].clickable=!1,e[i].ondragend=null,e[i].ondragover=null,e[i].ondrop=null,this.shapeList.push(e[i]),this.zr.addShape(e[i]);this._lastTipShape={dataIndex:t.dataIndex,tipShape:e}}},ondragend:function(){this._hide()},onlegendSelected:function(t){this._selectedMap=t.selected},_setSelectedMap:function(){this._selectedMap=this.component.legend?p.clone(this.component.legend.getSelectedMap()):{}},_isSelected:function(t){return null!=this._selectedMap[t]?this._selectedMap[t]:!0},showTip:function(t){if(t){var e,i=this.option.series;if(null!=t.seriesIndex)e=t.seriesIndex;else for(var o=t.seriesName,n=0,r=i.length;r>n;n++)if(i[n].name===o){e=n;break}var s=i[e];if(null!=s){var c=this.myChart.chart[s.type],d="axis"===this.deepQuery([s,this.option],"tooltip.trigger");if(c)if(d){var u=t.dataIndex;switch(c.type){case a.CHART_TYPE_LINE:case a.CHART_TYPE_BAR:case a.CHART_TYPE_K:case a.CHART_TYPE_RADAR:if(null==this.component.polar||s.data[0].value.length<=u)return;var p=s.polarIndex||0,f=this.component.polar.getVector(p,u,"max");this._event={zrenderX:f[0],zrenderY:f[1]},this._showPolarTrigger(p,u)}}else{var g,m,_=c.shapeList;switch(c.type){case a.CHART_TYPE_LINE:case a.CHART_TYPE_BAR:case a.CHART_TYPE_K:case a.CHART_TYPE_TREEMAP:case a.CHART_TYPE_SCATTER:for(var u=t.dataIndex,n=0,r=_.length;r>n;n++)if(null==_[n]._mark&&h.get(_[n],"seriesIndex")==e&&h.get(_[n],"dataIndex")==u){this._curTarget=_[n],g=_[n].style.x,m=c.type!=a.CHART_TYPE_K?_[n].style.y:_[n].style.y[0];break}break;case a.CHART_TYPE_RADAR:for(var u=t.dataIndex,n=0,r=_.length;r>n;n++)if("polygon"===_[n].type&&h.get(_[n],"seriesIndex")==e&&h.get(_[n],"dataIndex")==u){this._curTarget=_[n];var f=this.component.polar.getCenter(s.polarIndex||0);g=f[0],m=f[1];break}break;case a.CHART_TYPE_PIE:for(var y=t.name,n=0,r=_.length;r>n;n++)if("sector"===_[n].type&&h.get(_[n],"seriesIndex")==e&&h.get(_[n],"name")==y){this._curTarget=_[n];var v=this._curTarget.style,x=(v.startAngle+v.endAngle)/2*Math.PI/180;g=this._curTarget.style.x+Math.cos(x)*v.r/1.5,m=this._curTarget.style.y-Math.sin(x)*v.r/1.5;break}break;case a.CHART_TYPE_MAP:for(var y=t.name,b=s.mapType,n=0,r=_.length;r>n;n++)if("text"===_[n].type&&_[n]._mapType===b&&_[n].style._name===y){this._curTarget=_[n],g=this._curTarget.style.x+this._curTarget.position[0],m=this._curTarget.style.y+this._curTarget.position[1];break}break;case a.CHART_TYPE_CHORD:for(var y=t.name,n=0,r=_.length;r>n;n++)if("sector"===_[n].type&&h.get(_[n],"name")==y){this._curTarget=_[n];var v=this._curTarget.style,x=(v.startAngle+v.endAngle)/2*Math.PI/180;return g=this._curTarget.style.x+Math.cos(x)*(v.r-2),m=this._curTarget.style.y-Math.sin(x)*(v.r-2),void this.zr.trigger(l.EVENT.MOUSEMOVE,{zrenderX:g,zrenderY:m})}break;case a.CHART_TYPE_FORCE:for(var y=t.name,n=0,r=_.length;r>n;n++)if("circle"===_[n].type&&h.get(_[n],"name")==y){this._curTarget=_[n],g=this._curTarget.position[0],m=this._curTarget.position[1];break}}null!=g&&null!=m&&(this._event={zrenderX:g,zrenderY:m},this.zr.addHoverShape(this._curTarget),this.zr.refreshHover(),this._showItemTrigger())}}}},hideTip:function(){this._hide()},refresh:function(t){if(this._zrHeight=this.zr.getHeight(),this._zrWidth=this.zr.getWidth(),this._lastTipShape&&this._lastTipShape.tipShape.length>0&&this.zr.delShape(this._lastTipShape.tipShape),this._lastTipShape=!1,this.shapeList.length=2,this._lastDataIndex=-1,this._lastSeriesIndex=-1,this._lastItemTriggerId=-1,t){this.option=t,this.option.tooltip=this.reformOption(this.option.tooltip),this.option.tooltip.textStyle=p.merge(this.option.tooltip.textStyle,this.ecTheme.textStyle),this._needAxisTrigger=!1,"axis"===this.option.tooltip.trigger&&(this._needAxisTrigger=!0);for(var e=this.option.series,i=0,o=e.length;o>i;i++)if("axis"===this.query(e[i],"tooltip.trigger")){this._needAxisTrigger=!0;break}this._showDelay=this.option.tooltip.showDelay,this._hideDelay=this.option.tooltip.hideDelay,this._defaultCssText=this._style(this.option.tooltip),this._setSelectedMap(),this._axisLineWidth=this.option.tooltip.axisPointer.lineStyle.width,this._enterable=this.option.tooltip.enterable,!this._enterable&&this._tDom.className.indexOf(l.elementClassName)<0&&(this._tDom.className+=" "+l.elementClassName)}if(this.showing){var n=this;setTimeout(function(){n.zr.trigger(l.EVENT.MOUSEMOVE,n.zr.handler._event)},50)}},onbeforDispose:function(){this._lastTipShape&&this._lastTipShape.tipShape.length>0&&this.zr.delShape(this._lastTipShape.tipShape),clearTimeout(this._hidingTicket),clearTimeout(this._showingTicket),this.zr.un(l.EVENT.MOUSEMOVE,this._onmousemove),this.zr.un(l.EVENT.GLOBALOUT,this._onglobalout),this.hasAppend&&this.dom.firstChild&&this.dom.firstChild.removeChild(this._tDom),this._tDom=null},_encodeHTML:function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}},p.inherits(e,i),t("../component").define("tooltip",e),e}),i("echarts/component/timeline",["require","./base","zrender/shape/Rectangle","../util/shape/Icon","../util/shape/Chain","../config","zrender/tool/util","zrender/tool/area","zrender/tool/event","../component"],function(t){function e(t,e,i,n,r){o.call(this,t,e,i,n,r);var s=this;if(s._onclick=function(t){return s.__onclick(t)},s._ondrift=function(t,e){return s.__ondrift(this,t,e)},s._ondragend=function(){return s.__ondragend()},s._setCurrentOption=function(){var t=s.timelineOption;s.currentIndex%=t.data.length;var e=s.options[s.currentIndex]||{};s.myChart._setOption(e,t.notMerge,!0),s.messageCenter.dispatch(a.EVENT.TIMELINE_CHANGED,null,{currentIndex:s.currentIndex,data:null!=t.data[s.currentIndex].name?t.data[s.currentIndex].name:t.data[s.currentIndex]},s.myChart)},s._onFrame=function(){s._setCurrentOption(),s._syncHandleShape(),s.timelineOption.autoPlay&&(s.playTicket=setTimeout(function(){return s.currentIndex+=1,!s.timelineOption.loop&&s.currentIndex>=s.timelineOption.data.length?(s.currentIndex=s.timelineOption.data.length-1,void s.stop()):void s._onFrame()},s.timelineOption.playInterval))},this.setTheme(!1),this.options=this.option.options,this.currentIndex=this.timelineOption.currentIndex%this.timelineOption.data.length,this.timelineOption.notMerge||0===this.currentIndex||(this.options[this.currentIndex]=h.merge(this.options[this.currentIndex],this.options[0])),this.timelineOption.show&&(this._buildShape(),this._syncHandleShape()),this._setCurrentOption(),this.timelineOption.autoPlay){var s=this;this.playTicket=setTimeout(function(){s.play()},null!=this.ecTheme.animationDuration?this.ecTheme.animationDuration:a.animationDuration)}}function i(t,e){var i=2,o=e.x+i,n=e.y+i+2,s=e.width-i,a=e.height-i,h=e.symbol;if("last"===h)t.moveTo(o+s-2,n+a/3),t.lineTo(o+s-2,n),t.lineTo(o+2,n+a/2),t.lineTo(o+s-2,n+a),t.lineTo(o+s-2,n+a/3*2),t.moveTo(o,n),t.lineTo(o,n);else if("next"===h)t.moveTo(o+2,n+a/3),t.lineTo(o+2,n),t.lineTo(o+s-2,n+a/2),t.lineTo(o+2,n+a),t.lineTo(o+2,n+a/3*2),t.moveTo(o,n),t.lineTo(o,n);else if("play"===h)if("stop"===e.status)t.moveTo(o+2,n),t.lineTo(o+s-2,n+a/2),t.lineTo(o+2,n+a),t.lineTo(o+2,n);else{var l="both"===e.brushType?2:3;t.rect(o+2,n,l,a),t.rect(o+s-l-2,n,l,a)}else if(h.match("image")){var c="";c=h.replace(new RegExp("^image:\\/\\/"),""),h=r.prototype.iconLibrary.image,h(t,{x:o,y:n,width:s,height:a,image:c})}}var o=t("./base"),n=t("zrender/shape/Rectangle"),r=t("../util/shape/Icon"),s=t("../util/shape/Chain"),a=t("../config");a.timeline={zlevel:0,z:4,show:!0,type:"time",notMerge:!1,realtime:!0,x:80,x2:80,y2:0,height:50,backgroundColor:"rgba(0,0,0,0)",borderColor:"#ccc",borderWidth:0,padding:5,controlPosition:"left",autoPlay:!1,loop:!0,playInterval:2e3,lineStyle:{width:1,color:"#666",type:"dashed"},label:{show:!0,interval:"auto",rotate:0,textStyle:{color:"#333"}},checkpointStyle:{symbol:"auto",symbolSize:"auto",color:"auto",borderColor:"auto",borderWidth:"auto",label:{show:!1,textStyle:{color:"auto"}}},controlStyle:{itemSize:15,itemGap:5,normal:{color:"#333"},emphasis:{color:"#1e90ff"}},symbol:"emptyDiamond",symbolSize:4,currentIndex:0};var h=t("zrender/tool/util"),l=t("zrender/tool/area"),c=t("zrender/tool/event");return e.prototype={type:a.COMPONENT_TYPE_TIMELINE,_buildShape:function(){if(this._location=this._getLocation(),this._buildBackground(),this._buildControl(),this._chainPoint=this._getChainPoint(),this.timelineOption.label.show)for(var t=this._getInterval(),e=0,i=this._chainPoint.length;i>e;e+=t)this._chainPoint[e].showLabel=!0;this._buildChain(),this._buildHandle();for(var e=0,o=this.shapeList.length;o>e;e++)this.zr.addShape(this.shapeList[e])},_getLocation:function(){var t,e=this.timelineOption,i=this.reformCssArray(this.timelineOption.padding),o=this.zr.getWidth(),n=this.parsePercent(e.x,o),r=this.parsePercent(e.x2,o);null==e.width?(t=o-n-r,r=o-r):(t=this.parsePercent(e.width,o),r=n+t);var s,a,h=this.zr.getHeight(),l=this.parsePercent(e.height,h);return null!=e.y?(s=this.parsePercent(e.y,h),a=s+l):(a=h-this.parsePercent(e.y2,h),s=a-l),{x:n+i[3],y:s+i[0],x2:r-i[1],y2:a-i[2],width:t-i[1]-i[3],height:l-i[0]-i[2]}},_getReformedLabel:function(t){var e=this.timelineOption,i=null!=e.data[t].name?e.data[t].name:e.data[t],o=e.data[t].formatter||e.label.formatter;return o&&("function"==typeof o?i=o.call(this.myChart,i):"string"==typeof o&&(i=o.replace("{value}",i))),i},_getInterval:function(){var t=this._chainPoint,e=this.timelineOption,i=e.label.interval;if("auto"===i){var o=e.label.textStyle.fontSize,n=e.data,r=e.data.length;if(r>3){var s,a,h=!1;for(i=0;!h&&r>i;){i++,h=!0;for(var c=i;r>c;c+=i){if(s=t[c].x-t[c-i].x,0!==e.label.rotate)a=o;else if(n[c].textStyle)a=l.getTextWidth(t[c].name,t[c].textFont);else{var d=t[c].name+"",u=(d.match(/\w/g)||"").length,p=d.length-u;a=u*o*2/3+p*o}if(a>s){h=!1;break}}}}else i=1}else i=i-0+1;return i},_getChainPoint:function(){function t(t){return null!=l[t].name?l[t].name:l[t]+""}var e,i=this.timelineOption,o=i.symbol.toLowerCase(),n=i.symbolSize,r=i.label.rotate,s=i.label.textStyle,a=this.getFont(s),l=i.data,c=this._location.x,d=this._location.y+this._location.height/4*3,u=this._location.x2-this._location.x,p=l.length,f=[];if(p>1){var g=u/p;if(g=g>50?50:20>g?5:g,u-=2*g,"number"===i.type)for(var m=0;p>m;m++)f.push(c+g+u/(p-1)*m);else{f[0]=new Date(t(0).replace(/-/g,"/")),f[p-1]=new Date(t(p-1).replace(/-/g,"/"))-f[0];for(var m=1;p>m;m++)f[m]=c+g+u*(new Date(t(m).replace(/-/g,"/"))-f[0])/f[p-1];f[0]=c+g}}else f.push(c+u/2);for(var _,y,v,x,b,T=[],m=0;p>m;m++)c=f[m],_=l[m].symbol&&l[m].symbol.toLowerCase()||o,_.match("empty")?(_=_.replace("empty",""),v=!0):v=!1,_.match("star")&&(y=_.replace("star","")-0||5,_="star"),e=l[m].textStyle?h.merge(l[m].textStyle||{},s):s,x=e.align||"center",r?(x=r>0?"right":"left",b=[r*Math.PI/180,c,d-5]):b=!1,T.push({x:c,n:y,isEmpty:v,symbol:_,symbolSize:l[m].symbolSize||n,color:l[m].color,borderColor:l[m].borderColor,borderWidth:l[m].borderWidth,name:this._getReformedLabel(m),textColor:e.color,textAlign:x,textBaseline:e.baseline||"middle",textX:c,textY:d-(r?5:0),textFont:l[m].textStyle?this.getFont(e):a,rotation:b,showLabel:!1});return T},_buildBackground:function(){var t=this.timelineOption,e=this.reformCssArray(this.timelineOption.padding),i=this._location.width,o=this._location.height;(0!==t.borderWidth||"rgba(0,0,0,0)"!=t.backgroundColor.replace(/\s/g,""))&&this.shapeList.push(new n({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._location.x-e[3],y:this._location.y-e[0],width:i+e[1]+e[3],height:o+e[0]+e[2],brushType:0===t.borderWidth?"fill":"both",color:t.backgroundColor,strokeColor:t.borderColor,lineWidth:t.borderWidth}}))},_buildControl:function(){var t=this,e=this.timelineOption,i=e.lineStyle,o=e.controlStyle;if("none"!==e.controlPosition){var n,s=o.itemSize,a=o.itemGap;"left"===e.controlPosition?(n=this._location.x,this._location.x+=3*(s+a)):(n=this._location.x2-(3*(s+a)-a),this._location.x2-=3*(s+a));var l=this._location.y,c={zlevel:this.getZlevelBase(),z:this.getZBase()+1,style:{iconType:"timelineControl",symbol:"last",x:n,y:l,width:s,height:s,brushType:"stroke",color:o.normal.color,strokeColor:o.normal.color,lineWidth:i.width},highlightStyle:{color:o.emphasis.color,strokeColor:o.emphasis.color,lineWidth:i.width+1},clickable:!0};this._ctrLastShape=new r(c),this._ctrLastShape.onclick=function(){t.last()},this.shapeList.push(this._ctrLastShape),n+=s+a,this._ctrPlayShape=new r(h.clone(c)),this._ctrPlayShape.style.brushType="fill",this._ctrPlayShape.style.symbol="play",this._ctrPlayShape.style.status=this.timelineOption.autoPlay?"playing":"stop",this._ctrPlayShape.style.x=n,this._ctrPlayShape.onclick=function(){"stop"===t._ctrPlayShape.style.status?t.play():t.stop()},this.shapeList.push(this._ctrPlayShape),n+=s+a,this._ctrNextShape=new r(h.clone(c)),this._ctrNextShape.style.symbol="next",this._ctrNextShape.style.x=n,this._ctrNextShape.onclick=function(){t.next()},this.shapeList.push(this._ctrNextShape)}},_buildChain:function(){var t=this.timelineOption,e=t.lineStyle;this._timelineShae={zlevel:this.getZlevelBase(),z:this.getZBase(),style:{x:this._location.x,y:this.subPixelOptimize(this._location.y,e.width),width:this._location.x2-this._location.x,height:this._location.height,chainPoint:this._chainPoint,brushType:"both",strokeColor:e.color,lineWidth:e.width,lineType:e.type},hoverable:!1,clickable:!0,onclick:this._onclick},this._timelineShae=new s(this._timelineShae),this.shapeList.push(this._timelineShae)},_buildHandle:function(){var t=this._chainPoint[this.currentIndex],e=t.symbolSize+1;e=5>e?5:e,this._handleShape={zlevel:this.getZlevelBase(),z:this.getZBase()+1,hoverable:!1,draggable:!0,style:{iconType:"diamond",n:t.n,x:t.x-e,y:this._location.y+this._location.height/4-e,width:2*e,height:2*e,brushType:"both",textPosition:"specific",textX:t.x,textY:this._location.y-this._location.height/4,textAlign:"center",textBaseline:"middle"},highlightStyle:{},ondrift:this._ondrift,ondragend:this._ondragend},this._handleShape=new r(this._handleShape),this.shapeList.push(this._handleShape)},_syncHandleShape:function(){if(this.timelineOption.show){var t=this.timelineOption,e=t.checkpointStyle,i=this._chainPoint[this.currentIndex];this._handleShape.style.text=e.label.show?i.name:"",this._handleShape.style.textFont=i.textFont,this._handleShape.style.n=i.n,"auto"===e.symbol?this._handleShape.style.iconType="none"!=i.symbol?i.symbol:"diamond":(this._handleShape.style.iconType=e.symbol,e.symbol.match("star")&&(this._handleShape.style.n=e.symbol.replace("star","")-0||5,this._handleShape.style.iconType="star"));var o;"auto"===e.symbolSize?(o=i.symbolSize+2,o=5>o?5:o):o=e.symbolSize-0,this._handleShape.style.color="auto"===e.color?i.color?i.color:t.controlStyle.emphasis.color:e.color,this._handleShape.style.textColor="auto"===e.label.textStyle.color?this._handleShape.style.color:e.label.textStyle.color,this._handleShape.highlightStyle.strokeColor=this._handleShape.style.strokeColor="auto"===e.borderColor?i.borderColor?i.borderColor:"#fff":e.borderColor,this._handleShape.style.lineWidth="auto"===e.borderWidth?i.borderWidth?i.borderWidth:0:e.borderWidth-0,this._handleShape.highlightStyle.lineWidth=this._handleShape.style.lineWidth+1,this.zr.animate(this._handleShape.id,"style").when(500,{x:i.x-o,textX:i.x,y:this._location.y+this._location.height/4-o,width:2*o,height:2*o}).start("ExponentialOut")}},_findChainIndex:function(t){var e=this._chainPoint,i=e.length;if(t<=e[0].x)return 0;if(t>=e[i-1].x)return i-1;for(var o=0;i-1>o;o++)if(t>=e[o].x&&t<=e[o+1].x)return Math.abs(t-e[o].x)<Math.abs(t-e[o+1].x)?o:o+1},__onclick:function(t){var e=c.getX(t.event),i=this._findChainIndex(e);return i===this.currentIndex?!0:(this.currentIndex=i,this.timelineOption.autoPlay&&this.stop(),clearTimeout(this.playTicket),void this._onFrame())},__ondrift:function(t,e){this.timelineOption.autoPlay&&this.stop();var i,o=this._chainPoint,n=o.length;t.style.x+e<=o[0].x-o[0].symbolSize?(t.style.x=o[0].x-o[0].symbolSize,i=0):t.style.x+e>=o[n-1].x-o[n-1].symbolSize?(t.style.x=o[n-1].x-o[n-1].symbolSize,i=n-1):(t.style.x+=e,i=this._findChainIndex(t.style.x));var r=o[i],s=r.symbolSize+2;if(t.style.iconType=r.symbol,t.style.n=r.n,t.style.textX=t.style.x+s/2,t.style.y=this._location.y+this._location.height/4-s,t.style.width=2*s,t.style.height=2*s,t.style.text=r.name,i===this.currentIndex)return!0;if(this.currentIndex=i,this.timelineOption.realtime){clearTimeout(this.playTicket);var a=this;this.playTicket=setTimeout(function(){a._setCurrentOption()},200)}return!0},__ondragend:function(){this.isDragend=!0},ondragend:function(t,e){this.isDragend&&t.target&&(!this.timelineOption.realtime&&this._setCurrentOption(),e.dragOut=!0,e.dragIn=!0,e.needRefresh=!1,this.isDragend=!1,this._syncHandleShape())},last:function(){return this.timelineOption.autoPlay&&this.stop(),this.currentIndex-=1,this.currentIndex<0&&(this.currentIndex=this.timelineOption.data.length-1),this._onFrame(),this.currentIndex},next:function(){return this.timelineOption.autoPlay&&this.stop(),this.currentIndex+=1,this.currentIndex>=this.timelineOption.data.length&&(this.currentIndex=0),this._onFrame(),this.currentIndex},play:function(t,e){return this._ctrPlayShape&&"playing"!=this._ctrPlayShape.style.status&&(this._ctrPlayShape.style.status="playing",this.zr.modShape(this._ctrPlayShape.id),this.zr.refreshNextFrame()),this.timelineOption.autoPlay=null!=e?e:!0,this.timelineOption.autoPlay||clearTimeout(this.playTicket),this.currentIndex=null!=t?t:this.currentIndex+1,this.currentIndex>=this.timelineOption.data.length&&(this.currentIndex=0),this._onFrame(),this.currentIndex
},stop:function(){return this._ctrPlayShape&&"stop"!=this._ctrPlayShape.style.status&&(this._ctrPlayShape.style.status="stop",this.zr.modShape(this._ctrPlayShape.id),this.zr.refreshNextFrame()),this.timelineOption.autoPlay=!1,clearTimeout(this.playTicket),this.currentIndex},resize:function(){this.timelineOption.show&&(this.clear(),this._buildShape(),this._syncHandleShape())},setTheme:function(t){this.timelineOption=this.reformOption(h.clone(this.option.timeline)),this.timelineOption.label.textStyle=this.getTextStyle(this.timelineOption.label.textStyle),this.timelineOption.checkpointStyle.label.textStyle=this.getTextStyle(this.timelineOption.checkpointStyle.label.textStyle),this.myChart.canvasSupported||(this.timelineOption.realtime=!1),this.timelineOption.show&&t&&(this.clear(),this._buildShape(),this._syncHandleShape())},onbeforDispose:function(){clearTimeout(this.playTicket)}},r.prototype.iconLibrary.timelineControl=i,h.inherits(e,o),t("../component").define("timeline",e),e}),i("echarts/component/legend",["require","./base","zrender/shape/Text","zrender/shape/Rectangle","zrender/shape/Sector","../util/shape/Icon","../util/shape/Candle","../config","zrender/tool/util","zrender/tool/area","../component"],function(t){function e(t,e,o,n,r){if(!this.query(n,"legend.data"))return void console.error("option.legend.data has not been defined.");i.call(this,t,e,o,n,r);var s=this;s._legendSelected=function(t){s.__legendSelected(t)},s._dispatchHoverLink=function(t){return s.__dispatchHoverLink(t)},this._colorIndex=0,this._colorMap={},this._selectedMap={},this._hasDataMap={},this.refresh(n)}var i=t("./base"),o=t("zrender/shape/Text"),n=t("zrender/shape/Rectangle"),r=t("zrender/shape/Sector"),s=t("../util/shape/Icon"),a=t("../util/shape/Candle"),h=t("../config");h.legend={zlevel:0,z:4,show:!0,orient:"horizontal",x:"center",y:"top",backgroundColor:"rgba(0,0,0,0)",borderColor:"#ccc",borderWidth:0,padding:5,itemGap:10,itemWidth:20,itemHeight:14,textStyle:{color:"#333"},selectedMode:!0};var l=t("zrender/tool/util"),c=t("zrender/tool/area");e.prototype={type:h.COMPONENT_TYPE_LEGEND,_buildShape:function(){if(this.legendOption.show){this._itemGroupLocation=this._getItemGroupLocation(),this._buildBackground(),this._buildItem();for(var t=0,e=this.shapeList.length;e>t;t++)this.zr.addShape(this.shapeList[t])}},_buildItem:function(){var t,e,i,n,r,a,h,d,u=this.legendOption.data,p=u.length,f=this.legendOption.textStyle,g=this.zr.getWidth(),m=this.zr.getHeight(),_=this._itemGroupLocation.x,y=this._itemGroupLocation.y,v=this.legendOption.itemWidth,x=this.legendOption.itemHeight,b=this.legendOption.itemGap;"vertical"===this.legendOption.orient&&"right"===this.legendOption.x&&(_=this._itemGroupLocation.x+this._itemGroupLocation.width-v);for(var T=0;p>T;T++)r=l.merge(u[T].textStyle||{},f),a=this.getFont(r),t=this._getName(u[T]),h=this._getFormatterName(t),""!==t?(e=u[T].icon||this._getSomethingByName(t).type,d=this.getColor(t),"horizontal"===this.legendOption.orient?200>g-_&&v+5+c.getTextWidth(h,a)+(T===p-1||""===u[T+1]?0:b)>=g-_&&(_=this._itemGroupLocation.x,y+=x+b):200>m-y&&x+(T===p-1||""===u[T+1]?0:b)>=m-y&&("right"===this.legendOption.x?_-=this._itemGroupLocation.maxWidth+b:_+=this._itemGroupLocation.maxWidth+b,y=this._itemGroupLocation.y),i=this._getItemShapeByType(_,y,v,x,this._selectedMap[t]&&this._hasDataMap[t]?d:"#ccc",e,d),i._name=t,i=new s(i),n={zlevel:this.getZlevelBase(),z:this.getZBase(),style:{x:_+v+5,y:y+x/2,color:this._selectedMap[t]?"auto"===r.color?d:r.color:"#ccc",text:h,textFont:a,textBaseline:"middle"},highlightStyle:{color:d,brushType:"fill"},hoverable:!!this.legendOption.selectedMode,clickable:!!this.legendOption.selectedMode},"vertical"===this.legendOption.orient&&"right"===this.legendOption.x&&(n.style.x-=v+10,n.style.textAlign="right"),n._name=t,n=new o(n),this.legendOption.selectedMode&&(i.onclick=n.onclick=this._legendSelected,i.onmouseover=n.onmouseover=this._dispatchHoverLink,i.hoverConnect=n.id,n.hoverConnect=i.id),this.shapeList.push(i),this.shapeList.push(n),"horizontal"===this.legendOption.orient?_+=v+5+c.getTextWidth(h,a)+b:y+=x+b):"horizontal"===this.legendOption.orient?(_=this._itemGroupLocation.x,y+=x+b):("right"===this.legendOption.x?_-=this._itemGroupLocation.maxWidth+b:_+=this._itemGroupLocation.maxWidth+b,y=this._itemGroupLocation.y);"horizontal"===this.legendOption.orient&&"center"===this.legendOption.x&&y!=this._itemGroupLocation.y&&this._mLineOptimize()},_getName:function(t){return"undefined"!=typeof t.name?t.name:t},_getFormatterName:function(t){var e,i=this.legendOption.formatter;return e="function"==typeof i?i.call(this.myChart,t):"string"==typeof i?i.replace("{name}",t):t},_getFormatterNameFromData:function(t){var e=this._getName(t);return this._getFormatterName(e)},_mLineOptimize:function(){for(var t=[],e=this._itemGroupLocation.x,i=2,o=this.shapeList.length;o>i;i++)this.shapeList[i].style.x===e?t.push((this._itemGroupLocation.width-(this.shapeList[i-1].style.x+c.getTextWidth(this.shapeList[i-1].style.text,this.shapeList[i-1].style.textFont)-e))/2):i===o-1&&t.push((this._itemGroupLocation.width-(this.shapeList[i].style.x+c.getTextWidth(this.shapeList[i].style.text,this.shapeList[i].style.textFont)-e))/2);for(var n=-1,i=1,o=this.shapeList.length;o>i;i++)this.shapeList[i].style.x===e&&n++,0!==t[n]&&(this.shapeList[i].style.x+=t[n])},_buildBackground:function(){var t=this.reformCssArray(this.legendOption.padding);this.shapeList.push(new n({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._itemGroupLocation.x-t[3],y:this._itemGroupLocation.y-t[0],width:this._itemGroupLocation.width+t[3]+t[1],height:this._itemGroupLocation.height+t[0]+t[2],brushType:0===this.legendOption.borderWidth?"fill":"both",color:this.legendOption.backgroundColor,strokeColor:this.legendOption.borderColor,lineWidth:this.legendOption.borderWidth}}))},_getItemGroupLocation:function(){var t=this.legendOption.data,e=t.length,i=this.legendOption.itemGap,o=this.legendOption.itemWidth+5,n=this.legendOption.itemHeight,r=this.legendOption.textStyle,s=this.getFont(r),a=0,h=0,d=this.reformCssArray(this.legendOption.padding),u=this.zr.getWidth()-d[1]-d[3],p=this.zr.getHeight()-d[0]-d[2],f=0,g=0;if("horizontal"===this.legendOption.orient){h=n;for(var m=0;e>m;m++)if(""!==this._getName(t[m])){var _=c.getTextWidth(this._getFormatterNameFromData(t[m]),t[m].textStyle?this.getFont(l.merge(t[m].textStyle||{},r)):s);f+o+_+i>u?(f-=i,a=Math.max(a,f),h+=n+i,f=0):(f+=o+_+i,a=Math.max(a,f-i))}else f-=i,a=Math.max(a,f),h+=n+i,f=0}else{for(var m=0;e>m;m++)g=Math.max(g,c.getTextWidth(this._getFormatterNameFromData(t[m]),t[m].textStyle?this.getFont(l.merge(t[m].textStyle||{},r)):s));g+=o,a=g;for(var m=0;e>m;m++)""!==this._getName(t[m])?f+n+i>p?(a+=g+i,f-=i,h=Math.max(h,f),f=0):(f+=n+i,h=Math.max(h,f-i)):(a+=g+i,f-=i,h=Math.max(h,f),f=0)}u=this.zr.getWidth(),p=this.zr.getHeight();var y;switch(this.legendOption.x){case"center":y=Math.floor((u-a)/2);break;case"left":y=d[3]+this.legendOption.borderWidth;break;case"right":y=u-a-d[1]-d[3]-2*this.legendOption.borderWidth;break;default:y=this.parsePercent(this.legendOption.x,u)}var v;switch(this.legendOption.y){case"top":v=d[0]+this.legendOption.borderWidth;break;case"bottom":v=p-h-d[0]-d[2]-2*this.legendOption.borderWidth;break;case"center":v=Math.floor((p-h)/2);break;default:v=this.parsePercent(this.legendOption.y,p)}return{x:y,y:v,width:a,height:h,maxWidth:g}},_getSomethingByName:function(t){for(var e,i=this.option.series,o=0,n=i.length;n>o;o++){if(i[o].name===t)return{type:i[o].type,series:i[o],seriesIndex:o,data:null,dataIndex:-1};if(i[o].type===h.CHART_TYPE_PIE||i[o].type===h.CHART_TYPE_RADAR||i[o].type===h.CHART_TYPE_CHORD||i[o].type===h.CHART_TYPE_FORCE||i[o].type===h.CHART_TYPE_FUNNEL||i[o].type===h.CHART_TYPE_TREEMAP){e=i[o].categories||i[o].data||i[o].nodes;for(var r=0,s=e.length;s>r;r++)if(e[r].name===t)return{type:i[o].type,series:i[o],seriesIndex:o,data:e[r],dataIndex:r}}}return{type:"bar",series:null,seriesIndex:-1,data:null,dataIndex:-1}},_getItemShapeByType:function(t,e,i,o,n,r,s){var a,l="#ccc"===n?s:n,c={zlevel:this.getZlevelBase(),z:this.getZBase(),style:{iconType:"legendicon"+r,x:t,y:e,width:i,height:o,color:n,strokeColor:n,lineWidth:2},highlightStyle:{color:l,strokeColor:l,lineWidth:1},hoverable:this.legendOption.selectedMode,clickable:this.legendOption.selectedMode};if(r.match("image")){var a=r.replace(new RegExp("^image:\\/\\/"),"");r="image"}switch(r){case"line":c.style.brushType="stroke",c.highlightStyle.lineWidth=3;break;case"radar":case"venn":case"tree":case"treemap":case"scatter":c.highlightStyle.lineWidth=3;break;case"k":c.style.brushType="both",c.highlightStyle.lineWidth=3,c.highlightStyle.color=c.style.color=this.deepQuery([this.ecTheme,h],"k.itemStyle.normal.color")||"#fff",c.style.strokeColor="#ccc"!=n?this.deepQuery([this.ecTheme,h],"k.itemStyle.normal.lineStyle.color")||"#ff3200":n;break;case"image":c.style.iconType="image",c.style.image=a,"#ccc"===n&&(c.style.opacity=.5)}return c},__legendSelected:function(t){var e=t.target._name;if("single"===this.legendOption.selectedMode)for(var i in this._selectedMap)this._selectedMap[i]=!1;this._selectedMap[e]=!this._selectedMap[e],this.messageCenter.dispatch(h.EVENT.LEGEND_SELECTED,t.event,{selected:this._selectedMap,target:e},this.myChart)},__dispatchHoverLink:function(t){this.messageCenter.dispatch(h.EVENT.LEGEND_HOVERLINK,t.event,{target:t.target._name},this.myChart)},refresh:function(t){if(t){this.option=t||this.option,this.option.legend=this.reformOption(this.option.legend),this.legendOption=this.option.legend;var e,i,o,n,r=this.legendOption.data||[];if(this.legendOption.selected)for(var s in this.legendOption.selected)this._selectedMap[s]="undefined"!=typeof this._selectedMap[s]?this._selectedMap[s]:this.legendOption.selected[s];for(var a=0,l=r.length;l>a;a++)e=this._getName(r[a]),""!==e&&(i=this._getSomethingByName(e),i.series?(this._hasDataMap[e]=!0,n=!i.data||i.type!==h.CHART_TYPE_PIE&&i.type!==h.CHART_TYPE_FORCE&&i.type!==h.CHART_TYPE_FUNNEL?[i.series]:[i.data,i.series],o=this.getItemStyleColor(this.deepQuery(n,"itemStyle.normal.color"),i.seriesIndex,i.dataIndex,i.data),o&&i.type!=h.CHART_TYPE_K&&this.setColor(e,o),this._selectedMap[e]=null!=this._selectedMap[e]?this._selectedMap[e]:!0):this._hasDataMap[e]=!1)}this.clear(),this._buildShape()},getRelatedAmount:function(t){for(var e,i=0,o=this.option.series,n=0,r=o.length;r>n;n++)if(o[n].name===t&&i++,o[n].type===h.CHART_TYPE_PIE||o[n].type===h.CHART_TYPE_RADAR||o[n].type===h.CHART_TYPE_CHORD||o[n].type===h.CHART_TYPE_FORCE||o[n].type===h.CHART_TYPE_FUNNEL){e=o[n].type!=h.CHART_TYPE_FORCE?o[n].data:o[n].categories;for(var s=0,a=e.length;a>s;s++)e[s].name===t&&"-"!=e[s].value&&i++}return i},setColor:function(t,e){this._colorMap[t]=e},getColor:function(t){return this._colorMap[t]||(this._colorMap[t]=this.zr.getColor(this._colorIndex++)),this._colorMap[t]},hasColor:function(t){return this._colorMap[t]?this._colorMap[t]:!1},add:function(t,e){for(var i=this.legendOption.data,o=0,n=i.length;n>o;o++)if(this._getName(i[o])===t)return;this.legendOption.data.push(t),this.setColor(t,e),this._selectedMap[t]=!0,this._hasDataMap[t]=!0},del:function(t){for(var e=this.legendOption.data,i=0,o=e.length;o>i;i++)if(this._getName(e[i])===t)return this.legendOption.data.splice(i,1)},getItemShape:function(t){if(null!=t)for(var e,i=0,o=this.shapeList.length;o>i;i++)if(e=this.shapeList[i],e._name===t&&"text"!=e.type)return e},setItemShape:function(t,e){for(var i,o=0,n=this.shapeList.length;n>o;o++)i=this.shapeList[o],i._name===t&&"text"!=i.type&&(this._selectedMap[t]||(e.style.color="#ccc",e.style.strokeColor="#ccc"),this.zr.modShape(i.id,e))},isSelected:function(t){return"undefined"!=typeof this._selectedMap[t]?this._selectedMap[t]:!0},getSelectedMap:function(){return this._selectedMap},setSelected:function(t,e){if("single"===this.legendOption.selectedMode)for(var i in this._selectedMap)this._selectedMap[i]=!1;this._selectedMap[t]=e,this.messageCenter.dispatch(h.EVENT.LEGEND_SELECTED,null,{selected:this._selectedMap,target:t},this.myChart)},onlegendSelected:function(t,e){var i=t.selected;for(var o in i)this._selectedMap[o]!=i[o]&&(e.needRefresh=!0),this._selectedMap[o]=i[o]}};var d={line:function(t,e){var i=e.height/2;t.moveTo(e.x,e.y+i),t.lineTo(e.x+e.width,e.y+i)},pie:function(t,e){var i=e.x,o=e.y,n=e.width,s=e.height;r.prototype.buildPath(t,{x:i+n/2,y:o+s+2,r:s,r0:6,startAngle:45,endAngle:135})},eventRiver:function(t,e){var i=e.x,o=e.y,n=e.width,r=e.height;t.moveTo(i,o+r),t.bezierCurveTo(i+n,o+r,i,o+4,i+n,o+4),t.lineTo(i+n,o),t.bezierCurveTo(i,o,i+n,o+r-4,i,o+r-4),t.lineTo(i,o+r)},k:function(t,e){var i=e.x,o=e.y,n=e.width,r=e.height;a.prototype.buildPath(t,{x:i+n/2,y:[o+1,o+1,o+r-6,o+r],width:n-6})},bar:function(t,e){var i=e.x,o=e.y+1,n=e.width,r=e.height-2,s=3;t.moveTo(i+s,o),t.lineTo(i+n-s,o),t.quadraticCurveTo(i+n,o,i+n,o+s),t.lineTo(i+n,o+r-s),t.quadraticCurveTo(i+n,o+r,i+n-s,o+r),t.lineTo(i+s,o+r),t.quadraticCurveTo(i,o+r,i,o+r-s),t.lineTo(i,o+s),t.quadraticCurveTo(i,o,i+s,o)},force:function(t,e){s.prototype.iconLibrary.circle(t,e)},radar:function(t,e){var i=6,o=e.x+e.width/2,n=e.y+e.height/2,r=e.height/2,s=2*Math.PI/i,a=-Math.PI/2,h=o+r*Math.cos(a),l=n+r*Math.sin(a);t.moveTo(h,l),a+=s;for(var c=0,d=i-1;d>c;c++)t.lineTo(o+r*Math.cos(a),n+r*Math.sin(a)),a+=s;t.lineTo(h,l)}};d.chord=d.pie,d.map=d.bar;for(var u in d)s.prototype.iconLibrary["legendicon"+u]=d[u];return l.inherits(e,i),t("../component").define("legend",e),e}),i("zrender/loadingEffect/Bar",["require","./Base","../tool/util","../tool/color","../shape/Rectangle"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/color"),r=t("../shape/Rectangle");return o.inherits(e,i),e.prototype._start=function(t,e){var i=o.merge(this.options,{textStyle:{color:"#888"},backgroundColor:"rgba(250, 250, 250, 0.8)",effectOption:{x:0,y:this.canvasHeight/2-30,width:this.canvasWidth,height:5,brushType:"fill",timeInterval:100}}),s=this.createTextShape(i.textStyle),a=this.createBackgroundShape(i.backgroundColor),h=i.effectOption,l=new r({highlightStyle:o.clone(h)});return l.highlightStyle.color=h.color||n.getLinearGradient(h.x,h.y,h.x+h.width,h.y+h.height,[[0,"#ff6400"],[.5,"#ffe100"],[1,"#b1ff00"]]),null!=i.progress?(t(a),l.highlightStyle.width=this.adjust(i.progress,[0,1])*i.effectOption.width,t(l),t(s),void e()):(l.highlightStyle.width=0,setInterval(function(){t(a),l.highlightStyle.width<h.width?l.highlightStyle.width+=8:l.highlightStyle.width=0,t(l),t(s),e()},h.timeInterval))},e}),i("zrender/loadingEffect/Bubble",["require","./Base","../tool/util","../tool/color","../shape/Circle"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/color"),r=t("../shape/Circle");return o.inherits(e,i),e.prototype._start=function(t,e){for(var i=o.merge(this.options,{textStyle:{color:"#888"},backgroundColor:"rgba(250, 250, 250, 0.8)",effect:{n:50,lineWidth:2,brushType:"stroke",color:"random",timeInterval:100}}),s=this.createTextShape(i.textStyle),a=this.createBackgroundShape(i.backgroundColor),h=i.effect,l=h.n,c=h.brushType,d=h.lineWidth,u=[],p=this.canvasWidth,f=this.canvasHeight,g=0;l>g;g++){var m="random"==h.color?n.alpha(n.random(),.3):h.color;u[g]=new r({highlightStyle:{x:Math.ceil(Math.random()*p),y:Math.ceil(Math.random()*f),r:Math.ceil(40*Math.random()),brushType:c,color:m,strokeColor:m,lineWidth:d},animationY:Math.ceil(20*Math.random())})}return setInterval(function(){t(a);for(var i=0;l>i;i++){var o=u[i].highlightStyle;o.y-u[i].animationY+o.r<=0&&(u[i].highlightStyle.y=f+o.r,u[i].highlightStyle.x=Math.ceil(Math.random()*p)),u[i].highlightStyle.y-=u[i].animationY,t(u[i])}t(s),e()},h.timeInterval)},e}),i("echarts/component/toolbox",["require","./base","zrender/shape/Line","zrender/shape/Image","zrender/shape/Rectangle","../util/shape/Icon","../config","zrender/tool/util","zrender/config","zrender/tool/event","./dataView","../component"],function(t){function e(t,e,o,n,r){i.call(this,t,e,o,n,r),this.dom=r.dom,this._magicType={},this._magicMap={},this._isSilence=!1,this._iconList,this._iconShapeMap={},this._featureTitle={},this._featureIcon={},this._featureColor={},this._featureOption={},this._enableColor="red",this._disableColor="#ccc",this._markShapeList=[];var s=this;s._onMark=function(t){s.__onMark(t)},s._onMarkUndo=function(t){s.__onMarkUndo(t)},s._onMarkClear=function(t){s.__onMarkClear(t)},s._onDataZoom=function(t){s.__onDataZoom(t)},s._onDataZoomReset=function(t){s.__onDataZoomReset(t)},s._onDataView=function(t){s.__onDataView(t)},s._onRestore=function(t){s.__onRestore(t)},s._onSaveAsImage=function(t){s.__onSaveAsImage(t)},s._onMagicType=function(t){s.__onMagicType(t)},s._onCustomHandler=function(t){s.__onCustomHandler(t)},s._onmousemove=function(t){return s.__onmousemove(t)},s._onmousedown=function(t){return s.__onmousedown(t)},s._onmouseup=function(t){return s.__onmouseup(t)},s._onclick=function(t){return s.__onclick(t)}}var i=t("./base"),o=t("zrender/shape/Line"),n=t("zrender/shape/Image"),r=t("zrender/shape/Rectangle"),s=t("../util/shape/Icon"),a=t("../config");a.toolbox={zlevel:0,z:6,show:!1,orient:"horizontal",x:"right",y:"top",color:["#1e90ff","#22bb22","#4b0082","#d2691e"],disableColor:"#ddd",effectiveColor:"red",backgroundColor:"rgba(0,0,0,0)",borderColor:"#ccc",borderWidth:0,padding:5,itemGap:10,itemSize:16,showTitle:!0,feature:{mark:{show:!1,title:{mark:"辅助线开关",markUndo:"删除辅助线",markClear:"清空辅助线"},lineStyle:{width:1,color:"#1e90ff",type:"dashed"}},dataZoom:{show:!1,title:{dataZoom:"区域缩放",dataZoomReset:"区域缩放后退"}},dataView:{show:!1,title:"数据视图",readOnly:!1,lang:["数据视图","关闭","刷新"]},magicType:{show:!1,title:{line:"折线图切换",bar:"柱形图切换",stack:"堆积",tiled:"平铺",force:"力导向布局图切换",chord:"和弦图切换",pie:"饼图切换",funnel:"漏斗图切换"},type:[]},restore:{show:!1,title:"还原"},saveAsImage:{show:!1,title:"保存为图片",type:"png",lang:["点击保存"]}}};var h=t("zrender/tool/util"),l=t("zrender/config"),c=t("zrender/tool/event"),d="stack",u="tiled";return e.prototype={type:a.COMPONENT_TYPE_TOOLBOX,_buildShape:function(){this._iconList=[];var t=this.option.toolbox;this._enableColor=t.effectiveColor,this._disableColor=t.disableColor;var e=t.feature,i=[];for(var o in e)if(e[o].show)switch(o){case"mark":i.push({key:o,name:"mark"}),i.push({key:o,name:"markUndo"}),i.push({key:o,name:"markClear"});break;case"magicType":for(var n=0,r=e[o].type.length;r>n;n++)e[o].title[e[o].type[n]+"Chart"]=e[o].title[e[o].type[n]],e[o].option&&(e[o].option[e[o].type[n]+"Chart"]=e[o].option[e[o].type[n]]),i.push({key:o,name:e[o].type[n]+"Chart"});break;case"dataZoom":i.push({key:o,name:"dataZoom"}),i.push({key:o,name:"dataZoomReset"});break;case"saveAsImage":this.canvasSupported&&i.push({key:o,name:"saveAsImage"});break;default:i.push({key:o,name:o})}if(i.length>0){for(var s,o,n=0,r=i.length;r>n;n++)s=i[n].name,o=i[n].key,this._iconList.push(s),this._featureTitle[s]=e[o].title[s]||e[o].title,e[o].icon&&(this._featureIcon[s]=e[o].icon[s]||e[o].icon),e[o].color&&(this._featureColor[s]=e[o].color[s]||e[o].color),e[o].option&&(this._featureOption[s]=e[o].option[s]||e[o].option);this._itemGroupLocation=this._getItemGroupLocation(),this._buildBackground(),this._buildItem();for(var n=0,r=this.shapeList.length;r>n;n++)this.zr.addShape(this.shapeList[n]);this._iconShapeMap.mark&&(this._iconDisable(this._iconShapeMap.markUndo),this._iconDisable(this._iconShapeMap.markClear)),this._iconShapeMap.dataZoomReset&&0===this._zoomQueue.length&&this._iconDisable(this._iconShapeMap.dataZoomReset)}},_buildItem:function(){var e,i,o,r,a=this.option.toolbox,h=this._iconList.length,l=this._itemGroupLocation.x,c=this._itemGroupLocation.y,d=a.itemSize,u=a.itemGap,p=a.color instanceof Array?a.color:[a.color],f=this.getFont(a.textStyle);"horizontal"===a.orient?(i=this._itemGroupLocation.y/this.zr.getHeight()<.5?"bottom":"top",o=this._itemGroupLocation.x/this.zr.getWidth()<.5?"left":"right",r=this._itemGroupLocation.y/this.zr.getHeight()<.5?"top":"bottom"):i=this._itemGroupLocation.x/this.zr.getWidth()<.5?"right":"left",this._iconShapeMap={};for(var g=this,m=0;h>m;m++){switch(e={type:"icon",zlevel:this.getZlevelBase(),z:this.getZBase(),style:{x:l,y:c,width:d,height:d,iconType:this._iconList[m],lineWidth:1,strokeColor:this._featureColor[this._iconList[m]]||p[m%p.length],brushType:"stroke"},highlightStyle:{lineWidth:1,text:a.showTitle?this._featureTitle[this._iconList[m]]:void 0,textFont:f,textPosition:i,strokeColor:this._featureColor[this._iconList[m]]||p[m%p.length]},hoverable:!0,clickable:!0},this._featureIcon[this._iconList[m]]&&(e.style.image=this._featureIcon[this._iconList[m]].replace(new RegExp("^image:\\/\\/"),""),e.style.opacity=.8,e.highlightStyle.opacity=1,e.type="image"),"horizontal"===a.orient&&(0===m&&"left"===o&&(e.highlightStyle.textPosition="specific",e.highlightStyle.textAlign=o,e.highlightStyle.textBaseline=r,e.highlightStyle.textX=l,e.highlightStyle.textY="top"===r?c+d+10:c-10),m===h-1&&"right"===o&&(e.highlightStyle.textPosition="specific",e.highlightStyle.textAlign=o,e.highlightStyle.textBaseline=r,e.highlightStyle.textX=l+d,e.highlightStyle.textY="top"===r?c+d+10:c-10)),this._iconList[m]){case"mark":e.onclick=g._onMark;break;case"markUndo":e.onclick=g._onMarkUndo;break;case"markClear":e.onclick=g._onMarkClear;break;case"dataZoom":e.onclick=g._onDataZoom;break;case"dataZoomReset":e.onclick=g._onDataZoomReset;break;case"dataView":if(!this._dataView){var _=t("./dataView");this._dataView=new _(this.ecTheme,this.messageCenter,this.zr,this.option,this.myChart)}e.onclick=g._onDataView;break;case"restore":e.onclick=g._onRestore;break;case"saveAsImage":e.onclick=g._onSaveAsImage;break;default:this._iconList[m].match("Chart")?(e._name=this._iconList[m].replace("Chart",""),e.onclick=g._onMagicType):e.onclick=g._onCustomHandler}"icon"===e.type?e=new s(e):"image"===e.type&&(e=new n(e)),this.shapeList.push(e),this._iconShapeMap[this._iconList[m]]=e,"horizontal"===a.orient?l+=d+u:c+=d+u}},_buildBackground:function(){var t=this.option.toolbox,e=this.reformCssArray(this.option.toolbox.padding);this.shapeList.push(new r({zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this._itemGroupLocation.x-e[3],y:this._itemGroupLocation.y-e[0],width:this._itemGroupLocation.width+e[3]+e[1],height:this._itemGroupLocation.height+e[0]+e[2],brushType:0===t.borderWidth?"fill":"both",color:t.backgroundColor,strokeColor:t.borderColor,lineWidth:t.borderWidth}}))},_getItemGroupLocation:function(){var t=this.option.toolbox,e=this.reformCssArray(this.option.toolbox.padding),i=this._iconList.length,o=t.itemGap,n=t.itemSize,r=0,s=0;"horizontal"===t.orient?(r=(n+o)*i-o,s=n):(s=(n+o)*i-o,r=n);var a,h=this.zr.getWidth();switch(t.x){case"center":a=Math.floor((h-r)/2);break;case"left":a=e[3]+t.borderWidth;break;case"right":a=h-r-e[1]-t.borderWidth;break;default:a=t.x-0,a=isNaN(a)?0:a}var l,c=this.zr.getHeight();switch(t.y){case"top":l=e[0]+t.borderWidth;break;case"bottom":l=c-s-e[2]-t.borderWidth;break;case"center":l=Math.floor((c-s)/2);break;default:l=t.y-0,l=isNaN(l)?0:l}return{x:a,y:l,width:r,height:s}},__onmousemove:function(t){this._marking&&(this._markShape.style.xEnd=c.getX(t.event),this._markShape.style.yEnd=c.getY(t.event),this.zr.addHoverShape(this._markShape)),this._zooming&&(this._zoomShape.style.width=c.getX(t.event)-this._zoomShape.style.x,this._zoomShape.style.height=c.getY(t.event)-this._zoomShape.style.y,this.zr.addHoverShape(this._zoomShape),this.dom.style.cursor="crosshair",c.stop(t.event)),this._zoomStart&&"pointer"!=this.dom.style.cursor&&"move"!=this.dom.style.cursor&&(this.dom.style.cursor="crosshair")},__onmousedown:function(t){if(!t.target){this._zooming=!0;var e=c.getX(t.event),i=c.getY(t.event),o=this.option.dataZoom||{};return this._zoomShape=new r({zlevel:this.getZlevelBase(),z:this.getZBase(),style:{x:e,y:i,width:1,height:1,brushType:"both"},highlightStyle:{lineWidth:2,color:o.fillerColor||a.dataZoom.fillerColor,strokeColor:o.handleColor||a.dataZoom.handleColor,brushType:"both"}}),this.zr.addHoverShape(this._zoomShape),!0}},__onmouseup:function(){if(!this._zoomShape||Math.abs(this._zoomShape.style.width)<10||Math.abs(this._zoomShape.style.height)<10)return this._zooming=!1,!0;if(this._zooming&&this.component.dataZoom){this._zooming=!1;var t=this.component.dataZoom.rectZoom(this._zoomShape.style);t&&(this._zoomQueue.push({start:t.start,end:t.end,start2:t.start2,end2:t.end2}),this._iconEnable(this._iconShapeMap.dataZoomReset),this.zr.refreshNextFrame())}return!0},__onclick:function(t){if(!t.target)if(this._marking)this._marking=!1,this._markShapeList.push(this._markShape),this._iconEnable(this._iconShapeMap.markUndo),this._iconEnable(this._iconShapeMap.markClear),this.zr.addShape(this._markShape),this.zr.refreshNextFrame();else if(this._markStart){this._marking=!0;var e=c.getX(t.event),i=c.getY(t.event);this._markShape=new o({zlevel:this.getZlevelBase(),z:this.getZBase(),style:{xStart:e,yStart:i,xEnd:e,yEnd:i,lineWidth:this.query(this.option,"toolbox.feature.mark.lineStyle.width"),strokeColor:this.query(this.option,"toolbox.feature.mark.lineStyle.color"),lineType:this.query(this.option,"toolbox.feature.mark.lineStyle.type")}}),this.zr.addHoverShape(this._markShape)}},__onMark:function(t){var e=t.target;if(this._marking||this._markStart)this._resetMark(),this.zr.refreshNextFrame();else{this._resetZoom(),this.zr.modShape(e.id,{style:{strokeColor:this._enableColor}}),this.zr.refreshNextFrame(),this._markStart=!0;var i=this;setTimeout(function(){i.zr&&i.zr.on(l.EVENT.CLICK,i._onclick)&&i.zr.on(l.EVENT.MOUSEMOVE,i._onmousemove)},10)}return!0},__onMarkUndo:function(){if(this._marking)this._marking=!1;else{var t=this._markShapeList.length;if(t>=1){var e=this._markShapeList[t-1];this.zr.delShape(e.id),this.zr.refreshNextFrame(),this._markShapeList.pop(),1===t&&(this._iconDisable(this._iconShapeMap.markUndo),this._iconDisable(this._iconShapeMap.markClear))}}return!0},__onMarkClear:function(){this._marking&&(this._marking=!1);var t=this._markShapeList.length;if(t>0){for(;t--;)this.zr.delShape(this._markShapeList.pop().id);this._iconDisable(this._iconShapeMap.markUndo),this._iconDisable(this._iconShapeMap.markClear),this.zr.refreshNextFrame()}return!0},__onDataZoom:function(t){var e=t.target;if(this._zooming||this._zoomStart)this._resetZoom(),this.zr.refreshNextFrame(),this.dom.style.cursor="default";else{this._resetMark(),this.zr.modShape(e.id,{style:{strokeColor:this._enableColor}}),this.zr.refreshNextFrame(),this._zoomStart=!0;var i=this;setTimeout(function(){i.zr&&i.zr.on(l.EVENT.MOUSEDOWN,i._onmousedown)&&i.zr.on(l.EVENT.MOUSEUP,i._onmouseup)&&i.zr.on(l.EVENT.MOUSEMOVE,i._onmousemove)},10),this.dom.style.cursor="crosshair"}return!0},__onDataZoomReset:function(){return this._zooming&&(this._zooming=!1),this._zoomQueue.pop(),this._zoomQueue.length>0?this.component.dataZoom.absoluteZoom(this._zoomQueue[this._zoomQueue.length-1]):(this.component.dataZoom.rectZoom(),this._iconDisable(this._iconShapeMap.dataZoomReset),this.zr.refreshNextFrame()),!0},_resetMark:function(){this._marking=!1,this._markStart&&(this._markStart=!1,this._iconShapeMap.mark&&this.zr.modShape(this._iconShapeMap.mark.id,{style:{strokeColor:this._iconShapeMap.mark.highlightStyle.strokeColor}}),this.zr.un(l.EVENT.CLICK,this._onclick),this.zr.un(l.EVENT.MOUSEMOVE,this._onmousemove))},_resetZoom:function(){this._zooming=!1,this._zoomStart&&(this._zoomStart=!1,this._iconShapeMap.dataZoom&&this.zr.modShape(this._iconShapeMap.dataZoom.id,{style:{strokeColor:this._iconShapeMap.dataZoom.highlightStyle.strokeColor}}),this.zr.un(l.EVENT.MOUSEDOWN,this._onmousedown),this.zr.un(l.EVENT.MOUSEUP,this._onmouseup),this.zr.un(l.EVENT.MOUSEMOVE,this._onmousemove))},_iconDisable:function(t){"image"!=t.type?this.zr.modShape(t.id,{hoverable:!1,clickable:!1,style:{strokeColor:this._disableColor}}):this.zr.modShape(t.id,{hoverable:!1,clickable:!1,style:{opacity:.3}})},_iconEnable:function(t){"image"!=t.type?this.zr.modShape(t.id,{hoverable:!0,clickable:!0,style:{strokeColor:t.highlightStyle.strokeColor}}):this.zr.modShape(t.id,{hoverable:!0,clickable:!0,style:{opacity:.8}})},__onDataView:function(){return this._dataView.show(this.option),!0},__onRestore:function(){return this._resetMark(),this._resetZoom(),this.messageCenter.dispatch(a.EVENT.RESTORE,null,null,this.myChart),!0},__onSaveAsImage:function(){var t=this.option.toolbox.feature.saveAsImage,e=t.type||"png";"png"!=e&&"jpeg"!=e&&(e="png");var i;i=this.myChart.isConnected()?this.myChart.getConnectedDataURL(e):this.zr.toDataURL("image/"+e,this.option.backgroundColor&&"rgba(0,0,0,0)"===this.option.backgroundColor.replace(" ","")?"#fff":this.option.backgroundColor);var o=document.createElement("div");o.id="__echarts_download_wrap__",o.style.cssText="position:fixed;z-index:99999;display:block;top:0;left:0;background-color:rgba(33,33,33,0.5);text-align:center;width:100%;height:100%;line-height:"+document.documentElement.clientHeight+"px;";var n=document.createElement("a");n.href=i,n.setAttribute("download",(t.name?t.name:this.option.title&&(this.option.title.text||this.option.title.subtext)?this.option.title.text||this.option.title.subtext:"ECharts")+"."+e),n.innerHTML='<img style="vertical-align:middle" src="'+i+'" title="'+(window.ActiveXObject||"ActiveXObject"in window?"右键->图片另存为":t.lang?t.lang[0]:"点击保存")+'"/>',o.appendChild(n),document.body.appendChild(o),n=null,o=null,setTimeout(function(){var t=document.getElementById("__echarts_download_wrap__");t&&(t.onclick=function(){var t=document.getElementById("__echarts_download_wrap__");t.onclick=null,t.innerHTML="",document.body.removeChild(t),t=null},t=null)},500)},__onMagicType:function(t){this._resetMark();var e=t.target._name;return this._magicType[e]||(this._magicType[e]=!0,e===a.CHART_TYPE_LINE?this._magicType[a.CHART_TYPE_BAR]=!1:e===a.CHART_TYPE_BAR&&(this._magicType[a.CHART_TYPE_LINE]=!1),e===a.CHART_TYPE_PIE?this._magicType[a.CHART_TYPE_FUNNEL]=!1:e===a.CHART_TYPE_FUNNEL&&(this._magicType[a.CHART_TYPE_PIE]=!1),e===a.CHART_TYPE_FORCE?this._magicType[a.CHART_TYPE_CHORD]=!1:e===a.CHART_TYPE_CHORD&&(this._magicType[a.CHART_TYPE_FORCE]=!1),e===d?this._magicType[u]=!1:e===u&&(this._magicType[d]=!1),this.messageCenter.dispatch(a.EVENT.MAGIC_TYPE_CHANGED,t.event,{magicType:this._magicType},this.myChart)),!0},setMagicType:function(t){this._resetMark(),this._magicType=t,!this._isSilence&&this.messageCenter.dispatch(a.EVENT.MAGIC_TYPE_CHANGED,null,{magicType:this._magicType},this.myChart)},__onCustomHandler:function(t){var e=t.target.style.iconType,i=this.option.toolbox.feature[e].onclick;"function"==typeof i&&i.call(this,this.option)},reset:function(t,e){if(e&&this.clear(),this.query(t,"toolbox.show")&&this.query(t,"toolbox.feature.magicType.show")){var i=t.toolbox.feature.magicType.type,o=i.length;for(this._magicMap={};o--;)this._magicMap[i[o]]=!0;o=t.series.length;for(var n,r;o--;)n=t.series[o].type,this._magicMap[n]&&(r=t.xAxis instanceof Array?t.xAxis[t.series[o].xAxisIndex||0]:t.xAxis,r&&"category"===(r.type||"category")&&(r.__boundaryGap=null!=r.boundaryGap?r.boundaryGap:!0),r=t.yAxis instanceof Array?t.yAxis[t.series[o].yAxisIndex||0]:t.yAxis,r&&"category"===r.type&&(r.__boundaryGap=null!=r.boundaryGap?r.boundaryGap:!0),t.series[o].__type=n,t.series[o].__itemStyle=h.clone(t.series[o].itemStyle||{})),(this._magicMap[d]||this._magicMap[u])&&(t.series[o].__stack=t.series[o].stack)}this._magicType=e?{}:this._magicType||{};for(var s in this._magicType)if(this._magicType[s]){this.option=t,this.getMagicOption();break}var a=t.dataZoom;if(a&&a.show){var l=null!=a.start&&a.start>=0&&a.start<=100?a.start:0,c=null!=a.end&&a.end>=0&&a.end<=100?a.end:100;l>c&&(l+=c,c=l-c,l-=c),this._zoomQueue=[{start:l,end:c,start2:0,end2:100}]}else this._zoomQueue=[]},getMagicOption:function(){var t,e;if(this._magicType[a.CHART_TYPE_LINE]||this._magicType[a.CHART_TYPE_BAR]){for(var i=this._magicType[a.CHART_TYPE_LINE]?!1:!0,o=0,n=this.option.series.length;n>o;o++)e=this.option.series[o].type,(e==a.CHART_TYPE_LINE||e==a.CHART_TYPE_BAR)&&(t=this.option.xAxis instanceof Array?this.option.xAxis[this.option.series[o].xAxisIndex||0]:this.option.xAxis,t&&"category"===(t.type||"category")&&(t.boundaryGap=i?!0:t.__boundaryGap),t=this.option.yAxis instanceof Array?this.option.yAxis[this.option.series[o].yAxisIndex||0]:this.option.yAxis,t&&"category"===t.type&&(t.boundaryGap=i?!0:t.__boundaryGap));
this._defaultMagic(a.CHART_TYPE_LINE,a.CHART_TYPE_BAR)}if(this._defaultMagic(a.CHART_TYPE_CHORD,a.CHART_TYPE_FORCE),this._defaultMagic(a.CHART_TYPE_PIE,a.CHART_TYPE_FUNNEL),this._magicType[d]||this._magicType[u])for(var o=0,n=this.option.series.length;n>o;o++)this._magicType[d]?(this.option.series[o].stack="_ECHARTS_STACK_KENER_2014_",e=d):this._magicType[u]&&(this.option.series[o].stack=null,e=u),this._featureOption[e+"Chart"]&&h.merge(this.option.series[o],this._featureOption[e+"Chart"]||{},!0);return this.option},_defaultMagic:function(t,e){if(this._magicType[t]||this._magicType[e])for(var i=0,o=this.option.series.length;o>i;i++){var n=this.option.series[i].type;(n==t||n==e)&&(this.option.series[i].type=this._magicType[t]?t:e,this.option.series[i].itemStyle=h.clone(this.option.series[i].__itemStyle),n=this.option.series[i].type,this._featureOption[n+"Chart"]&&h.merge(this.option.series[i],this._featureOption[n+"Chart"]||{},!0))}},silence:function(t){this._isSilence=t},resize:function(){this._resetMark(),this.clear(),this.option&&this.option.toolbox&&this.option.toolbox.show&&this._buildShape(),this._dataView&&this._dataView.resize()},hideDataView:function(){this._dataView&&this._dataView.hide()},clear:function(t){this.zr&&(this.zr.delShape(this.shapeList),this.shapeList=[],t||(this.zr.delShape(this._markShapeList),this._markShapeList=[]))},onbeforDispose:function(){this._dataView&&(this._dataView.dispose(),this._dataView=null),this._markShapeList=null},refresh:function(t){t&&(this._resetMark(),this._resetZoom(),t.toolbox=this.reformOption(t.toolbox),this.option=t,this.clear(!0),t.toolbox.show&&this._buildShape(),this.hideDataView())}},h.inherits(e,i),t("../component").define("toolbox",e),e}),i("zrender/loadingEffect/DynamicLine",["require","./Base","../tool/util","../tool/color","../shape/Line"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/color"),r=t("../shape/Line");return o.inherits(e,i),e.prototype._start=function(t,e){for(var i=o.merge(this.options,{textStyle:{color:"#fff"},backgroundColor:"rgba(0, 0, 0, 0.8)",effectOption:{n:30,lineWidth:1,color:"random",timeInterval:100}}),s=this.createTextShape(i.textStyle),a=this.createBackgroundShape(i.backgroundColor),h=i.effectOption,l=h.n,c=h.lineWidth,d=[],u=this.canvasWidth,p=this.canvasHeight,f=0;l>f;f++){var g=-Math.ceil(1e3*Math.random()),m=Math.ceil(400*Math.random()),_=Math.ceil(Math.random()*p),y="random"==h.color?n.random():h.color;d[f]=new r({highlightStyle:{xStart:g,yStart:_,xEnd:g+m,yEnd:_,strokeColor:y,lineWidth:c},animationX:Math.ceil(100*Math.random()),len:m})}return setInterval(function(){t(a);for(var i=0;l>i;i++){var o=d[i].highlightStyle;o.xStart>=u&&(d[i].len=Math.ceil(400*Math.random()),o.xStart=-400,o.xEnd=-400+d[i].len,o.yStart=Math.ceil(Math.random()*p),o.yEnd=o.yStart),o.xStart+=d[i].animationX,o.xEnd+=d[i].animationX,t(d[i])}t(s),e()},h.timeInterval)},e}),i("zrender/shape/Image",["require","./Base","../tool/util"],function(t){var e=t("./Base"),i=function(t){e.call(this,t)};return i.prototype={type:"image",brush:function(t,e,i){var o=this.style||{};e&&(o=this.getHighlightStyle(o,this.highlightStyle||{}));var n=o.image,r=this;if(this._imageCache||(this._imageCache={}),"string"==typeof n){var s=n;this._imageCache[s]?n=this._imageCache[s]:(n=new Image,n.onload=function(){n.onload=null,r.modSelf(),i()},n.src=s,this._imageCache[s]=n)}if(n){if("IMG"==n.nodeName.toUpperCase())if(window.ActiveXObject){if("complete"!=n.readyState)return}else if(!n.complete)return;var a=o.width||n.width,h=o.height||n.height,l=o.x,c=o.y;if(!n.width||!n.height)return;if(t.save(),this.doClip(t),this.setContext(t,o),this.setTransform(t),o.sWidth&&o.sHeight){var d=o.sx||0,u=o.sy||0;t.drawImage(n,d,u,o.sWidth,o.sHeight,l,c,a,h)}else if(o.sx&&o.sy){var d=o.sx,u=o.sy,p=a-d,f=h-u;t.drawImage(n,d,u,p,f,l,c,a,h)}else t.drawImage(n,l,c,a,h);o.width||(o.width=a),o.height||(o.height=h),this.style.width||(this.style.width=a),this.style.height||(this.style.height=h),this.drawText(t,o,this.style),t.restore()}},getRect:function(t){return{x:t.x,y:t.y,width:t.width,height:t.height}},clearCache:function(){this._imageCache={}}},t("../tool/util").inherits(i,e),i}),i("zrender/loadingEffect/Ring",["require","./Base","../tool/util","../tool/color","../shape/Ring","../shape/Sector"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/color"),r=t("../shape/Ring"),s=t("../shape/Sector");return o.inherits(e,i),e.prototype._start=function(t,e){var i=o.merge(this.options,{textStyle:{color:"#07a"},backgroundColor:"rgba(250, 250, 250, 0.8)",effect:{x:this.canvasWidth/2,y:this.canvasHeight/2,r0:60,r:100,color:"#bbdcff",brushType:"fill",textPosition:"inside",textFont:"normal 30px verdana",textColor:"rgba(30, 144, 255, 0.6)",timeInterval:100}}),a=i.effect,h=i.textStyle;null==h.x&&(h.x=a.x),null==h.y&&(h.y=a.y+(a.r0+a.r)/2-5);for(var l=this.createTextShape(i.textStyle),c=this.createBackgroundShape(i.backgroundColor),d=a.x,u=a.y,p=a.r0+6,f=a.r-6,g=a.color,m=n.lift(g,.1),_=new r({highlightStyle:o.clone(a)}),y=[],v=n.getGradientColors(["#ff6400","#ffe100","#97ff00"],25),x=15,b=240,T=0;16>T;T++)y.push(new s({highlightStyle:{x:d,y:u,r0:p,r:f,startAngle:b-x,endAngle:b,brushType:"fill",color:m},_color:n.getLinearGradient(d+p*Math.cos(b,!0),u-p*Math.sin(b,!0),d+p*Math.cos(b-x,!0),u-p*Math.sin(b-x,!0),[[0,v[2*T]],[1,v[2*T+1]]])})),b-=x;b=360;for(var T=0;4>T;T++)y.push(new s({highlightStyle:{x:d,y:u,r0:p,r:f,startAngle:b-x,endAngle:b,brushType:"fill",color:m},_color:n.getLinearGradient(d+p*Math.cos(b,!0),u-p*Math.sin(b,!0),d+p*Math.cos(b-x,!0),u-p*Math.sin(b-x,!0),[[0,v[2*T+32]],[1,v[2*T+33]]])})),b-=x;var S=0;if(null!=i.progress){t(c),S=100*this.adjust(i.progress,[0,1]).toFixed(2)/5,_.highlightStyle.text=5*S+"%",t(_);for(var T=0;20>T;T++)y[T].highlightStyle.color=S>T?y[T]._color:m,t(y[T]);return t(l),void e()}return setInterval(function(){t(c),S+=S>=20?-20:1,t(_);for(var i=0;20>i;i++)y[i].highlightStyle.color=S>i?y[i]._color:m,t(y[i]);t(l),e()},a.timeInterval)},e}),i("zrender/loadingEffect/Whirling",["require","./Base","../tool/util","../tool/area","../shape/Ring","../shape/Droplet","../shape/Circle"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/area"),r=t("../shape/Ring"),s=t("../shape/Droplet"),a=t("../shape/Circle");return o.inherits(e,i),e.prototype._start=function(t,e){var i=o.merge(this.options,{textStyle:{color:"#888",textAlign:"start"},backgroundColor:"rgba(250, 250, 250, 0.8)"}),h=this.createTextShape(i.textStyle),l=10,c=n.getTextWidth(h.highlightStyle.text,h.highlightStyle.textFont),d=n.getTextHeight(h.highlightStyle.text,h.highlightStyle.textFont),u=o.merge(this.options.effect||{},{r:18,colorIn:"#fff",colorOut:"#555",colorWhirl:"#6cf",timeInterval:50}),p=this.getLocation(this.options.textStyle,c+l+2*u.r,Math.max(2*u.r,d));u.x=p.x+u.r,u.y=h.highlightStyle.y=p.y+p.height/2,h.highlightStyle.x=u.x+u.r+l;var f=this.createBackgroundShape(i.backgroundColor),g=new s({highlightStyle:{a:Math.round(u.r/2),b:Math.round(u.r-u.r/6),brushType:"fill",color:u.colorWhirl}}),m=new a({highlightStyle:{r:Math.round(u.r/6),brushType:"fill",color:u.colorIn}}),_=new r({highlightStyle:{r0:Math.round(u.r-u.r/3),r:u.r,brushType:"fill",color:u.colorOut}}),y=[0,u.x,u.y];return g.highlightStyle.x=m.highlightStyle.x=_.highlightStyle.x=y[1],g.highlightStyle.y=m.highlightStyle.y=_.highlightStyle.y=y[2],setInterval(function(){t(f),t(_),y[0]-=.3,g.rotation=y,t(g),t(m),t(h),e()},u.timeInterval)},e}),i("zrender/loadingEffect/Spin",["require","./Base","../tool/util","../tool/color","../tool/area","../shape/Sector"],function(t){function e(t){i.call(this,t)}var i=t("./Base"),o=t("../tool/util"),n=t("../tool/color"),r=t("../tool/area"),s=t("../shape/Sector");return o.inherits(e,i),e.prototype._start=function(t,e){var i=o.merge(this.options,{textStyle:{color:"#fff",textAlign:"start"},backgroundColor:"rgba(0, 0, 0, 0.8)"}),a=this.createTextShape(i.textStyle),h=10,l=r.getTextWidth(a.highlightStyle.text,a.highlightStyle.textFont),c=r.getTextHeight(a.highlightStyle.text,a.highlightStyle.textFont),d=o.merge(this.options.effect||{},{r0:9,r:15,n:18,color:"#fff",timeInterval:100}),u=this.getLocation(this.options.textStyle,l+h+2*d.r,Math.max(2*d.r,c));d.x=u.x+d.r,d.y=a.highlightStyle.y=u.y+u.height/2,a.highlightStyle.x=d.x+d.r+h;for(var p=this.createBackgroundShape(i.backgroundColor),f=d.n,g=d.x,m=d.y,_=d.r0,y=d.r,v=d.color,x=[],b=Math.round(180/f),T=0;f>T;T++)x[T]=new s({highlightStyle:{x:g,y:m,r0:_,r:y,startAngle:b*T*2,endAngle:b*T*2+b,color:n.alpha(v,(T+1)/f),brushType:"fill"}});var S=[0,g,m];return setInterval(function(){t(p),S[0]-=.3;for(var i=0;f>i;i++)x[i].rotation=S,t(x[i]);t(a),e()},d.timeInterval)},e}),i("echarts/theme/macarons",[],function(){var t={color:["#2ec7c9","#b6a2de","#5ab1ef","#ffb980","#d87a80","#8d98b3","#e5cf0d","#97b552","#95706d","#dc69aa","#07a2a4","#9a7fd1","#588dd5","#f5994e","#c05050","#59678c","#c9ab00","#7eb00a","#6f5553","#c14089"],title:{textStyle:{fontWeight:"normal",color:"#008acd"}},dataRange:{itemWidth:15,color:["#5ab1ef","#e0ffff"]},toolbox:{color:["#1e90ff","#1e90ff","#1e90ff","#1e90ff"],effectiveColor:"#ff4500"},tooltip:{backgroundColor:"rgba(50,50,50,0.5)",axisPointer:{type:"line",lineStyle:{color:"#008acd"},crossStyle:{color:"#008acd"},shadowStyle:{color:"rgba(200,200,200,0.2)"}}},dataZoom:{dataBackgroundColor:"#efefff",fillerColor:"rgba(182,162,222,0.2)",handleColor:"#008acd"},grid:{borderColor:"#eee"},categoryAxis:{axisLine:{lineStyle:{color:"#008acd"}},splitLine:{lineStyle:{color:["#eee"]}}},valueAxis:{axisLine:{lineStyle:{color:"#008acd"}},splitArea:{show:!0,areaStyle:{color:["rgba(250,250,250,0.1)","rgba(200,200,200,0.1)"]}},splitLine:{lineStyle:{color:["#eee"]}}},polar:{axisLine:{lineStyle:{color:"#ddd"}},splitArea:{show:!0,areaStyle:{color:["rgba(250,250,250,0.2)","rgba(200,200,200,0.2)"]}},splitLine:{lineStyle:{color:"#ddd"}}},timeline:{lineStyle:{color:"#008acd"},controlStyle:{normal:{color:"#008acd"},emphasis:{color:"#008acd"}},symbol:"emptyCircle",symbolSize:3},bar:{itemStyle:{normal:{barBorderRadius:5},emphasis:{barBorderRadius:5}}},line:{smooth:!0,symbol:"emptyCircle",symbolSize:3},k:{itemStyle:{normal:{color:"#d87a80",color0:"#2ec7c9",lineStyle:{color:"#d87a80",color0:"#2ec7c9"}}}},scatter:{symbol:"circle",symbolSize:4},radar:{symbol:"emptyCircle",symbolSize:3},map:{itemStyle:{normal:{areaStyle:{color:"#ddd"},label:{textStyle:{color:"#d87a80"}}},emphasis:{areaStyle:{color:"#fe994e"}}}},force:{itemStyle:{normal:{linkStyle:{color:"#1e90ff"}}}},chord:{itemStyle:{normal:{borderWidth:1,borderColor:"rgba(128, 128, 128, 0.5)",chordStyle:{lineStyle:{color:"rgba(128, 128, 128, 0.5)"}}},emphasis:{borderWidth:1,borderColor:"rgba(128, 128, 128, 0.5)",chordStyle:{lineStyle:{color:"rgba(128, 128, 128, 0.5)"}}}}},gauge:{axisLine:{lineStyle:{color:[[.2,"#2ec7c9"],[.8,"#5ab1ef"],[1,"#d87a80"]],width:10}},axisTick:{splitNumber:10,length:15,lineStyle:{color:"auto"}},splitLine:{length:22,lineStyle:{color:"auto"}},pointer:{width:5}},textStyle:{fontFamily:"微软雅黑, Arial, Verdana, sans-serif"}};return t}),i("echarts/util/shape/MarkLine",["require","zrender/shape/Base","./Icon","zrender/shape/Line","zrender/shape/BezierCurve","zrender/tool/area","zrender/shape/util/dashedLineTo","zrender/tool/util","zrender/tool/curve"],function(t){function e(t){i.call(this,t),this.style.curveness>0&&this.updatePoints(this.style),this.highlightStyle.curveness>0&&this.updatePoints(this.highlightStyle)}var i=t("zrender/shape/Base"),o=t("./Icon"),n=t("zrender/shape/Line"),r=new n({}),s=t("zrender/shape/BezierCurve"),a=new s({}),h=t("zrender/tool/area"),l=t("zrender/shape/util/dashedLineTo"),c=t("zrender/tool/util"),d=t("zrender/tool/curve");return e.prototype={type:"mark-line",brush:function(t,e){var i=this.style;e&&(i=this.getHighlightStyle(i,this.highlightStyle||{})),t.save(),this.setContext(t,i),this.setTransform(t),t.save(),t.beginPath(),this.buildPath(t,i),t.stroke(),t.restore(),this.brushSymbol(t,i,0),this.brushSymbol(t,i,1),this.drawText(t,i,this.style),t.restore()},buildPath:function(t,e){var i=e.lineType||"solid";if(t.moveTo(e.xStart,e.yStart),e.curveness>0){var o=null;switch(i){case"dashed":o=[5,5];break;case"dotted":o=[1,1]}o&&t.setLineDash&&t.setLineDash(o),t.quadraticCurveTo(e.cpX1,e.cpY1,e.xEnd,e.yEnd)}else if("solid"==i)t.lineTo(e.xEnd,e.yEnd);else{var n=(e.lineWidth||1)*("dashed"==e.lineType?5:1);l(t,e.xStart,e.yStart,e.xEnd,e.yEnd,n)}},updatePoints:function(t){var e=t.curveness||0,i=1,o=t.xStart,n=t.yStart,r=t.xEnd,s=t.yEnd,a=(o+r)/2-i*(n-s)*e,h=(n+s)/2-i*(r-o)*e;t.cpX1=a,t.cpY1=h},brushSymbol:function(t,e,i){if("none"!=e.symbol[i]){t.save(),t.beginPath(),t.lineWidth=e.symbolBorder,t.strokeStyle=e.symbolBorderColor;var n=e.symbol[i].replace("empty","").toLowerCase();e.symbol[i].match("empty")&&(t.fillStyle="#fff");var r=e.xStart,s=e.yStart,a=e.xEnd,h=e.yEnd,l=0===i?r:a,c=0===i?s:h,u=e.curveness||0,p=null!=e.symbolRotate[i]?e.symbolRotate[i]-0:0;if(p=p/180*Math.PI,"arrow"==n&&0===p)if(0===u){var f=0===i?-1:1;p=Math.PI/2+Math.atan2(f*(h-s),f*(a-r))}else{var g=e.cpX1,m=e.cpY1,_=d.quadraticDerivativeAt,y=_(r,g,a,i),v=_(s,m,h,i);p=Math.PI/2+Math.atan2(v,y)}t.translate(l,c),0!==p&&t.rotate(p);var x=e.symbolSize[i];o.prototype.buildPath(t,{x:-x,y:-x,width:2*x,height:2*x,iconType:n}),t.closePath(),t.fill(),t.stroke(),t.restore()}},getRect:function(t){return t.curveness>0?a.getRect(t):r.getRect(t),t.__rect},isCover:function(t,e){var i=this.transformCoordToLocal(t,e);return t=i[0],e=i[1],this.isCoverRect(t,e)?this.style.curveness>0?h.isInside(a,this.style,t,e):h.isInside(r,this.style,t,e):!1}},c.inherits(e,i),e}),i("echarts/theme/infographic",[],function(){var t={color:["#C1232B","#B5C334","#FCCE10","#E87C25","#27727B","#FE8463","#9BCA63","#FAD860","#F3A43B","#60C0DD","#D7504B","#C6E579","#F4E001","#F0805A","#26C0C0"],title:{textStyle:{fontWeight:"normal",color:"#27727B"}},dataRange:{x:"right",y:"center",itemWidth:5,itemHeight:25,color:["#C1232B","#FCCE10"]},toolbox:{color:["#C1232B","#B5C334","#FCCE10","#E87C25","#27727B","#FE8463","#9BCA63","#FAD860","#F3A43B","#60C0DD"],effectiveColor:"#ff4500"},tooltip:{backgroundColor:"rgba(50,50,50,0.5)",axisPointer:{type:"line",lineStyle:{color:"#27727B",type:"dashed"},crossStyle:{color:"#27727B"},shadowStyle:{color:"rgba(200,200,200,0.3)"}}},dataZoom:{dataBackgroundColor:"rgba(181,195,52,0.3)",fillerColor:"rgba(181,195,52,0.2)",handleColor:"#27727B"},grid:{borderWidth:0},categoryAxis:{axisLine:{lineStyle:{color:"#27727B"}},splitLine:{show:!1}},valueAxis:{axisLine:{show:!1},splitArea:{show:!1},splitLine:{lineStyle:{color:["#ccc"],type:"dashed"}}},polar:{axisLine:{lineStyle:{color:"#ddd"}},splitArea:{show:!0,areaStyle:{color:["rgba(250,250,250,0.2)","rgba(200,200,200,0.2)"]}},splitLine:{lineStyle:{color:"#ddd"}}},timeline:{lineStyle:{color:"#27727B"},controlStyle:{normal:{color:"#27727B"},emphasis:{color:"#27727B"}},symbol:"emptyCircle",symbolSize:3},line:{itemStyle:{normal:{borderWidth:2,borderColor:"#fff",lineStyle:{width:3}},emphasis:{borderWidth:0}},symbol:"circle",symbolSize:3.5},k:{itemStyle:{normal:{color:"#C1232B",color0:"#B5C334",lineStyle:{width:1,color:"#C1232B",color0:"#B5C334"}}}},scatter:{itemStyle:{normal:{borderWidth:1,borderColor:"rgba(200,200,200,0.5)"},emphasis:{borderWidth:0}},symbol:"star4",symbolSize:4},radar:{symbol:"emptyCircle",symbolSize:3},map:{itemStyle:{normal:{areaStyle:{color:"#ddd"},label:{textStyle:{color:"#C1232B"}}},emphasis:{areaStyle:{color:"#fe994e"},label:{textStyle:{color:"rgb(100,0,0)"}}}}},force:{itemStyle:{normal:{linkStyle:{color:"#27727B"}}}},chord:{itemStyle:{normal:{borderWidth:1,borderColor:"rgba(128, 128, 128, 0.5)",chordStyle:{lineStyle:{color:"rgba(128, 128, 128, 0.5)"}}},emphasis:{borderWidth:1,borderColor:"rgba(128, 128, 128, 0.5)",chordStyle:{lineStyle:{color:"rgba(128, 128, 128, 0.5)"}}}}},gauge:{center:["50%","80%"],radius:"100%",startAngle:180,endAngle:0,axisLine:{show:!0,lineStyle:{color:[[.2,"#B5C334"],[.8,"#27727B"],[1,"#C1232B"]],width:"40%"}},axisTick:{splitNumber:2,length:5,lineStyle:{color:"#fff"}},axisLabel:{textStyle:{color:"#fff",fontWeight:"bolder"}},splitLine:{length:"5%",lineStyle:{color:"#fff"}},pointer:{width:"40%",length:"80%",color:"#fff"},title:{offsetCenter:[0,-20],textStyle:{color:"auto",fontSize:20}},detail:{offsetCenter:[0,0],textStyle:{color:"auto",fontSize:40}}},textStyle:{fontFamily:"微软雅黑, Arial, Verdana, sans-serif"}};return t}),i("echarts/util/shape/Symbol",["require","zrender/shape/Base","zrender/shape/Polygon","zrender/tool/util","./normalIsCover"],function(t){function e(t){i.call(this,t)}var i=t("zrender/shape/Base"),o=t("zrender/shape/Polygon"),n=new o({}),r=t("zrender/tool/util");return e.prototype={type:"symbol",buildPath:function(t,e){var i=e.pointList,o=i.length;if(0!==o)for(var n,r,s,a,h,l=1e4,c=Math.ceil(o/l),d=i[0]instanceof Array,u=e.size?e.size:2,p=u,f=u/2,g=2*Math.PI,m=0;c>m;m++){t.beginPath(),n=m*l,r=n+l,r=r>o?o:r;for(var _=n;r>_;_++)if(e.random&&(s=e["randomMap"+_%20]/100,p=u*s*s,f=p/2),d?(a=i[_][0],h=i[_][1]):(a=i[_].x,h=i[_].y),3>p)t.rect(a-f,h-f,p,p);else switch(e.iconType){case"circle":t.moveTo(a,h),t.arc(a,h,f,0,g,!0);break;case"diamond":t.moveTo(a,h-f),t.lineTo(a+f/3,h-f/3),t.lineTo(a+f,h),t.lineTo(a+f/3,h+f/3),t.lineTo(a,h+f),t.lineTo(a-f/3,h+f/3),t.lineTo(a-f,h),t.lineTo(a-f/3,h-f/3),t.lineTo(a,h-f);break;default:t.rect(a-f,h-f,p,p)}if(t.closePath(),c-1>m)switch(e.brushType){case"both":t.fill(),e.lineWidth>0&&t.stroke();break;case"stroke":e.lineWidth>0&&t.stroke();break;default:t.fill()}}},getRect:function(t){return t.__rect||n.getRect(t)},isCover:t("./normalIsCover")},r.inherits(e,i),e}),i("zrender/shape/ShapeBundle",["require","./Base","../tool/util"],function(t){var e=t("./Base"),i=function(t){e.call(this,t)};return i.prototype={constructor:i,type:"shape-bundle",brush:function(t,e){var i=this.beforeBrush(t,e);t.beginPath();for(var o=0;o<i.shapeList.length;o++){var n=i.shapeList[o],r=n.style;e&&(r=n.getHighlightStyle(r,n.highlightStyle||{},n.brushTypeOnly)),n.buildPath(t,r)}switch(i.brushType){case"both":t.fill();case"stroke":i.lineWidth>0&&t.stroke();break;default:t.fill()}this.drawText(t,i,this.style),this.afterBrush(t)},getRect:function(t){if(t.__rect)return t.__rect;for(var e=1/0,i=-1/0,o=1/0,n=-1/0,r=0;r<t.shapeList.length;r++)var s=t.shapeList[r],a=s.getRect(s.style),e=Math.min(a.x,e),o=Math.min(a.y,o),i=Math.max(a.x+a.width,i),n=Math.max(a.y+a.height,n);return t.__rect={x:e,y:o,width:i-e,height:n-o},t.__rect},isCover:function(t,e){var i=this.transformCoordToLocal(t,e);if(t=i[0],e=i[1],this.isCoverRect(t,e))for(var o=0;o<this.style.shapeList.length;o++){var n=this.style.shapeList[o];if(n.isCover(t,e))return!0}return!1}},t("../tool/util").inherits(i,e),i}),i("echarts/util/ecAnimation",["require","zrender/tool/util","zrender/tool/curve","zrender/shape/Polygon"],function(t){function e(t,e,i,o,n){var r,s=i.style.pointList,a=s.length;if(!e){if(r=[],"vertical"!=i._orient)for(var h=s[0][1],l=0;a>l;l++)r[l]=[s[l][0],h];else for(var c=s[0][0],l=0;a>l;l++)r[l]=[c,s[l][1]];"half-smooth-polygon"==i.type&&(r[a-1]=f.clone(s[a-1]),r[a-2]=f.clone(s[a-2])),e={style:{pointList:r}}}r=e.style.pointList;var d=r.length;i.style.pointList=d==a?r:a>d?r.concat(s.slice(d)):r.slice(0,a),t.addShape(i),i.__animating=!0,t.animate(i.id,"style").when(o,{pointList:s}).during(function(){i.updateControlPoints&&i.updateControlPoints(i.style)}).done(function(){i.__animating=!1}).start(n)}function i(t,e){for(var i=arguments.length,o=2;i>o;o++){var n=arguments[o];t.style[n]=e.style[n]}}function o(t,e,o,n,r){var s=o.style;e||(e={position:o.position,style:{x:s.x,y:"vertical"==o._orient?s.y+s.height:s.y,width:"vertical"==o._orient?s.width:0,height:"vertical"!=o._orient?s.height:0}});var a=s.x,h=s.y,l=s.width,c=s.height,d=[o.position[0],o.position[1]];i(o,e,"x","y","width","height"),o.position=e.position,t.addShape(o),(d[0]!=e.position[0]||d[1]!=e.position[1])&&t.animate(o.id,"").when(n,{position:d}).start(r),o.__animating=!0,t.animate(o.id,"style").when(n,{x:a,y:h,width:l,height:c}).done(function(){o.__animating=!1}).start(r)}function n(t,e,i,o,n){if(!e){var r=i.style.y;e={style:{y:[r[0],r[0],r[0],r[0]]}}}var s=i.style.y;i.style.y=e.style.y,t.addShape(i),i.__animating=!0,t.animate(i.id,"style").when(o,{y:s}).done(function(){i.__animating=!1}).start(n)}function r(t,e,i,o,n){var r=i.style.x,s=i.style.y,a=i.style.r0,h=i.style.r;i.__animating=!0,"r"!=i._animationAdd?(i.style.r0=0,i.style.r=0,i.rotation=[2*Math.PI,r,s],t.addShape(i),t.animate(i.id,"style").when(o,{r0:a,r:h}).done(function(){i.__animating=!1}).start(n),t.animate(i.id,"").when(o,{rotation:[0,r,s]}).start(n)):(i.style.r0=i.style.r,t.addShape(i),t.animate(i.id,"style").when(o,{r0:a}).done(function(){i.__animating=!1}).start(n))}function s(t,e,o,n,r){e||(e="r"!=o._animationAdd?{style:{startAngle:o.style.startAngle,endAngle:o.style.startAngle}}:{style:{r0:o.style.r}});var s=o.style.startAngle,a=o.style.endAngle;i(o,e,"startAngle","endAngle"),t.addShape(o),o.__animating=!0,t.animate(o.id,"style").when(n,{startAngle:s,endAngle:a}).done(function(){o.__animating=!1}).start(r)}function a(t,e,o,n,r){e||(e={style:{x:"left"==o.style.textAlign?o.style.x+100:o.style.x-100,y:o.style.y}});var s=o.style.x,a=o.style.y;i(o,e,"x","y"),t.addShape(o),o.__animating=!0,t.animate(o.id,"style").when(n,{x:s,y:a}).done(function(){o.__animating=!1}).start(r)}function h(e,i,o,n,r){var s=t("zrender/shape/Polygon").prototype.getRect(o.style),a=s.x+s.width/2,h=s.y+s.height/2;o.scale=[.1,.1,a,h],e.addShape(o),o.__animating=!0,e.animate(o.id,"").when(n,{scale:[1,1,a,h]}).done(function(){o.__animating=!1}).start(r)}function l(t,e,o,n,r){e||(e={style:{source0:0,source1:o.style.source1>0?360:-360,target0:0,target1:o.style.target1>0?360:-360}});var s=o.style.source0,a=o.style.source1,h=o.style.target0,l=o.style.target1;e.style&&i(o,e,"source0","source1","target0","target1"),t.addShape(o),o.__animating=!0,t.animate(o.id,"style").when(n,{source0:s,source1:a,target0:h,target1:l}).done(function(){o.__animating=!1}).start(r)}function c(t,e,i,o,n){e||(e={style:{angle:i.style.startAngle}});var r=i.style.angle;i.style.angle=e.style.angle,t.addShape(i),i.__animating=!0,t.animate(i.id,"style").when(o,{angle:r}).done(function(){i.__animating=!1}).start(n)}function d(t,e,i,n,r,s){if(i.style._x=i.style.x,i.style._y=i.style.y,i.style._width=i.style.width,i.style._height=i.style.height,e)o(t,e,i,n,r);else{var a=i._x||0,h=i._y||0;i.scale=[.01,.01,a,h],t.addShape(i),i.__animating=!0,t.animate(i.id,"").delay(s).when(n,{scale:[1,1,a,h]}).done(function(){i.__animating=!1}).start(r||"QuinticOut")}}function u(t,e,o,n,r){e||(e={style:{xStart:o.style.xStart,yStart:o.style.yStart,xEnd:o.style.xStart,yEnd:o.style.yStart}});var s=o.style.xStart,a=o.style.xEnd,h=o.style.yStart,l=o.style.yEnd;i(o,e,"xStart","xEnd","yStart","yEnd"),t.addShape(o),o.__animating=!0,t.animate(o.id,"style").when(n,{xStart:s,xEnd:a,yStart:h,yEnd:l}).done(function(){o.__animating=!1}).start(r)}function p(t,e,i,o,n){n=n||"QuinticOut",i.__animating=!0,t.addShape(i);var r=i.style,s=function(){i.__animating=!1},a=r.xStart,h=r.yStart,l=r.xEnd,c=r.yEnd;if(r.curveness>0){i.updatePoints(r);var d={p:0},u=r.cpX1,p=r.cpY1,f=[],m=[],_=g.quadraticSubdivide;t.animation.animate(d).when(o,{p:1}).during(function(){_(a,u,l,d.p,f),_(h,p,c,d.p,m),r.cpX1=f[1],r.cpY1=m[1],r.xEnd=f[2],r.yEnd=m[2],t.modShape(i)}).done(s).start(n)}else t.animate(i.id,"style").when(0,{xEnd:a,yEnd:h}).when(o,{xEnd:l,yEnd:c}).done(s).start(n)}var f=t("zrender/tool/util"),g=t("zrender/tool/curve");return{pointList:e,rectangle:o,candle:n,ring:r,sector:s,text:a,polygon:h,ribbon:l,gaugePointer:c,icon:d,line:u,markline:p}}),i("echarts/util/ecEffect",["require","../util/ecData","zrender/shape/Circle","zrender/shape/Image","zrender/tool/curve","../util/shape/Icon","../util/shape/Symbol","zrender/shape/ShapeBundle","zrender/shape/Polyline","zrender/tool/vector","zrender/tool/env"],function(t){function e(t,e,i,o){var n,s=i.effect,h=s.color||i.style.strokeColor||i.style.color,c=s.shadowColor||h,d=s.scaleSize,u=s.bounceDistance,p="undefined"!=typeof s.shadowBlur?s.shadowBlur:d;"image"!==i.type?(n=new l({zlevel:o,style:{brushType:"stroke",iconType:"droplet"!=i.style.iconType?i.style.iconType:"circle",x:p+1,y:p+1,n:i.style.n,width:i.style._width*d,height:i.style._height*d,lineWidth:1,strokeColor:h,shadowColor:c,shadowBlur:p},draggable:!1,hoverable:!1}),"pin"==i.style.iconType&&(n.style.y+=n.style.height/2*1.5),f&&(n.style.image=t.shapeToImage(n,n.style.width+2*p+2,n.style.height+2*p+2).style.image,n=new a({zlevel:n.zlevel,style:n.style,draggable:!1,hoverable:!1}))):n=new a({zlevel:o,style:i.style,draggable:!1,hoverable:!1}),r.clone(i,n),n.position=i.position,e.push(n),t.addShape(n);var g="image"!==i.type?window.devicePixelRatio||1:1,m=(n.style.width/g-i.style._width)/2;n.style.x=i.style._x-m,n.style.y=i.style._y-m,"pin"==i.style.iconType&&(n.style.y-=i.style.height/2*1.5);var _=100*(s.period+10*Math.random());t.modShape(i.id,{invisible:!0});var y=n.style.x+n.style.width/2/g,v=n.style.y+n.style.height/2/g;"scale"===s.type?(t.modShape(n.id,{scale:[.1,.1,y,v]}),t.animate(n.id,"",s.loop).when(_,{scale:[1,1,y,v]}).done(function(){i.effect.show=!1,t.delShape(n.id)}).start()):t.animate(n.id,"style",s.loop).when(_,{y:n.style.y-u}).when(2*_,{y:n.style.y}).done(function(){i.effect.show=!1,t.delShape(n.id)}).start()}function i(t,e,i,o){var n=i.effect,r=n.color||i.style.strokeColor||i.style.color,s=n.scaleSize,a=n.shadowColor||r,h="undefined"!=typeof n.shadowBlur?n.shadowBlur:2*s,l=window.devicePixelRatio||1,d=new c({zlevel:o,position:i.position,scale:i.scale,style:{pointList:i.style.pointList,iconType:i.style.iconType,color:r,strokeColor:r,shadowColor:a,shadowBlur:h*l,random:!0,brushType:"fill",lineWidth:1,size:i.style.size},draggable:!1,hoverable:!1});e.push(d),t.addShape(d),t.modShape(i.id,{invisible:!0});for(var u=Math.round(100*n.period),p={},f={},g=0;20>g;g++)d.style["randomMap"+g]=0,p={},p["randomMap"+g]=100,f={},f["randomMap"+g]=0,d.style["randomMap"+g]=100*Math.random(),t.animate(d.id,"style",!0).when(u,p).when(2*u,f).when(3*u,p).when(4*u,p).delay(Math.random()*u*g).start()}function o(t,e,i,o,n){var a=i.effect,l=i.style,c=a.color||l.strokeColor||l.color,d=a.shadowColor||l.strokeColor||c,g=l.lineWidth*a.scaleSize,m="undefined"!=typeof a.shadowBlur?a.shadowBlur:g,_=new s({zlevel:o,style:{x:m,y:m,r:g,color:c,shadowColor:d,shadowBlur:m},hoverable:!1}),y=0;if(f&&!n){var o=_.zlevel;_=t.shapeToImage(_,2*(g+m),2*(g+m)),_.zlevel=o,_.hoverable=!1,y=m}n||(r.clone(i,_),_.position=i.position,e.push(_),t.addShape(_));var v=function(){n||(i.effect.show=!1,t.delShape(_.id)),_.effectAnimator=null};if(i instanceof u){for(var x=[0],b=0,T=l.pointList,S=l.controlPointList,z=1;z<T.length;z++){if(S){var C=S[2*(z-1)],E=S[2*(z-1)+1];b+=p.dist(T[z-1],C)+p.dist(C,E)+p.dist(E,T[z])}else b+=p.dist(T[z-1],T[z]);x.push(b)}for(var w={p:0},L=t.animation.animate(w,{loop:a.loop}),z=0;z<x.length;z++)L.when(x[z]*a.period,{p:z});L.during(function(){var e,i,o=Math.floor(w.p);if(o==T.length-1)e=T[o][0],i=T[o][1];else{var r=w.p-o,s=T[o],a=T[o+1];if(S){var l=S[2*o],c=S[2*o+1];e=h.cubicAt(s[0],l[0],c[0],a[0],r),i=h.cubicAt(s[1],l[1],c[1],a[1],r)}else e=(a[0]-s[0])*r+s[0],i=(a[1]-s[1])*r+s[1]}_.style.x=e,_.style.y=i,n||t.modShape(_)}).done(v).start(),L.duration=b*a.period,_.effectAnimator=L}else{var A=l.xStart-y,M=l.yStart-y,k=l.xEnd-y,P=l.yEnd-y;_.style.x=A,_.style.y=M;var I=(k-A)*(k-A)+(P-M)*(P-M),O=Math.round(Math.sqrt(Math.round(I*a.period*a.period)));if(i.style.curveness>0){var D=l.cpX1-y,R=l.cpY1-y;_.effectAnimator=t.animation.animate(_,{loop:a.loop}).when(O,{p:1}).during(function(e,i){_.style.x=h.quadraticAt(A,D,k,i),_.style.y=h.quadraticAt(M,R,P,i),n||t.modShape(_)}).done(v).start()}else _.effectAnimator=t.animation.animate(_.style,{loop:a.loop}).when(O,{x:k,y:P}).during(function(){n||t.modShape(_)}).done(v).start();_.effectAnimator.duration=O}return _}function n(t,e,i,n){var r=new d({style:{shapeList:[]},zlevel:n,hoverable:!1}),s=i.style.shapeList,a=i.effect;r.position=i.position;for(var h=0,l=[],c=0;c<s.length;c++){s[c].effect=a;var u=o(t,null,s[c],n,!0),p=u.effectAnimator;r.style.shapeList.push(u),p.duration>h&&(h=p.duration),0===c&&(r.style.color=u.style.color,r.style.shadowBlur=u.style.shadowBlur,r.style.shadowColor=u.style.shadowColor),l.push(p)}e.push(r),t.addShape(r);var f=function(){for(var t=0;t<l.length;t++)l[t].stop()};if(h){r.__dummy=0;var g=t.animate(r.id,"",a.loop).when(h,{__dummy:1}).during(function(){t.modShape(r)}).done(function(){i.effect.show=!1,t.delShape(r.id)}).start(),m=g.stop;g.stop=function(){f(),m.call(this)}}}var r=t("../util/ecData"),s=t("zrender/shape/Circle"),a=t("zrender/shape/Image"),h=t("zrender/tool/curve"),l=t("../util/shape/Icon"),c=t("../util/shape/Symbol"),d=t("zrender/shape/ShapeBundle"),u=t("zrender/shape/Polyline"),p=t("zrender/tool/vector"),f=t("zrender/tool/env").canvasSupported;return{point:e,largePoint:i,line:o,largeLine:n}}),i("echarts/util/accMath",[],function(){function t(t,e){var i=t.toString(),o=e.toString(),n=0;try{n=o.split(".")[1].length}catch(r){}try{n-=i.split(".")[1].length}catch(r){}return(i.replace(".","")-0)/(o.replace(".","")-0)*Math.pow(10,n)}function e(t,e){var i=t.toString(),o=e.toString(),n=0;try{n+=i.split(".")[1].length}catch(r){}try{n+=o.split(".")[1].length}catch(r){}return(i.replace(".","")-0)*(o.replace(".","")-0)/Math.pow(10,n)}function i(t,e){var i=0,o=0;try{i=t.toString().split(".")[1].length}catch(n){}try{o=e.toString().split(".")[1].length}catch(n){}var r=Math.pow(10,Math.max(i,o));return(Math.round(t*r)+Math.round(e*r))/r}function o(t,e){return i(t,-e)}return{accDiv:t,accMul:e,accAdd:i,accSub:o}}),i("echarts/component/base",["require","../config","../util/ecData","../util/ecQuery","../util/number","zrender/tool/util","zrender/tool/env"],function(t){function e(t,e,n,r,s){this.ecTheme=t,this.messageCenter=e,this.zr=n,this.option=r,this.series=r.series,this.myChart=s,this.component=s.component,this.shapeList=[],this.effectList=[];var a=this;a._onlegendhoverlink=function(t){if(a.legendHoverLink)for(var e,n=t.target,r=a.shapeList.length-1;r>=0;r--)e=a.type==i.CHART_TYPE_PIE||a.type==i.CHART_TYPE_FUNNEL?o.get(a.shapeList[r],"name"):(o.get(a.shapeList[r],"series")||{}).name,e!=n||a.shapeList[r].invisible||a.shapeList[r].__animating||a.zr.addHoverShape(a.shapeList[r])},e&&e.bind(i.EVENT.LEGEND_HOVERLINK,this._onlegendhoverlink)}var i=t("../config"),o=t("../util/ecData"),n=t("../util/ecQuery"),r=t("../util/number"),s=t("zrender/tool/util");return e.prototype={canvasSupported:t("zrender/tool/env").canvasSupported,_getZ:function(t){if(null!=this[t])return this[t];var e=this.ecTheme[this.type];return e&&null!=e[t]?e[t]:(e=i[this.type],e&&null!=e[t]?e[t]:0)},getZlevelBase:function(){return this._getZ("zlevel")},getZBase:function(){return this._getZ("z")},reformOption:function(t){return t=s.merge(s.merge(t||{},s.clone(this.ecTheme[this.type]||{})),s.clone(i[this.type]||{})),this.z=t.z,this.zlevel=t.zlevel,t},reformCssArray:function(t){if(!(t instanceof Array))return[t,t,t,t];switch(t.length+""){case"4":return t;case"3":return[t[0],t[1],t[2],t[1]];case"2":return[t[0],t[1],t[0],t[1]];case"1":return[t[0],t[0],t[0],t[0]];case"0":return[0,0,0,0]}},getShapeById:function(t){for(var e=0,i=this.shapeList.length;i>e;e++)if(this.shapeList[e].id===t)return this.shapeList[e];return null},getFont:function(t){var e=this.getTextStyle(s.clone(t));return e.fontStyle+" "+e.fontWeight+" "+e.fontSize+"px "+e.fontFamily},getTextStyle:function(t){return s.merge(s.merge(t||{},this.ecTheme.textStyle),i.textStyle)},getItemStyleColor:function(t,e,i,o){return"function"==typeof t?t.call(this.myChart,{seriesIndex:e,series:this.series[e],dataIndex:i,data:o}):t},getDataFromOption:function(t,e){return null!=t?null!=t.value?t.value:t:e},subPixelOptimize:function(t,e){return t=e%2===1?Math.floor(t)+.5:Math.round(t)},resize:function(){this.refresh&&this.refresh(),this.clearEffectShape&&this.clearEffectShape(!0);
var t=this;setTimeout(function(){t.animationEffect&&t.animationEffect()},200)},clear:function(){this.clearEffectShape&&this.clearEffectShape(),this.zr&&this.zr.delShape(this.shapeList),this.shapeList=[]},dispose:function(){this.onbeforDispose&&this.onbeforDispose(),this.clear(),this.shapeList=null,this.effectList=null,this.messageCenter&&this.messageCenter.unbind(i.EVENT.LEGEND_HOVERLINK,this._onlegendhoverlink),this.onafterDispose&&this.onafterDispose()},query:n.query,deepQuery:n.deepQuery,deepMerge:n.deepMerge,parsePercent:r.parsePercent,parseCenter:r.parseCenter,parseRadius:r.parseRadius,numAddCommas:r.addCommas,getPrecision:r.getPrecision},e}),i("echarts/layout/EdgeBundling",["require","../data/KDTree","zrender/tool/vector"],function(t){function e(t,e){t=t.array,e=e.array;var i=e[0]-t[0],o=e[1]-t[1],n=e[2]-t[2],r=e[3]-t[3];return i*i+o*o+n*n+r*r}function i(t){this.points=[t.mp0,t.mp1],this.group=t}function o(t){var e=t.points;e[0][1]<e[1][1]||t instanceof i?(this.array=[e[0][0],e[0][1],e[1][0],e[1][1]],this._startPoint=e[0],this._endPoint=e[1]):(this.array=[e[1][0],e[1][1],e[0][0],e[0][1]],this._startPoint=e[1],this._endPoint=e[0]),this.ink=c(e[0],e[1]),this.edge=t,this.group=null}function n(){this.edgeList=[],this.mp0=h(),this.mp1=h(),this.ink=0}function r(){this.maxNearestEdge=6,this.maxTurningAngle=Math.PI/4,this.maxIteration=20}var s=t("../data/KDTree"),a=t("zrender/tool/vector"),h=a.create,l=a.distSquare,c=a.dist,d=a.copy,u=a.clone;return o.prototype.getStartPoint=function(){return this._startPoint},o.prototype.getEndPoint=function(){return this._endPoint},n.prototype.addEdge=function(t){t.group=this,this.edgeList.push(t)},n.prototype.removeEdge=function(t){t.group=null,this.edgeList.splice(this.edgeList.indexOf(t),1)},r.prototype={constructor:r,run:function(t){function e(t,e){return l(t,e)<1e-10}function o(t,i){for(var o=[],n=0,r=0;r<t.length;r++)n>0&&e(t[r],o[n-1])||(o[n++]=u(t[r]));return i[0]&&!e(o[0],i[0])&&(o=o.reverse()),o}for(var n=this._iterate(t),r=0;r++<this.maxIteration;){for(var s=[],a=0;a<n.groups.length;a++)s.push(new i(n.groups[a]));var h=this._iterate(s);if(h.savedInk<=0)break;n=h}var c=[],d=function(t,e){for(var n,r=0;r<t.length;r++){var s=t[r];if(s.edgeList[0]&&s.edgeList[0].edge instanceof i){for(var a=[],h=0;h<s.edgeList.length;h++)a.push(s.edgeList[h].edge.group);n=e?e.slice():[],n.unshift(s.mp0),n.push(s.mp1),d(a,n)}else for(var h=0;h<s.edgeList.length;h++){var l=s.edgeList[h];n=e?e.slice():[],n.unshift(s.mp0),n.push(s.mp1),n.unshift(l.getStartPoint()),n.push(l.getEndPoint()),c.push({points:o(n,l.edge.points),rawEdge:l.edge})}}};return d(n.groups),c},_iterate:function(t){for(var i=[],r=[],a=0,l=0;l<t.length;l++){var c=new o(t[l]);i.push(c)}for(var u=new s(i,4),p=[],f=h(),g=h(),m=0,_=h(),y=h(),v=0,l=0;l<i.length;l++){var c=i[l];if(!c.group){u.nearestN(c,this.maxNearestEdge,e,p);for(var x=0,b=null,T=null,S=0;S<p.length;S++){var z=p[S],C=0;z.group?z.group!==T&&(T=z.group,m=this._calculateGroupEdgeInk(z.group,c,f,g),C=z.group.ink+c.ink-m):(m=this._calculateEdgeEdgeInk(c,z,f,g),C=z.ink+c.ink-m),C>x&&(x=C,b=z,d(y,g),d(_,f),v=m)}if(b){a+=x;var E;b.group||(E=new n,r.push(E),E.addEdge(b)),E=b.group,d(E.mp0,_),d(E.mp1,y),E.ink=v,b.group.addEdge(c)}else{var E=new n;r.push(E),d(E.mp0,c.getStartPoint()),d(E.mp1,c.getEndPoint()),E.ink=c.ink,E.addEdge(c)}}}return{groups:r,edges:i,savedInk:a}},_calculateEdgeEdgeInk:function(){var t=[],e=[];return function(i,o,n,r){t[0]=i.getStartPoint(),t[1]=o.getStartPoint(),e[0]=i.getEndPoint(),e[1]=o.getEndPoint(),this._calculateMeetPoints(t,e,n,r);var s=c(t[0],n)+c(n,r)+c(r,e[0])+c(t[1],n)+c(r,e[1]);return s}}(),_calculateGroupEdgeInk:function(t,e,i,o){for(var n=[],r=[],s=0;s<t.edgeList.length;s++){var a=t.edgeList[s];n.push(a.getStartPoint()),r.push(a.getEndPoint())}n.push(e.getStartPoint()),r.push(e.getEndPoint()),this._calculateMeetPoints(n,r,i,o);for(var h=c(i,o),s=0;s<n.length;s++)h+=c(n[s],i)+c(r[s],o);return h},_calculateMeetPoints:function(){var t=h(),e=h();return function(i,o,n,r){a.set(t,0,0),a.set(e,0,0);for(var s=i.length,h=0;s>h;h++)a.add(t,t,i[h]);a.scale(t,t,1/s),s=o.length;for(var h=0;s>h;h++)a.add(e,e,o[h]);a.scale(e,e,1/s),this._limitTurningAngle(i,t,e,n),this._limitTurningAngle(o,e,t,r)}}(),_limitTurningAngle:function(){var t=h(),e=h(),i=h(),o=h();return function(n,r,s,h){var d=Math.cos(this.maxTurningAngle),u=Math.tan(this.maxTurningAngle);a.sub(t,r,s),a.normalize(t,t),a.copy(h,r);for(var p=0,f=0;f<n.length;f++){var g=n[f];a.sub(e,g,r);var m=a.len(e);a.scale(e,e,1/m);var _=a.dot(e,t);if(d>_){a.scaleAndAdd(i,r,t,m*_);var y=c(i,g),v=y/u;a.scaleAndAdd(o,i,t,-v);var x=l(o,r);x>p&&(p=x,a.copy(h,o))}}}}()},r}),i("zrender/tool/area",["require","./util","./curve"],function(t){"use strict";function e(t){return t%=P,0>t&&(t+=P),t}function i(t,e,i,r){if(!e||!t)return!1;var s=t.type;z=z||C.getContext();var a=o(t,e,i,r);if("undefined"!=typeof a)return a;if(t.buildPath&&z.isPointInPath)return n(t,z,e,i,r);switch(s){case"ellipse":return!0;case"trochoid":var h="out"==e.location?e.r1+e.r2+e.d:e.r1-e.r2+e.d;return p(e,i,r,h);case"rose":return p(e,i,r,e.maxr);default:return!1}}function o(t,e,i,o){var n=t.type;switch(n){case"bezier-curve":return"undefined"==typeof e.cpX2?h(e.xStart,e.yStart,e.cpX1,e.cpY1,e.xEnd,e.yEnd,e.lineWidth,i,o):a(e.xStart,e.yStart,e.cpX1,e.cpY1,e.cpX2,e.cpY2,e.xEnd,e.yEnd,e.lineWidth,i,o);case"line":return s(e.xStart,e.yStart,e.xEnd,e.yEnd,e.lineWidth,i,o);case"polyline":return c(e.pointList,e.lineWidth,i,o);case"ring":return d(e.x,e.y,e.r0,e.r,i,o);case"circle":return p(e.x,e.y,e.r,i,o);case"sector":var r=e.startAngle*Math.PI/180,l=e.endAngle*Math.PI/180;return e.clockWise||(r=-r,l=-l),f(e.x,e.y,e.r0,e.r,r,l,!e.clockWise,i,o);case"path":return e.pathArray&&b(e.pathArray,Math.max(e.lineWidth,5),e.brushType,i,o);case"polygon":case"star":case"isogon":return g(e.pointList,i,o);case"text":var m=e.__rect||t.getRect(e);return u(m.x,m.y,m.width,m.height,i,o);case"rectangle":case"image":return u(e.x,e.y,e.width,e.height,i,o)}}function n(t,e,i,o,n){return e.beginPath(),t.buildPath(e,i),e.closePath(),e.isPointInPath(o,n)}function r(t,e,o,n){return!i(t,e,o,n)}function s(t,e,i,o,n,r,s){if(0===n)return!1;var a=Math.max(n,5),h=0,l=t;if(s>e+a&&s>o+a||e-a>s&&o-a>s||r>t+a&&r>i+a||t-a>r&&i-a>r)return!1;if(t===i)return Math.abs(r-t)<=a/2;h=(e-o)/(t-i),l=(t*o-i*e)/(t-i);var c=h*r-s+l,d=c*c/(h*h+1);return a/2*a/2>=d}function a(t,e,i,o,n,r,s,a,h,l,c){if(0===h)return!1;var d=Math.max(h,5);if(c>e+d&&c>o+d&&c>r+d&&c>a+d||e-d>c&&o-d>c&&r-d>c&&a-d>c||l>t+d&&l>i+d&&l>n+d&&l>s+d||t-d>l&&i-d>l&&n-d>l&&s-d>l)return!1;var u=E.cubicProjectPoint(t,e,i,o,n,r,s,a,l,c,null);return d/2>=u}function h(t,e,i,o,n,r,s,a,h){if(0===s)return!1;var l=Math.max(s,5);if(h>e+l&&h>o+l&&h>r+l||e-l>h&&o-l>h&&r-l>h||a>t+l&&a>i+l&&a>n+l||t-l>a&&i-l>a&&n-l>a)return!1;var c=E.quadraticProjectPoint(t,e,i,o,n,r,a,h,null);return l/2>=c}function l(t,i,o,n,r,s,a,h,l){if(0===a)return!1;var c=Math.max(a,5);h-=t,l-=i;var d=Math.sqrt(h*h+l*l);if(d-c>o||o>d+c)return!1;if(Math.abs(n-r)>=P)return!0;if(s){var u=n;n=e(r),r=e(u)}else n=e(n),r=e(r);n>r&&(r+=P);var p=Math.atan2(l,h);return 0>p&&(p+=P),p>=n&&r>=p||p+P>=n&&r>=p+P}function c(t,e,i,o){for(var e=Math.max(e,10),n=0,r=t.length-1;r>n;n++){var a=t[n][0],h=t[n][1],l=t[n+1][0],c=t[n+1][1];if(s(a,h,l,c,e,i,o))return!0}return!1}function d(t,e,i,o,n,r){var s=(n-t)*(n-t)+(r-e)*(r-e);return o*o>s&&s>i*i}function u(t,e,i,o,n,r){return n>=t&&t+i>=n&&r>=e&&e+o>=r}function p(t,e,i,o,n){return i*i>(o-t)*(o-t)+(n-e)*(n-e)}function f(t,e,i,o,n,r,s,a,h){return l(t,e,(i+o)/2,n,r,s,o-i,a,h)}function g(t,e,i){for(var o=t.length,n=0,r=0,s=o-1;o>r;r++){var a=t[s][0],h=t[s][1],l=t[r][0],c=t[r][1];n+=m(a,h,l,c,e,i),s=r}return 0!==n}function m(t,e,i,o,n,r){if(r>e&&r>o||e>r&&o>r)return 0;if(o==e)return 0;var s=e>o?1:-1,a=(r-e)/(o-e),h=a*(i-t)+t;return h>n?s:0}function _(){var t=O[0];O[0]=O[1],O[1]=t}function y(t,e,i,o,n,r,s,a,h,l){if(l>e&&l>o&&l>r&&l>a||e>l&&o>l&&r>l&&a>l)return 0;var c=E.cubicRootAt(e,o,r,a,l,I);if(0===c)return 0;for(var d,u,p=0,f=-1,g=0;c>g;g++){var m=I[g],y=E.cubicAt(t,i,n,s,m);h>y||(0>f&&(f=E.cubicExtrema(e,o,r,a,O),O[1]<O[0]&&f>1&&_(),d=E.cubicAt(e,o,r,a,O[0]),f>1&&(u=E.cubicAt(e,o,r,a,O[1]))),p+=2==f?m<O[0]?e>d?1:-1:m<O[1]?d>u?1:-1:u>a?1:-1:m<O[0]?e>d?1:-1:d>a?1:-1)}return p}function v(t,e,i,o,n,r,s,a){if(a>e&&a>o&&a>r||e>a&&o>a&&r>a)return 0;var h=E.quadraticRootAt(e,o,r,a,I);if(0===h)return 0;var l=E.quadraticExtremum(e,o,r);if(l>=0&&1>=l){for(var c=0,d=E.quadraticAt(e,o,r,l),u=0;h>u;u++){var p=E.quadraticAt(t,i,n,I[u]);s>p||(c+=I[u]<l?e>d?1:-1:d>r?1:-1)}return c}var p=E.quadraticAt(t,i,n,I[0]);return s>p?0:e>r?1:-1}function x(t,i,o,n,r,s,a,h){if(h-=i,h>o||-o>h)return 0;var l=Math.sqrt(o*o-h*h);if(I[0]=-l,I[1]=l,Math.abs(n-r)>=P){n=0,r=P;var c=s?1:-1;return a>=I[0]+t&&a<=I[1]+t?c:0}if(s){var l=n;n=e(r),r=e(l)}else n=e(n),r=e(r);n>r&&(r+=P);for(var d=0,u=0;2>u;u++){var p=I[u];if(p+t>a){var f=Math.atan2(h,p),c=s?1:-1;0>f&&(f=P+f),(f>=n&&r>=f||f+P>=n&&r>=f+P)&&(f>Math.PI/2&&f<1.5*Math.PI&&(c=-c),d+=c)}}return d}function b(t,e,i,o,n){var r=0,c=0,d=0,u=0,p=0,f=!0,g=!0;i=i||"fill";for(var _="stroke"===i||"both"===i,b="fill"===i||"both"===i,T=0;T<t.length;T++){var S=t[T],z=S.points;if(f||"M"===S.command){if(T>0&&(b&&(r+=m(c,d,u,p,o,n)),0!==r))return!0;u=z[z.length-2],p=z[z.length-1],f=!1,g&&"A"!==S.command&&(g=!1,c=u,d=p)}switch(S.command){case"M":c=z[0],d=z[1];break;case"L":if(_&&s(c,d,z[0],z[1],e,o,n))return!0;b&&(r+=m(c,d,z[0],z[1],o,n)),c=z[0],d=z[1];break;case"C":if(_&&a(c,d,z[0],z[1],z[2],z[3],z[4],z[5],e,o,n))return!0;b&&(r+=y(c,d,z[0],z[1],z[2],z[3],z[4],z[5],o,n)),c=z[4],d=z[5];break;case"Q":if(_&&h(c,d,z[0],z[1],z[2],z[3],e,o,n))return!0;b&&(r+=v(c,d,z[0],z[1],z[2],z[3],o,n)),c=z[2],d=z[3];break;case"A":var C=z[0],E=z[1],w=z[2],L=z[3],A=z[4],M=z[5],k=Math.cos(A)*w+C,P=Math.sin(A)*L+E;g?(g=!1,u=k,p=P):r+=m(c,d,k,P);var I=(o-C)*L/w+C;if(_&&l(C,E,L,A,A+M,1-z[7],e,I,n))return!0;b&&(r+=x(C,E,L,A,A+M,1-z[7],I,n)),c=Math.cos(A+M)*w+C,d=Math.sin(A+M)*L+E;break;case"z":if(_&&s(c,d,u,p,e,o,n))return!0;f=!0}}return b&&(r+=m(c,d,u,p,o,n)),0!==r}function T(t,e){var i=t+":"+e;if(w[i])return w[i];z=z||C.getContext(),z.save(),e&&(z.font=e),t=(t+"").split("\n");for(var o=0,n=0,r=t.length;r>n;n++)o=Math.max(z.measureText(t[n]).width,o);return z.restore(),w[i]=o,++A>k&&(A=0,w={}),o}function S(t,e){var i=t+":"+e;if(L[i])return L[i];z=z||C.getContext(),z.save(),e&&(z.font=e),t=(t+"").split("\n");var o=(z.measureText("国").width+2)*t.length;return z.restore(),L[i]=o,++M>k&&(M=0,L={}),o}var z,C=t("./util"),E=t("./curve"),w={},L={},A=0,M=0,k=5e3,P=2*Math.PI,I=[-1,-1,-1],O=[-1,-1];return{isInside:i,isOutside:r,getTextWidth:T,getTextHeight:S,isInsidePath:b,isInsidePolygon:g,isInsideSector:f,isInsideCircle:p,isInsideLine:s,isInsideRect:u,isInsidePolyline:c,isInsideCubicStroke:a,isInsideQuadraticStroke:h}}),i("zrender/dep/excanvas",["require"],function(){return document.createElement("canvas").getContext?G_vmlCanvasManager=!1:!function(){function t(){return this.context_||(this.context_=new x(this))}function e(t,e){var i=N.call(arguments,2);return function(){return t.apply(e,i.concat(N.call(arguments)))}}function i(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;")}function o(t,e,i){t.namespaces[e]||t.namespaces.add(e,i,"#default#VML")}function n(t){if(o(t,"g_vml_","urn:schemas-microsoft-com:vml"),o(t,"g_o_","urn:schemas-microsoft-com:office:office"),!t.styleSheets.ex_canvas_){var e=t.createStyleSheet();e.owningElement.id="ex_canvas_",e.cssText="canvas{display:inline-block;overflow:hidden;text-align:left;width:300px;height:150px}"}}function r(t){var e=t.srcElement;switch(t.propertyName){case"width":e.getContext().clearRect(),e.style.width=e.attributes.width.nodeValue+"px",e.firstChild.style.width=e.clientWidth+"px";break;case"height":e.getContext().clearRect(),e.style.height=e.attributes.height.nodeValue+"px",e.firstChild.style.height=e.clientHeight+"px"}}function s(t){var e=t.srcElement;e.firstChild&&(e.firstChild.style.width=e.clientWidth+"px",e.firstChild.style.height=e.clientHeight+"px")}function a(){return[[1,0,0],[0,1,0],[0,0,1]]}function h(t,e){for(var i=a(),o=0;3>o;o++)for(var n=0;3>n;n++){for(var r=0,s=0;3>s;s++)r+=t[o][s]*e[s][n];i[o][n]=r}return i}function l(t,e){e.fillStyle=t.fillStyle,e.lineCap=t.lineCap,e.lineJoin=t.lineJoin,e.lineWidth=t.lineWidth,e.miterLimit=t.miterLimit,e.shadowBlur=t.shadowBlur,e.shadowColor=t.shadowColor,e.shadowOffsetX=t.shadowOffsetX,e.shadowOffsetY=t.shadowOffsetY,e.strokeStyle=t.strokeStyle,e.globalAlpha=t.globalAlpha,e.font=t.font,e.textAlign=t.textAlign,e.textBaseline=t.textBaseline,e.scaleX_=t.scaleX_,e.scaleY_=t.scaleY_,e.lineScale_=t.lineScale_}function c(t){var e=t.indexOf("(",3),i=t.indexOf(")",e+1),o=t.substring(e+1,i).split(",");return(4!=o.length||"a"!=t.charAt(3))&&(o[3]=1),o}function d(t){return parseFloat(t)/100}function u(t,e,i){return Math.min(i,Math.max(e,t))}function p(t){var e,i,o,n,r,s;if(n=parseFloat(t[0])/360%360,0>n&&n++,r=u(d(t[1]),0,1),s=u(d(t[2]),0,1),0==r)e=i=o=s;else{var a=.5>s?s*(1+r):s+r-s*r,h=2*s-a;e=f(h,a,n+1/3),i=f(h,a,n),o=f(h,a,n-1/3)}return"#"+W[Math.floor(255*e)]+W[Math.floor(255*i)]+W[Math.floor(255*o)]}function f(t,e,i){return 0>i&&i++,i>1&&i--,1>6*i?t+6*(e-t)*i:1>2*i?e:2>3*i?t+(e-t)*(2/3-i)*6:t}function g(t){if(t in V)return V[t];var e,i=1;if(t=String(t),"#"==t.charAt(0))e=t;else if(/^rgb/.test(t)){for(var o,n=c(t),e="#",r=0;3>r;r++)o=-1!=n[r].indexOf("%")?Math.floor(255*d(n[r])):+n[r],e+=W[u(o,0,255)];i=+n[3]}else if(/^hsl/.test(t)){var n=c(t);e=p(n),i=n[3]}else e=G[t]||t;return V[t]={color:e,alpha:i}}function m(t){if(U[t])return U[t];var e,i=document.createElement("div"),o=i.style;try{o.font=t,e=o.fontFamily.split(",")[0]}catch(n){}return U[t]={style:o.fontStyle||Z.style,variant:o.fontVariant||Z.variant,weight:o.fontWeight||Z.weight,size:o.fontSize||Z.size,family:e||Z.family}}function _(t,e){var i={};for(var o in t)i[o]=t[o];var n=parseFloat(e.currentStyle.fontSize),r=parseFloat(t.size);return i.size="number"==typeof t.size?t.size:-1!=t.size.indexOf("px")?r:-1!=t.size.indexOf("em")?n*r:-1!=t.size.indexOf("%")?n/100*r:-1!=t.size.indexOf("pt")?r/.75:n,i}function y(t){return t.style+" "+t.variant+" "+t.weight+" "+t.size+"px '"+t.family+"'"}function v(t){return Q[t]||"square"}function x(t){this.m_=a(),this.mStack_=[],this.aStack_=[],this.currentPath_=[],this.strokeStyle="#000",this.fillStyle="#000",this.lineWidth=1,this.lineJoin="miter",this.lineCap="butt",this.miterLimit=1*B,this.globalAlpha=1,this.font="12px 微软雅黑",this.textAlign="left",this.textBaseline="alphabetic",this.canvas=t;var e="width:"+t.clientWidth+"px;height:"+t.clientHeight+"px;overflow:hidden;position:absolute",i=t.ownerDocument.createElement("div");i.style.cssText=e,t.appendChild(i);var o=i.cloneNode(!1);o.style.backgroundColor="#fff",o.style.filter="alpha(opacity=0)",t.appendChild(o),this.element_=i,this.scaleX_=1,this.scaleY_=1,this.lineScale_=1}function b(t,e,i,o){t.currentPath_.push({type:"bezierCurveTo",cp1x:e.x,cp1y:e.y,cp2x:i.x,cp2y:i.y,x:o.x,y:o.y}),t.currentX_=o.x,t.currentY_=o.y}function T(t,e){var i=g(t.strokeStyle),o=i.color,n=i.alpha*t.globalAlpha,r=t.lineScale_*t.lineWidth;1>r&&(n*=r),e.push("<g_vml_:stroke",' opacity="',n,'"',' joinstyle="',t.lineJoin,'"',' miterlimit="',t.miterLimit,'"',' endcap="',v(t.lineCap),'"',' weight="',r,'px"',' color="',o,'" />')}function S(t,e,i,o){var n=t.fillStyle,r=t.scaleX_,s=t.scaleY_,a=o.x-i.x,h=o.y-i.y;if(n instanceof w){var l=0,c={x:0,y:0},d=0,u=1;if("gradient"==n.type_){var p=n.x0_/r,f=n.y0_/s,m=n.x1_/r,_=n.y1_/s,y=z(t,p,f),v=z(t,m,_),x=v.x-y.x,b=v.y-y.y;l=180*Math.atan2(x,b)/Math.PI,0>l&&(l+=360),1e-6>l&&(l=0)}else{var y=z(t,n.x0_,n.y0_);c={x:(y.x-i.x)/a,y:(y.y-i.y)/h},a/=r*B,h/=s*B;var T=P.max(a,h);d=2*n.r0_/T,u=2*n.r1_/T-d}var S=n.colors_;S.sort(function(t,e){return t.offset-e.offset});for(var C=S.length,E=S[0].color,A=S[C-1].color,M=S[0].alpha*t.globalAlpha,k=S[C-1].alpha*t.globalAlpha,I=[],O=0;C>O;O++){var D=S[O];I.push(D.offset*u+d+" "+D.color)}e.push('<g_vml_:fill type="',n.type_,'"',' method="none" focus="100%"',' color="',E,'"',' color2="',A,'"',' colors="',I.join(","),'"',' opacity="',k,'"',' g_o_:opacity2="',M,'"',' angle="',l,'"',' focusposition="',c.x,",",c.y,'" />')}else if(n instanceof L){if(a&&h){var R=-i.x,H=-i.y;e.push("<g_vml_:fill",' position="',R/a*r*r,",",H/h*s*s,'"',' type="tile"',' src="',n.src_,'" />')}}else{var F=g(t.fillStyle),N=F.color,Y=F.alpha*t.globalAlpha;e.push('<g_vml_:fill color="',N,'" opacity="',Y,'" />')}}function z(t,e,i){var o=t.m_;return{x:B*(e*o[0][0]+i*o[1][0]+o[2][0])-F,y:B*(e*o[0][1]+i*o[1][1]+o[2][1])-F}}function C(t){return isFinite(t[0][0])&&isFinite(t[0][1])&&isFinite(t[1][0])&&isFinite(t[1][1])&&isFinite(t[2][0])&&isFinite(t[2][1])}function E(t,e,i){if(C(e)&&(t.m_=e,t.scaleX_=Math.sqrt(e[0][0]*e[0][0]+e[0][1]*e[0][1]),t.scaleY_=Math.sqrt(e[1][0]*e[1][0]+e[1][1]*e[1][1]),i)){var o=e[0][0]*e[1][1]-e[0][1]*e[1][0];t.lineScale_=H(R(o))}}function w(t){this.type_=t,this.x0_=0,this.y0_=0,this.r0_=0,this.x1_=0,this.y1_=0,this.r1_=0,this.colors_=[]}function L(t,e){switch(M(t),e){case"repeat":case null:case"":this.repetition_="repeat";break;case"repeat-x":case"repeat-y":case"no-repeat":this.repetition_=e;break;default:A("SYNTAX_ERR")}this.src_=t.src,this.width_=t.width,this.height_=t.height}function A(t){throw new k(t)}function M(t){t&&1==t.nodeType&&"IMG"==t.tagName||A("TYPE_MISMATCH_ERR"),"complete"!=t.readyState&&A("INVALID_STATE_ERR")}function k(t){this.code=this[t],this.message=t+": DOM Exception "+this.code}var P=Math,I=P.round,O=P.sin,D=P.cos,R=P.abs,H=P.sqrt,B=10,F=B/2,N=(+navigator.userAgent.match(/MSIE ([\d.]+)?/)[1],Array.prototype.slice);n(document);var Y={init:function(t){var i=t||document;i.createElement("canvas"),i.attachEvent("onreadystatechange",e(this.init_,this,i))},init_:function(t){for(var e=t.getElementsByTagName("canvas"),i=0;i<e.length;i++)this.initElement(e[i])},initElement:function(e){if(!e.getContext){e.getContext=t,n(e.ownerDocument),e.innerHTML="",e.attachEvent("onpropertychange",r),e.attachEvent("onresize",s);var i=e.attributes;i.width&&i.width.specified?e.style.width=i.width.nodeValue+"px":e.width=e.clientWidth,i.height&&i.height.specified?e.style.height=i.height.nodeValue+"px":e.height=e.clientHeight}return e}};Y.init();for(var W=[],X=0;16>X;X++)for(var q=0;16>q;q++)W[16*X+q]=X.toString(16)+q.toString(16);var G={aliceblue:"#F0F8FF",antiquewhite:"#FAEBD7",aquamarine:"#7FFFD4",azure:"#F0FFFF",beige:"#F5F5DC",bisque:"#FFE4C4",black:"#000000",blanchedalmond:"#FFEBCD",blueviolet:"#8A2BE2",brown:"#A52A2A",burlywood:"#DEB887",cadetblue:"#5F9EA0",chartreuse:"#7FFF00",chocolate:"#D2691E",coral:"#FF7F50",cornflowerblue:"#6495ED",cornsilk:"#FFF8DC",crimson:"#DC143C",cyan:"#00FFFF",darkblue:"#00008B",darkcyan:"#008B8B",darkgoldenrod:"#B8860B",darkgray:"#A9A9A9",darkgreen:"#006400",darkgrey:"#A9A9A9",darkkhaki:"#BDB76B",darkmagenta:"#8B008B",darkolivegreen:"#556B2F",darkorange:"#FF8C00",darkorchid:"#9932CC",darkred:"#8B0000",darksalmon:"#E9967A",darkseagreen:"#8FBC8F",darkslateblue:"#483D8B",darkslategray:"#2F4F4F",darkslategrey:"#2F4F4F",darkturquoise:"#00CED1",darkviolet:"#9400D3",deeppink:"#FF1493",deepskyblue:"#00BFFF",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1E90FF",firebrick:"#B22222",floralwhite:"#FFFAF0",forestgreen:"#228B22",gainsboro:"#DCDCDC",ghostwhite:"#F8F8FF",gold:"#FFD700",goldenrod:"#DAA520",grey:"#808080",greenyellow:"#ADFF2F",honeydew:"#F0FFF0",hotpink:"#FF69B4",indianred:"#CD5C5C",indigo:"#4B0082",ivory:"#FFFFF0",khaki:"#F0E68C",lavender:"#E6E6FA",lavenderblush:"#FFF0F5",lawngreen:"#7CFC00",lemonchiffon:"#FFFACD",lightblue:"#ADD8E6",lightcoral:"#F08080",lightcyan:"#E0FFFF",lightgoldenrodyellow:"#FAFAD2",lightgreen:"#90EE90",lightgrey:"#D3D3D3",lightpink:"#FFB6C1",lightsalmon:"#FFA07A",lightseagreen:"#20B2AA",lightskyblue:"#87CEFA",lightslategray:"#778899",lightslategrey:"#778899",lightsteelblue:"#B0C4DE",lightyellow:"#FFFFE0",limegreen:"#32CD32",linen:"#FAF0E6",magenta:"#FF00FF",mediumaquamarine:"#66CDAA",mediumblue:"#0000CD",mediumorchid:"#BA55D3",mediumpurple:"#9370DB",mediumseagreen:"#3CB371",mediumslateblue:"#7B68EE",mediumspringgreen:"#00FA9A",mediumturquoise:"#48D1CC",mediumvioletred:"#C71585",midnightblue:"#191970",mintcream:"#F5FFFA",mistyrose:"#FFE4E1",moccasin:"#FFE4B5",navajowhite:"#FFDEAD",oldlace:"#FDF5E6",olivedrab:"#6B8E23",orange:"#FFA500",orangered:"#FF4500",orchid:"#DA70D6",palegoldenrod:"#EEE8AA",palegreen:"#98FB98",paleturquoise:"#AFEEEE",palevioletred:"#DB7093",papayawhip:"#FFEFD5",peachpuff:"#FFDAB9",peru:"#CD853F",pink:"#FFC0CB",plum:"#DDA0DD",powderblue:"#B0E0E6",rosybrown:"#BC8F8F",royalblue:"#4169E1",saddlebrown:"#8B4513",salmon:"#FA8072",sandybrown:"#F4A460",seagreen:"#2E8B57",seashell:"#FFF5EE",sienna:"#A0522D",skyblue:"#87CEEB",slateblue:"#6A5ACD",slategray:"#708090",slategrey:"#708090",snow:"#FFFAFA",springgreen:"#00FF7F",steelblue:"#4682B4",tan:"#D2B48C",thistle:"#D8BFD8",tomato:"#FF6347",turquoise:"#40E0D0",violet:"#EE82EE",wheat:"#F5DEB3",whitesmoke:"#F5F5F5",yellowgreen:"#9ACD32"},V={},Z={style:"normal",variant:"normal",weight:"normal",size:12,family:"微软雅黑"},U={},Q={butt:"flat",round:"round"},j=x.prototype;j.clearRect=function(){this.textMeasureEl_&&(this.textMeasureEl_.removeNode(!0),this.textMeasureEl_=null),this.element_.innerHTML=""},j.beginPath=function(){this.currentPath_=[]},j.moveTo=function(t,e){var i=z(this,t,e);this.currentPath_.push({type:"moveTo",x:i.x,y:i.y}),this.currentX_=i.x,this.currentY_=i.y},j.lineTo=function(t,e){var i=z(this,t,e);this.currentPath_.push({type:"lineTo",x:i.x,y:i.y}),this.currentX_=i.x,this.currentY_=i.y},j.bezierCurveTo=function(t,e,i,o,n,r){var s=z(this,n,r),a=z(this,t,e),h=z(this,i,o);b(this,a,h,s)},j.quadraticCurveTo=function(t,e,i,o){var n=z(this,t,e),r=z(this,i,o),s={x:this.currentX_+2/3*(n.x-this.currentX_),y:this.currentY_+2/3*(n.y-this.currentY_)},a={x:s.x+(r.x-this.currentX_)/3,y:s.y+(r.y-this.currentY_)/3};b(this,s,a,r)},j.arc=function(t,e,i,o,n,r){i*=B;var s=r?"at":"wa",a=t+D(o)*i-F,h=e+O(o)*i-F,l=t+D(n)*i-F,c=e+O(n)*i-F;a!=l||r||(a+=.125);var d=z(this,t,e),u=z(this,a,h),p=z(this,l,c);this.currentPath_.push({type:s,x:d.x,y:d.y,radius:i,xStart:u.x,yStart:u.y,xEnd:p.x,yEnd:p.y})},j.rect=function(t,e,i,o){this.moveTo(t,e),this.lineTo(t+i,e),this.lineTo(t+i,e+o),this.lineTo(t,e+o),this.closePath()},j.strokeRect=function(t,e,i,o){var n=this.currentPath_;this.beginPath(),this.moveTo(t,e),this.lineTo(t+i,e),this.lineTo(t+i,e+o),this.lineTo(t,e+o),this.closePath(),this.stroke(),this.currentPath_=n},j.fillRect=function(t,e,i,o){var n=this.currentPath_;this.beginPath(),this.moveTo(t,e),this.lineTo(t+i,e),this.lineTo(t+i,e+o),this.lineTo(t,e+o),this.closePath(),this.fill(),this.currentPath_=n},j.createLinearGradient=function(t,e,i,o){var n=new w("gradient");return n.x0_=t,n.y0_=e,n.x1_=i,n.y1_=o,n},j.createRadialGradient=function(t,e,i,o,n,r){var s=new w("gradientradial");return s.x0_=t,s.y0_=e,s.r0_=i,s.x1_=o,s.y1_=n,s.r1_=r,s},j.drawImage=function(t){var e,i,o,n,r,s,a,h,l=t.runtimeStyle.width,c=t.runtimeStyle.height;t.runtimeStyle.width="auto",t.runtimeStyle.height="auto";var d=t.width,u=t.height;if(t.runtimeStyle.width=l,t.runtimeStyle.height=c,3==arguments.length)e=arguments[1],i=arguments[2],r=s=0,a=o=d,h=n=u;else if(5==arguments.length)e=arguments[1],i=arguments[2],o=arguments[3],n=arguments[4],r=s=0,a=d,h=u;else{if(9!=arguments.length)throw Error("Invalid number of arguments");r=arguments[1],s=arguments[2],a=arguments[3],h=arguments[4],e=arguments[5],i=arguments[6],o=arguments[7],n=arguments[8]}var p=z(this,e,i),f=[],g=10,m=10,_=v=1;if(f.push(" <g_vml_:group",' coordsize="',B*g,",",B*m,'"',' coordorigin="0,0"',' style="width:',g,"px;height:",m,"px;position:absolute;"),1!=this.m_[0][0]||this.m_[0][1]||1!=this.m_[1][1]||this.m_[1][0]){var y=[],_=this.scaleX_,v=this.scaleY_;y.push("M11=",this.m_[0][0]/_,",","M12=",this.m_[1][0]/v,",","M21=",this.m_[0][1]/_,",","M22=",this.m_[1][1]/v,",","Dx=",I(p.x/B),",","Dy=",I(p.y/B),"");var x=p,b=z(this,e+o,i),T=z(this,e,i+n),S=z(this,e+o,i+n);x.x=P.max(x.x,b.x,T.x,S.x),x.y=P.max(x.y,b.y,T.y,S.y),f.push("padding:0 ",I(x.x/B),"px ",I(x.y/B),"px 0;filter:progid:DXImageTransform.Microsoft.Matrix(",y.join(""),", SizingMethod='clip');")}else f.push("top:",I(p.y/B),"px;left:",I(p.x/B),"px;");f.push(' ">'),(r||s)&&f.push('<div style="overflow: hidden; width:',Math.ceil((o+r*o/a)*_),"px;"," height:",Math.ceil((n+s*n/h)*v),"px;"," filter:progid:DxImageTransform.Microsoft.Matrix(Dx=",-r*o/a*_,",Dy=",-s*n/h*v,');">'),f.push('<div style="width:',Math.round(_*d*o/a),"px;"," height:",Math.round(v*u*n/h),"px;"," filter:"),this.globalAlpha<1&&f.push(" progid:DXImageTransform.Microsoft.Alpha(opacity="+100*this.globalAlpha+")"),f.push(" progid:DXImageTransform.Microsoft.AlphaImageLoader(src=",t.src,',sizingMethod=scale)">'),(r||s)&&f.push("</div>"),f.push("</div></div>"),this.element_.insertAdjacentHTML("BeforeEnd",f.join(""))},j.stroke=function(t){var e=[],i=10,o=10;e.push("<g_vml_:shape",' filled="',!!t,'"',' style="position:absolute;width:',i,"px;height:",o,'px;"',' coordorigin="0,0"',' coordsize="',B*i,",",B*o,'"',' stroked="',!t,'"',' path="');for(var n={x:null,y:null},r={x:null,y:null},s=0;s<this.currentPath_.length;s++){var a,h=this.currentPath_[s];switch(h.type){case"moveTo":a=h,e.push(" m ",I(h.x),",",I(h.y));break;case"lineTo":e.push(" l ",I(h.x),",",I(h.y));break;case"close":e.push(" x "),h=null;break;case"bezierCurveTo":e.push(" c ",I(h.cp1x),",",I(h.cp1y),",",I(h.cp2x),",",I(h.cp2y),",",I(h.x),",",I(h.y));break;case"at":case"wa":e.push(" ",h.type," ",I(h.x-this.scaleX_*h.radius),",",I(h.y-this.scaleY_*h.radius)," ",I(h.x+this.scaleX_*h.radius),",",I(h.y+this.scaleY_*h.radius)," ",I(h.xStart),",",I(h.yStart)," ",I(h.xEnd),",",I(h.yEnd))}h&&((null==n.x||h.x<n.x)&&(n.x=h.x),(null==r.x||h.x>r.x)&&(r.x=h.x),(null==n.y||h.y<n.y)&&(n.y=h.y),(null==r.y||h.y>r.y)&&(r.y=h.y))}e.push(' ">'),t?S(this,e,n,r):T(this,e),e.push("</g_vml_:shape>"),this.element_.insertAdjacentHTML("beforeEnd",e.join(""))},j.fill=function(){this.stroke(!0)},j.closePath=function(){this.currentPath_.push({type:"close"})},j.save=function(){var t={};l(this,t),this.aStack_.push(t),this.mStack_.push(this.m_),this.m_=h(a(),this.m_)},j.restore=function(){this.aStack_.length&&(l(this.aStack_.pop(),this),this.m_=this.mStack_.pop())},j.translate=function(t,e){var i=[[1,0,0],[0,1,0],[t,e,1]];E(this,h(i,this.m_),!1)},j.rotate=function(t){var e=D(t),i=O(t),o=[[e,i,0],[-i,e,0],[0,0,1]];E(this,h(o,this.m_),!1)},j.scale=function(t,e){var i=[[t,0,0],[0,e,0],[0,0,1]];E(this,h(i,this.m_),!0)},j.transform=function(t,e,i,o,n,r){var s=[[t,e,0],[i,o,0],[n,r,1]];E(this,h(s,this.m_),!0)},j.setTransform=function(t,e,i,o,n,r){var s=[[t,e,0],[i,o,0],[n,r,1]];E(this,s,!0)},j.drawText_=function(t,e,o,n,r){var s=this.m_,a=1e3,h=0,l=a,c={x:0,y:0},d=[],u=_(m(this.font),this.element_),p=y(u),f=this.element_.currentStyle,g=this.textAlign.toLowerCase();switch(g){case"left":case"center":case"right":break;case"end":g="ltr"==f.direction?"right":"left";break;case"start":g="rtl"==f.direction?"right":"left";break;default:g="left"}switch(this.textBaseline){case"hanging":case"top":c.y=u.size/1.75;break;case"middle":break;default:case null:case"alphabetic":case"ideographic":case"bottom":c.y=-u.size/2.25}switch(g){case"right":h=a,l=.05;break;case"center":h=l=a/2}var v=z(this,e+c.x,o+c.y);d.push('<g_vml_:line from="',-h,' 0" to="',l,' 0.05" ',' coordsize="100 100" coordorigin="0 0"',' filled="',!r,'" stroked="',!!r,'" style="position:absolute;width:1px;height:1px;">'),r?T(this,d):S(this,d,{x:-h,y:0},{x:l,y:u.size});var x=s[0][0].toFixed(3)+","+s[1][0].toFixed(3)+","+s[0][1].toFixed(3)+","+s[1][1].toFixed(3)+",0,0",b=I(v.x/B)+","+I(v.y/B);d.push('<g_vml_:skew on="t" matrix="',x,'" ',' offset="',b,'" origin="',h,' 0" />','<g_vml_:path textpathok="true" />','<g_vml_:textpath on="true" string="',i(t),'" style="v-text-align:',g,";font:",i(p),'" /></g_vml_:line>'),this.element_.insertAdjacentHTML("beforeEnd",d.join(""))},j.fillText=function(t,e,i,o){this.drawText_(t,e,i,o,!1)},j.strokeText=function(t,e,i,o){this.drawText_(t,e,i,o,!0)},j.measureText=function(t){if(!this.textMeasureEl_){var e='<span style="position:absolute;top:-20000px;left:0;padding:0;margin:0;border:none;white-space:pre;"></span>';this.element_.insertAdjacentHTML("beforeEnd",e),this.textMeasureEl_=this.element_.lastChild}var i=this.element_.ownerDocument;this.textMeasureEl_.innerHTML="";try{this.textMeasureEl_.style.font=this.font}catch(o){}return this.textMeasureEl_.appendChild(i.createTextNode(t)),{width:this.textMeasureEl_.offsetWidth}},j.clip=function(){},j.arcTo=function(){},j.createPattern=function(t,e){return new L(t,e)},w.prototype.addColorStop=function(t,e){e=g(e),this.colors_.push({offset:t,color:e.color,alpha:e.alpha})};var K=k.prototype=new Error;K.INDEX_SIZE_ERR=1,K.DOMSTRING_SIZE_ERR=2,K.HIERARCHY_REQUEST_ERR=3,K.WRONG_DOCUMENT_ERR=4,K.INVALID_CHARACTER_ERR=5,K.NO_DATA_ALLOWED_ERR=6,K.NO_MODIFICATION_ALLOWED_ERR=7,K.NOT_FOUND_ERR=8,K.NOT_SUPPORTED_ERR=9,K.INUSE_ATTRIBUTE_ERR=10,K.INVALID_STATE_ERR=11,K.SYNTAX_ERR=12,K.INVALID_MODIFICATION_ERR=13,K.NAMESPACE_ERR=14,K.INVALID_ACCESS_ERR=15,K.VALIDATION_ERR=16,K.TYPE_MISMATCH_ERR=17,G_vmlCanvasManager=Y,CanvasRenderingContext2D=x,CanvasGradient=w,CanvasPattern=L,DOMException=k}(),G_vmlCanvasManager}),i("zrender/shape/Base",["require","../tool/matrix","../tool/guid","../tool/util","../tool/log","../mixin/Transformable","../mixin/Eventful","../tool/area","../tool/color"],function(t){function e(e,o,n,r,s,a,h){s&&(e.font=s),e.textAlign=a,e.textBaseline=h;var l=i(o,n,r,s,a,h);o=(o+"").split("\n");var c=t("../tool/area").getTextHeight("国",s);switch(h){case"top":r=l.y;break;case"bottom":r=l.y+c;break;default:r=l.y+c/2}for(var d=0,u=o.length;u>d;d++)e.fillText(o[d],n,r),r+=c}function i(e,i,o,n,r,s){var a=t("../tool/area"),h=a.getTextWidth(e,n),l=a.getTextHeight("国",n);switch(e=(e+"").split("\n"),r){case"end":case"right":i-=h;break;case"center":i-=h/2}switch(s){case"top":break;case"bottom":o-=l*e.length;break;default:o-=l*e.length/2}return{x:i,y:o,width:h,height:l*e.length}}var o=window.G_vmlCanvasManager,n=t("../tool/matrix"),r=t("../tool/guid"),s=t("../tool/util"),a=t("../tool/log"),h=t("../mixin/Transformable"),l=t("../mixin/Eventful"),c=function(t){t=t||{},this.id=t.id||r();for(var e in t)this[e]=t[e];this.style=this.style||{},this.highlightStyle=this.highlightStyle||null,this.parent=null,this.__dirty=!0,this.__clipShapes=[],h.call(this),l.call(this)};c.prototype.invisible=!1,c.prototype.ignore=!1,c.prototype.zlevel=0,c.prototype.draggable=!1,c.prototype.clickable=!1,c.prototype.hoverable=!0,c.prototype.z=0,c.prototype.brush=function(t,e){var i=this.beforeBrush(t,e);switch(t.beginPath(),this.buildPath(t,i),i.brushType){case"both":t.fill();case"stroke":i.lineWidth>0&&t.stroke();break;default:t.fill()}this.drawText(t,i,this.style),this.afterBrush(t)},c.prototype.beforeBrush=function(t,e){var i=this.style;return this.brushTypeOnly&&(i.brushType=this.brushTypeOnly),e&&(i=this.getHighlightStyle(i,this.highlightStyle||{},this.brushTypeOnly)),"stroke"==this.brushTypeOnly&&(i.strokeColor=i.strokeColor||i.color),t.save(),this.doClip(t),this.setContext(t,i),this.setTransform(t),i},c.prototype.afterBrush=function(t){t.restore()};var d=[["color","fillStyle"],["strokeColor","strokeStyle"],["opacity","globalAlpha"],["lineCap","lineCap"],["lineJoin","lineJoin"],["miterLimit","miterLimit"],["lineWidth","lineWidth"],["shadowBlur","shadowBlur"],["shadowColor","shadowColor"],["shadowOffsetX","shadowOffsetX"],["shadowOffsetY","shadowOffsetY"]];c.prototype.setContext=function(t,e){for(var i=0,o=d.length;o>i;i++){var n=d[i][0],r=e[n],s=d[i][1];"undefined"!=typeof r&&(t[s]=r)}};var u=n.create();return c.prototype.doClip=function(t){if(this.__clipShapes&&!o)for(var e=0;e<this.__clipShapes.length;e++){var i=this.__clipShapes[e];if(i.needTransform){var r=i.transform;n.invert(u,r),t.transform(r[0],r[1],r[2],r[3],r[4],r[5])}if(t.beginPath(),i.buildPath(t,i.style),t.clip(),i.needTransform){var r=u;
t.transform(r[0],r[1],r[2],r[3],r[4],r[5])}}},c.prototype.getHighlightStyle=function(e,i,o){var n={};for(var r in e)n[r]=e[r];var s=t("../tool/color"),a=s.getHighlightColor();"stroke"!=e.brushType?(n.strokeColor=a,n.lineWidth=(e.lineWidth||1)+this.getHighlightZoom(),n.brushType="both"):"stroke"!=o?(n.strokeColor=a,n.lineWidth=(e.lineWidth||1)+this.getHighlightZoom()):n.strokeColor=i.strokeColor||s.mix(e.strokeColor,s.toRGB(a));for(var r in i)"undefined"!=typeof i[r]&&(n[r]=i[r]);return n},c.prototype.getHighlightZoom=function(){return"text"!=this.type?6:2},c.prototype.drift=function(t,e){this.position[0]+=t,this.position[1]+=e},c.prototype.buildPath=function(){a("buildPath not implemented in "+this.type)},c.prototype.getRect=function(){a("getRect not implemented in "+this.type)},c.prototype.isCover=function(e,i){var o=this.transformCoordToLocal(e,i);return e=o[0],i=o[1],this.isCoverRect(e,i)?t("../tool/area").isInside(this,this.style,e,i):!1},c.prototype.isCoverRect=function(t,e){var i=this.style.__rect;return i||(i=this.style.__rect=this.getRect(this.style)),t>=i.x&&t<=i.x+i.width&&e>=i.y&&e<=i.y+i.height},c.prototype.drawText=function(t,i,o){if("undefined"!=typeof i.text&&i.text!==!1){var n=i.textColor||i.color||i.strokeColor;t.fillStyle=n;var r,s,a,h,l=10,c=i.textPosition||this.textPosition||"top";switch(c){case"inside":case"top":case"bottom":case"left":case"right":if(this.getRect){var d=(o||i).__rect||this.getRect(o||i);switch(c){case"inside":a=d.x+d.width/2,h=d.y+d.height/2,r="center",s="middle","stroke"!=i.brushType&&n==i.color&&(t.fillStyle="#fff");break;case"left":a=d.x-l,h=d.y+d.height/2,r="end",s="middle";break;case"right":a=d.x+d.width+l,h=d.y+d.height/2,r="start",s="middle";break;case"top":a=d.x+d.width/2,h=d.y-l,r="center",s="bottom";break;case"bottom":a=d.x+d.width/2,h=d.y+d.height+l,r="center",s="top"}}break;case"start":case"end":var u=i.pointList||[[i.xStart||0,i.yStart||0],[i.xEnd||0,i.yEnd||0]],p=u.length;if(2>p)return;var f,g,m,_;switch(c){case"start":f=u[1][0],g=u[0][0],m=u[1][1],_=u[0][1];break;case"end":f=u[p-2][0],g=u[p-1][0],m=u[p-2][1],_=u[p-1][1]}a=g,h=_;var y=Math.atan((m-_)/(g-f))/Math.PI*180;0>g-f?y+=180:0>m-_&&(y+=360),l=5,y>=30&&150>=y?(r="center",s="bottom",h-=l):y>150&&210>y?(r="right",s="middle",a-=l):y>=210&&330>=y?(r="center",s="top",h+=l):(r="left",s="middle",a+=l);break;case"specific":a=i.textX||0,h=i.textY||0,r="start",s="middle"}null!=a&&null!=h&&e(t,i.text,a,h,i.textFont,i.textAlign||r,i.textBaseline||s)}},c.prototype.modSelf=function(){this.__dirty=!0,this.style&&(this.style.__rect=null),this.highlightStyle&&(this.highlightStyle.__rect=null)},c.prototype.isSilent=function(){return!(this.hoverable||this.draggable||this.clickable||this.onmousemove||this.onmouseover||this.onmouseout||this.onmousedown||this.onmouseup||this.onclick||this.ondragenter||this.ondragover||this.ondragleave||this.ondrop)},s.merge(c.prototype,h.prototype,!0),s.merge(c.prototype,l.prototype,!0),c}),i("zrender/mixin/Eventful",["require"],function(){var t=function(){this._handlers={}};return t.prototype.one=function(t,e,i){var o=this._handlers;return e&&t?(o[t]||(o[t]=[]),o[t].push({h:e,one:!0,ctx:i||this}),this):this},t.prototype.bind=function(t,e,i){var o=this._handlers;return e&&t?(o[t]||(o[t]=[]),o[t].push({h:e,one:!1,ctx:i||this}),this):this},t.prototype.unbind=function(t,e){var i=this._handlers;if(!t)return this._handlers={},this;if(e){if(i[t]){for(var o=[],n=0,r=i[t].length;r>n;n++)i[t][n].h!=e&&o.push(i[t][n]);i[t]=o}i[t]&&0===i[t].length&&delete i[t]}else delete i[t];return this},t.prototype.dispatch=function(t){if(this._handlers[t]){var e=arguments,i=e.length;i>3&&(e=Array.prototype.slice.call(e,1));for(var o=this._handlers[t],n=o.length,r=0;n>r;){switch(i){case 1:o[r].h.call(o[r].ctx);break;case 2:o[r].h.call(o[r].ctx,e[1]);break;case 3:o[r].h.call(o[r].ctx,e[1],e[2]);break;default:o[r].h.apply(o[r].ctx,e)}o[r].one?(o.splice(r,1),n--):r++}}return this},t.prototype.dispatchWithContext=function(t){if(this._handlers[t]){var e=arguments,i=e.length;i>4&&(e=Array.prototype.slice.call(e,1,e.length-1));for(var o=e[e.length-1],n=this._handlers[t],r=n.length,s=0;r>s;){switch(i){case 1:n[s].h.call(o);break;case 2:n[s].h.call(o,e[1]);break;case 3:n[s].h.call(o,e[1],e[2]);break;default:n[s].h.apply(o,e)}n[s].one?(n.splice(s,1),r--):s++}}return this},t}),i("zrender/tool/log",["require","../config"],function(t){var e=t("../config");return function(){if(0!==e.debugMode)if(1==e.debugMode)for(var t in arguments)throw new Error(arguments[t]);else if(e.debugMode>1)for(var t in arguments)console.log(arguments[t])}}),i("zrender/tool/guid",[],function(){var t=2311;return function(){return"zrender__"+t++}}),i("zrender/mixin/Transformable",["require","../tool/matrix","../tool/vector"],function(t){"use strict";function e(t){return t>-a&&a>t}function i(t){return t>a||-a>t}var o=t("../tool/matrix"),n=t("../tool/vector"),r=[0,0],s=o.translate,a=5e-5,h=function(){this.position||(this.position=[0,0]),"undefined"==typeof this.rotation&&(this.rotation=[0,0,0]),this.scale||(this.scale=[1,1,0,0]),this.needLocalTransform=!1,this.needTransform=!1};return h.prototype={constructor:h,updateNeedTransform:function(){this.needLocalTransform=i(this.rotation[0])||i(this.position[0])||i(this.position[1])||i(this.scale[0]-1)||i(this.scale[1]-1)},updateTransform:function(){this.updateNeedTransform();var t=this.parent&&this.parent.needTransform;if(this.needTransform=this.needLocalTransform||t,this.needTransform){var e=this.transform||o.create();if(o.identity(e),this.needLocalTransform){var n=this.scale;if(i(n[0])||i(n[1])){r[0]=-n[2]||0,r[1]=-n[3]||0;var a=i(r[0])||i(r[1]);a&&s(e,e,r),o.scale(e,e,n),a&&(r[0]=-r[0],r[1]=-r[1],s(e,e,r))}if(this.rotation instanceof Array){if(0!==this.rotation[0]){r[0]=-this.rotation[1]||0,r[1]=-this.rotation[2]||0;var a=i(r[0])||i(r[1]);a&&s(e,e,r),o.rotate(e,e,this.rotation[0]),a&&(r[0]=-r[0],r[1]=-r[1],s(e,e,r))}}else 0!==this.rotation&&o.rotate(e,e,this.rotation);(i(this.position[0])||i(this.position[1]))&&s(e,e,this.position)}t&&(this.needLocalTransform?o.mul(e,this.parent.transform,e):o.copy(e,this.parent.transform)),this.transform=e,this.invTransform=this.invTransform||o.create(),o.invert(this.invTransform,e)}},setTransform:function(t){if(this.needTransform){var e=this.transform;t.transform(e[0],e[1],e[2],e[3],e[4],e[5])}},lookAt:function(){var t=n.create();return function(i){this.transform||(this.transform=o.create());var r=this.transform;if(n.sub(t,i,this.position),!e(t[0])||!e(t[1])){n.normalize(t,t);var s=this.scale;r[2]=t[0]*s[1],r[3]=t[1]*s[1],r[0]=t[1]*s[0],r[1]=-t[0]*s[0],r[4]=this.position[0],r[5]=this.position[1],this.decomposeTransform()}}}(),decomposeTransform:function(){if(this.transform){var t=this.transform,e=t[0]*t[0]+t[1]*t[1],o=this.position,n=this.scale,r=this.rotation;i(e-1)&&(e=Math.sqrt(e));var s=t[2]*t[2]+t[3]*t[3];i(s-1)&&(s=Math.sqrt(s)),o[0]=t[4],o[1]=t[5],n[0]=e,n[1]=s,n[2]=n[3]=0,r[0]=Math.atan2(-t[1]/s,t[0]/e),r[1]=r[2]=0}},transformCoordToLocal:function(t,e){var i=[t,e];return this.needTransform&&this.invTransform&&n.applyTransform(i,i,this.invTransform),i}},h}),i("zrender/tool/matrix",[],function(){var t="undefined"==typeof Float32Array?Array:Float32Array,e={create:function(){var i=new t(6);return e.identity(i),i},identity:function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t},copy:function(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t},mul:function(t,e,i){return t[0]=e[0]*i[0]+e[2]*i[1],t[1]=e[1]*i[0]+e[3]*i[1],t[2]=e[0]*i[2]+e[2]*i[3],t[3]=e[1]*i[2]+e[3]*i[3],t[4]=e[0]*i[4]+e[2]*i[5]+e[4],t[5]=e[1]*i[4]+e[3]*i[5]+e[5],t},translate:function(t,e,i){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4]+i[0],t[5]=e[5]+i[1],t},rotate:function(t,e,i){var o=e[0],n=e[2],r=e[4],s=e[1],a=e[3],h=e[5],l=Math.sin(i),c=Math.cos(i);return t[0]=o*c+s*l,t[1]=-o*l+s*c,t[2]=n*c+a*l,t[3]=-n*l+c*a,t[4]=c*r+l*h,t[5]=c*h-l*r,t},scale:function(t,e,i){var o=i[0],n=i[1];return t[0]=e[0]*o,t[1]=e[1]*n,t[2]=e[2]*o,t[3]=e[3]*n,t[4]=e[4]*o,t[5]=e[5]*n,t},invert:function(t,e){var i=e[0],o=e[2],n=e[4],r=e[1],s=e[3],a=e[5],h=i*s-r*o;return h?(h=1/h,t[0]=s*h,t[1]=-r*h,t[2]=-o*h,t[3]=i*h,t[4]=(o*a-s*n)*h,t[5]=(r*n-i*a)*h,t):null}};return e}),i("zrender/Handler",["require","./config","./tool/env","./tool/event","./tool/util","./tool/vector","./tool/matrix","./mixin/Eventful"],function(t){"use strict";function e(t,e){return function(i,o){return t.call(e,i,o)}}function i(t,e){return function(i,o,n){return t.call(e,i,o,n)}}function o(t){for(var i=p.length;i--;){var o=p[i];t["_"+o+"Handler"]=e(g[o],t)}}function n(t,e,i){if(this._draggingTarget&&this._draggingTarget.id==t.id||t.isSilent())return!1;var o=this._event;if(t.isCover(e,i)){t.hoverable&&this.storage.addHover(t);for(var n=t.parent;n;){if(n.clipShape&&!n.clipShape.isCover(this._mouseX,this._mouseY))return!1;n=n.parent}return this._lastHover!=t&&(this._processOutShape(o),this._processDragLeave(o),this._lastHover=t,this._processDragEnter(o)),this._processOverShape(o),this._processDragOver(o),this._hasfound=1,!0}return!1}var r=t("./config"),s=t("./tool/env"),a=t("./tool/event"),h=t("./tool/util"),l=t("./tool/vector"),c=t("./tool/matrix"),d=r.EVENT,u=t("./mixin/Eventful"),p=["resize","click","dblclick","mousewheel","mousemove","mouseout","mouseup","mousedown","touchstart","touchend","touchmove"],f=function(t){if(window.G_vmlCanvasManager)return!0;t=t||window.event;var e=t.toElement||t.relatedTarget||t.srcElement||t.target;return e&&e.className.match(r.elementClassName)},g={resize:function(t){t=t||window.event,this._lastHover=null,this._isMouseDown=0,this.dispatch(d.RESIZE,t)},click:function(t,e){if(f(t)||e){t=this._zrenderEventFixed(t);var i=this._lastHover;(i&&i.clickable||!i)&&this._clickThreshold<5&&this._dispatchAgency(i,d.CLICK,t),this._mousemoveHandler(t)}},dblclick:function(t,e){if(f(t)||e){t=t||window.event,t=this._zrenderEventFixed(t);var i=this._lastHover;(i&&i.clickable||!i)&&this._clickThreshold<5&&this._dispatchAgency(i,d.DBLCLICK,t),this._mousemoveHandler(t)}},mousewheel:function(t,e){if(f(t)||e){t=this._zrenderEventFixed(t);var i=t.wheelDelta||-t.detail,o=i>0?1.1:1/1.1,n=!1,r=this._mouseX,s=this._mouseY;this.painter.eachBuildinLayer(function(e){var i=e.position;if(e.zoomable){e.__zoom=e.__zoom||1;var h=e.__zoom;h*=o,h=Math.max(Math.min(e.maxZoom,h),e.minZoom),o=h/e.__zoom,e.__zoom=h,i[0]-=(r-i[0])*(o-1),i[1]-=(s-i[1])*(o-1),e.scale[0]*=o,e.scale[1]*=o,e.dirty=!0,n=!0,a.stop(t)}}),n&&this.painter.refresh(),this._dispatchAgency(this._lastHover,d.MOUSEWHEEL,t),this._mousemoveHandler(t)}},mousemove:function(t,e){if((f(t)||e)&&!this.painter.isLoading()){t=this._zrenderEventFixed(t),this._lastX=this._mouseX,this._lastY=this._mouseY,this._mouseX=a.getX(t),this._mouseY=a.getY(t);var i=this._mouseX-this._lastX,o=this._mouseY-this._lastY;this._processDragStart(t),this._hasfound=0,this._event=t,this._iterateAndFindHover(),this._hasfound||((!this._draggingTarget||this._lastHover&&this._lastHover!=this._draggingTarget)&&(this._processOutShape(t),this._processDragLeave(t)),this._lastHover=null,this.storage.delHover(),this.painter.clearHover());var n="default";if(this._draggingTarget)this.storage.drift(this._draggingTarget.id,i,o),this._draggingTarget.modSelf(),this.storage.addHover(this._draggingTarget),this._clickThreshold++;else if(this._isMouseDown){var r=!1;this.painter.eachBuildinLayer(function(t){t.panable&&(n="move",t.position[0]+=i,t.position[1]+=o,r=!0,t.dirty=!0)}),r&&this.painter.refresh()}this._draggingTarget||this._hasfound&&this._lastHover.draggable?n="move":this._hasfound&&this._lastHover.clickable&&(n="pointer"),this.root.style.cursor=n,this._dispatchAgency(this._lastHover,d.MOUSEMOVE,t),(this._draggingTarget||this._hasfound||this.storage.hasHoverShape())&&this.painter.refreshHover()}},mouseout:function(t,e){if(f(t)||e){t=this._zrenderEventFixed(t);var i=t.toElement||t.relatedTarget;if(i!=this.root)for(;i&&9!=i.nodeType;){if(i==this.root)return void this._mousemoveHandler(t);i=i.parentNode}t.zrenderX=this._lastX,t.zrenderY=this._lastY,this.root.style.cursor="default",this._isMouseDown=0,this._processOutShape(t),this._processDrop(t),this._processDragEnd(t),this.painter.isLoading()||this.painter.refreshHover(),this.dispatch(d.GLOBALOUT,t)}},mousedown:function(t,e){if(f(t)||e){if(this._clickThreshold=0,2==this._lastDownButton)return this._lastDownButton=t.button,void(this._mouseDownTarget=null);this._lastMouseDownMoment=new Date,t=this._zrenderEventFixed(t),this._isMouseDown=1,this._mouseDownTarget=this._lastHover,this._dispatchAgency(this._lastHover,d.MOUSEDOWN,t),this._lastDownButton=t.button}},mouseup:function(t,e){(f(t)||e)&&(t=this._zrenderEventFixed(t),this.root.style.cursor="default",this._isMouseDown=0,this._mouseDownTarget=null,this._dispatchAgency(this._lastHover,d.MOUSEUP,t),this._processDrop(t),this._processDragEnd(t))},touchstart:function(t,e){(f(t)||e)&&(t=this._zrenderEventFixed(t,!0),this._lastTouchMoment=new Date,this._mobileFindFixed(t),this._mousedownHandler(t))},touchmove:function(t,e){(f(t)||e)&&(t=this._zrenderEventFixed(t,!0),this._mousemoveHandler(t),this._isDragging&&a.stop(t))},touchend:function(t,e){if(f(t)||e){t=this._zrenderEventFixed(t,!0),this._mouseupHandler(t);var i=new Date;i-this._lastTouchMoment<d.touchClickDelay&&(this._mobileFindFixed(t),this._clickHandler(t),i-this._lastClickMoment<d.touchClickDelay/2&&(this._dblclickHandler(t),this._lastHover&&this._lastHover.clickable&&a.stop(t)),this._lastClickMoment=i),this.painter.clearHover()}}},m=function(t,e,r){u.call(this),this.root=t,this.storage=e,this.painter=r,this._lastX=this._lastY=this._mouseX=this._mouseY=0,this._findHover=i(n,this),this._domHover=r.getDomHover(),o(this),window.addEventListener?(window.addEventListener("resize",this._resizeHandler),s.os.tablet||s.os.phone?(t.addEventListener("touchstart",this._touchstartHandler),t.addEventListener("touchmove",this._touchmoveHandler),t.addEventListener("touchend",this._touchendHandler)):(t.addEventListener("click",this._clickHandler),t.addEventListener("dblclick",this._dblclickHandler),t.addEventListener("mousewheel",this._mousewheelHandler),t.addEventListener("mousemove",this._mousemoveHandler),t.addEventListener("mousedown",this._mousedownHandler),t.addEventListener("mouseup",this._mouseupHandler)),t.addEventListener("DOMMouseScroll",this._mousewheelHandler),t.addEventListener("mouseout",this._mouseoutHandler)):(window.attachEvent("onresize",this._resizeHandler),t.attachEvent("onclick",this._clickHandler),t.ondblclick=this._dblclickHandler,t.attachEvent("onmousewheel",this._mousewheelHandler),t.attachEvent("onmousemove",this._mousemoveHandler),t.attachEvent("onmouseout",this._mouseoutHandler),t.attachEvent("onmousedown",this._mousedownHandler),t.attachEvent("onmouseup",this._mouseupHandler))};m.prototype.on=function(t,e,i){return this.bind(t,e,i),this},m.prototype.un=function(t,e){return this.unbind(t,e),this},m.prototype.trigger=function(t,e){switch(t){case d.RESIZE:case d.CLICK:case d.DBLCLICK:case d.MOUSEWHEEL:case d.MOUSEMOVE:case d.MOUSEDOWN:case d.MOUSEUP:case d.MOUSEOUT:this["_"+t+"Handler"](e,!0)}},m.prototype.dispose=function(){var t=this.root;window.removeEventListener?(window.removeEventListener("resize",this._resizeHandler),s.os.tablet||s.os.phone?(t.removeEventListener("touchstart",this._touchstartHandler),t.removeEventListener("touchmove",this._touchmoveHandler),t.removeEventListener("touchend",this._touchendHandler)):(t.removeEventListener("click",this._clickHandler),t.removeEventListener("dblclick",this._dblclickHandler),t.removeEventListener("mousewheel",this._mousewheelHandler),t.removeEventListener("mousemove",this._mousemoveHandler),t.removeEventListener("mousedown",this._mousedownHandler),t.removeEventListener("mouseup",this._mouseupHandler)),t.removeEventListener("DOMMouseScroll",this._mousewheelHandler),t.removeEventListener("mouseout",this._mouseoutHandler)):(window.detachEvent("onresize",this._resizeHandler),t.detachEvent("onclick",this._clickHandler),t.detachEvent("dblclick",this._dblclickHandler),t.detachEvent("onmousewheel",this._mousewheelHandler),t.detachEvent("onmousemove",this._mousemoveHandler),t.detachEvent("onmouseout",this._mouseoutHandler),t.detachEvent("onmousedown",this._mousedownHandler),t.detachEvent("onmouseup",this._mouseupHandler)),this.root=this._domHover=this.storage=this.painter=null,this.un()},m.prototype._processDragStart=function(t){var e=this._lastHover;if(this._isMouseDown&&e&&e.draggable&&!this._draggingTarget&&this._mouseDownTarget==e){if(e.dragEnableTime&&new Date-this._lastMouseDownMoment<e.dragEnableTime)return;var i=e;this._draggingTarget=i,this._isDragging=1,i.invisible=!0,this.storage.mod(i.id),this._dispatchAgency(i,d.DRAGSTART,t),this.painter.refresh()}},m.prototype._processDragEnter=function(t){this._draggingTarget&&this._dispatchAgency(this._lastHover,d.DRAGENTER,t,this._draggingTarget)},m.prototype._processDragOver=function(t){this._draggingTarget&&this._dispatchAgency(this._lastHover,d.DRAGOVER,t,this._draggingTarget)},m.prototype._processDragLeave=function(t){this._draggingTarget&&this._dispatchAgency(this._lastHover,d.DRAGLEAVE,t,this._draggingTarget)},m.prototype._processDrop=function(t){this._draggingTarget&&(this._draggingTarget.invisible=!1,this.storage.mod(this._draggingTarget.id),this.painter.refresh(),this._dispatchAgency(this._lastHover,d.DROP,t,this._draggingTarget))},m.prototype._processDragEnd=function(t){this._draggingTarget&&(this._dispatchAgency(this._draggingTarget,d.DRAGEND,t),this._lastHover=null),this._isDragging=0,this._draggingTarget=null},m.prototype._processOverShape=function(t){this._dispatchAgency(this._lastHover,d.MOUSEOVER,t)},m.prototype._processOutShape=function(t){this._dispatchAgency(this._lastHover,d.MOUSEOUT,t)},m.prototype._dispatchAgency=function(t,e,i,o){var n="on"+e,r={type:e,event:i,target:t,cancelBubble:!1},s=t;for(o&&(r.dragged=o);s&&(s[n]&&(r.cancelBubble=s[n](r)),s.dispatch(e,r),s=s.parent,!r.cancelBubble););if(t)r.cancelBubble||this.dispatch(e,r);else if(!o){var a={type:e,event:i};this.dispatch(e,a),this.painter.eachOtherLayer(function(t){"function"==typeof t[n]&&t[n](a),t.dispatch&&t.dispatch(e,a)})}},m.prototype._iterateAndFindHover=function(){var t=c.create();return function(){for(var e,i,o=this.storage.getShapeList(),n=[0,0],r=o.length-1;r>=0;r--){var s=o[r];if(e!==s.zlevel&&(i=this.painter.getLayer(s.zlevel,i),n[0]=this._mouseX,n[1]=this._mouseY,i.needTransform&&(c.invert(t,i.transform),l.applyTransform(n,n,t))),this._findHover(s,n[0],n[1]))break}}}();var _=[{x:10},{x:-20},{x:10,y:10},{y:-20}];return m.prototype._mobileFindFixed=function(t){this._lastHover=null,this._mouseX=t.zrenderX,this._mouseY=t.zrenderY,this._event=t,this._iterateAndFindHover();for(var e=0;!this._lastHover&&e<_.length;e++){var i=_[e];i.x&&(this._mouseX+=i.x),i.y&&(this._mouseY+=i.y),this._iterateAndFindHover()}this._lastHover&&(t.zrenderX=this._mouseX,t.zrenderY=this._mouseY)},m.prototype._zrenderEventFixed=function(t,e){if(t.zrenderFixed)return t;if(e){var i="touchend"!=t.type?t.targetTouches[0]:t.changedTouches[0];if(i){var o=this.painter._domRoot.getBoundingClientRect();t.zrenderX=i.clientX-o.left,t.zrenderY=i.clientY-o.top}}else{t=t||window.event;var n=t.toElement||t.relatedTarget||t.srcElement||t.target;n&&n!=this._domHover&&(t.zrenderX=("undefined"!=typeof t.offsetX?t.offsetX:t.layerX)+n.offsetLeft,t.zrenderY=("undefined"!=typeof t.offsetY?t.offsetY:t.layerY)+n.offsetTop)}return t.zrenderFixed=1,t},h.merge(m.prototype,u.prototype,!0),m}),i("zrender/Painter",["require","./config","./tool/util","./tool/log","./loadingEffect/Base","./Layer","./shape/Image"],function(t){"use strict";function e(){return!1}function i(){}function o(t){return t?t.isBuildin?!0:"function"!=typeof t.resize||"function"!=typeof t.refresh?!1:!0:!1}var n=t("./config"),r=t("./tool/util"),s=t("./tool/log"),a=t("./loadingEffect/Base"),h=t("./Layer"),l=function(t,i){this.root=t,t.style["-webkit-tap-highlight-color"]="transparent",t.style["-webkit-user-select"]="none",t.style["user-select"]="none",t.style["-webkit-touch-callout"]="none",this.storage=i,t.innerHTML="",this._width=this._getWidth(),this._height=this._getHeight();var o=document.createElement("div");this._domRoot=o,o.style.position="relative",o.style.overflow="hidden",o.style.width=this._width+"px",o.style.height=this._height+"px",t.appendChild(o),this._layers={},this._zlevelList=[],this._layerConfig={},this._loadingEffect=new a({}),this.shapeToImage=this._createShapeToImageProcessor(),this._bgDom=document.createElement("div"),this._bgDom.style.cssText=["position:absolute;left:0px;top:0px;width:",this._width,"px;height:",this._height+"px;","-webkit-user-select:none;user-select;none;","-webkit-touch-callout:none;"].join(""),this._bgDom.setAttribute("data-zr-dom-id","bg"),this._bgDom.className=n.elementClassName,o.appendChild(this._bgDom),this._bgDom.onselectstart=e;var r=new h("_zrender_hover_",this);this._layers.hover=r,o.appendChild(r.dom),r.initContext(),r.dom.onselectstart=e,r.dom.style["-webkit-user-select"]="none",r.dom.style["user-select"]="none",r.dom.style["-webkit-touch-callout"]="none",this.refreshNextFrame=null};return l.prototype.render=function(t){return this.isLoading()&&this.hideLoading(),this.refresh(t,!0),this},l.prototype.refresh=function(t,e){var i=this.storage.getShapeList(!0);this._paintList(i,e);for(var o=0;o<this._zlevelList.length;o++){var n=this._zlevelList[o],r=this._layers[n];!r.isBuildin&&r.refresh&&r.refresh()}return"function"==typeof t&&t(),this},l.prototype._preProcessLayer=function(t){t.unusedCount++,t.updateTransform()},l.prototype._postProcessLayer=function(t){t.dirty=!1,1==t.unusedCount&&t.clear()},l.prototype._paintList=function(t,e){"undefined"==typeof e&&(e=!1),this._updateLayerStatus(t);var i,o,r;this.eachBuildinLayer(this._preProcessLayer);for(var a=0,h=t.length;h>a;a++){var l=t[a];if(o!==l.zlevel&&(i&&(i.needTransform&&r.restore(),r.flush&&r.flush()),o=l.zlevel,i=this.getLayer(o),i.isBuildin||s("ZLevel "+o+" has been used by unkown layer "+i.id),r=i.ctx,i.unusedCount=0,(i.dirty||e)&&i.clear(),i.needTransform&&(r.save(),i.setTransform(r))),(i.dirty||e)&&!l.invisible&&(!l.onbrush||l.onbrush&&!l.onbrush(r,!1)))if(n.catchBrushException)try{l.brush(r,!1,this.refreshNextFrame)}catch(c){s(c,"brush error of "+l.type,l)}else l.brush(r,!1,this.refreshNextFrame);l.__dirty=!1}i&&(i.needTransform&&r.restore(),r.flush&&r.flush()),this.eachBuildinLayer(this._postProcessLayer)},l.prototype.getLayer=function(t){var e=this._layers[t];return e||(e=new h(t,this),e.isBuildin=!0,this._layerConfig[t]&&r.merge(e,this._layerConfig[t],!0),e.updateTransform(),this.insertLayer(t,e),e.initContext()),e},l.prototype.insertLayer=function(t,e){if(this._layers[t])return void s("ZLevel "+t+" has been used already");if(!o(e))return void s("Layer of zlevel "+t+" is not valid");var i=this._zlevelList.length,n=null,r=-1;if(i>0&&t>this._zlevelList[0]){for(r=0;i-1>r&&!(this._zlevelList[r]<t&&this._zlevelList[r+1]>t);r++);n=this._layers[this._zlevelList[r]]}this._zlevelList.splice(r+1,0,t);var a=n?n.dom:this._bgDom;a.nextSibling?a.parentNode.insertBefore(e.dom,a.nextSibling):a.parentNode.appendChild(e.dom),this._layers[t]=e},l.prototype.eachLayer=function(t,e){for(var i=0;i<this._zlevelList.length;i++){var o=this._zlevelList[i];t.call(e,this._layers[o],o)}},l.prototype.eachBuildinLayer=function(t,e){for(var i=0;i<this._zlevelList.length;i++){var o=this._zlevelList[i],n=this._layers[o];n.isBuildin&&t.call(e,n,o)}},l.prototype.eachOtherLayer=function(t,e){for(var i=0;i<this._zlevelList.length;i++){var o=this._zlevelList[i],n=this._layers[o];n.isBuildin||t.call(e,n,o)}},l.prototype.getLayers=function(){return this._layers},l.prototype._updateLayerStatus=function(t){var e=this._layers,i={};this.eachBuildinLayer(function(t,e){i[e]=t.elCount,t.elCount=0});for(var o=0,n=t.length;n>o;o++){var r=t[o],s=r.zlevel,a=e[s];if(a){if(a.elCount++,a.dirty)continue;a.dirty=r.__dirty}}this.eachBuildinLayer(function(t,e){i[e]!==t.elCount&&(t.dirty=!0)})},l.prototype.refreshShapes=function(t,e){for(var i=0,o=t.length;o>i;i++){var n=t[i];n.modSelf()}return this.refresh(e),this},l.prototype.setLoadingEffect=function(t){return this._loadingEffect=t,this},l.prototype.clear=function(){return this.eachBuildinLayer(this._clearLayer),this},l.prototype._clearLayer=function(t){t.clear()},l.prototype.modLayer=function(t,e){if(e){this._layerConfig[t]?r.merge(this._layerConfig[t],e,!0):this._layerConfig[t]=e;var i=this._layers[t];i&&r.merge(i,this._layerConfig[t],!0)}},l.prototype.delLayer=function(t){var e=this._layers[t];e&&(this.modLayer(t,{position:e.position,rotation:e.rotation,scale:e.scale}),e.dom.parentNode.removeChild(e.dom),delete this._layers[t],this._zlevelList.splice(r.indexOf(this._zlevelList,t),1))},l.prototype.refreshHover=function(){this.clearHover();for(var t=this.storage.getHoverShapes(!0),e=0,i=t.length;i>e;e++)this._brushHover(t[e]);var o=this._layers.hover.ctx;return o.flush&&o.flush(),this.storage.delHover(),this},l.prototype.clearHover=function(){var t=this._layers.hover;return t&&t.clear(),this},l.prototype.showLoading=function(t){return this._loadingEffect&&this._loadingEffect.stop(),t&&this.setLoadingEffect(t),this._loadingEffect.start(this),this.loading=!0,this},l.prototype.hideLoading=function(){return this._loadingEffect.stop(),this.clearHover(),this.loading=!1,this},l.prototype.isLoading=function(){return this.loading},l.prototype.resize=function(){var t=this._domRoot;t.style.display="none";var e=this._getWidth(),i=this._getHeight();if(t.style.display="",this._width!=e||i!=this._height){this._width=e,this._height=i,t.style.width=e+"px",t.style.height=i+"px";for(var o in this._layers)this._layers[o].resize(e,i);this.refresh(null,!0)}return this},l.prototype.clearLayer=function(t){var e=this._layers[t];e&&e.clear()},l.prototype.dispose=function(){this.isLoading()&&this.hideLoading(),this.root.innerHTML="",this.root=this.storage=this._domRoot=this._layers=null},l.prototype.getDomHover=function(){return this._layers.hover.dom},l.prototype.toDataURL=function(t,e,i){if(window.G_vmlCanvasManager)return null;var o=new h("image",this);this._bgDom.appendChild(o.dom),o.initContext();var r=o.ctx;o.clearColor=e||"#fff",o.clear();var a=this;this.storage.iterShape(function(t){if(!t.invisible&&(!t.onbrush||t.onbrush&&!t.onbrush(r,!1)))if(n.catchBrushException)try{t.brush(r,!1,a.refreshNextFrame)}catch(e){s(e,"brush error of "+t.type,t)}else t.brush(r,!1,a.refreshNextFrame)},{normal:"up",update:!0});var l=o.dom.toDataURL(t,i);return r=null,this._bgDom.removeChild(o.dom),l},l.prototype.getWidth=function(){return this._width},l.prototype.getHeight=function(){return this._height},l.prototype._getWidth=function(){var t=this.root,e=t.currentStyle||document.defaultView.getComputedStyle(t);return((t.clientWidth||parseInt(e.width,10))-parseInt(e.paddingLeft,10)-parseInt(e.paddingRight,10)).toFixed(0)-0},l.prototype._getHeight=function(){var t=this.root,e=t.currentStyle||document.defaultView.getComputedStyle(t);return((t.clientHeight||parseInt(e.height,10))-parseInt(e.paddingTop,10)-parseInt(e.paddingBottom,10)).toFixed(0)-0},l.prototype._brushHover=function(t){var e=this._layers.hover.ctx;if(!t.onbrush||t.onbrush&&!t.onbrush(e,!0)){var i=this.getLayer(t.zlevel);if(i.needTransform&&(e.save(),i.setTransform(e)),n.catchBrushException)try{t.brush(e,!0,this.refreshNextFrame)}catch(o){s(o,"hoverBrush error of "+t.type,t)}else t.brush(e,!0,this.refreshNextFrame);i.needTransform&&e.restore()}},l.prototype._shapeToImage=function(e,i,o,n,r){var s=document.createElement("canvas"),a=s.getContext("2d");s.style.width=o+"px",s.style.height=n+"px",s.setAttribute("width",o*r),s.setAttribute("height",n*r),a.clearRect(0,0,o*r,n*r);var h={position:i.position,rotation:i.rotation,scale:i.scale};i.position=[0,0,0],i.rotation=0,i.scale=[1,1],i&&i.brush(a,!1);var l=t("./shape/Image"),c=new l({id:e,style:{x:0,y:0,image:s}});return null!=h.position&&(c.position=i.position=h.position),null!=h.rotation&&(c.rotation=i.rotation=h.rotation),null!=h.scale&&(c.scale=i.scale=h.scale),c},l.prototype._createShapeToImageProcessor=function(){if(window.G_vmlCanvasManager)return i;var t=this;return function(e,i,o,r){return t._shapeToImage(e,i,o,r,n.devicePixelRatio)}},l}),i("zrender/Storage",["require","./tool/util","./Group"],function(t){"use strict";function e(t,e){return t.zlevel==e.zlevel?t.z==e.z?t.__renderidx-e.__renderidx:t.z-e.z:t.zlevel-e.zlevel}var i=t("./tool/util"),o=t("./Group"),n={hover:!1,normal:"down",update:!1},r=function(){this._elements={},this._hoverElements=[],this._roots=[],this._shapeList=[],this._shapeListOffset=0};return r.prototype.iterShape=function(t,e){if(e||(e=n),e.hover)for(var i=0,o=this._hoverElements.length;o>i;i++){var r=this._hoverElements[i];if(r.updateTransform(),t(r))return this}switch(e.update&&this.updateShapeList(),e.normal){case"down":for(var o=this._shapeList.length;o--;)if(t(this._shapeList[o]))return this;break;default:for(var i=0,o=this._shapeList.length;o>i;i++)if(t(this._shapeList[i]))return this}return this},r.prototype.getHoverShapes=function(t){for(var i=[],o=0,n=this._hoverElements.length;n>o;o++){i.push(this._hoverElements[o]);var r=this._hoverElements[o].hoverConnect;if(r){var s;r=r instanceof Array?r:[r];for(var a=0,h=r.length;h>a;a++)s=r[a].id?r[a]:this.get(r[a]),s&&i.push(s)}}if(i.sort(e),t)for(var o=0,n=i.length;n>o;o++)i[o].updateTransform();return i},r.prototype.getShapeList=function(t){return t&&this.updateShapeList(),this._shapeList},r.prototype.updateShapeList=function(){this._shapeListOffset=0;for(var t=0,i=this._roots.length;i>t;t++){var o=this._roots[t];this._updateAndAddShape(o)}this._shapeList.length=this._shapeListOffset;for(var t=0,i=this._shapeList.length;i>t;t++)this._shapeList[t].__renderidx=t;this._shapeList.sort(e)},r.prototype._updateAndAddShape=function(t,e){if(!t.ignore)if(t.updateTransform(),t.clipShape&&(t.clipShape.parent=t,t.clipShape.updateTransform(),e?(e=e.slice(),e.push(t.clipShape)):e=[t.clipShape]),"group"==t.type){for(var i=0;i<t._children.length;i++){var o=t._children[i];o.__dirty=t.__dirty||o.__dirty,this._updateAndAddShape(o,e)}t.__dirty=!1}else t.__clipShapes=e,this._shapeList[this._shapeListOffset++]=t},r.prototype.mod=function(t,e){if("string"==typeof t&&(t=this._elements[t]),t&&(t.modSelf(),e))if(e.parent||e._storage||e.__clipShapes){var o={};for(var n in e)"parent"!==n&&"_storage"!==n&&"__clipShapes"!==n&&e.hasOwnProperty(n)&&(o[n]=e[n]);i.merge(t,o,!0)}else i.merge(t,e,!0);return this},r.prototype.drift=function(t,e,i){var o=this._elements[t];return o&&(o.needTransform=!0,"horizontal"===o.draggable?i=0:"vertical"===o.draggable&&(e=0),(!o.ondrift||o.ondrift&&!o.ondrift(e,i))&&o.drift(e,i)),this},r.prototype.addHover=function(t){return t.updateNeedTransform(),this._hoverElements.push(t),this},r.prototype.delHover=function(){return this._hoverElements=[],this},r.prototype.hasHoverShape=function(){return this._hoverElements.length>0},r.prototype.addRoot=function(t){this._elements[t.id]||(t instanceof o&&t.addChildrenToStorage(this),this.addToMap(t),this._roots.push(t))},r.prototype.delRoot=function(t){if("undefined"==typeof t){for(var e=0;e<this._roots.length;e++){var n=this._roots[e];n instanceof o&&n.delChildrenFromStorage(this)}return this._elements={},this._hoverElements=[],this._roots=[],this._shapeList=[],void(this._shapeListOffset=0)}if(t instanceof Array)for(var e=0,r=t.length;r>e;e++)this.delRoot(t[e]);else{var s;s="string"==typeof t?this._elements[t]:t;var a=i.indexOf(this._roots,s);a>=0&&(this.delFromMap(s.id),this._roots.splice(a,1),s instanceof o&&s.delChildrenFromStorage(this))}},r.prototype.addToMap=function(t){return t instanceof o&&(t._storage=this),t.modSelf(),this._elements[t.id]=t,this},r.prototype.get=function(t){return this._elements[t]},r.prototype.delFromMap=function(t){var e=this._elements[t];return e&&(delete this._elements[t],e instanceof o&&(e._storage=null)),this},r.prototype.dispose=function(){this._elements=this._renderList=this._roots=this._hoverElements=null
},r}),i("zrender/animation/Animation",["require","./Clip","../tool/color","../tool/util","../tool/event"],function(t){"use strict";function e(t,e){return t[e]}function i(t,e,i){t[e]=i}function o(t,e,i){return(e-t)*i+t}function n(t,e,i,n,r){var s=t.length;if(1==r)for(var a=0;s>a;a++)n[a]=o(t[a],e[a],i);else for(var h=t[0].length,a=0;s>a;a++)for(var l=0;h>l;l++)n[a][l]=o(t[a][l],e[a][l],i)}function r(t){switch(typeof t){case"undefined":case"string":return!1}return"undefined"!=typeof t.length}function s(t,e,i,o,n,r,s,h,l){var c=t.length;if(1==l)for(var d=0;c>d;d++)h[d]=a(t[d],e[d],i[d],o[d],n,r,s);else for(var u=t[0].length,d=0;c>d;d++)for(var p=0;u>p;p++)h[d][p]=a(t[d][p],e[d][p],i[d][p],o[d][p],n,r,s)}function a(t,e,i,o,n,r,s){var a=.5*(i-t),h=.5*(o-e);return(2*(e-i)+a+h)*s+(-3*(e-i)-2*a-h)*r+a*n+e}function h(t){if(r(t)){var e=t.length;if(r(t[0])){for(var i=[],o=0;e>o;o++)i.push(g.call(t[o]));return i}return g.call(t)}return t}function l(t){return t[0]=Math.floor(t[0]),t[1]=Math.floor(t[1]),t[2]=Math.floor(t[2]),"rgba("+t.join(",")+")"}var c=t("./Clip"),d=t("../tool/color"),u=t("../tool/util"),p=t("../tool/event").Dispatcher,f=window.requestAnimationFrame||window.msRequestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||function(t){setTimeout(t,16)},g=Array.prototype.slice,m=function(t){t=t||{},this.stage=t.stage||{},this.onframe=t.onframe||function(){},this._clips=[],this._running=!1,this._time=0,p.call(this)};m.prototype={add:function(t){this._clips.push(t)},remove:function(t){if(t.__inStep)t.__needsRemove=!0;else{var e=u.indexOf(this._clips,t);e>=0&&this._clips.splice(e,1)}},_update:function(){for(var t=(new Date).getTime(),e=t-this._time,i=this._clips,o=i.length,n=[],r=[],s=0;o>s;s++){var a=i[s];a.__inStep=!0;var h=a.step(t);a.__inStep=!1,h&&(n.push(h),r.push(a))}for(var s=0;o>s;)i[s].__needsRemove?(i[s]=i[o-1],i.pop(),o--):s++;o=n.length;for(var s=0;o>s;s++)r[s].fire(n[s]);this._time=t,this.onframe(e),this.dispatch("frame",e),this.stage.update&&this.stage.update()},start:function(){function t(){e._running&&(f(t),e._update())}var e=this;this._running=!0,this._time=(new Date).getTime(),f(t)},stop:function(){this._running=!1},clear:function(){this._clips=[]},animate:function(t,e){e=e||{};var i=new _(t,e.loop,e.getter,e.setter);return i.animation=this,i},constructor:m},u.merge(m.prototype,p.prototype,!0);var _=function(t,o,n,r){this._tracks={},this._target=t,this._loop=o||!1,this._getter=n||e,this._setter=r||i,this._clipCount=0,this._delay=0,this._doneList=[],this._onframeList=[],this._clipList=[]};return _.prototype={when:function(t,e){for(var i in e)this._tracks[i]||(this._tracks[i]=[],0!==t&&this._tracks[i].push({time:0,value:h(this._getter(this._target,i))})),this._tracks[i].push({time:parseInt(t,10),value:e[i]});return this},during:function(t){return this._onframeList.push(t),this},start:function(t){var e=this,i=this._setter,h=this._getter,u="spline"===t,p=function(){if(e._clipCount--,0===e._clipCount){e._tracks={};for(var t=e._doneList.length,i=0;t>i;i++)e._doneList[i].call(e)}},f=function(f,g){var m=f.length;if(m){var _=f[0].value,y=r(_),v=!1,x=y&&r(_[0])?2:1;f.sort(function(t,e){return t.time-e.time});var b;if(m){b=f[m-1].time;for(var T=[],S=[],z=0;m>z;z++){T.push(f[z].time/b);var C=f[z].value;"string"==typeof C&&(C=d.toArray(C),0===C.length&&(C[0]=C[1]=C[2]=0,C[3]=1),v=!0),S.push(C)}var E,z,w,L,A,M,k,P=0,I=0;if(v)var O=[0,0,0,0];var D=function(t,r){if(I>r){for(E=Math.min(P+1,m-1),z=E;z>=0&&!(T[z]<=r);z--);z=Math.min(z,m-2)}else{for(z=P;m>z&&!(T[z]>r);z++);z=Math.min(z-1,m-2)}P=z,I=r;var c=T[z+1]-T[z];if(0!==c){if(w=(r-T[z])/c,u)if(A=S[z],L=S[0===z?z:z-1],M=S[z>m-2?m-1:z+1],k=S[z>m-3?m-1:z+2],y)s(L,A,M,k,w,w*w,w*w*w,h(t,g),x);else{var d;v?(d=s(L,A,M,k,w,w*w,w*w*w,O,1),d=l(O)):d=a(L,A,M,k,w,w*w,w*w*w),i(t,g,d)}else if(y)n(S[z],S[z+1],w,h(t,g),x);else{var d;v?(n(S[z],S[z+1],w,O,1),d=l(O)):d=o(S[z],S[z+1],w),i(t,g,d)}for(z=0;z<e._onframeList.length;z++)e._onframeList[z](t,r)}},R=new c({target:e._target,life:b,loop:e._loop,delay:e._delay,onframe:D,ondestroy:p});t&&"spline"!==t&&(R.easing=t),e._clipList.push(R),e._clipCount++,e.animation.add(R)}}};for(var g in this._tracks)f(this._tracks[g],g);return this},stop:function(){for(var t=0;t<this._clipList.length;t++){var e=this._clipList[t];this.animation.remove(e)}this._clipList=[]},delay:function(t){return this._delay=t,this},done:function(t){return t&&this._doneList.push(t),this}},m}),i("zrender/tool/vector",[],function(){var t="undefined"==typeof Float32Array?Array:Float32Array,e={create:function(e,i){var o=new t(2);return o[0]=e||0,o[1]=i||0,o},copy:function(t,e){return t[0]=e[0],t[1]=e[1],t},clone:function(e){var i=new t(2);return i[0]=e[0],i[1]=e[1],i},set:function(t,e,i){return t[0]=e,t[1]=i,t},add:function(t,e,i){return t[0]=e[0]+i[0],t[1]=e[1]+i[1],t},scaleAndAdd:function(t,e,i,o){return t[0]=e[0]+i[0]*o,t[1]=e[1]+i[1]*o,t},sub:function(t,e,i){return t[0]=e[0]-i[0],t[1]=e[1]-i[1],t},len:function(t){return Math.sqrt(this.lenSquare(t))},lenSquare:function(t){return t[0]*t[0]+t[1]*t[1]},mul:function(t,e,i){return t[0]=e[0]*i[0],t[1]=e[1]*i[1],t},div:function(t,e,i){return t[0]=e[0]/i[0],t[1]=e[1]/i[1],t},dot:function(t,e){return t[0]*e[0]+t[1]*e[1]},scale:function(t,e,i){return t[0]=e[0]*i,t[1]=e[1]*i,t},normalize:function(t,i){var o=e.len(i);return 0===o?(t[0]=0,t[1]=0):(t[0]=i[0]/o,t[1]=i[1]/o),t},distance:function(t,e){return Math.sqrt((t[0]-e[0])*(t[0]-e[0])+(t[1]-e[1])*(t[1]-e[1]))},distanceSquare:function(t,e){return(t[0]-e[0])*(t[0]-e[0])+(t[1]-e[1])*(t[1]-e[1])},negate:function(t,e){return t[0]=-e[0],t[1]=-e[1],t},lerp:function(t,e,i,o){return t[0]=e[0]+o*(i[0]-e[0]),t[1]=e[1]+o*(i[1]-e[1]),t},applyTransform:function(t,e,i){var o=e[0],n=e[1];return t[0]=i[0]*o+i[2]*n+i[4],t[1]=i[1]*o+i[3]*n+i[5],t},min:function(t,e,i){return t[0]=Math.min(e[0],i[0]),t[1]=Math.min(e[1],i[1]),t},max:function(t,e,i){return t[0]=Math.max(e[0],i[0]),t[1]=Math.max(e[1],i[1]),t}};return e.length=e.len,e.lengthSquare=e.lenSquare,e.dist=e.distance,e.distSquare=e.distanceSquare,e}),i("zrender/loadingEffect/Base",["require","../tool/util","../shape/Text","../shape/Rectangle"],function(t){function e(t){this.setOptions(t)}var i=t("../tool/util"),o=t("../shape/Text"),n=t("../shape/Rectangle"),r="Loading...",s="normal 16px Arial";return e.prototype.createTextShape=function(t){return new o({highlightStyle:i.merge({x:this.canvasWidth/2,y:this.canvasHeight/2,text:r,textAlign:"center",textBaseline:"middle",textFont:s,color:"#333",brushType:"fill"},t,!0)})},e.prototype.createBackgroundShape=function(t){return new n({highlightStyle:{x:0,y:0,width:this.canvasWidth,height:this.canvasHeight,brushType:"fill",color:t}})},e.prototype.start=function(t){function e(e){t.storage.addHover(e)}function i(){t.refreshHover()}this.canvasWidth=t._width,this.canvasHeight=t._height,this.loadingTimer=this._start(e,i)},e.prototype._start=function(){return setInterval(function(){},1e4)},e.prototype.stop=function(){clearInterval(this.loadingTimer)},e.prototype.setOptions=function(t){this.options=t||{}},e.prototype.adjust=function(t,e){return t<=e[0]?t=e[0]:t>=e[1]&&(t=e[1]),t},e.prototype.getLocation=function(t,e,i){var o=null!=t.x?t.x:"center";switch(o){case"center":o=Math.floor((this.canvasWidth-e)/2);break;case"left":o=0;break;case"right":o=this.canvasWidth-e}var n=null!=t.y?t.y:"center";switch(n){case"center":n=Math.floor((this.canvasHeight-i)/2);break;case"top":n=0;break;case"bottom":n=this.canvasHeight-i}return{x:o,y:n,width:e,height:i}},e}),i("zrender/tool/curve",["require","./vector"],function(t){function e(t){return t>-m&&m>t}function i(t){return t>m||-m>t}function o(t,e,i,o,n){var r=1-n;return r*r*(r*t+3*n*e)+n*n*(n*o+3*r*i)}function n(t,e,i,o,n){var r=1-n;return 3*(((e-t)*r+2*(i-e)*n)*r+(o-i)*n*n)}function r(t,i,o,n,r,s){var a=n+3*(i-o)-t,h=3*(o-2*i+t),l=3*(i-t),c=t-r,d=h*h-3*a*l,u=h*l-9*a*c,p=l*l-3*h*c,f=0;if(e(d)&&e(u))if(e(h))s[0]=0;else{var g=-l/h;g>=0&&1>=g&&(s[f++]=g)}else{var m=u*u-4*d*p;if(e(m)){var v=u/d,g=-h/a+v,x=-v/2;g>=0&&1>=g&&(s[f++]=g),x>=0&&1>=x&&(s[f++]=x)}else if(m>0){var b=Math.sqrt(m),T=d*h+1.5*a*(-u+b),S=d*h+1.5*a*(-u-b);T=0>T?-Math.pow(-T,y):Math.pow(T,y),S=0>S?-Math.pow(-S,y):Math.pow(S,y);var g=(-h-(T+S))/(3*a);g>=0&&1>=g&&(s[f++]=g)}else{var z=(2*d*h-3*a*u)/(2*Math.sqrt(d*d*d)),C=Math.acos(z)/3,E=Math.sqrt(d),w=Math.cos(C),g=(-h-2*E*w)/(3*a),x=(-h+E*(w+_*Math.sin(C)))/(3*a),L=(-h+E*(w-_*Math.sin(C)))/(3*a);g>=0&&1>=g&&(s[f++]=g),x>=0&&1>=x&&(s[f++]=x),L>=0&&1>=L&&(s[f++]=L)}}return f}function s(t,o,n,r,s){var a=6*n-12*o+6*t,h=9*o+3*r-3*t-9*n,l=3*o-3*t,c=0;if(e(h)){if(i(a)){var d=-l/a;d>=0&&1>=d&&(s[c++]=d)}}else{var u=a*a-4*h*l;if(e(u))s[0]=-a/(2*h);else if(u>0){var p=Math.sqrt(u),d=(-a+p)/(2*h),f=(-a-p)/(2*h);d>=0&&1>=d&&(s[c++]=d),f>=0&&1>=f&&(s[c++]=f)}}return c}function a(t,e,i,o,n,r){var s=(e-t)*n+t,a=(i-e)*n+e,h=(o-i)*n+i,l=(a-s)*n+s,c=(h-a)*n+a,d=(c-l)*n+l;r[0]=t,r[1]=s,r[2]=l,r[3]=d,r[4]=d,r[5]=c,r[6]=h,r[7]=o}function h(t,e,i,n,r,s,a,h,l,c,d){var u,p=.005,f=1/0;v[0]=l,v[1]=c;for(var _=0;1>_;_+=.05){x[0]=o(t,i,r,a,_),x[1]=o(e,n,s,h,_);var y=g.distSquare(v,x);f>y&&(u=_,f=y)}f=1/0;for(var T=0;32>T&&!(m>p);T++){var S=u-p,z=u+p;x[0]=o(t,i,r,a,S),x[1]=o(e,n,s,h,S);var y=g.distSquare(x,v);if(S>=0&&f>y)u=S,f=y;else{b[0]=o(t,i,r,a,z),b[1]=o(e,n,s,h,z);var C=g.distSquare(b,v);1>=z&&f>C?(u=z,f=C):p*=.5}}return d&&(d[0]=o(t,i,r,a,u),d[1]=o(e,n,s,h,u)),Math.sqrt(f)}function l(t,e,i,o){var n=1-o;return n*(n*t+2*o*e)+o*o*i}function c(t,e,i,o){return 2*((1-o)*(e-t)+o*(i-e))}function d(t,o,n,r,s){var a=t-2*o+n,h=2*(o-t),l=t-r,c=0;if(e(a)){if(i(h)){var d=-l/h;d>=0&&1>=d&&(s[c++]=d)}}else{var u=h*h-4*a*l;if(e(u)){var d=-h/(2*a);d>=0&&1>=d&&(s[c++]=d)}else if(u>0){var p=Math.sqrt(u),d=(-h+p)/(2*a),f=(-h-p)/(2*a);d>=0&&1>=d&&(s[c++]=d),f>=0&&1>=f&&(s[c++]=f)}}return c}function u(t,e,i){var o=t+i-2*e;return 0===o?.5:(t-e)/o}function p(t,e,i,o,n){var r=(e-t)*o+t,s=(i-e)*o+e,a=(s-r)*o+r;n[0]=t,n[1]=r,n[2]=a,n[3]=a,n[4]=s,n[5]=i}function f(t,e,i,o,n,r,s,a,h){var c,d=.005,u=1/0;v[0]=s,v[1]=a;for(var p=0;1>p;p+=.05){x[0]=l(t,i,n,p),x[1]=l(e,o,r,p);var f=g.distSquare(v,x);u>f&&(c=p,u=f)}u=1/0;for(var _=0;32>_&&!(m>d);_++){var y=c-d,T=c+d;x[0]=l(t,i,n,y),x[1]=l(e,o,r,y);var f=g.distSquare(x,v);if(y>=0&&u>f)c=y,u=f;else{b[0]=l(t,i,n,T),b[1]=l(e,o,r,T);var S=g.distSquare(b,v);1>=T&&u>S?(c=T,u=S):d*=.5}}return h&&(h[0]=l(t,i,n,c),h[1]=l(e,o,r,c)),Math.sqrt(u)}var g=t("./vector"),m=1e-4,_=Math.sqrt(3),y=1/3,v=g.create(),x=g.create(),b=g.create();return{cubicAt:o,cubicDerivativeAt:n,cubicRootAt:r,cubicExtrema:s,cubicSubdivide:a,cubicProjectPoint:h,quadraticAt:l,quadraticDerivativeAt:c,quadraticRootAt:d,quadraticExtremum:u,quadraticSubdivide:p,quadraticProjectPoint:f}}),i("zrender/Layer",["require","./mixin/Transformable","./tool/util","./config"],function(t){function e(){return!1}function i(t,e,i){var o=document.createElement(e),n=i.getWidth(),r=i.getHeight();return o.style.position="absolute",o.style.left=0,o.style.top=0,o.style.width=n+"px",o.style.height=r+"px",o.width=n*s.devicePixelRatio,o.height=r*s.devicePixelRatio,o.setAttribute("data-zr-dom-id",t),o}var o=t("./mixin/Transformable"),n=t("./tool/util"),r=window.G_vmlCanvasManager,s=t("./config"),a=function(t,n){this.id=t,this.dom=i(t,"canvas",n),this.dom.onselectstart=e,this.dom.style["-webkit-user-select"]="none",this.dom.style["user-select"]="none",this.dom.style["-webkit-touch-callout"]="none",this.dom.style["-webkit-tap-highlight-color"]="rgba(0,0,0,0)",this.dom.className=s.elementClassName,r&&r.initElement(this.dom),this.domBack=null,this.ctxBack=null,this.painter=n,this.unusedCount=0,this.config=null,this.dirty=!0,this.elCount=0,this.clearColor=0,this.motionBlur=!1,this.lastFrameAlpha=.7,this.zoomable=!1,this.panable=!1,this.maxZoom=1/0,this.minZoom=0,o.call(this)};return a.prototype.initContext=function(){this.ctx=this.dom.getContext("2d");var t=s.devicePixelRatio;1!=t&&this.ctx.scale(t,t)},a.prototype.createBackBuffer=function(){if(!r){this.domBack=i("back-"+this.id,"canvas",this.painter),this.ctxBack=this.domBack.getContext("2d");var t=s.devicePixelRatio;1!=t&&this.ctxBack.scale(t,t)}},a.prototype.resize=function(t,e){var i=s.devicePixelRatio;this.dom.style.width=t+"px",this.dom.style.height=e+"px",this.dom.setAttribute("width",t*i),this.dom.setAttribute("height",e*i),1!=i&&this.ctx.scale(i,i),this.domBack&&(this.domBack.setAttribute("width",t*i),this.domBack.setAttribute("height",e*i),1!=i&&this.ctxBack.scale(i,i))},a.prototype.clear=function(){var t=this.dom,e=this.ctx,i=t.width,o=t.height,n=this.clearColor&&!r,a=this.motionBlur&&!r,h=this.lastFrameAlpha,l=s.devicePixelRatio;if(a&&(this.domBack||this.createBackBuffer(),this.ctxBack.globalCompositeOperation="copy",this.ctxBack.drawImage(t,0,0,i/l,o/l)),e.clearRect(0,0,i/l,o/l),n&&(e.save(),e.fillStyle=this.clearColor,e.fillRect(0,0,i/l,o/l),e.restore()),a){var c=this.domBack;e.save(),e.globalAlpha=h,e.drawImage(c,0,0,i/l,o/l),e.restore()}},n.merge(a.prototype,o.prototype),a}),i("zrender/shape/Star",["require","../tool/math","./Base","../tool/util"],function(t){var e=t("../tool/math"),i=e.sin,o=e.cos,n=Math.PI,r=t("./Base"),s=function(t){r.call(this,t)};return s.prototype={type:"star",buildPath:function(t,e){var r=e.n;if(r&&!(2>r)){var s=e.x,a=e.y,h=e.r,l=e.r0;null==l&&(l=r>4?h*o(2*n/r)/o(n/r):h/3);var c=n/r,d=-n/2,u=s+h*o(d),p=a+h*i(d);d+=c;var f=e.pointList=[];f.push([u,p]);for(var g,m=0,_=2*r-1;_>m;m++)g=m%2===0?l:h,f.push([s+g*o(d),a+g*i(d)]),d+=c;f.push([u,p]),t.moveTo(f[0][0],f[0][1]);for(var m=0;m<f.length;m++)t.lineTo(f[m][0],f[m][1]);t.closePath()}},getRect:function(t){if(t.__rect)return t.__rect;var e;return e="stroke"==t.brushType||"fill"==t.brushType?t.lineWidth||1:0,t.__rect={x:Math.round(t.x-t.r-e/2),y:Math.round(t.y-t.r-e/2),width:2*t.r+e,height:2*t.r+e},t.__rect}},t("../tool/util").inherits(s,r),s}),i("zrender/shape/Rectangle",["require","./Base","../tool/util"],function(t){var e=t("./Base"),i=function(t){e.call(this,t)};return i.prototype={type:"rectangle",_buildRadiusPath:function(t,e){var i,o,n,r,s=e.x,a=e.y,h=e.width,l=e.height,c=e.radius;"number"==typeof c?i=o=n=r=c:c instanceof Array?1===c.length?i=o=n=r=c[0]:2===c.length?(i=n=c[0],o=r=c[1]):3===c.length?(i=c[0],o=r=c[1],n=c[2]):(i=c[0],o=c[1],n=c[2],r=c[3]):i=o=n=r=0;var d;i+o>h&&(d=i+o,i*=h/d,o*=h/d),n+r>h&&(d=n+r,n*=h/d,r*=h/d),o+n>l&&(d=o+n,o*=l/d,n*=l/d),i+r>l&&(d=i+r,i*=l/d,r*=l/d),t.moveTo(s+i,a),t.lineTo(s+h-o,a),0!==o&&t.quadraticCurveTo(s+h,a,s+h,a+o),t.lineTo(s+h,a+l-n),0!==n&&t.quadraticCurveTo(s+h,a+l,s+h-n,a+l),t.lineTo(s+r,a+l),0!==r&&t.quadraticCurveTo(s,a+l,s,a+l-r),t.lineTo(s,a+i),0!==i&&t.quadraticCurveTo(s,a,s+i,a)},buildPath:function(t,e){e.radius?this._buildRadiusPath(t,e):(t.moveTo(e.x,e.y),t.lineTo(e.x+e.width,e.y),t.lineTo(e.x+e.width,e.y+e.height),t.lineTo(e.x,e.y+e.height),t.lineTo(e.x,e.y)),t.closePath()},getRect:function(t){if(t.__rect)return t.__rect;var e;return e="stroke"==t.brushType||"fill"==t.brushType?t.lineWidth||1:0,t.__rect={x:Math.round(t.x-e/2),y:Math.round(t.y-e/2),width:t.width+e,height:t.height+e},t.__rect}},t("../tool/util").inherits(i,e),i}),i("zrender/shape/Text",["require","../tool/area","./Base","../tool/util"],function(t){var e=t("../tool/area"),i=t("./Base"),o=function(t){i.call(this,t)};return o.prototype={type:"text",brush:function(t,i){var o=this.style;if(i&&(o=this.getHighlightStyle(o,this.highlightStyle||{})),"undefined"!=typeof o.text&&o.text!==!1){t.save(),this.doClip(t),this.setContext(t,o),this.setTransform(t),o.textFont&&(t.font=o.textFont),t.textAlign=o.textAlign||"start",t.textBaseline=o.textBaseline||"middle";var n,r=(o.text+"").split("\n"),s=e.getTextHeight("国",o.textFont),a=this.getRect(o),h=o.x;n="top"==o.textBaseline?a.y:"bottom"==o.textBaseline?a.y+s:a.y+s/2;for(var l=0,c=r.length;c>l;l++){if(o.maxWidth)switch(o.brushType){case"fill":t.fillText(r[l],h,n,o.maxWidth);break;case"stroke":t.strokeText(r[l],h,n,o.maxWidth);break;case"both":t.fillText(r[l],h,n,o.maxWidth),t.strokeText(r[l],h,n,o.maxWidth);break;default:t.fillText(r[l],h,n,o.maxWidth)}else switch(o.brushType){case"fill":t.fillText(r[l],h,n);break;case"stroke":t.strokeText(r[l],h,n);break;case"both":t.fillText(r[l],h,n),t.strokeText(r[l],h,n);break;default:t.fillText(r[l],h,n)}n+=s}t.restore()}},getRect:function(t){if(t.__rect)return t.__rect;var i=e.getTextWidth(t.text,t.textFont),o=e.getTextHeight(t.text,t.textFont),n=t.x;"end"==t.textAlign||"right"==t.textAlign?n-=i:"center"==t.textAlign&&(n-=i/2);var r;return r="top"==t.textBaseline?t.y:"bottom"==t.textBaseline?t.y-o:t.y-o/2,t.__rect={x:n,y:r,width:i,height:o},t.__rect}},t("../tool/util").inherits(o,i),o}),i("zrender/shape/Droplet",["require","./Base","./util/PathProxy","../tool/area","../tool/util"],function(t){"use strict";var e=t("./Base"),i=t("./util/PathProxy"),o=t("../tool/area"),n=function(t){e.call(this,t),this._pathProxy=new i};return n.prototype={type:"droplet",buildPath:function(t,e){var o=this._pathProxy||new i;o.begin(t),o.moveTo(e.x,e.y+e.a),o.bezierCurveTo(e.x+e.a,e.y+e.a,e.x+3*e.a/2,e.y-e.a/3,e.x,e.y-e.b),o.bezierCurveTo(e.x-3*e.a/2,e.y-e.a/3,e.x-e.a,e.y+e.a,e.x,e.y+e.a),o.closePath()},getRect:function(t){return t.__rect?t.__rect:(this._pathProxy.isEmpty()||this.buildPath(null,t),this._pathProxy.fastBoundingRect())},isCover:function(t,e){var i=this.transformCoordToLocal(t,e);return t=i[0],e=i[1],this.isCoverRect(t,e)?o.isInsidePath(this._pathProxy.pathCommands,this.style.lineWidth,this.style.brushType,t,e):void 0}},t("../tool/util").inherits(n,e),n}),i("zrender/shape/Heart",["require","./Base","./util/PathProxy","../tool/area","../tool/util"],function(t){"use strict";var e=t("./Base"),i=t("./util/PathProxy"),o=t("../tool/area"),n=function(t){e.call(this,t),this._pathProxy=new i};return n.prototype={type:"heart",buildPath:function(t,e){var o=this._pathProxy||new i;o.begin(t),o.moveTo(e.x,e.y),o.bezierCurveTo(e.x+e.a/2,e.y-2*e.b/3,e.x+2*e.a,e.y+e.b/3,e.x,e.y+e.b),o.bezierCurveTo(e.x-2*e.a,e.y+e.b/3,e.x-e.a/2,e.y-2*e.b/3,e.x,e.y),o.closePath()},getRect:function(t){return t.__rect?t.__rect:(this._pathProxy.isEmpty()||this.buildPath(null,t),this._pathProxy.fastBoundingRect())},isCover:function(t,e){var i=this.transformCoordToLocal(t,e);return t=i[0],e=i[1],this.isCoverRect(t,e)?o.isInsidePath(this._pathProxy.pathCommands,this.style.lineWidth,this.style.brushType,t,e):void 0}},t("../tool/util").inherits(n,e),n}),i("zrender/tool/math",[],function(){function t(t,e){return Math.sin(e?t*n:t)}function e(t,e){return Math.cos(e?t*n:t)}function i(t){return t*n}function o(t){return t/n}var n=Math.PI/180;return{sin:t,cos:e,degreeToRadian:i,radianToDegree:o}}),i("zrender/Group",["require","./tool/guid","./tool/util","./mixin/Transformable","./mixin/Eventful"],function(t){var e=t("./tool/guid"),i=t("./tool/util"),o=t("./mixin/Transformable"),n=t("./mixin/Eventful"),r=function(t){t=t||{},this.id=t.id||e();for(var i in t)this[i]=t[i];this.type="group",this.clipShape=null,this._children=[],this._storage=null,this.__dirty=!0,o.call(this),n.call(this)};return r.prototype.ignore=!1,r.prototype.children=function(){return this._children.slice()},r.prototype.childAt=function(t){return this._children[t]},r.prototype.addChild=function(t){t!=this&&t.parent!=this&&(t.parent&&t.parent.removeChild(t),this._children.push(t),t.parent=this,this._storage&&this._storage!==t._storage&&(this._storage.addToMap(t),t instanceof r&&t.addChildrenToStorage(this._storage)))},r.prototype.removeChild=function(t){var e=i.indexOf(this._children,t);e>=0&&this._children.splice(e,1),t.parent=null,this._storage&&(this._storage.delFromMap(t.id),t instanceof r&&t.delChildrenFromStorage(this._storage))},r.prototype.clearChildren=function(){for(var t=0;t<this._children.length;t++){var e=this._children[t];this._storage&&(this._storage.delFromMap(e.id),e instanceof r&&e.delChildrenFromStorage(this._storage))}this._children.length=0},r.prototype.eachChild=function(t,e){for(var i=!!e,o=0;o<this._children.length;o++){var n=this._children[o];i?t.call(e,n):t(n)}},r.prototype.traverse=function(t,e){for(var i=!!e,o=0;o<this._children.length;o++){var n=this._children[o];i?t.call(e,n):t(n),"group"===n.type&&n.traverse(t,e)}},r.prototype.addChildrenToStorage=function(t){for(var e=0;e<this._children.length;e++){var i=this._children[e];t.addToMap(i),i instanceof r&&i.addChildrenToStorage(t)}},r.prototype.delChildrenFromStorage=function(t){for(var e=0;e<this._children.length;e++){var i=this._children[e];t.delFromMap(i.id),i instanceof r&&i.delChildrenFromStorage(t)}},r.prototype.modSelf=function(){this.__dirty=!0},i.merge(r.prototype,o.prototype,!0),i.merge(r.prototype,n.prototype,!0),r}),i("zrender/shape/util/PathProxy",["require","../../tool/vector"],function(t){var e=t("../../tool/vector"),i=function(t,e){this.command=t,this.points=e||null},o=function(){this.pathCommands=[],this._ctx=null,this._min=[],this._max=[]};return o.prototype.fastBoundingRect=function(){var t=this._min,i=this._max;t[0]=t[1]=1/0,i[0]=i[1]=-1/0;for(var o=0;o<this.pathCommands.length;o++){var n=this.pathCommands[o],r=n.points;switch(n.command){case"M":e.min(t,t,r),e.max(i,i,r);break;case"L":e.min(t,t,r),e.max(i,i,r);break;case"C":for(var s=0;6>s;s+=2)t[0]=Math.min(t[0],t[0],r[s]),t[1]=Math.min(t[1],t[1],r[s+1]),i[0]=Math.max(i[0],i[0],r[s]),i[1]=Math.max(i[1],i[1],r[s+1]);break;case"Q":for(var s=0;4>s;s+=2)t[0]=Math.min(t[0],t[0],r[s]),t[1]=Math.min(t[1],t[1],r[s+1]),i[0]=Math.max(i[0],i[0],r[s]),i[1]=Math.max(i[1],i[1],r[s+1]);break;case"A":var a=r[0],h=r[1],l=r[2],c=r[3];t[0]=Math.min(t[0],t[0],a-l),t[1]=Math.min(t[1],t[1],h-c),i[0]=Math.max(i[0],i[0],a+l),i[1]=Math.max(i[1],i[1],h+c)}}return{x:t[0],y:t[1],width:i[0]-t[0],height:i[1]-t[1]}},o.prototype.begin=function(t){return this._ctx=t||null,this.pathCommands.length=0,this},o.prototype.moveTo=function(t,e){return this.pathCommands.push(new i("M",[t,e])),this._ctx&&this._ctx.moveTo(t,e),this},o.prototype.lineTo=function(t,e){return this.pathCommands.push(new i("L",[t,e])),this._ctx&&this._ctx.lineTo(t,e),this},o.prototype.bezierCurveTo=function(t,e,o,n,r,s){return this.pathCommands.push(new i("C",[t,e,o,n,r,s])),this._ctx&&this._ctx.bezierCurveTo(t,e,o,n,r,s),this},o.prototype.quadraticCurveTo=function(t,e,o,n){return this.pathCommands.push(new i("Q",[t,e,o,n])),this._ctx&&this._ctx.quadraticCurveTo(t,e,o,n),this},o.prototype.arc=function(t,e,o,n,r,s){return this.pathCommands.push(new i("A",[t,e,o,o,n,r-n,0,s?0:1])),this._ctx&&this._ctx.arc(t,e,o,n,r,s),this},o.prototype.arcTo=function(t,e,i,o,n){return this._ctx&&this._ctx.arcTo(t,e,i,o,n),this},o.prototype.rect=function(t,e,i,o){return this._ctx&&this._ctx.rect(t,e,i,o),this},o.prototype.closePath=function(){return this.pathCommands.push(new i("z")),this._ctx&&this._ctx.closePath(),this},o.prototype.isEmpty=function(){return 0===this.pathCommands.length},o.PathSegment=i,o}),i("zrender/shape/BezierCurve",["require","./Base","../tool/util"],function(t){"use strict";var e=t("./Base"),i=function(t){this.brushTypeOnly="stroke",this.textPosition="end",e.call(this,t)};return i.prototype={type:"bezier-curve",buildPath:function(t,e){t.moveTo(e.xStart,e.yStart),"undefined"!=typeof e.cpX2&&"undefined"!=typeof e.cpY2?t.bezierCurveTo(e.cpX1,e.cpY1,e.cpX2,e.cpY2,e.xEnd,e.yEnd):t.quadraticCurveTo(e.cpX1,e.cpY1,e.xEnd,e.yEnd)},getRect:function(t){if(t.__rect)return t.__rect;var e=Math.min(t.xStart,t.xEnd,t.cpX1),i=Math.min(t.yStart,t.yEnd,t.cpY1),o=Math.max(t.xStart,t.xEnd,t.cpX1),n=Math.max(t.yStart,t.yEnd,t.cpY1),r=t.cpX2,s=t.cpY2;"undefined"!=typeof r&&"undefined"!=typeof s&&(e=Math.min(e,r),i=Math.min(i,s),o=Math.max(o,r),n=Math.max(n,s));var a=t.lineWidth||1;return t.__rect={x:e-a,y:i-a,width:o-e+a,height:n-i+a},t.__rect}},t("../tool/util").inherits(i,e),i}),i("zrender/shape/Line",["require","./Base","./util/dashedLineTo","../tool/util"],function(t){var e=t("./Base"),i=t("./util/dashedLineTo"),o=function(t){this.brushTypeOnly="stroke",this.textPosition="end",e.call(this,t)};return o.prototype={type:"line",buildPath:function(t,e){if(e.lineType&&"solid"!=e.lineType){if("dashed"==e.lineType||"dotted"==e.lineType){var o=(e.lineWidth||1)*("dashed"==e.lineType?5:1);i(t,e.xStart,e.yStart,e.xEnd,e.yEnd,o)}}else t.moveTo(e.xStart,e.yStart),t.lineTo(e.xEnd,e.yEnd)},getRect:function(t){if(t.__rect)return t.__rect;var e=t.lineWidth||1;return t.__rect={x:Math.min(t.xStart,t.xEnd)-e,y:Math.min(t.yStart,t.yEnd)-e,width:Math.abs(t.xStart-t.xEnd)+e,height:Math.abs(t.yStart-t.yEnd)+e},t.__rect}},t("../tool/util").inherits(o,e),o}),i("zrender/shape/util/dashedLineTo",[],function(){var t=[5,5];return function(e,i,o,n,r,s){if(e.setLineDash)return t[0]=t[1]=s,e.setLineDash(t),e.moveTo(i,o),void e.lineTo(n,r);s="number"!=typeof s?5:s;var a=n-i,h=r-o,l=Math.floor(Math.sqrt(a*a+h*h)/s);a/=l,h/=l;for(var c=!0,d=0;l>d;++d)c?e.moveTo(i,o):e.lineTo(i,o),c=!c,i+=a,o+=h;e.lineTo(n,r)}}),i("zrender/animation/Clip",["require","./easing"],function(t){function e(t){this._targetPool=t.target||{},this._targetPool instanceof Array||(this._targetPool=[this._targetPool]),this._life=t.life||1e3,this._delay=t.delay||0,this._startTime=(new Date).getTime()+this._delay,this._endTime=this._startTime+1e3*this._life,this.loop="undefined"==typeof t.loop?!1:t.loop,this.gap=t.gap||0,this.easing=t.easing||"Linear",this.onframe=t.onframe,this.ondestroy=t.ondestroy,this.onrestart=t.onrestart}var i=t("./easing");return e.prototype={step:function(t){var e=(t-this._startTime)/this._life;if(!(0>e)){e=Math.min(e,1);var o="string"==typeof this.easing?i[this.easing]:this.easing,n="function"==typeof o?o(e):e;return this.fire("frame",n),1==e?this.loop?(this.restart(),"restart"):(this.__needsRemove=!0,"destroy"):null}},restart:function(){var t=(new Date).getTime(),e=(t-this._startTime)%this._life;this._startTime=(new Date).getTime()-e+this.gap,this.__needsRemove=!1},fire:function(t,e){for(var i=0,o=this._targetPool.length;o>i;i++)this["on"+t]&&this["on"+t](this._targetPool[i],e)},constructor:e},e}),i("echarts/util/shape/normalIsCover",[],function(){return function(t,e){var i=this.transformCoordToLocal(t,e);return t=i[0],e=i[1],this.isCoverRect(t,e)}}),i("zrender/animation/easing",[],function(){var t={Linear:function(t){return t},QuadraticIn:function(t){return t*t},QuadraticOut:function(t){return t*(2-t)},QuadraticInOut:function(t){return(t*=2)<1?.5*t*t:-.5*(--t*(t-2)-1)},CubicIn:function(t){return t*t*t},CubicOut:function(t){return--t*t*t+1},CubicInOut:function(t){return(t*=2)<1?.5*t*t*t:.5*((t-=2)*t*t+2)},QuarticIn:function(t){return t*t*t*t},QuarticOut:function(t){return 1- --t*t*t*t},QuarticInOut:function(t){return(t*=2)<1?.5*t*t*t*t:-.5*((t-=2)*t*t*t-2)},QuinticIn:function(t){return t*t*t*t*t},QuinticOut:function(t){return--t*t*t*t*t+1},QuinticInOut:function(t){return(t*=2)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2)},SinusoidalIn:function(t){return 1-Math.cos(t*Math.PI/2)},SinusoidalOut:function(t){return Math.sin(t*Math.PI/2)},SinusoidalInOut:function(t){return.5*(1-Math.cos(Math.PI*t))},ExponentialIn:function(t){return 0===t?0:Math.pow(1024,t-1)},ExponentialOut:function(t){return 1===t?1:1-Math.pow(2,-10*t)},ExponentialInOut:function(t){return 0===t?0:1===t?1:(t*=2)<1?.5*Math.pow(1024,t-1):.5*(-Math.pow(2,-10*(t-1))+2)},CircularIn:function(t){return 1-Math.sqrt(1-t*t)},CircularOut:function(t){return Math.sqrt(1- --t*t)},CircularInOut:function(t){return(t*=2)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)},ElasticIn:function(t){var e,i=.1,o=.4;return 0===t?0:1===t?1:(!i||1>i?(i=1,e=o/4):e=o*Math.asin(1/i)/(2*Math.PI),-(i*Math.pow(2,10*(t-=1))*Math.sin(2*(t-e)*Math.PI/o)))},ElasticOut:function(t){var e,i=.1,o=.4;return 0===t?0:1===t?1:(!i||1>i?(i=1,e=o/4):e=o*Math.asin(1/i)/(2*Math.PI),i*Math.pow(2,-10*t)*Math.sin(2*(t-e)*Math.PI/o)+1)},ElasticInOut:function(t){var e,i=.1,o=.4;return 0===t?0:1===t?1:(!i||1>i?(i=1,e=o/4):e=o*Math.asin(1/i)/(2*Math.PI),(t*=2)<1?-.5*i*Math.pow(2,10*(t-=1))*Math.sin(2*(t-e)*Math.PI/o):i*Math.pow(2,-10*(t-=1))*Math.sin(2*(t-e)*Math.PI/o)*.5+1)},BackIn:function(t){var e=1.70158;return t*t*((e+1)*t-e)},BackOut:function(t){var e=1.70158;return--t*t*((e+1)*t+e)+1},BackInOut:function(t){var e=2.5949095;return(t*=2)<1?.5*t*t*((e+1)*t-e):.5*((t-=2)*t*((e+1)*t+e)+2)},BounceIn:function(e){return 1-t.BounceOut(1-e)},BounceOut:function(t){return 1/2.75>t?7.5625*t*t:2/2.75>t?7.5625*(t-=1.5/2.75)*t+.75:2.5/2.75>t?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375},BounceInOut:function(e){return.5>e?.5*t.BounceIn(2*e):.5*t.BounceOut(2*e-1)+.5}};return t}),i("zrender/shape/Polygon",["require","./Base","./util/smoothSpline","./util/smoothBezier","./util/dashedLineTo","../tool/util"],function(t){var e=t("./Base"),i=t("./util/smoothSpline"),o=t("./util/smoothBezier"),n=t("./util/dashedLineTo"),r=function(t){e.call(this,t)};return r.prototype={type:"polygon",buildPath:function(t,e){var r=e.pointList;if(!(r.length<2)){if(e.smooth&&"spline"!==e.smooth){var s=o(r,e.smooth,!0,e.smoothConstraint);t.moveTo(r[0][0],r[0][1]);for(var a,h,l,c=r.length,d=0;c>d;d++)a=s[2*d],h=s[2*d+1],l=r[(d+1)%c],t.bezierCurveTo(a[0],a[1],h[0],h[1],l[0],l[1])}else if("spline"===e.smooth&&(r=i(r,!0)),e.lineType&&"solid"!=e.lineType){if("dashed"==e.lineType||"dotted"==e.lineType){var u=e._dashLength||(e.lineWidth||1)*("dashed"==e.lineType?5:1);e._dashLength=u,t.moveTo(r[0][0],r[0][1]);for(var d=1,p=r.length;p>d;d++)n(t,r[d-1][0],r[d-1][1],r[d][0],r[d][1],u);n(t,r[r.length-1][0],r[r.length-1][1],r[0][0],r[0][1],u)}}else{t.moveTo(r[0][0],r[0][1]);for(var d=1,p=r.length;p>d;d++)t.lineTo(r[d][0],r[d][1]);t.lineTo(r[0][0],r[0][1])}t.closePath()}},getRect:function(t){if(t.__rect)return t.__rect;for(var e=Number.MAX_VALUE,i=Number.MIN_VALUE,o=Number.MAX_VALUE,n=Number.MIN_VALUE,r=t.pointList,s=0,a=r.length;a>s;s++)r[s][0]<e&&(e=r[s][0]),r[s][0]>i&&(i=r[s][0]),r[s][1]<o&&(o=r[s][1]),r[s][1]>n&&(n=r[s][1]);var h;return h="stroke"==t.brushType||"fill"==t.brushType?t.lineWidth||1:0,t.__rect={x:Math.round(e-h/2),y:Math.round(o-h/2),width:i-e+h,height:n-o+h},t.__rect}},t("../tool/util").inherits(r,e),r}),i("zrender/shape/Circle",["require","./Base","../tool/util"],function(t){"use strict";var e=t("./Base"),i=function(t){e.call(this,t)};return i.prototype={type:"circle",buildPath:function(t,e){t.moveTo(e.x+e.r,e.y),t.arc(e.x,e.y,e.r,0,2*Math.PI,!0)},getRect:function(t){if(t.__rect)return t.__rect;var e;return e="stroke"==t.brushType||"fill"==t.brushType?t.lineWidth||1:0,t.__rect={x:Math.round(t.x-t.r-e/2),y:Math.round(t.y-t.r-e/2),width:2*t.r+e,height:2*t.r+e},t.__rect}},t("../tool/util").inherits(i,e),i}),i("zrender/shape/util/smoothSpline",["require","../../tool/vector"],function(t){function e(t,e,i,o,n,r,s){var a=.5*(i-t),h=.5*(o-e);return(2*(e-i)+a+h)*s+(-3*(e-i)-2*a-h)*r+a*n+e}var i=t("../../tool/vector");return function(t,o){for(var n=t.length,r=[],s=0,a=1;n>a;a++)s+=i.distance(t[a-1],t[a]);var h=s/5;h=n>h?n:h;for(var a=0;h>a;a++){var l,c,d,u=a/(h-1)*(o?n:n-1),p=Math.floor(u),f=u-p,g=t[p%n];o?(l=t[(p-1+n)%n],c=t[(p+1)%n],d=t[(p+2)%n]):(l=t[0===p?p:p-1],c=t[p>n-2?n-1:p+1],d=t[p>n-3?n-1:p+2]);var m=f*f,_=f*m;r.push([e(l[0],g[0],c[0],d[0],f,m,_),e(l[1],g[1],c[1],d[1],f,m,_)])}return r}}),i("zrender/shape/util/smoothBezier",["require","../../tool/vector"],function(t){var e=t("../../tool/vector");return function(t,i,o,n){var r,s,a,h,l=[],c=[],d=[],u=[],p=!!n;if(p){a=[1/0,1/0],h=[-1/0,-1/0];for(var f=0,g=t.length;g>f;f++)e.min(a,a,t[f]),e.max(h,h,t[f]);e.min(a,a,n[0]),e.max(h,h,n[1])}for(var f=0,g=t.length;g>f;f++){var r,s,m=t[f];if(o)r=t[f?f-1:g-1],s=t[(f+1)%g];else{if(0===f||f===g-1){l.push(e.clone(t[f]));continue}r=t[f-1],s=t[f+1]}e.sub(c,s,r),e.scale(c,c,i);var _=e.distance(m,r),y=e.distance(m,s),v=_+y;0!==v&&(_/=v,y/=v),e.scale(d,c,-_),e.scale(u,c,y);var x=e.add([],m,d),b=e.add([],m,u);p&&(e.max(x,x,a),e.min(x,x,h),e.max(b,b,a),e.min(b,b,h)),l.push(x),l.push(b)}return o&&l.push(e.clone(l.shift())),l}}),i("echarts/util/ecQuery",["require","zrender/tool/util"],function(t){function e(t,e){if("undefined"!=typeof t){if(!e)return t;
e=e.split(".");for(var i=e.length,o=0;i>o;){if(t=t[e[o]],"undefined"==typeof t)return;o++}return t}}function i(t,i){for(var o,n=0,r=t.length;r>n;n++)if(o=e(t[n],i),"undefined"!=typeof o)return o}function o(t,i){for(var o,r=t.length;r--;){var s=e(t[r],i);"undefined"!=typeof s&&("undefined"==typeof o?o=n.clone(s):n.merge(o,s,!0))}return o}var n=t("zrender/tool/util");return{query:e,deepQuery:i,deepMerge:o}}),i("echarts/util/number",[],function(){function t(t){return t.replace(/^\s+/,"").replace(/\s+$/,"")}function e(e,i){return"string"==typeof e?t(e).match(/%$/)?parseFloat(e)/100*i:parseFloat(e):e}function i(t,i){return[e(i[0],t.getWidth()),e(i[1],t.getHeight())]}function o(t,i){i instanceof Array||(i=[0,i]);var o=Math.min(t.getWidth(),t.getHeight())/2;return[e(i[0],o),e(i[1],o)]}function n(t){return isNaN(t)?"-":(t=(t+"").split("."),t[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g,"$1,")+(t.length>1?"."+t[1]:""))}function r(t){for(var e=1,i=0;Math.round(t*e)/e!==t;)e*=10,i++;return i}return{parsePercent:e,parseCenter:i,parseRadius:o,addCommas:n,getPrecision:r}}),i("echarts/data/KDTree",["require","./quickSelect"],function(t){function e(t,e){this.left=null,this.right=null,this.axis=t,this.data=e}var i=t("./quickSelect"),o=function(t,e){t.length&&(e||(e=t[0].array.length),this.dimension=e,this.root=this._buildTree(t,0,t.length-1,0),this._stack=[],this._nearstNList=[])};return o.prototype._buildTree=function(t,o,n,r){if(o>n)return null;var s=Math.floor((o+n)/2);s=i(t,o,n,s,function(t,e){return t.array[r]-e.array[r]});var a=t[s],h=new e(r,a);return r=(r+1)%this.dimension,n>o&&(h.left=this._buildTree(t,o,s-1,r),h.right=this._buildTree(t,s+1,n,r)),h},o.prototype.nearest=function(t,e){var i=this.root,o=this._stack,n=0,r=1/0,s=null;for(i.data!==t&&(r=e(i.data,t),s=i),t.array[i.axis]<i.data.array[i.axis]?(i.right&&(o[n++]=i.right),i.left&&(o[n++]=i.left)):(i.left&&(o[n++]=i.left),i.right&&(o[n++]=i.right));n--;){i=o[n];var a=t.array[i.axis]-i.data.array[i.axis],h=0>a,l=!1;a*=a,r>a&&(a=e(i.data,t),r>a&&i.data!==t&&(r=a,s=i),l=!0),h?(l&&i.right&&(o[n++]=i.right),i.left&&(o[n++]=i.left)):(l&&i.left&&(o[n++]=i.left),i.right&&(o[n++]=i.right))}return s.data},o.prototype._addNearest=function(t,e,i){for(var o=this._nearstNList,n=t-1;n>0&&!(e>=o[n-1].dist);n--)o[n].dist=o[n-1].dist,o[n].node=o[n-1].node;o[n].dist=e,o[n].node=i},o.prototype.nearestN=function(t,e,i,o){if(0>=e)return o.length=0,o;for(var n=this.root,r=this._stack,s=0,a=this._nearstNList,h=0;e>h;h++)a[h]||(a[h]={}),a[h].dist=0,a[h].node=null;var l=i(n.data,t),c=0;for(n.data!==t&&(c++,this._addNearest(c,l,n)),t.array[n.axis]<n.data.array[n.axis]?(n.right&&(r[s++]=n.right),n.left&&(r[s++]=n.left)):(n.left&&(r[s++]=n.left),n.right&&(r[s++]=n.right));s--;){n=r[s];var l=t.array[n.axis]-n.data.array[n.axis],d=0>l,u=!1;l*=l,(e>c||l<a[c-1].dist)&&(l=i(n.data,t),(e>c||l<a[c-1].dist)&&n.data!==t&&(e>c&&c++,this._addNearest(c,l,n)),u=!0),d?(u&&n.right&&(r[s++]=n.right),n.left&&(r[s++]=n.left)):(u&&n.left&&(r[s++]=n.left),n.right&&(r[s++]=n.right))}for(var h=0;c>h;h++)o[h]=a[h].node.data;return o.length=c,o},o}),i("echarts/data/quickSelect",["require"],function(){function t(t,e){return t-e}function e(t,e,i){var o=t[e];t[e]=t[i],t[i]=o}function i(t,i,o,n,r){for(var s=i;o>i;){var s=Math.round((o+i)/2),a=t[s];e(t,s,o),s=i;for(var h=i;o-1>=h;h++)r(a,t[h])>=0&&(e(t,h,s),s++);if(e(t,o,s),s===n)return s;n>s?i=s+1:o=s-1}return i}function o(e,o,n,r,s){return arguments.length<=3&&(r=o,s=2==arguments.length?t:n,o=0,n=e.length-1),i(e,o,n,r,s)}return o}),i("echarts/component/valueAxis",["require","./base","zrender/shape/Text","zrender/shape/Line","zrender/shape/Rectangle","../config","../util/date","zrender/tool/util","../util/smartSteps","../util/accMath","../util/smartLogSteps","../component"],function(t){function e(t,e,o,n,r,s,a){if(!a||0===a.length)return void console.err("option.series.length == 0.");i.call(this,t,e,o,n,r),this.series=a,this.grid=this.component.grid;for(var h in s)this[h]=s[h];this.refresh(n,a)}var i=t("./base"),o=t("zrender/shape/Text"),n=t("zrender/shape/Line"),r=t("zrender/shape/Rectangle"),s=t("../config");s.valueAxis={zlevel:0,z:0,show:!0,position:"left",name:"",nameLocation:"end",nameTextStyle:{},boundaryGap:[0,0],axisLine:{show:!0,onZero:!0,lineStyle:{color:"#48b",width:2,type:"solid"}},axisTick:{show:!1,inside:!1,length:5,lineStyle:{color:"#333",width:1}},axisLabel:{show:!0,rotate:0,margin:8,textStyle:{color:"#333"}},splitLine:{show:!0,lineStyle:{color:["#ccc"],width:1,type:"solid"}},splitArea:{show:!1,areaStyle:{color:["rgba(250,250,250,0.3)","rgba(200,200,200,0.3)"]}}};var a=t("../util/date"),h=t("zrender/tool/util");return e.prototype={type:s.COMPONENT_TYPE_AXIS_VALUE,_buildShape:function(){if(this._hasData=!1,this._calculateValue(),this._hasData&&this.option.show){this.option.splitArea.show&&this._buildSplitArea(),this.option.splitLine.show&&this._buildSplitLine(),this.option.axisLine.show&&this._buildAxisLine(),this.option.axisTick.show&&this._buildAxisTick(),this.option.axisLabel.show&&this._buildAxisLabel();for(var t=0,e=this.shapeList.length;e>t;t++)this.zr.addShape(this.shapeList[t])}},_buildAxisTick:function(){var t,e=this._valueList,i=this._valueList.length,o=this.option.axisTick,r=o.length,s=o.lineStyle.color,a=o.lineStyle.width;if(this.isHorizontal())for(var h,l="bottom"===this.option.position?o.inside?this.grid.getYend()-r-1:this.grid.getYend()+1:o.inside?this.grid.getY()+1:this.grid.getY()-r-1,c=0;i>c;c++)h=this.subPixelOptimize(this.getCoord(e[c]),a),t={_axisShape:"axisTick",zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:h,yStart:l,xEnd:h,yEnd:l+r,strokeColor:s,lineWidth:a}},this.shapeList.push(new n(t));else for(var d,u="left"===this.option.position?o.inside?this.grid.getX()+1:this.grid.getX()-r-1:o.inside?this.grid.getXend()-r-1:this.grid.getXend()+1,c=0;i>c;c++)d=this.subPixelOptimize(this.getCoord(e[c]),a),t={_axisShape:"axisTick",zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:u,yStart:d,xEnd:u+r,yEnd:d,strokeColor:s,lineWidth:a}},this.shapeList.push(new n(t))},_buildAxisLabel:function(){var t,e=this._valueList,i=this._valueList.length,n=this.option.axisLabel.rotate,r=this.option.axisLabel.margin,s=this.option.axisLabel.clickable,a=this.option.axisLabel.textStyle;if(this.isHorizontal()){var h,l;"bottom"===this.option.position?(h=this.grid.getYend()+r,l="top"):(h=this.grid.getY()-r,l="bottom");for(var c=0;i>c;c++)t={zlevel:this.getZlevelBase(),z:this.getZBase()+3,hoverable:!1,style:{x:this.getCoord(e[c]),y:h,color:"function"==typeof a.color?a.color(e[c]):a.color,text:this._valueLabel[c],textFont:this.getFont(a),textAlign:a.align||"center",textBaseline:a.baseline||l}},n&&(t.style.textAlign=n>0?"bottom"===this.option.position?"right":"left":"bottom"===this.option.position?"left":"right",t.rotation=[n*Math.PI/180,t.style.x,t.style.y]),this.shapeList.push(new o(this._axisLabelClickable(s,t)))}else{var d,u;"left"===this.option.position?(d=this.grid.getX()-r,u="right"):(d=this.grid.getXend()+r,u="left");for(var c=0;i>c;c++)t={zlevel:this.getZlevelBase(),z:this.getZBase()+3,hoverable:!1,style:{x:d,y:this.getCoord(e[c]),color:"function"==typeof a.color?a.color(e[c]):a.color,text:this._valueLabel[c],textFont:this.getFont(a),textAlign:a.align||u,textBaseline:a.baseline||(0===c&&""!==this.option.name?"bottom":c===i-1&&""!==this.option.name?"top":"middle")}},n&&(t.rotation=[n*Math.PI/180,t.style.x,t.style.y]),this.shapeList.push(new o(this._axisLabelClickable(s,t)))}},_buildSplitLine:function(){var t,e=this._valueList,i=this._valueList.length,o=this.option.splitLine,r=o.lineStyle.type,s=o.lineStyle.width,a=o.lineStyle.color;a=a instanceof Array?a:[a];var h=a.length;if(this.isHorizontal())for(var l,c=this.grid.getY(),d=this.grid.getYend(),u=0;i>u;u++)l=this.subPixelOptimize(this.getCoord(e[u]),s),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:l,yStart:c,xEnd:l,yEnd:d,strokeColor:a[u%h],lineType:r,lineWidth:s}},this.shapeList.push(new n(t));else for(var p,f=this.grid.getX(),g=this.grid.getXend(),u=0;i>u;u++)p=this.subPixelOptimize(this.getCoord(e[u]),s),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:f,yStart:p,xEnd:g,yEnd:p,strokeColor:a[u%h],lineType:r,lineWidth:s}},this.shapeList.push(new n(t))},_buildSplitArea:function(){var t,e=this.option.splitArea.areaStyle.color;if(e instanceof Array){var i=e.length,o=this._valueList,n=this._valueList.length;if(this.isHorizontal())for(var s,a=this.grid.getY(),h=this.grid.getHeight(),l=this.grid.getX(),c=0;n>=c;c++)s=n>c?this.getCoord(o[c]):this.grid.getXend(),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:l,y:a,width:s-l,height:h,color:e[c%i]}},this.shapeList.push(new r(t)),l=s;else for(var d,u=this.grid.getX(),p=this.grid.getWidth(),f=this.grid.getYend(),c=0;n>=c;c++)d=n>c?this.getCoord(o[c]):this.grid.getY(),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:u,y:d,width:p,height:f-d,color:e[c%i]}},this.shapeList.push(new r(t)),f=d}else t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this.grid.getX(),y:this.grid.getY(),width:this.grid.getWidth(),height:this.grid.getHeight(),color:e}},this.shapeList.push(new r(t))},_calculateValue:function(){if(isNaN(this.option.min-0)||isNaN(this.option.max-0)){for(var t,e,i={},o=this.component.legend,n=0,r=this.series.length;r>n;n++)!(this.series[n].type!=s.CHART_TYPE_LINE&&this.series[n].type!=s.CHART_TYPE_BAR&&this.series[n].type!=s.CHART_TYPE_SCATTER&&this.series[n].type!=s.CHART_TYPE_K&&this.series[n].type!=s.CHART_TYPE_EVENTRIVER||o&&!o.isSelected(this.series[n].name)||(t=this.series[n].xAxisIndex||0,e=this.series[n].yAxisIndex||0,this.option.xAxisIndex!=t&&this.option.yAxisIndex!=e||!this._calculSum(i,n)));var a;for(var n in i){a=i[n];for(var h=0,l=a.length;l>h;h++)if(!isNaN(a[h])){this._hasData=!0,this._min=a[h],this._max=a[h];break}if(this._hasData)break}for(var n in i){a=i[n];for(var h=0,l=a.length;l>h;h++)isNaN(a[h])||(this._min=Math.min(this._min,a[h]),this._max=Math.max(this._max,a[h]))}var c="log"!==this.option.type?this.option.boundaryGap:[0,0],d=Math.abs(this._max-this._min);this._min=isNaN(this.option.min-0)?this._min-Math.abs(d*c[0]):this.option.min-0,this._max=isNaN(this.option.max-0)?this._max+Math.abs(d*c[1]):this.option.max-0,this._min===this._max&&(0===this._max?this._max=1:this._max>0?this._min=this._max/this.option.splitNumber!=null?this.option.splitNumber:5:this._max=this._max/this.option.splitNumber!=null?this.option.splitNumber:5),"time"===this.option.type?this._reformTimeValue():"log"===this.option.type?this._reformLogValue():this._reformValue(this.option.scale)}else this._hasData=!0,this._min=this.option.min-0,this._max=this.option.max-0,"time"===this.option.type?this._reformTimeValue():"log"===this.option.type?this._reformLogValue():this._customerValue()},_calculSum:function(t,e){var i,o,n=this.series[e].name||"kener";if(this.series[e].stack){var r="__Magic_Key_Positive__"+this.series[e].stack,h="__Magic_Key_Negative__"+this.series[e].stack;t[r]=t[r]||[],t[h]=t[h]||[],t[n]=t[n]||[],o=this.series[e].data;for(var l=0,c=o.length;c>l;l++)i=this.getDataFromOption(o[l]),"-"!==i&&(i-=0,i>=0?null!=t[r][l]?t[r][l]+=i:t[r][l]=i:null!=t[h][l]?t[h][l]+=i:t[h][l]=i,this.option.scale&&t[n].push(i))}else if(t[n]=t[n]||[],this.series[e].type!=s.CHART_TYPE_EVENTRIVER){o=this.series[e].data;for(var l=0,c=o.length;c>l;l++)i=this.getDataFromOption(o[l]),this.series[e].type===s.CHART_TYPE_K?(t[n].push(i[0]),t[n].push(i[1]),t[n].push(i[2]),t[n].push(i[3])):i instanceof Array?(-1!=this.option.xAxisIndex&&t[n].push("time"!=this.option.type?i[0]:a.getNewDate(i[0])),-1!=this.option.yAxisIndex&&t[n].push("time"!=this.option.type?i[1]:a.getNewDate(i[1]))):t[n].push(i)}else{o=this.series[e].data;for(var l=0,c=o.length;c>l;l++)for(var d=o[l].evolution,u=0,p=d.length;p>u;u++)t[n].push(a.getNewDate(d[u].time))}},_reformValue:function(e){var i=t("../util/smartSteps"),o=this.option.splitNumber;!e&&this._min>=0&&this._max>=0&&(this._min=0),!e&&this._min<=0&&this._max<=0&&(this._max=0);var n=i(this._min,this._max,o);o=null!=o?o:n.secs,this._min=n.min,this._max=n.max,this._valueList=n.pnts,this._reformLabelData()},_reformTimeValue:function(){var t=null!=this.option.splitNumber?this.option.splitNumber:5,e=a.getAutoFormatter(this._min,this._max,t),i=e.formatter,o=e.gapValue;this._valueList=[a.getNewDate(this._min)];var n;switch(i){case"week":n=a.nextMonday(this._min);break;case"month":n=a.nextNthOnMonth(this._min,1);break;case"quarter":n=a.nextNthOnQuarterYear(this._min,1);break;case"half-year":n=a.nextNthOnHalfYear(this._min,1);break;case"year":n=a.nextNthOnYear(this._min,1);break;default:72e5>=o?n=(Math.floor(this._min/o)+1)*o:(n=a.getNewDate(this._min- -o),n.setHours(6*Math.round(n.getHours()/6)),n.setMinutes(0),n.setSeconds(0))}for(n-this._min<o/2&&(n-=-o),e=a.getNewDate(n),t*=1.5;t-->=0&&(("month"==i||"quarter"==i||"half-year"==i||"year"==i)&&e.setDate(1),!(this._max-e<o/2));)this._valueList.push(e),e=a.getNewDate(e- -o);this._valueList.push(a.getNewDate(this._max)),this._reformLabelData(function(t){return function(e){return a.format(t,e)}}(i))},_customerValue:function(){var e=t("../util/accMath"),i=null!=this.option.splitNumber?this.option.splitNumber:5,o=(this._max-this._min)/i;this._valueList=[];for(var n=0;i>=n;n++)this._valueList.push(e.accAdd(this._min,e.accMul(o,n)));this._reformLabelData()},_reformLogValue:function(){var e=this.option,i=t("../util/smartLogSteps")({dataMin:this._min,dataMax:this._max,logPositive:e.logPositive,logLabelBase:e.logLabelBase,splitNumber:e.splitNumber});this._min=i.dataMin,this._max=i.dataMax,this._valueList=i.tickList,this._dataMappingMethods=i.dataMappingMethods,this._reformLabelData(i.labelFormatter)},_reformLabelData:function(t){this._valueLabel=[];var e=this.option.axisLabel.formatter;if(e)for(var i=0,o=this._valueList.length;o>i;i++)"function"==typeof e?this._valueLabel.push(t?e.call(this.myChart,this._valueList[i],t):e.call(this.myChart,this._valueList[i])):"string"==typeof e&&this._valueLabel.push(t?a.format(e,this._valueList[i]):e.replace("{value}",this._valueList[i]));else for(var i=0,o=this._valueList.length;o>i;i++)this._valueLabel.push(t?t(this._valueList[i]):this.numAddCommas(this._valueList[i]))},getExtremum:function(){this._calculateValue();var t=this._dataMappingMethods;return{min:this._min,max:this._max,dataMappingMethods:t?h.merge({},t):null}},refresh:function(t,e){t&&(this.option=this.reformOption(t),this.option.axisLabel.textStyle=h.merge(this.option.axisLabel.textStyle||{},this.ecTheme.textStyle),this.series=e),this.zr&&(this.clear(),this._buildShape())},getCoord:function(t){this._dataMappingMethods&&(t=this._dataMappingMethods.value2Coord(t)),t=t<this._min?this._min:t,t=t>this._max?this._max:t;var e;return e=this.isHorizontal()?this.grid.getX()+(t-this._min)/(this._max-this._min)*this.grid.getWidth():this.grid.getYend()-(t-this._min)/(this._max-this._min)*this.grid.getHeight()},getCoordSize:function(t){return Math.abs(this.isHorizontal()?t/(this._max-this._min)*this.grid.getWidth():t/(this._max-this._min)*this.grid.getHeight())},getValueFromCoord:function(t){var e;return this.isHorizontal()?(t=t<this.grid.getX()?this.grid.getX():t,t=t>this.grid.getXend()?this.grid.getXend():t,e=this._min+(t-this.grid.getX())/this.grid.getWidth()*(this._max-this._min)):(t=t<this.grid.getY()?this.grid.getY():t,t=t>this.grid.getYend()?this.grid.getYend():t,e=this._max-(t-this.grid.getY())/this.grid.getHeight()*(this._max-this._min)),this._dataMappingMethods&&(e=this._dataMappingMethods.coord2Value(e)),e.toFixed(2)-0},isMaindAxis:function(t){for(var e=0,i=this._valueList.length;i>e;e++)if(this._valueList[e]===t)return!0;return!1}},h.inherits(e,i),t("../component").define("valueAxis",e),e}),i("echarts/component/categoryAxis",["require","./base","zrender/shape/Text","zrender/shape/Line","zrender/shape/Rectangle","../config","zrender/tool/util","zrender/tool/area","../component"],function(t){function e(t,e,o,n,r,s){if(n.data.length<1)return void console.error("option.data.length < 1.");i.call(this,t,e,o,n,r),this.grid=this.component.grid;for(var a in s)this[a]=s[a];this.refresh(n)}var i=t("./base"),o=t("zrender/shape/Text"),n=t("zrender/shape/Line"),r=t("zrender/shape/Rectangle"),s=t("../config");s.categoryAxis={zlevel:0,z:0,show:!0,position:"bottom",name:"",nameLocation:"end",nameTextStyle:{},boundaryGap:!0,axisLine:{show:!0,onZero:!0,lineStyle:{color:"#48b",width:2,type:"solid"}},axisTick:{show:!0,interval:"auto",inside:!1,length:5,lineStyle:{color:"#333",width:1}},axisLabel:{show:!0,interval:"auto",rotate:0,margin:8,textStyle:{color:"#333"}},splitLine:{show:!0,lineStyle:{color:["#ccc"],width:1,type:"solid"}},splitArea:{show:!1,areaStyle:{color:["rgba(250,250,250,0.3)","rgba(200,200,200,0.3)"]}}};var a=t("zrender/tool/util"),h=t("zrender/tool/area");return e.prototype={type:s.COMPONENT_TYPE_AXIS_CATEGORY,_getReformedLabel:function(t){var e=this.getDataFromOption(this.option.data[t]),i=this.option.data[t].formatter||this.option.axisLabel.formatter;return i&&("function"==typeof i?e=i.call(this.myChart,e):"string"==typeof i&&(e=i.replace("{value}",e))),e},_getInterval:function(){var t=this.option.axisLabel.interval;if("auto"==t){var e=this.option.axisLabel.textStyle.fontSize,i=this.option.data,o=this.option.data.length;if(this.isHorizontal())if(o>3){var n,r,s=this.getGap(),l=!1,c=Math.floor(.5/s);for(c=1>c?1:c,t=Math.floor(15/s);!l&&o>t;){t+=c,l=!0,n=Math.floor(s*t);for(var d=Math.floor((o-1)/t)*t;d>=0;d-=t){if(0!==this.option.axisLabel.rotate)r=e;else if(i[d].textStyle)r=h.getTextWidth(this._getReformedLabel(d),this.getFont(a.merge(i[d].textStyle,this.option.axisLabel.textStyle)));else{var u=this._getReformedLabel(d)+"",p=(u.match(/\w/g)||"").length,f=u.length-p;r=p*e*2/3+f*e}if(r>n){l=!1;break}}}}else t=1;else if(o>3){var s=this.getGap();for(t=Math.floor(11/s);e>s*t-6&&o>t;)t++}else t=1}else t="function"==typeof t?1:t-0+1;return t},_buildShape:function(){if(this._interval=this._getInterval(),this.option.show){this.option.splitArea.show&&this._buildSplitArea(),this.option.splitLine.show&&this._buildSplitLine(),this.option.axisLine.show&&this._buildAxisLine(),this.option.axisTick.show&&this._buildAxisTick(),this.option.axisLabel.show&&this._buildAxisLabel();for(var t=0,e=this.shapeList.length;e>t;t++)this.zr.addShape(this.shapeList[t])}},_buildAxisTick:function(){var t,e=this.option.data,i=this.option.data.length,o=this.option.axisTick,r=o.length,s=o.lineStyle.color,a=o.lineStyle.width,h="function"==typeof o.interval?o.interval:"auto"==o.interval&&"function"==typeof this.option.axisLabel.interval?this.option.axisLabel.interval:!1,l=h?1:"auto"==o.interval?this._interval:o.interval-0+1,c=o.onGap,d=c?this.getGap()/2:"undefined"==typeof c&&this.option.boundaryGap?this.getGap()/2:0,u=d>0?-l:0;if(this.isHorizontal())for(var p,f="bottom"==this.option.position?o.inside?this.grid.getYend()-r-1:this.grid.getYend()+1:o.inside?this.grid.getY()+1:this.grid.getY()-r-1,g=u;i>g;g+=l)(!h||h(g,e[g]))&&(p=this.subPixelOptimize(this.getCoordByIndex(g)+(g>=0?d:0),a),t={_axisShape:"axisTick",zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:p,yStart:f,xEnd:p,yEnd:f+r,strokeColor:s,lineWidth:a}},this.shapeList.push(new n(t)));else for(var m,_="left"==this.option.position?o.inside?this.grid.getX()+1:this.grid.getX()-r-1:o.inside?this.grid.getXend()-r-1:this.grid.getXend()+1,g=u;i>g;g+=l)(!h||h(g,e[g]))&&(m=this.subPixelOptimize(this.getCoordByIndex(g)-(g>=0?d:0),a),t={_axisShape:"axisTick",zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:_,yStart:m,xEnd:_+r,yEnd:m,strokeColor:s,lineWidth:a}},this.shapeList.push(new n(t)))},_buildAxisLabel:function(){var t,e,i=this.option.data,n=this.option.data.length,r=this.option.axisLabel,s=r.rotate,h=r.margin,l=r.clickable,c=r.textStyle,d="function"==typeof r.interval?r.interval:!1;if(this.isHorizontal()){var u,p;"bottom"==this.option.position?(u=this.grid.getYend()+h,p="top"):(u=this.grid.getY()-h,p="bottom");for(var f=0;n>f;f+=this._interval)d&&!d(f,i[f])||""===this._getReformedLabel(f)||(e=a.merge(i[f].textStyle||{},c),t={zlevel:this.getZlevelBase(),z:this.getZBase()+3,hoverable:!1,style:{x:this.getCoordByIndex(f),y:u,color:e.color,text:this._getReformedLabel(f),textFont:this.getFont(e),textAlign:e.align||"center",textBaseline:e.baseline||p}},s&&(t.style.textAlign=s>0?"bottom"==this.option.position?"right":"left":"bottom"==this.option.position?"left":"right",t.rotation=[s*Math.PI/180,t.style.x,t.style.y]),this.shapeList.push(new o(this._axisLabelClickable(l,t))))}else{var g,m;"left"==this.option.position?(g=this.grid.getX()-h,m="right"):(g=this.grid.getXend()+h,m="left");for(var f=0;n>f;f+=this._interval)d&&!d(f,i[f])||""===this._getReformedLabel(f)||(e=a.merge(i[f].textStyle||{},c),t={zlevel:this.getZlevelBase(),z:this.getZBase()+3,hoverable:!1,style:{x:g,y:this.getCoordByIndex(f),color:e.color,text:this._getReformedLabel(f),textFont:this.getFont(e),textAlign:e.align||m,textBaseline:e.baseline||0===f&&""!==this.option.name?"bottom":f==n-1&&""!==this.option.name?"top":"middle"}},s&&(t.rotation=[s*Math.PI/180,t.style.x,t.style.y]),this.shapeList.push(new o(this._axisLabelClickable(l,t))))}},_buildSplitLine:function(){var t,e=this.option.data,i=this.option.data.length,o=this.option.splitLine,r=o.lineStyle.type,s=o.lineStyle.width,a=o.lineStyle.color;a=a instanceof Array?a:[a];var h=a.length,l="function"==typeof this.option.axisLabel.interval?this.option.axisLabel.interval:!1,c=o.onGap,d=c?this.getGap()/2:"undefined"==typeof c&&this.option.boundaryGap?this.getGap()/2:0;if(i-=c||"undefined"==typeof c&&this.option.boundaryGap?1:0,this.isHorizontal())for(var u,p=this.grid.getY(),f=this.grid.getYend(),g=0;i>g;g+=this._interval)(!l||l(g,e[g]))&&(u=this.subPixelOptimize(this.getCoordByIndex(g)+d,s),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:u,yStart:p,xEnd:u,yEnd:f,strokeColor:a[g/this._interval%h],lineType:r,lineWidth:s}},this.shapeList.push(new n(t)));else for(var m,_=this.grid.getX(),y=this.grid.getXend(),g=0;i>g;g+=this._interval)(!l||l(g,e[g]))&&(m=this.subPixelOptimize(this.getCoordByIndex(g)-d,s),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{xStart:_,yStart:m,xEnd:y,yEnd:m,strokeColor:a[g/this._interval%h],lineType:r,lineWidth:s}},this.shapeList.push(new n(t)))},_buildSplitArea:function(){var t,e=this.option.data,i=this.option.splitArea,o=i.areaStyle.color;if(o instanceof Array){var n=o.length,s=this.option.data.length,a="function"==typeof this.option.axisLabel.interval?this.option.axisLabel.interval:!1,h=i.onGap,l=h?this.getGap()/2:"undefined"==typeof h&&this.option.boundaryGap?this.getGap()/2:0;if(this.isHorizontal())for(var c,d=this.grid.getY(),u=this.grid.getHeight(),p=this.grid.getX(),f=0;s>=f;f+=this._interval)a&&!a(f,e[f])&&s>f||(c=s>f?this.getCoordByIndex(f)+l:this.grid.getXend(),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:p,y:d,width:c-p,height:u,color:o[f/this._interval%n]}},this.shapeList.push(new r(t)),p=c);else for(var g,m=this.grid.getX(),_=this.grid.getWidth(),y=this.grid.getYend(),f=0;s>=f;f+=this._interval)a&&!a(f,e[f])&&s>f||(g=s>f?this.getCoordByIndex(f)-l:this.grid.getY(),t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:m,y:g,width:_,height:y-g,color:o[f/this._interval%n]}},this.shapeList.push(new r(t)),y=g)}else t={zlevel:this.getZlevelBase(),z:this.getZBase(),hoverable:!1,style:{x:this.grid.getX(),y:this.grid.getY(),width:this.grid.getWidth(),height:this.grid.getHeight(),color:o}},this.shapeList.push(new r(t))},refresh:function(t){t&&(this.option=this.reformOption(t),this.option.axisLabel.textStyle=this.getTextStyle(this.option.axisLabel.textStyle)),this.clear(),this._buildShape()},getGap:function(){var t=this.option.data.length,e=this.isHorizontal()?this.grid.getWidth():this.grid.getHeight();return this.option.boundaryGap?e/t:e/(t>1?t-1:1)},getCoord:function(t){for(var e=this.option.data,i=e.length,o=this.getGap(),n=this.option.boundaryGap?o/2:0,r=0;i>r;r++){if(this.getDataFromOption(e[r])==t)return n=this.isHorizontal()?this.grid.getX()+n:this.grid.getYend()-n;n+=o}},getCoordByIndex:function(t){if(0>t)return this.isHorizontal()?this.grid.getX():this.grid.getYend();if(t>this.option.data.length-1)return this.isHorizontal()?this.grid.getXend():this.grid.getY();var e=this.getGap(),i=this.option.boundaryGap?e/2:0;return i+=t*e,i=this.isHorizontal()?this.grid.getX()+i:this.grid.getYend()-i},getNameByIndex:function(t){return this.getDataFromOption(this.option.data[t])},getIndexByName:function(t){for(var e=this.option.data,i=e.length,o=0;i>o;o++)if(this.getDataFromOption(e[o])==t)return o;return-1},getValueFromCoord:function(){return""},isMainAxis:function(t){return t%this._interval===0}},a.inherits(e,i),t("../component").define("categoryAxis",e),e}),i("echarts/component/dataView",["require","./base","../config","zrender/tool/util","../component"],function(t){function e(t,e,o,n,r){i.call(this,t,e,o,n,r),this.dom=r.dom,this._tDom=document.createElement("div"),this._textArea=document.createElement("textArea"),this._buttonRefresh=document.createElement("button"),this._buttonRefresh.setAttribute("type","button"),this._buttonClose=document.createElement("button"),this._buttonClose.setAttribute("type","button"),this._hasShow=!1,this._zrHeight=o.getHeight(),this._zrWidth=o.getWidth(),this._tDom.className="echarts-dataview",this.hide(),this.dom.firstChild.appendChild(this._tDom),window.addEventListener?(this._tDom.addEventListener("click",this._stop),this._tDom.addEventListener("mousewheel",this._stop),this._tDom.addEventListener("mousemove",this._stop),this._tDom.addEventListener("mousedown",this._stop),this._tDom.addEventListener("mouseup",this._stop),this._tDom.addEventListener("touchstart",this._stop),this._tDom.addEventListener("touchmove",this._stop),this._tDom.addEventListener("touchend",this._stop)):(this._tDom.attachEvent("onclick",this._stop),this._tDom.attachEvent("onmousewheel",this._stop),this._tDom.attachEvent("onmousemove",this._stop),this._tDom.attachEvent("onmousedown",this._stop),this._tDom.attachEvent("onmouseup",this._stop))}var i=t("./base"),o=t("../config"),n=t("zrender/tool/util");return e.prototype={type:o.COMPONENT_TYPE_DATAVIEW,_lang:["Data View","close","refresh"],_gCssText:"position:absolute;display:block;overflow:hidden;transition:height 0.8s,background-color 1s;-moz-transition:height 0.8s,background-color 1s;-webkit-transition:height 0.8s,background-color 1s;-o-transition:height 0.8s,background-color 1s;z-index:1;left:0;top:0;",hide:function(){this._sizeCssText="width:"+this._zrWidth+"px;height:0px;background-color:#f0ffff;",this._tDom.style.cssText=this._gCssText+this._sizeCssText},show:function(t){this._hasShow=!0;var e=this.query(this.option,"toolbox.feature.dataView.lang")||this._lang;this.option=t,this._tDom.innerHTML='<p style="padding:8px 0;margin:0 0 10px 0;border-bottom:1px solid #eee">'+(e[0]||this._lang[0])+"</p>";var i=this.query(this.option,"toolbox.feature.dataView.optionToContent");"function"!=typeof i?this._textArea.value=this._optionToContent():(this._textArea=document.createElement("div"),this._textArea.innerHTML=i(this.option)),this._textArea.style.cssText="display:block;margin:0 0 8px 0;padding:4px 6px;overflow:auto;width:100%;height:"+(this._zrHeight-100)+"px;",this._tDom.appendChild(this._textArea),this._buttonClose.style.cssText="float:right;padding:1px 6px;",this._buttonClose.innerHTML=e[1]||this._lang[1];var o=this;this._buttonClose.onclick=function(){o.hide()},this._tDom.appendChild(this._buttonClose),this.query(this.option,"toolbox.feature.dataView.readOnly")===!1?(this._buttonRefresh.style.cssText="float:right;margin-right:10px;padding:1px 6px;",this._buttonRefresh.innerHTML=e[2]||this._lang[2],this._buttonRefresh.onclick=function(){o._save()},this._textArea.readOnly=!1,this._textArea.style.cursor="default"):(this._buttonRefresh.style.cssText="display:none",this._textArea.readOnly=!0,this._textArea.style.cursor="text"),this._tDom.appendChild(this._buttonRefresh),this._sizeCssText="width:"+this._zrWidth+"px;height:"+this._zrHeight+"px;background-color:#fff;",this._tDom.style.cssText=this._gCssText+this._sizeCssText},_optionToContent:function(){var t,e,i,n,r,s,a=[],h="";if(this.option.xAxis)for(a=this.option.xAxis instanceof Array?this.option.xAxis:[this.option.xAxis],t=0,n=a.length;n>t;t++)if("category"==(a[t].type||"category")){for(s=[],e=0,i=a[t].data.length;i>e;e++)s.push(this.getDataFromOption(a[t].data[e]));h+=s.join(", ")+"\n\n"}if(this.option.yAxis)for(a=this.option.yAxis instanceof Array?this.option.yAxis:[this.option.yAxis],t=0,n=a.length;n>t;t++)if("category"==a[t].type){for(s=[],e=0,i=a[t].data.length;i>e;e++)s.push(this.getDataFromOption(a[t].data[e]));h+=s.join(", ")+"\n\n"}var l,c=this.option.series;for(t=0,n=c.length;n>t;t++){for(s=[],e=0,i=c[t].data.length;i>e;e++)r=c[t].data[e],l=c[t].type==o.CHART_TYPE_PIE||c[t].type==o.CHART_TYPE_MAP?(r.name||"-")+":":"",c[t].type==o.CHART_TYPE_SCATTER&&(r=this.getDataFromOption(r).join(", ")),s.push(l+this.getDataFromOption(r));h+=(c[t].name||"-")+" : \n",h+=s.join(c[t].type==o.CHART_TYPE_SCATTER?"\n":", "),h+="\n\n"}return h},_save:function(){var t=this.query(this.option,"toolbox.feature.dataView.contentToOption");if("function"!=typeof t){for(var e=this._textArea.value.split("\n"),i=[],n=0,r=e.length;r>n;n++)e[n]=this._trim(e[n]),""!==e[n]&&i.push(e[n]);this._contentToOption(i)}else t(this._textArea,this.option);this.hide();var s=this;setTimeout(function(){s.messageCenter&&s.messageCenter.dispatch(o.EVENT.DATA_VIEW_CHANGED,null,{option:s.option},s.myChart)},s.canvasSupported?800:100)},_contentToOption:function(t){var e,i,n,r,s,a,h,l=[],c=0;if(this.option.xAxis)for(l=this.option.xAxis instanceof Array?this.option.xAxis:[this.option.xAxis],e=0,r=l.length;r>e;e++)if("category"==(l[e].type||"category")){for(a=t[c].split(","),i=0,n=l[e].data.length;n>i;i++)h=this._trim(a[i]||""),s=l[e].data[i],"undefined"!=typeof l[e].data[i].value?l[e].data[i].value=h:l[e].data[i]=h;c++}if(this.option.yAxis)for(l=this.option.yAxis instanceof Array?this.option.yAxis:[this.option.yAxis],e=0,r=l.length;r>e;e++)if("category"==l[e].type){for(a=t[c].split(","),i=0,n=l[e].data.length;n>i;i++)h=this._trim(a[i]||""),s=l[e].data[i],"undefined"!=typeof l[e].data[i].value?l[e].data[i].value=h:l[e].data[i]=h;c++}var d=this.option.series;for(e=0,r=d.length;r>e;e++)if(c++,d[e].type==o.CHART_TYPE_SCATTER)for(var i=0,n=d[e].data.length;n>i;i++)a=t[c],h=a.replace(" ","").split(","),"undefined"!=typeof d[e].data[i].value?d[e].data[i].value=h:d[e].data[i]=h,c++;else{a=t[c].split(",");for(var i=0,n=d[e].data.length;n>i;i++)h=(a[i]||"").replace(/.*:/,""),h=this._trim(h),h="-"!=h&&""!==h?h-0:"-","undefined"!=typeof d[e].data[i].value?d[e].data[i].value=h:d[e].data[i]=h;c++}},_trim:function(t){var e=new RegExp("(^[\\s\\t\\xa0\\u3000]+)|([\\u3000\\xa0\\s\\t]+$)","g");return t.replace(e,"")},_stop:function(t){t=t||window.event,t.stopPropagation?t.stopPropagation():t.cancelBubble=!0},resize:function(){this._zrHeight=this.zr.getHeight(),this._zrWidth=this.zr.getWidth(),this._tDom.offsetHeight>10&&(this._sizeCssText="width:"+this._zrWidth+"px;height:"+this._zrHeight+"px;background-color:#fff;",this._tDom.style.cssText=this._gCssText+this._sizeCssText,this._textArea.style.cssText="display:block;margin:0 0 8px 0;padding:4px 6px;overflow:auto;width:100%;height:"+(this._zrHeight-100)+"px;")},dispose:function(){window.removeEventListener?(this._tDom.removeEventListener("click",this._stop),this._tDom.removeEventListener("mousewheel",this._stop),this._tDom.removeEventListener("mousemove",this._stop),this._tDom.removeEventListener("mousedown",this._stop),this._tDom.removeEventListener("mouseup",this._stop),this._tDom.removeEventListener("touchstart",this._stop),this._tDom.removeEventListener("touchmove",this._stop),this._tDom.removeEventListener("touchend",this._stop)):(this._tDom.detachEvent("onclick",this._stop),this._tDom.detachEvent("onmousewheel",this._stop),this._tDom.detachEvent("onmousemove",this._stop),this._tDom.detachEvent("onmousedown",this._stop),this._tDom.detachEvent("onmouseup",this._stop)),this._buttonRefresh.onclick=null,this._buttonClose.onclick=null,this._hasShow&&(this._tDom.removeChild(this._textArea),this._tDom.removeChild(this._buttonRefresh),this._tDom.removeChild(this._buttonClose)),this._textArea=null,this._buttonRefresh=null,this._buttonClose=null,this.dom.firstChild.removeChild(this._tDom),this._tDom=null
}},n.inherits(e,i),t("../component").define("dataView",e),e}),i("echarts/util/date",[],function(){function t(t,e,i){i=i>1?i:2;for(var o,n,r,s,a=0,h=c.length;h>a;a++)if(o=c[a].value,n=Math.ceil(e/o)*o-Math.floor(t/o)*o,Math.round(n/o)<=1.2*i){r=c[a].formatter,s=c[a].value;break}return null==r&&(r="year",o=317088e5,n=Math.ceil(e/o)*o-Math.floor(t/o)*o,s=Math.round(n/(i-1)/o)*o),{formatter:r,gapValue:s}}function e(t){return 10>t?"0"+t:t}function i(t,i){("week"==t||"month"==t||"quarter"==t||"half-year"==t||"year"==t)&&(t="MM - dd\nyyyy");var o=l(i),n=o.getFullYear(),r=o.getMonth()+1,s=o.getDate(),a=o.getHours(),h=o.getMinutes(),c=o.getSeconds();return t=t.replace("MM",e(r)),t=t.toLowerCase(),t=t.replace("yyyy",n),t=t.replace("yy",n%100),t=t.replace("dd",e(s)),t=t.replace("d",s),t=t.replace("hh",e(a)),t=t.replace("h",a),t=t.replace("mm",e(h)),t=t.replace("m",h),t=t.replace("ss",e(c)),t=t.replace("s",c)}function o(t){return t=l(t),t.setDate(t.getDate()+8-t.getDay()),t}function n(t,e,i){return t=l(t),t.setMonth(Math.ceil((t.getMonth()+1)/i)*i),t.setDate(e),t}function r(t,e){return n(t,e,1)}function s(t,e){return n(t,e,3)}function a(t,e){return n(t,e,6)}function h(t,e){return n(t,e,12)}function l(t){return t instanceof Date?t:new Date("string"==typeof t?t.replace(/-/g,"/"):t)}var c=[{formatter:"hh : mm : ss",value:1e3},{formatter:"hh : mm : ss",value:5e3},{formatter:"hh : mm : ss",value:1e4},{formatter:"hh : mm : ss",value:15e3},{formatter:"hh : mm : ss",value:3e4},{formatter:"hh : mm\nMM - dd",value:6e4},{formatter:"hh : mm\nMM - dd",value:3e5},{formatter:"hh : mm\nMM - dd",value:6e5},{formatter:"hh : mm\nMM - dd",value:9e5},{formatter:"hh : mm\nMM - dd",value:18e5},{formatter:"hh : mm\nMM - dd",value:36e5},{formatter:"hh : mm\nMM - dd",value:72e5},{formatter:"hh : mm\nMM - dd",value:216e5},{formatter:"hh : mm\nMM - dd",value:432e5},{formatter:"MM - dd\nyyyy",value:864e5},{formatter:"week",value:6048e5},{formatter:"month",value:26784e5},{formatter:"quarter",value:8208e6},{formatter:"half-year",value:16416e6},{formatter:"year",value:32832e6}];return{getAutoFormatter:t,getNewDate:l,format:i,nextMonday:o,nextNthPerNmonth:n,nextNthOnMonth:r,nextNthOnQuarterYear:s,nextNthOnHalfYear:a,nextNthOnYear:h}}),i("echarts/util/shape/Cross",["require","zrender/shape/Base","zrender/shape/Line","zrender/tool/util","./normalIsCover"],function(t){function e(t){i.call(this,t)}var i=t("zrender/shape/Base"),o=t("zrender/shape/Line"),n=t("zrender/tool/util");return e.prototype={type:"cross",buildPath:function(t,e){var i=e.rect;e.xStart=i.x,e.xEnd=i.x+i.width,e.yStart=e.yEnd=e.y,o.prototype.buildPath(t,e),e.xStart=e.xEnd=e.x,e.yStart=i.y,e.yEnd=i.y+i.height,o.prototype.buildPath(t,e)},getRect:function(t){return t.rect},isCover:t("./normalIsCover")},n.inherits(e,i),e}),i("echarts/util/smartLogSteps",["require","./number"],function(t){function e(t){return i(),m=t||{},o(),n(),[r(),i()][0]}function i(){u=m=y=g=v=x=_=b=p=f=null}function o(){p=m.logLabelBase,null==p?(f="plain",p=10,g=M):(p=+p,1>p&&(p=10),f="exponent",g=z(p)),_=m.splitNumber,null==_&&(_=O);var t=parseFloat(m.dataMin),e=parseFloat(m.dataMax);isFinite(t)||isFinite(e)?isFinite(t)?isFinite(e)?t>e&&(e=[t,t=e][0]):e=t:t=e:t=e=1,u=m.logPositive,null==u&&(u=e>0||0===t),v=u?t:-e,x=u?e:-t,I>v&&(v=I),I>x&&(x=I)}function n(){function t(){_>c&&(_=c);var t=L(h(c/_)),e=w(h(c/t)),i=t*e,o=(i-u)/2,n=L(h(s-o));d(n-s)&&(n-=1),y=-n*g;for(var a=n;r>=a-t;a+=t)b.push(C(p,a))}function e(){for(var t=i(l,0),e=t+2;e>t&&n(t+1)+o(t+1)*P<s;)t++;for(var h=i(a,0),e=h-2;h>e&&n(h-1)+o(h-1)*P>r;)h--;y=-(n(t)*M+o(t)*k);for(var c=t;h>=c;c++){var d=n(c),u=o(c);b.push(C(10,d)*C(2,u))}}function i(t,e){return 3*t+e}function o(t){return t-3*n(t)}function n(t){return L(h(t/3))}b=[];var r=h(z(x)/g),s=h(z(v)/g),a=w(r),l=L(s),c=a-l,u=r-s;"exponent"===f?t():D>=c&&_>D?e():t()}function r(){for(var t=[],e=0,i=b.length;i>e;e++)t[e]=(u?1:-1)*b[e];!u&&t.reverse();var o=a(),n=o.value2Coord,r=n(t[0]),h=n(t[t.length-1]);return r===h&&(r-=1,h+=1),{dataMin:r,dataMax:h,tickList:t,logPositive:u,labelFormatter:s(),dataMappingMethods:o}}function s(){if("exponent"===f){var t=p,e=g;return function(i){if(!isFinite(parseFloat(i)))return"";var o="";return 0>i&&(i=-i,o="-"),o+t+c(z(i)/e)}}return function(t){return isFinite(parseFloat(t))?T.addCommas(l(t)):""}}function a(){var t=u,e=y;return{value2Coord:function(i){return null==i||isNaN(i)||!isFinite(i)?i:(i=parseFloat(i),isFinite(i)?t&&I>i?i=I:!t&&i>-I&&(i=-I):i=I,i=E(i),(t?1:-1)*(z(i)+e))},coord2Value:function(i){return null==i||isNaN(i)||!isFinite(i)?i:(i=parseFloat(i),isFinite(i)||(i=I),t?C(A,i-e):-C(A,-i+e))}}}function h(t){return+Number(+t).toFixed(14)}function l(t){return Number(t).toFixed(15).replace(/\.?0*$/,"")}function c(t){t=l(Math.round(t));for(var e=[],i=0,o=t.length;o>i;i++){var n=t.charAt(i);e.push(R[n]||"")}return e.join("")}function d(t){return t>-I&&I>t}var u,p,f,g,m,_,y,v,x,b,T=t("./number"),S=Math,z=S.log,C=S.pow,E=S.abs,w=S.ceil,L=S.floor,A=S.E,M=S.LN10,k=S.LN2,P=k/M,I=1e-9,O=5,D=2,R={0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹","-":"⁻"};return e}),i("zrender/shape/Sector",["require","../tool/math","../tool/computeBoundingBox","../tool/vector","./Base","../tool/util"],function(t){var e=t("../tool/math"),i=t("../tool/computeBoundingBox"),o=t("../tool/vector"),n=t("./Base"),r=o.create(),s=o.create(),a=o.create(),h=o.create(),l=function(t){n.call(this,t)};return l.prototype={type:"sector",buildPath:function(t,i){var o=i.x,n=i.y,r=i.r0||0,s=i.r,a=i.startAngle,h=i.endAngle,l=i.clockWise||!1;a=e.degreeToRadian(a),h=e.degreeToRadian(h),l||(a=-a,h=-h);var c=e.cos(a),d=e.sin(a);t.moveTo(c*r+o,d*r+n),t.lineTo(c*s+o,d*s+n),t.arc(o,n,s,a,h,!l),t.lineTo(e.cos(h)*r+o,e.sin(h)*r+n),0!==r&&t.arc(o,n,r,h,a,l),t.closePath()},getRect:function(t){if(t.__rect)return t.__rect;var n=t.x,l=t.y,c=t.r0||0,d=t.r,u=e.degreeToRadian(t.startAngle),p=e.degreeToRadian(t.endAngle),f=t.clockWise;return f||(u=-u,p=-p),c>1?i.arc(n,l,c,u,p,!f,r,a):(r[0]=a[0]=n,r[1]=a[1]=l),i.arc(n,l,d,u,p,!f,s,h),o.min(r,r,s),o.max(a,a,h),t.__rect={x:r[0],y:r[1],width:a[0]-r[0],height:a[1]-r[1]},t.__rect}},t("../tool/util").inherits(l,n),l}),i("echarts/util/shape/Candle",["require","zrender/shape/Base","zrender/tool/util","./normalIsCover"],function(t){function e(t){i.call(this,t)}var i=t("zrender/shape/Base"),o=t("zrender/tool/util");return e.prototype={type:"candle",_numberOrder:function(t,e){return e-t},buildPath:function(t,e){var i=o.clone(e.y).sort(this._numberOrder);t.moveTo(e.x,i[3]),t.lineTo(e.x,i[2]),t.moveTo(e.x-e.width/2,i[2]),t.rect(e.x-e.width/2,i[2],e.width,i[1]-i[2]),t.moveTo(e.x,i[1]),t.lineTo(e.x,i[0])},getRect:function(t){if(!t.__rect){var e=0;("stroke"==t.brushType||"fill"==t.brushType)&&(e=t.lineWidth||1);var i=o.clone(t.y).sort(this._numberOrder);t.__rect={x:Math.round(t.x-t.width/2-e/2),y:Math.round(i[3]-e/2),width:t.width+e,height:i[0]-i[3]+e}}return t.__rect},isCover:t("./normalIsCover")},o.inherits(e,i),e}),i("echarts/util/smartSteps",[],function(){function t(t){return E.log(M(t))/E.LN10}function e(t){return E.pow(10,t)}function i(t){return t===L(t)}function o(t,e,o,n){v=n||{},x=v.steps||z,b=v.secs||C,o=w(+o||0)%99,t=+t||0,e=+e||0,T=S=0,"min"in v&&(t=+v.min||0,T=1),"max"in v&&(e=+v.max||0,S=1),t>e&&(e=[t,t=e][0]);var r=e-t;if(T&&S)return y(t,e,o);if((o||5)>r){if(i(t)&&i(e))return p(t,e,o);if(0===r)return f(t,e,o)}return l(t,e,o)}function n(t,i,o,n){n=n||0;var a=r((i-t)/o,-1),h=r(t,-1,1),l=r(i,-1),c=E.min(a.e,h.e,l.e);0===h.c?c=E.min(a.e,l.e):0===l.c&&(c=E.min(a.e,h.e)),s(a,{c:0,e:c}),s(h,a,1),s(l,a),n+=c,t=h.c,i=l.c;for(var d=(i-t)/o,u=e(n),p=0,f=[],g=o+1;g--;)f[g]=(t+d*g)*u;if(0>n){p=m(u),d=+(d*u).toFixed(p),t=+(t*u).toFixed(p),i=+(i*u).toFixed(p);for(var g=f.length;g--;)f[g]=f[g].toFixed(p),0===+f[g]&&(f[g]="0")}else t*=u,i*=u,d*=u;return b=0,x=0,v=0,{min:t,max:i,secs:o,step:d,fix:p,exp:n,pnts:f}}function r(o,n,r){n=w(n%10)||2,0>n&&(i(o)?n=(""+M(o)).replace(/0+$/,"").length||1:(o=o.toFixed(15).replace(/0+$/,""),n=o.replace(".","").replace(/^[-0]+/,"").length,o=+o));var s=L(t(o))-n+1,a=+(o*e(-s)).toFixed(15)||0;return a=r?L(a):A(a),!a&&(s=0),(""+M(a)).length>n&&(s+=1,a/=10),{c:a,e:s}}function s(t,i,o){var n=i.e-t.e;n&&(t.e+=n,t.c*=e(-n),t.c=o?L(t.c):A(t.c))}function a(t,e,i){t.e<e.e?s(e,t,i):s(t,e,i)}function h(t,e){e=e||z,t=r(t);for(var i=t.c,o=0;i>e[o];)o++;if(!e[o])for(i/=10,t.e+=1,o=0;i>e[o];)o++;return t.c=e[o],t}function l(t,e,o){var a,l=o||+b.slice(-1),f=h((e-t)/l,x),m=r(e-t),y=r(t,-1,1),v=r(e,-1);if(s(m,f),s(y,f,1),s(v,f),o?a=d(y,v,l):l=c(y,v),i(t)&&i(e)&&t*e>=0){if(l>e-t)return p(t,e,l);l=u(t,e,o,y,v,l)}var z=g(t,e,y.c,v.c);return y.c=z[0],v.c=z[1],(T||S)&&_(t,e,y,v),n(y.c,v.c,l,v.e)}function c(t,i){for(var o,n,r,s,a=[],l=b.length;l--;)o=b[l],n=h((i.c-t.c)/o,x),n=n.c*e(n.e),r=L(t.c/n)*n,s=A(i.c/n)*n,a[l]={min:r,max:s,step:n,span:s-r};return a.sort(function(t,e){var i=t.span-e.span;return 0===i&&(i=t.step-e.step),i}),a=a[0],o=a.span/a.step,t.c=a.min,i.c=a.max,3>o?2*o:o}function d(t,i,o){for(var n,r,s=i.c,a=(i.c-t.c)/o-1;s>t.c;)a=h(a+1,x),a=a.c*e(a.e),n=a*o,r=A(i.c/a)*a,s=r-n;var l=t.c-s,c=r-i.c,d=l-c;return d>1.1*a&&(d=w(d/a/2)*a,s+=d,r+=d),t.c=s,i.c=r,a}function u(t,o,n,r,s,a){var h=s.c-r.c,l=h/a*e(s.e);if(!i(l)&&(l=L(l),h=l*a,o-t>h&&(l+=1,h=l*a,!n&&l*(a-1)>=o-t&&(a-=1,h=l*a)),h>=o-t)){var c=h-(o-t);r.c=w(t-c/2),s.c=w(o+c/2),r.e=0,s.e=0}return a}function p(t,e,i){if(i=i||5,T)e=t+i;else if(S)t=e-i;else{var o=i-(e-t),r=w(t-o/2),s=w(e+o/2),a=g(t,e,r,s);t=a[0],e=a[1]}return n(t,e,i)}function f(t,e,i){i=i||5;var o=E.min(M(e/i),i)/2.1;return T?e=t+o:S?t=e-o:(t-=o,e+=o),l(t,e,i)}function g(t,e,i,o){return t>=0&&0>i?(o-=i,i=0):0>=e&&o>0&&(i-=o,o=0),[i,o]}function m(t){return t=(+t).toFixed(15).split("."),t.pop().replace(/0+$/,"").length}function _(t,e,i,o){if(T){var n=r(t,4,1);i.e-n.e>6&&(n={c:0,e:i.e}),a(i,n),a(o,n),o.c+=n.c-i.c,i.c=n.c}else if(S){var s=r(e,4);o.e-s.e>6&&(s={c:0,e:o.e}),a(i,s),a(o,s),i.c+=s.c-o.c,o.c=s.c}}function y(t,e,i){var o=i?[i]:b,a=e-t;if(0===a)return e=r(e,3),i=o[0],e.c=w(e.c+i/2),n(e.c-i,e.c,i,e.e);M(e/a)<1e-6&&(e=0),M(t/a)<1e-6&&(t=0);var h,l,c,d=[[5,10],[10,2],[50,10],[100,2]],u=[],p=[],f=r(e-t,3),g=r(t,-1,1),m=r(e,-1);s(g,f,1),s(m,f),a=m.c-g.c,f.c=a;for(var _=o.length;_--;){i=o[_],h=A(a/i),l=h*i-a,c=3*(l+3),c+=2*(i-o[0]+2),i%5===0&&(c-=10);for(var y=d.length;y--;)h%d[y][0]===0&&(c/=d[y][1]);p[_]=[i,h,l,c].join(),u[_]={secs:i,step:h,delta:l,score:c}}return u.sort(function(t,e){return t.score-e.score}),u=u[0],g.c=w(g.c-u.delta/2),m.c=w(m.c+u.delta/2),n(g.c,m.c,u.secs,f.e)}var v,x,b,T,S,z=[10,20,25,50],C=[4,5,6],E=Math,w=E.round,L=E.floor,A=E.ceil,M=E.abs;return o}),i("zrender/tool/computeBoundingBox",["require","./vector","./curve"],function(t){function e(t,e,i){if(0!==t.length){for(var o=t[0][0],n=t[0][0],r=t[0][1],s=t[0][1],a=1;a<t.length;a++){var h=t[a];h[0]<o&&(o=h[0]),h[0]>n&&(n=h[0]),h[1]<r&&(r=h[1]),h[1]>s&&(s=h[1])}e[0]=o,e[1]=r,i[0]=n,i[1]=s}}function i(t,e,i,o,n,s){var a=[];r.cubicExtrema(t[0],e[0],i[0],o[0],a);for(var h=0;h<a.length;h++)a[h]=r.cubicAt(t[0],e[0],i[0],o[0],a[h]);var l=[];r.cubicExtrema(t[1],e[1],i[1],o[1],l);for(var h=0;h<l.length;h++)l[h]=r.cubicAt(t[1],e[1],i[1],o[1],l[h]);a.push(t[0],o[0]),l.push(t[1],o[1]);var c=Math.min.apply(null,a),d=Math.max.apply(null,a),u=Math.min.apply(null,l),p=Math.max.apply(null,l);n[0]=c,n[1]=u,s[0]=d,s[1]=p}function o(t,e,i,o,n){var s=r.quadraticExtremum(t[0],e[0],i[0]),a=r.quadraticExtremum(t[1],e[1],i[1]);s=Math.max(Math.min(s,1),0),a=Math.max(Math.min(a,1),0);var h=1-s,l=1-a,c=h*h*t[0]+2*h*s*e[0]+s*s*i[0],d=h*h*t[1]+2*h*s*e[1]+s*s*i[1],u=l*l*t[0]+2*l*a*e[0]+a*a*i[0],p=l*l*t[1]+2*l*a*e[1]+a*a*i[1];o[0]=Math.min(t[0],i[0],c,u),o[1]=Math.min(t[1],i[1],d,p),n[0]=Math.max(t[0],i[0],c,u),n[1]=Math.max(t[1],i[1],d,p)}var n=t("./vector"),r=t("./curve"),s=n.create(),a=n.create(),h=n.create(),l=function(t,e,i,o,r,l,c,d){if(Math.abs(o-r)>=2*Math.PI)return c[0]=t-i,c[1]=e-i,d[0]=t+i,void(d[1]=e+i);if(s[0]=Math.cos(o)*i+t,s[1]=Math.sin(o)*i+e,a[0]=Math.cos(r)*i+t,a[1]=Math.sin(r)*i+e,n.min(c,s,a),n.max(d,s,a),o%=2*Math.PI,0>o&&(o+=2*Math.PI),r%=2*Math.PI,0>r&&(r+=2*Math.PI),o>r&&!l?r+=2*Math.PI:r>o&&l&&(o+=2*Math.PI),l){var u=r;r=o,o=u}for(var p=0;r>p;p+=Math.PI/2)p>o&&(h[0]=Math.cos(p)*i+t,h[1]=Math.sin(p)*i+e,n.min(c,h,c),n.max(d,h,d))};return e.cubeBezier=i,e.quadraticBezier=o,e.arc=l,e}),i("echarts/util/shape/Chain",["require","zrender/shape/Base","./Icon","zrender/shape/util/dashedLineTo","zrender/tool/util","zrender/tool/matrix"],function(t){function e(t){i.call(this,t)}var i=t("zrender/shape/Base"),o=t("./Icon"),n=t("zrender/shape/util/dashedLineTo"),r=t("zrender/tool/util"),s=t("zrender/tool/matrix");return e.prototype={type:"chain",brush:function(t,e){var i=this.style;e&&(i=this.getHighlightStyle(i,this.highlightStyle||{})),t.save(),this.setContext(t,i),this.setTransform(t),t.save(),t.beginPath(),this.buildLinePath(t,i),t.stroke(),t.restore(),this.brushSymbol(t,i),t.restore()},buildLinePath:function(t,e){var i=e.x,o=e.y+5,r=e.width,s=e.height/2-10;if(t.moveTo(i,o),t.lineTo(i,o+s),t.moveTo(i+r,o),t.lineTo(i+r,o+s),t.moveTo(i,o+s/2),e.lineType&&"solid"!=e.lineType){if("dashed"==e.lineType||"dotted"==e.lineType){var a=(e.lineWidth||1)*("dashed"==e.lineType?5:1);n(t,i,o+s/2,i+r,o+s/2,a)}}else t.lineTo(i+r,o+s/2)},brushSymbol:function(t,e){var i=e.y+e.height/4;t.save();for(var n,r=e.chainPoint,s=0,a=r.length;a>s;s++){if(n=r[s],"none"!=n.symbol){t.beginPath();var h=n.symbolSize;o.prototype.buildPath(t,{iconType:n.symbol,x:n.x-h,y:i-h,width:2*h,height:2*h,n:n.n}),t.fillStyle=n.isEmpty?"#fff":e.strokeColor,t.closePath(),t.fill(),t.stroke()}n.showLabel&&(t.font=n.textFont,t.fillStyle=n.textColor,t.textAlign=n.textAlign,t.textBaseline=n.textBaseline,n.rotation?(t.save(),this._updateTextTransform(t,n.rotation),t.fillText(n.name,n.textX,n.textY),t.restore()):t.fillText(n.name,n.textX,n.textY))}t.restore()},_updateTextTransform:function(t,e){var i=s.create();if(s.identity(i),0!==e[0]){var o=e[1]||0,n=e[2]||0;(o||n)&&s.translate(i,i,[-o,-n]),s.rotate(i,i,e[0]),(o||n)&&s.translate(i,i,[o,n])}t.transform.apply(t,i)},isCover:function(t,e){var i=this.style;return t>=i.x&&t<=i.x+i.width&&e>=i.y&&e<=i.y+i.height?!0:!1}},r.inherits(e,i),e}),i("zrender/shape/Ring",["require","./Base","../tool/util"],function(t){var e=t("./Base"),i=function(t){e.call(this,t)};return i.prototype={type:"ring",buildPath:function(t,e){t.arc(e.x,e.y,e.r,0,2*Math.PI,!1),t.moveTo(e.x+e.r0,e.y),t.arc(e.x,e.y,e.r0,0,2*Math.PI,!0)},getRect:function(t){if(t.__rect)return t.__rect;var e;return e="stroke"==t.brushType||"fill"==t.brushType?t.lineWidth||1:0,t.__rect={x:Math.round(t.x-t.r-e/2),y:Math.round(t.y-t.r-e/2),width:2*t.r+e,height:2*t.r+e},t.__rect}},t("../tool/util").inherits(i,e),i}),i("zrender",["zrender/zrender"],function(t){return t}),i("echarts",["echarts/echarts"],function(t){return t});var o=e("zrender");o.tool={color:e("zrender/tool/color"),math:e("zrender/tool/math"),util:e("zrender/tool/util"),vector:e("zrender/tool/vector"),area:e("zrender/tool/area"),event:e("zrender/tool/event")},o.animation={Animation:e("zrender/animation/Animation"),Cip:e("zrender/animation/Clip"),easing:e("zrender/animation/easing")};var n=e("echarts");n.config=e("echarts/config"),e("echarts/chart/line"),t.echarts=n,t.zrender=o}(window);
// Zepto.cookie plugin
//
// Copyright (c) 2010, 2012
// @author Klaus Hartl (stilbuero.de)
// @author Daniel Lacy (daniellacy.com)
//
// Dual licensed under the MIT and GPL licenses:
// http://www.opensource.org/licenses/mit-license.php
// http://www.gnu.org/licenses/gpl.html
;(function($){
    $.extend($.fn, {
        cookie : function (key, value, options) {
            var days, time, result, decode

            // A key and value were given. Set cookie.
            if (arguments.length > 1 && String(value) !== "[object Object]") {
                // Enforce object
                options = $.extend({}, options)

                if (value === null || value === undefined) options.expires = -1

                if (typeof options.expires === 'number') {
                    days = (options.expires * 24 * 60 * 60 * 1000)
                    time = options.expires = new Date()

                    time.setTime(time.getTime() + days)
                }

                value = String(value)

                return (document.cookie = [
                    encodeURIComponent(key), '=',
                    options.raw ? value : encodeURIComponent(value),
                    options.expires ? '; expires=' + options.expires.toUTCString() : '',
                    options.path ? '; path=' + options.path : '',
                    options.domain ? '; domain=' + options.domain : '',
                    options.secure ? '; secure' : ''
                ].join(''))
            }

            // Key and possibly options given, get cookie
            options = value || {}

            decode = options.raw ? function (s) { return s } : decodeURIComponent

            return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null
        }

    })
})(Zepto)


//     Zepto.js
//     (c) 2010-2014 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var zepto = $.zepto, oldQsa = zepto.qsa, oldMatches = zepto.matches

  function visible(elem){
    elem = $(elem)
    return !!(elem.width() || elem.height()) && elem.css("display") !== "none"
  }

  // Implements a subset from:
  // http://api.jquery.com/category/selectors/jquery-selector-extensions/
  //
  // Each filter function receives the current index, all nodes in the
  // considered set, and a value if there were parentheses. The value
  // of `this` is the node currently being considered. The function returns the
  // resulting node(s), null, or undefined.
  //
  // Complex selectors are not supported:
  //   li:has(label:contains("foo")) + li:has(label:contains("bar"))
  //   ul.inner:first > li
  var filters = $.expr[':'] = {
    visible:  function(){ if (visible(this)) return this },
    hidden:   function(){ if (!visible(this)) return this },
    selected: function(){ if (this.selected) return this },
    checked:  function(){ if (this.checked) return this },
    parent:   function(){ return this.parentNode },
    first:    function(idx){ if (idx === 0) return this },
    last:     function(idx, nodes){ if (idx === nodes.length - 1) return this },
    eq:       function(idx, _, value){ if (idx === value) return this },
    contains: function(idx, _, text){ if ($(this).text().indexOf(text) > -1) return this },
    has:      function(idx, _, sel){ if (zepto.qsa(this, sel).length) return this }
  }

  var filterRe = new RegExp('(.*):(\\w+)(?:\\(([^)]+)\\))?$\\s*'),
      childRe  = /^\s*>/,
      classTag = 'Zepto' + (+new Date())

  function process(sel, fn) {
    // quote the hash in `a[href^=#]` expression
    sel = sel.replace(/=#\]/g, '="#"]')
    var filter, arg, match = filterRe.exec(sel)
    if (match && match[2] in filters) {
      filter = filters[match[2]], arg = match[3]
      sel = match[1]
      if (arg) {
        var num = Number(arg)
        if (isNaN(num)) arg = arg.replace(/^["']|["']$/g, '')
        else arg = num
      }
    }
    return fn(sel, filter, arg)
  }

  zepto.qsa = function(node, selector) {
    return process(selector, function(sel, filter, arg){
      try {
        var taggedParent
        if (!sel && filter) sel = '*'
        else if (childRe.test(sel))
          // support "> *" child queries by tagging the parent node with a
          // unique class and prepending that classname onto the selector
          taggedParent = $(node).addClass(classTag), sel = '.'+classTag+' '+sel

        var nodes = oldQsa(node, sel)
      } catch(e) {
        console.error('error performing selector: %o', selector)
        throw e
      } finally {
        if (taggedParent) taggedParent.removeClass(classTag)
      }
      return !filter ? nodes :
        zepto.uniq($.map(nodes, function(n, i){ return filter.call(n, i, nodes, arg) }))
    })
  }

  zepto.matches = function(node, selector){
    return process(selector, function(sel, filter, arg){
      return (!sel || oldMatches(node, sel)) &&
        (!filter || filter.call(node, null, arg) === node)
    })
  }
})(Zepto)
