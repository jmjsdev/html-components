/**
 *
 * https://github.com/arnogues/html-components
 *
 * @author Arnaud Guéras
 * @class HTMLComponents
 * @copyright (c) 2014 Arnaud Gueras
 * @license MIT
 *
 *
 */

"use strict";

const { parseDocument } = require("htmlparser2");
const { selectAll, selectOne } = require("css-select");
const render = require("dom-serializer").default;
const { getText, textContent, getChildren, removeElement, hasChildren, getAttributeValue } = require("domutils");
const _ = require("lodash");
const path = require("path");
const Handlebars = require("handlebars");
const mkdirp = require("mkdirp");
const glob = require("glob-all");
const fs = require("fs");

var HTMLComponents = function () {
  this.init.apply(this, arguments);
  this.cache = {};
  this.tags = null;
};

HTMLComponents.prototype = {
  constructor: HTMLComponents.prototype.constructor,

  /**
   * @member {Object} Defaults options
   */
  options: {
    /**
     * @member {String} componentsFolder
     * default folder where the components are stored
     * @default 'components'
     */
    componentsFolder: "components",

    /**
     * @member {String} srcDir
     * source directory, srcDir is relative to the projectFolder
     * @exemple : 'app/'
     */
    srcDir: "",

    /**
     * @member {String} destDir
     * Destination directory, where the html files are generated, the destDir is relative to the projectFolder
     */
    destDir: "",

    /**
     * @member {String} attrNodePrefix
     * Prefix of the attr when you need to use html content inside an attribute
     * @example
     * // use the attribute value as a var
     * // normal usage
     * <node value="foo"></node>
     * // usage as attribute
     * <node>
     *     <_value>long string with <strong>html inside</strong></_value>
     * </node>
     */
    attrNodePrefix: "_",

    /**
     * @mamber {Array} files
     * The match of the html files, base on the minimatch library
     * @default ['*.html']
     */
    files: ["*.html"],

    /**
     *
     * @param html
     * Modify the HTML code before HTML is processed
     * @returns {String}
     */
    beforeProcessHTML: function (html) {
      return html;
    },

    /**
     *
     * @param html
     * Modify the HTML code after HTML is processed
     * @returns {String}
     */
    afterProcessHTML: function (html) {
      return html;
    },
  },

  /**
   * @constructs
   * @param {Object} options object
   */
  init: function (options) {
    this.options = _.merge({}, this.options, options);
  },

  /**
   * @membere {Array} List of tags
   */
  tags: null,
  /**
   * Generate list of tags from a directory, the generated tags is set to `tags`
   * @method
   */
  initTags: function () {
    if (!this.tags) {
      var filesList = fs.readdirSync(this.options.componentsFolder);
      this.tags = filesList
        .map(function (filename) {
          return filename.replace(/\.hbs$/, "");
        })
        .sort();
    }
  },

  /**
   * Parse all html files of srcDir and write them into destDir
   * @param {String} srcDir source directory
   * @param {String} destDir destination directory
   * @param {Array} patterns files mask, it follows https://github.com/isaacs/node-glob options
   */
  processDirectory: function (patterns, srcDir, destDir) {
    var _this = this;
    var files = glob.sync(patterns, { cwd: srcDir });
    files.forEach(function (file) {
      _this.processFile(file, srcDir, destDir);
    });
  },

  /**
   * Process one file
   * @param filePath the relative file path from srcFolder,
   * @param srcFolder the source folder
   * @param destFolder the destination folder
   *
   * @example
   * htmlComponents.processFile('myfile.html', 'test', '.tmp');
   * htmlComponents.processFile('mysubfolder/folder/myfile.html', 'app', 'dist');
   *
   */
  processFile: function (filePath, srcFolder, destFolder) {
    var html = fs.readFileSync(path.join(srcFolder, filePath), { encoding: "utf-8" });
    var newHTML = this.processHTML(html);
    mkdirp.sync(path.dirname(path.join(destFolder, filePath)));
    fs.writeFileSync(path.join(destFolder, filePath), newHTML, { encoding: "utf-8" });
  },

  /**
   * Get element attributes as an object
   */
  getAttributes: function (node) {
    const attrs = {};
    if (node.attribs) {
      Object.assign(attrs, node.attribs);
    }
    return attrs;
  },

  /**
   * Get inner HTML of a node
   */
  getInnerHTML: function (node) {
    if (!node.children || node.children.length === 0) {
      return "";
    }
    return render(node.children, { xmlMode: false, decodeEntities: false });
  },

  /**
   * Get children elements (not text nodes)
   */
  getChildElements: function (node) {
    if (!node.children) return [];
    return node.children.filter((child) => child.type === "tag");
  },

  /**
   * Transform HTML custom tag into parsed html from template
   * @param node element
   * @param dom AST document
   */
  processNode: function (node, dom) {
    var context = this.processAttributes(node, dom);
    var nodeName = node.name;
    var type = context.type;
    var template = this.getTemplate(nodeName, type);
    return template(context);
  },

  /**
   * Process the HTML by using list of tags
   * @param {String} html String of HTML
   * @returns {String}
   */
  processHTML: function (html) {
    html = this.options.beforeProcessHTML(html);
    // fix <br> bug
    html = html.replace(/<br>/g, "<br/>");
    var _this = this;
    this.initTags();

    // Parse in XML mode to properly recognize tags starting with underscore
    var dom = parseDocument(html, {
      xmlMode: true,
      decodeEntities: false,
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
      recognizeSelfClosing: true,
    });

    var nodesToProcess = selectAll(this.tags.join(","), dom);
    nodesToProcess.forEach(function (node) {
      var processedHTML = _this.processNode(node, dom);
      processedHTML = _this.processHTML(processedHTML);

      // Parse the processed HTML into a fragment
      // We need to wrap it to ensure proper parsing
      var wrappedHTML = "<div>" + processedHTML + "</div>";
      var fragment = parseDocument(wrappedHTML, {
        xmlMode: true,
        decodeEntities: false,
        lowerCaseTags: false,
        lowerCaseAttributeNames: false,
      });

      // Get the wrapper div and extract its children
      var wrapperDiv = selectOne("div", fragment);
      var newNodes = wrapperDiv && wrapperDiv.children ? wrapperDiv.children : [];

      if (node.parent) {
        var parent = node.parent;
        var index = parent.children.indexOf(node);
        if (index !== -1) {
          // Remove the old node
          parent.children.splice(index, 1);
          // Insert new nodes at the same position (in reverse to maintain order)
          for (var i = newNodes.length - 1; i >= 0; i--) {
            var newNode = newNodes[i];
            newNode.parent = parent;
            parent.children.splice(index, 0, newNode);
          }
        }
      }
    });

    // Process script tags with type="text/html" or type="text/template"
    var scriptNodes = selectAll('script[type="text/html"], script[type="text/template"]', dom);
    scriptNodes.forEach(function (scriptNode) {
      var html = textContent(scriptNode);
      if (/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/.test(html)) {
        // Check if script has CDATA children
        var hasCDATA = false;
        var cdataNode = null;
        if (scriptNode.children) {
          for (var i = 0; i < scriptNode.children.length; i++) {
            if (scriptNode.children[i].type === "cdata") {
              hasCDATA = true;
              cdataNode = scriptNode.children[i];
              break;
            }
          }
        }

        var htmlToParse = html;
        var newHTML = _this.processHTML(htmlToParse);

        if (hasCDATA && cdataNode) {
          // Replace the CDATA content
          if (cdataNode.children && cdataNode.children.length > 0) {
            cdataNode.children[0].data = newHTML;
          }
        } else {
          // Replace text content for non-CDATA scripts
          if (scriptNode.children && scriptNode.children.length > 0) {
            scriptNode.children[0].data = newHTML;
          }
        }
      }
    });

    // Render in HTML mode for proper output
    var finalString = render(dom, { xmlMode: false, decodeEntities: false, selfClosingTags: false });

    return this.options.afterProcessHTML(finalString);
  },

  /**
   * Transforms all attributes of a node into an object
   * @param node
   * @param dom
   * @returns {*}
   */
  processAttributes: function (node, dom) {
    var attr = this.getAttributes(node);
    var nodesAttr = this.processNodesAsAttributes(node, dom);
    attr = _.merge({}, attr, nodesAttr);
    attr = this.fixAttributesObject(attr);
    return attr;
  },

  /**
   * transform all children nodes of the object into attributes. The nodes must begin by a specific string. By default it's _
   * @param node html node to process
   * @param dom AST document
   * @returns {{}}
   */
  processNodesAsAttributes: function (node, dom) {
    var obj = {};
    var regexp = new RegExp("^" + this.options.attrNodePrefix.replace(/([\[\]\$])/g, "\\$1"));
    var children = this.getChildElements(node);

    children.forEach((child) => {
      if (regexp.test(child.name)) {
        var name = child.name.replace(regexp, "");
        obj[name] = this.getInnerHTML(child);
      }
      //process items
      if (child.name === "item") {
        if (!obj.items) {
          obj.items = [];
        }
        obj.items.push({
          html: this.getInnerHTML(child),
          value: getAttributeValue(child, "value"),
        });
      }
    });

    // Remove processed children by filtering
    if (node.children) {
      node.children = node.children.filter((child) => {
        if (child.type !== "tag") return true; // Keep text nodes, comments, etc.
        return !regexp.test(child.name) && child.name !== "item";
      });
    }

    obj.html = this.getInnerHTML(node);
    return obj;
  },

  /**
   *
   * @ignore
   * @param attr
   * @returns {{}}
   */
  fixAttributesObject: function (attr) {
    var obj = {};
    for (var name in attr) {
      if (attr.hasOwnProperty(name)) {
        var dataRegExp = /^data-/;
        if (dataRegExp.test(name)) {
          if (!obj.data) {
            obj.data = {};
          }
          var dataName = name.replace(dataRegExp, "");
          obj.data[dataName] = attr[name];
        }
        obj[name] = attr[name];
      }
    }

    //merge data object from attr into a string
    if (obj.data) {
      obj.dataStr = this.objectToAttributeString("data-", obj.data);
    }

    return obj;
  },

  /**
   * Return the right template from name and type
   * @param name name of the template file
   * @param type if type if specified, then name become a folder and type if the filename of the template
   * @returns {*}
   * @ignore
   */
  cache: {},
  getTemplate: function (name, type) {
    var template;
    if (!this.cache[name + "$" + type]) {
      var filepath = path.normalize(path.join(this.options.componentsFolder, name + (type ? "/" + type : "") + ".hbs"));
      template = Handlebars.compile(fs.readFileSync(filepath, { encoding: "utf-8" }));
      this.cache[name + "$" + type] = template;
    } else {
      template = this.cache[name + "$" + type];
    }
    return template;
  },

  /**
   * Reset the cache
   */
  resetCache: function () {
    this.cache = {};
    return this;
  },

  /**
   * Generate object into string
   * @example
   * // returns: data-item="value" data-foo="bar"
   * htmlComponents.objectToAttributeString('data-', {item:'value', foo:'bar'});
   *
   * @param {String} prefix The prefix to use
   * @param {Object} obj The object to transform
   * @returns {string}
   *
   */
  objectToAttributeString: function (prefix, obj) {
    var str = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(prefix + key + '="' + obj[key] + '"');
      }
    }
    return str.join(" ");
  },
};

module.exports = HTMLComponents;
