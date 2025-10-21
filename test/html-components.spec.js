/*global describe,it*/
"use strict";
var assert = require("assert"),
  { parseDocument } = require("htmlparser2"),
  { selectAll, selectOne } = require("css-select"),
  render = require("dom-serializer").default,
  { textContent } = require("domutils"),
  fs = require("fs.extra"),
  glob = require("glob-all"),
  path = require("path"),
  HTMLComponents = require("../lib/html-components.js");

//clean .tmp folder
fs.rmrfSync(".tmp");
var componentsFolder = "test/resources/components-folder";

var htmlComponents = new HTMLComponents({
  componentsFolder: componentsFolder,
});

// Helper function to get attributes from a node
function getAttributes(node) {
  return node.attribs || {};
}

// Helper function to load HTML and select elements
function loadHTML(html, options = {}) {
  const dom = parseDocument(html, {
    xmlMode: options.xmlMode || false,
    decodeEntities: false,
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
  });
  return {
    dom: dom,
    select: (selector) => {
      const nodes = selectAll(selector, dom);
      return {
        eq: (index) => nodes[index],
        length: nodes.length,
        text: () => (nodes[0] ? textContent(nodes[0]) : ""),
      };
    },
  };
}

describe("Tags", function () {
  it("should correctly list the tags in components folder", function () {
    htmlComponents.initTags();
    assert.strictEqual(htmlComponents.tags.join(","), "comp1,customselect,layout,scripttest,tag"); //script tag is added by code
  });

  it("should get template from name", function () {
    var template = htmlComponents.getTemplate("comp1");
    // template is a function because it is evaluate automatically by the template engine
    assert.strictEqual(template(), '<div class="comp1">\n    \n    \n</div>');
  });

  it("should get template from name and type", function () {
    var template = htmlComponents.getTemplate("tag", "type1");
    assert.strictEqual(template(), '<div class="tagtype1">\n    \n    \n</div>');
  });

  /*it('should put the template in cache', function () {
        var template = htmlComponents.getTemplate('tag', 'type1');
        assert.strictEqual(htmlComponents['tag$type'], '<div class="tagtype1">\n    \n    \n</div>');
    });*/
});

describe("Attributes", function () {
  var testNodeAttr = '<node attr1="value1" attr2="value2"></node>';
  it("should return object from attributes", function () {
    const { dom } = loadHTML(testNodeAttr);
    const node = selectOne("node", dom);
    var attrObj = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
  });

  var testNodeData = '<node attr1="value1" attr2="value2" data-custom1="datavalue1" data-custom2="datavalue2"></node>';
  it("should return object from data-attributes into object attached to attributes object", function () {
    const { dom } = loadHTML(testNodeData);
    const node = selectOne("node", dom);
    var attrObj = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attrObj.data.custom1, "datavalue1");
    assert.strictEqual(attrObj.data.custom2, "datavalue2");
  });

  var testNodeAttrAsNodes =
    "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2></node>";
  it("should process nodes as attributes", function () {
    const { dom } = loadHTML(testNodeAttrAsNodes, { xmlMode: true });
    const node = selectOne("node", dom);
    var attrObj = htmlComponents.processNodesAsAttributes(node, dom);
    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
    assert.strictEqual(attrObj["data-custom1"], "datavalue1");
    assert.strictEqual(attrObj["data-custom2"], "datavalue2");
  });

  var testNodeDataAsAttributeProperties =
    "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2></node>";
  it("should process all nodes even data-nodes into attributes object", function () {
    const { dom } = loadHTML(testNodeDataAsAttributeProperties, { xmlMode: true });
    const node = selectOne("node", dom);
    var attrObj = htmlComponents.processAttributes(node, dom);

    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
    assert.strictEqual(attrObj.data.custom1, "datavalue1");
    assert.strictEqual(attrObj.data.custom2, "datavalue2");
  });

  it("should remove all attributes nodes after processing nodes", function () {
    const { dom } = loadHTML(testNodeAttrAsNodes);
    const node = selectOne("node", dom);
    htmlComponents.processNodesAsAttributes(node, dom);
    const children = node.children ? node.children.filter((c) => c.type === "tag") : [];
    assert.strictEqual(children.length, 0);
  });

  var testNodeWithHTML =
    "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2><label>This is label</label>\n<span>This is span</span> this is direct text</node>";
  it("should put property `html` with the html of the node without custom nodes", function () {
    const { dom } = loadHTML(testNodeWithHTML, { xmlMode: true });
    const node = selectOne("node", dom);
    var attr = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attr.html, "<label>This is label</label>\n<span>This is span</span> this is direct text");
  });

  it("should transform data object into attributes string", function () {
    var str = htmlComponents.objectToAttributeString("data-", {
      attr1: "value1",
      attr2: "value2",
    });

    assert.equal(str, 'data-attr1="value1" data-attr2="value2"');
  });

  it("should have the data object into attached string `dataStr`", function () {
    var testNodeData = '<node attr1="value1" data-custom1="datavalue1" data-custom2="datavalue2">hmtl content</node>';
    const { dom } = loadHTML(testNodeData, { xmlMode: true });
    const node = selectOne("node", dom);
    var attrObj = htmlComponents.processAttributes(node, dom);

    assert.equal(attrObj.data.custom1, "datavalue1");
    assert.equal(attrObj.data.custom2, "datavalue2");
    assert.equal(attrObj.dataStr, 'data-custom1="datavalue1" data-custom2="datavalue2"');
  });

  it("should be possible to specify  the prefix for the node attributes (attrNodePrefix)", function () {
    var htmlComp = new HTMLComponents({
      attrNodePrefix: "z-",
      componentsFolder: "test/resources/components-folder",
    });
    htmlComp.initTags();
    var testNodeData =
      "<node><z-attr1>value1</z-attr1><z-attr2>value2</z-attr2><z-data-custom1>datavalue1</z-data-custom1><z-data-custom2>datavalue2</z-data-custom2></node>";
    const { dom } = loadHTML(testNodeData);
    const node = selectOne("node", dom);
    var attrObj = htmlComp.processAttributes(node, dom);

    assert.equal(attrObj.attr1, "value1");
    assert.equal(attrObj.attr2, "value2");
    assert.equal(attrObj.data.custom1, "datavalue1");
    assert.equal(attrObj.data.custom2, "datavalue2");
  });
});

