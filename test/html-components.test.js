"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument } = require("htmlparser2");
const { selectAll, selectOne } = require("css-select");
const render = require("dom-serializer").default;
const { textContent } = require("domutils");
const fs = require("fs.extra");
const glob = require("glob-all");
const path = require("path");
const HTMLComponents = require("../lib/html-components.js");

// Clean .tmp folder
fs.rmrfSync(".tmp");
const componentsFolder = "test/resources/components-folder";

const htmlComponents = new HTMLComponents({
  componentsFolder: componentsFolder,
});

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

// Tags tests
test("Tags", async (t) => {
  await t.test("should correctly list the tags in components folder", () => {
    htmlComponents.initTags();
    assert.strictEqual(htmlComponents.tags.join(","), "comp1,customselect,layout,scripttest,tag");
  });

  await t.test("should get template from name", () => {
    const template = htmlComponents.getTemplate("comp1");
    assert.strictEqual(template(), '<div class="comp1">\n    \n    \n</div>');
  });

  await t.test("should get template from name and type", () => {
    const template = htmlComponents.getTemplate("tag", "type1");
    assert.strictEqual(template(), '<div class="tagtype1">\n    \n    \n</div>');
  });
});

// Attributes tests
test("Attributes", async (t) => {
  const testNodeAttr = '<node attr1="value1" attr2="value2"></node>';

  await t.test("should return object from attributes", () => {
    const { dom } = loadHTML(testNodeAttr);
    const node = selectOne("node", dom);
    const attrObj = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
  });

  await t.test("should return object from data-attributes into object attached to attributes object", () => {
    const testNodeData = '<node attr1="value1" attr2="value2" data-custom1="datavalue1" data-custom2="datavalue2"></node>';
    const { dom } = loadHTML(testNodeData);
    const node = selectOne("node", dom);
    const attrObj = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attrObj.data.custom1, "datavalue1");
    assert.strictEqual(attrObj.data.custom2, "datavalue2");
  });

  await t.test("should process nodes as attributes", () => {
    const testNodeAttrAsNodes =
      "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2></node>";
    const { dom } = loadHTML(testNodeAttrAsNodes, { xmlMode: true });
    const node = selectOne("node", dom);
    const attrObj = htmlComponents.processNodesAsAttributes(node, dom);
    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
    assert.strictEqual(attrObj["data-custom1"], "datavalue1");
    assert.strictEqual(attrObj["data-custom2"], "datavalue2");
  });

  await t.test("should process all nodes even data-nodes into attributes object", () => {
    const testNodeDataAsAttributeProperties =
      "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2></node>";
    const { dom } = loadHTML(testNodeDataAsAttributeProperties, { xmlMode: true });
    const node = selectOne("node", dom);
    const attrObj = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attrObj.attr1, "value1");
    assert.strictEqual(attrObj.attr2, "value2");
    assert.strictEqual(attrObj.data.custom1, "datavalue1");
    assert.strictEqual(attrObj.data.custom2, "datavalue2");
  });

  await t.test("should remove all attributes nodes after processing nodes", () => {
    const testNodeAttrAsNodes =
      "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2></node>";
    const { dom } = loadHTML(testNodeAttrAsNodes);
    const node = selectOne("node", dom);
    htmlComponents.processNodesAsAttributes(node, dom);
    const children = node.children ? node.children.filter((c) => c.type === "tag") : [];
    assert.strictEqual(children.length, 0);
  });

  await t.test("should put property `html` with the html of the node without custom nodes", () => {
    const testNodeWithHTML =
      "<node><_attr1>value1</_attr1><_attr2>value2</_attr2><_data-custom1>datavalue1</_data-custom1><_data-custom2>datavalue2</_data-custom2><label>This is label</label>\n<span>This is span</span> this is direct text</node>";
    const { dom } = loadHTML(testNodeWithHTML, { xmlMode: true });
    const node = selectOne("node", dom);
    const attr = htmlComponents.processAttributes(node, dom);
    assert.strictEqual(attr.html, "<label>This is label</label>\n<span>This is span</span> this is direct text");
  });

  await t.test("should transform data object into attributes string", () => {
    const str = htmlComponents.objectToAttributeString("data-", {
      attr1: "value1",
      attr2: "value2",
    });
    assert.equal(str, 'data-attr1="value1" data-attr2="value2"');
  });

  await t.test("should have the data object into attached string `dataStr`", () => {
    const testNodeData = '<node attr1="value1" data-custom1="datavalue1" data-custom2="datavalue2">hmtl content</node>';
    const { dom } = loadHTML(testNodeData, { xmlMode: true });
    const node = selectOne("node", dom);
    const attrObj = htmlComponents.processAttributes(node, dom);
    assert.equal(attrObj.data.custom1, "datavalue1");
    assert.equal(attrObj.data.custom2, "datavalue2");
    assert.equal(attrObj.dataStr, 'data-custom1="datavalue1" data-custom2="datavalue2"');
  });

  await t.test("should be possible to specify the prefix for the node attributes (attrNodePrefix)", () => {
    const htmlComp = new HTMLComponents({
      attrNodePrefix: "z-",
      componentsFolder: "test/resources/components-folder",
    });
    htmlComp.initTags();
    const testNodeData =
      "<node><z-attr1>value1</z-attr1><z-attr2>value2</z-attr2><z-data-custom1>datavalue1</z-data-custom1><z-data-custom2>datavalue2</z-data-custom2></node>";
    const { dom } = loadHTML(testNodeData);
    const node = selectOne("node", dom);
    const attrObj = htmlComp.processAttributes(node, dom);
    assert.equal(attrObj.attr1, "value1");
    assert.equal(attrObj.attr2, "value2");
    assert.equal(attrObj.data.custom1, "datavalue1");
    assert.equal(attrObj.data.custom2, "datavalue2");
  });
});

// Templating tests
test("Templating", async (t) => {
  await t.test("should be possible to have a custom tag inside another tag", () => {
    const string = '<comp1><tag type="type1"></tag>blabla</comp1>';
    const newHTML = htmlComponents.processHTML(string);
    assert(!/<tag/.test(newHTML));
  });

  await t.test("should replace node by it's generated HTML", () => {
    htmlComponents.initTags();
    const html = '<comp1 attr1="i am attr1"><_attr2>I am attr2</_attr2></comp1>';
    const { dom } = loadHTML(html, { xmlMode: true });
    const node = selectOne("comp1", dom);
    const newHTML = htmlComponents.processNode(node, dom);
    assert.strictEqual(newHTML, '<div class="comp1">\n' + "    <span>i am attr1</span>\n" + "    <span>I am attr2</span>\n" + "</div>");
  });

  await t.test("should process an entire html string from file", () => {
    const resultPageContent =
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

    htmlComponents.initTags();
    const html = fs.readFileSync("test/resources/htmlpages/page.html", { encoding: "utf-8" });
    const newHTML = htmlComponents.processHTML(html);
    assert.equal(newHTML, resultPageContent);
  });

  await t.test("should process read a file from src dir and write it to dest dir", () => {
    const resultPageContent =
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

    htmlComponents.processFile("page.html", "test/resources/htmlpages", ".tmp");
    const fileContent = fs.readFileSync(".tmp/page.html", { encoding: "utf-8" });
    assert.equal(fileContent, resultPageContent);
  });

  await t.test("should process an entire directory and have the same number of files", () => {
    htmlComponents.processDirectory(["**/*.html", "*.html"], "test/resources/htmlpages", ".tmp");
    const files = glob.sync(["**/*"], { cwd: ".tmp" }).filter((f) => fs.lstatSync(path.join(".tmp", f)).isFile());

    assert(fs.existsSync(".tmp/page.html"), "test if file is written");
    assert(fs.existsSync(".tmp/page2.html"), "test if file is written");
    assert(fs.existsSync(".tmp/subdir/page3.html"), "test if file is written");
    assert.equal(files.length, 5);
  });

  await t.test("should be possible to use collections in the component", () => {
    const html = '<customselect><item value="test">label</item><item value="test2">label2</item></customselect>';
    const newHTML = htmlComponents.processHTML(html);
    assert.equal(newHTML, '<select>\n    <option value="test">label</option>\n    <option value="test2">label2</option>\n</select>');
  });

  await t.test("should be possible to process script tags", () => {
    htmlComponents.processFile("scripttest.html", "test/resources/htmlpages", ".tmp");
    const fileContent = fs.readFileSync(".tmp/scripttest.html", { encoding: "utf-8" });
    const { select } = loadHTML(fileContent);
    assert(/<div class="comp1">/.test(select("script").text()));
  });

  await t.test("Don't encode next scripts tags", () => {
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

  await t.test("should generate the layout of a page", () => {
    htmlComponents.processFile("pageWithLayout.html", "test/resources/htmlpages", ".tmp");
    const fileContent = fs.readFileSync(".tmp/pageWithLayout.html", { encoding: "utf-8" });
    const fileToTest = fs.readFileSync("test/resources/resultCompare/pageWithLayout.html", { encoding: "utf-8" });
    assert.equal(fileContent, fileToTest);
  });
});

// Render correctly without modification tests
test("Render correctly without modification", async (t) => {
  await t.test("Should use render correctly", () => {
    const htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
    });

    function ts(string) {
      const newHTML = htmlCompWithBeforeHTML.processHTML(string);
      assert.equal(newHTML, string);
    }

    ts("<div>foo<br>bar</div>");
    ts("<div>foo<hr>bar</div>");
    ts('<div>foo<input type="text">bar</div>');
  });
});