describe("Templating", function () {
  it("should be possible to have a custom tag inside another tag", function () {
    var string = '<comp1><tag type="type1"></tag>blabla</comp1>';
    var newHTML = htmlComponents.processHTML(string);
    //simple test of node "tag" existance
    assert(!/<tag/.test(newHTML));
  });

  it("should replace node by it's generated HTML", function () {
    htmlComponents.initTags();
    var html = '<comp1 attr1="i am attr1"><_attr2>I am attr2</_attr2></comp1>';
    const { dom } = loadHTML(html, { xmlMode: true });
    const node = selectOne("comp1", dom);
    var newHTML = htmlComponents.processNode(node, dom);
    assert.strictEqual(newHTML, '<div class="comp1">\n' + "    <span>i am attr1</span>\n" + "    <span>I am attr2</span>\n" + "</div>");
  });

  var resultPageContent =
    "<!DOCTYPE html>\n" +
    "<html>\n" +
    '<head lang="en">\n' +
    '    <meta charset="UTF-8">\n' +
    "    <title></title>\n" +
    "</head>\n" +
    "<body>\n" +
    "\n" +
    '<div class="comp1">\n' +
    "    <span>i am attr1</span>\n" +
    "    <span>I am attr2</span>\n    \n\n" +
    "</div>\n" +
    "\n" +
    '<div class="tagtype1">\n' +
    "    <span>i am attr1</span>\n" +
    "    <span>I am attr2</span>\n    \n\n" +
    "</div>\n" +
    "\n" +
    "</body>\n" +
    "</html>";
  it("should process an entire html string from file", function () {
    htmlComponents.initTags();
    var html = fs.readFileSync("test/resources/htmlpages/page.html", { encoding: "utf-8" });
    var newHTML = htmlComponents.processHTML(html);
    assert.equal(newHTML, resultPageContent);
  });

  it("should process read a file from src dir and write it to dest dir", function () {
    htmlComponents.processFile("page.html", "test/resources/htmlpages", ".tmp");
    var fileContent = fs.readFileSync(".tmp/page.html", { encoding: "utf-8" });
    assert.equal(fileContent, resultPageContent);
  });

  it("should process an entire directory and have the same number of files", function () {
    htmlComponents.processDirectory(["**/*.html", "*.html"], "test/resources/htmlpages", ".tmp");

    var files = glob.sync(["**/*"], { cwd: ".tmp" }).filter(function (f) {
      return fs.lstatSync(path.join(".tmp", f)).isFile();
    });

    assert(fs.existsSync(".tmp/page.html"), "test if file is written");
    assert(fs.existsSync(".tmp/page2.html"), "test if file is written");
    assert(fs.existsSync(".tmp/subdir/page3.html"), "test if file is written");
    assert(fs.existsSync(".tmp/subdir/page3.html"), "test if file is written");
    assert.equal(files.length, 5);
  });

  it("should be possible to use collections in the component", function () {
    var html = '<customselect><item value="test">label</item><item value="test2">label2</item></customselect>';
    var newHTML = htmlComponents.processHTML(html);
    assert.equal(newHTML, '<select>\n    <option value="test">label</option>\n    <option value="test2">label2</option>\n</select>');
  });

  it("shoud be possible to process script tags", function () {
    htmlComponents.processFile("scripttest.html", "test/resources/htmlpages", ".tmp");
    var fileContent = fs.readFileSync(".tmp/scripttest.html", { encoding: "utf-8" });
    const { select } = loadHTML(fileContent);

    assert(/<div class="comp1">/.test(select("script").text()), true);
  });

  it("Don't encode next scripts tags", function () {
    const html = `
    <html>
    <head><title>test</title></head>
    <body>test

    <span></span>
    <script type="text/javascript" src="js/framework.js"></script>
    <script type="text/javascript" src="js/header.js"></script>
    </body>
    </html>
  `;

    const newHTML = htmlComponents.processHTML(html);
    assert.equal(html, newHTML);
  });

  it("should generate the layout of a page", function () {
    htmlComponents.processFile("pageWithLayout.html", "test/resources/htmlpages", ".tmp");
    var fileContent = fs.readFileSync(".tmp/pageWithLayout.html", { encoding: "utf-8" });
    var fileToTest = fs.readFileSync("test/resources/resultCompare/pageWithLayout.html", { encoding: "utf-8" });

    assert.equal(fileContent, fileToTest);
  });
});