// Callbacks tests
test("Callbacks", async (t) => {
  await t.test("Should use beforeHTML callback", () => {
    const htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
      beforeProcessHTML: (html) => html.replace(/<span>(.+?)<\/span>/g, "<strong>$1</strong>"),
    });

    const newHTML = htmlCompWithBeforeHTML.processHTML("<div>foobar<span>buzz</span></div>");
    assert.equal(newHTML, "<div>foobar<strong>buzz</strong></div>");
  });

  await t.test("Should use afterProcessHTML callback", () => {
    const htmlCompWithBeforeHTML = new HTMLComponents({
      componentsFolder: componentsFolder,
      afterProcessHTML: (html) => html.replace(/<span>(.+?)<\/span>/g, "<strong>$1</strong>"),
    });

    const newHTML = htmlCompWithBeforeHTML.processHTML("<div>foobar<span>buzz</span></div>");
    assert.equal(newHTML, "<div>foobar<strong>buzz</strong></div>");
  });
});

// CDATA handling tests
test("CDATA handling", async (t) => {
  await t.test("Should process CDATA in script tags", () => {
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

    assert(newHTML.includes("<![CDATA["), "CDATA opening should be present");
    assert(newHTML.includes("]]>"), "CDATA closing should be present");
    assert(newHTML.includes('<div class="comp1">'), "Component should be processed inside CDATA");
    assert(!newHTML.includes("<comp1"), "Original component tag should not be present");
  });

  await t.test("Should process non-CDATA script tags with text/html type", () => {
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

    assert(newHTML.includes('<div class="comp1">'), "Component should be processed");
    assert(newHTML.includes('without-cdata'), "Attribute value should be present");
    assert(!newHTML.includes("<comp1"), "Original component tag should not be present");
  });

  await t.test("Should process script tags with jQuery selectors", () => {
    const html = `
      <html>
      <body>
        <script type="text/html">#my-selector</script>
      </body>
      </html>
    `;

    const newHTML = htmlComponents.processHTML(html);

    assert(newHTML.includes('#my-selector'), "jQuery selector should be preserved");
  });
});

// Cache management tests
test("Cache management", async (t) => {
  await t.test("Should cache templates", () => {
    const template1 = htmlComponents.getTemplate("comp1");
    const template2 = htmlComponents.getTemplate("comp1");

    assert.strictEqual(template1, template2, "Templates should be cached");
  });

  await t.test("Should reset cache when resetCache is called", () => {
    const template1 = htmlComponents.getTemplate("comp1");
    assert(Object.keys(htmlComponents.cache).length > 0, "Cache should not be empty");

    const result = htmlComponents.resetCache();

    assert.strictEqual(Object.keys(htmlComponents.cache).length, 0, "Cache should be empty after reset");
    assert.strictEqual(result, htmlComponents, "resetCache should return this");

    htmlComponents.getTemplate("comp1");
  });
});