describe("Render correctly without modification", function () {
  it("Should use render correctly", function () {
    var htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
    });

    function ts(string) {
      var newHTML = htmlCompWithBeforeHTML.processHTML(string);
      //simple test of node "tag" existance
      assert.equal(newHTML, string);
    }

    ts("<div>foo<br>bar</div>");
    ts("<div>foo<hr>bar</div>");
    ts('<div>foo<input type="text">bar</div>');
  });
});

describe("callbacks", function () {
  it("Should use beforeHTML callback", function () {
    var htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
      beforeProcessHTML: function (html) {
        return html.replace(/<span>(.+?)<\/span>/g, "<strong>$1</strong>");
      },
    });

    var newHTML = htmlCompWithBeforeHTML.processHTML("<div>foobar<span>buzz</span></div>");
    //simple test of node "tag" existanc
    assert.equal(newHTML, "<div>foobar<strong>buzz</strong></div>");
  });

  it("Should use afterProcessHTML callback", function () {
    var htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
      afterProcessHTML: function (html) {
        return html.replace(/<span>(.+?)<\/span>/g, "<strong>$1</strong>");
      },
    });

    var newHTML = htmlCompWithBeforeHTML.processHTML("<div>foobar<span>buzz</span></div>");
    //simple test of node "tag" existanc
    assert.equal(newHTML, "<div>foobar<strong>buzz</strong></div>");
  });
});

describe("CDATA handling", function () {
  it("Should process CDATA in script tags", function () {
    const html = `
      <html>
      <head><title>test</title></head>
      <body>
        <script type="text/html">
        <![CDATA[
          <comp1 attr1="test"><_attr2>content</_attr2></comp1>
        ]]>
        </script>
      </body>
      </html>
    `;

    const newHTML = htmlComponents.processHTML(html);

    // CDATA should be preserved and content should be processed
    assert(newHTML.includes("<![CDATA["), "CDATA opening should be present");
    assert(newHTML.includes("]]>"), "CDATA closing should be present");
    assert(newHTML.includes('<div class="comp1">'), "Component should be processed inside CDATA");
    assert(!newHTML.includes("<comp1"), "Original component tag should not be present");
  });

  it("Should process non-CDATA script tags with text/html type", function () {
    const html = `
      <html>
      <body>
        <script type="text/html">
          <comp1 attr1="without-cdata"></comp1>
        </script>
      </body>
      </html>
    `;

    const newHTML = htmlComponents.processHTML(html);

    // Component should be processed even without CDATA
    assert(newHTML.includes('<div class="comp1">'), "Component should be processed");
    assert(newHTML.includes('without-cdata'), "Attribute value should be present");
    assert(!newHTML.includes("<comp1"), "Original component tag should not be present");
  });
});

describe("Cache management", function () {
  it("Should cache templates", function () {
    const template1 = htmlComponents.getTemplate("comp1");
    const template2 = htmlComponents.getTemplate("comp1");

    // Same template should be returned from cache
    assert.strictEqual(template1, template2, "Templates should be cached");
  });

  it("Should reset cache when resetCache is called", function () {
    // Get a template to populate cache
    const template1 = htmlComponents.getTemplate("comp1");
    assert(Object.keys(htmlComponents.cache).length > 0, "Cache should not be empty");

    // Reset cache
    const result = htmlComponents.resetCache();

    // Cache should be empty
    assert.strictEqual(Object.keys(htmlComponents.cache).length, 0, "Cache should be empty after reset");

    // Should return this for chaining
    assert.strictEqual(result, htmlComponents, "resetCache should return this");

    // Re-populate cache
    htmlComponents.getTemplate("comp1");
  });
});

/*
describe("bugs", function() {
    it.only("Should not render multiple <br>", function() {
      var newHTML = htmlComponents.processHTML("<td>Foo<br/>barr</td>");
      //simple test of node "tag" existance
      assert.equal(newHTML, "<td>Foo<br>barr</td>");
    });
});*/
