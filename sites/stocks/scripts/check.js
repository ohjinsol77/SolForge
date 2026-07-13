const { checkContentSite } = require("../../shared/build-content-site");
const { pages } = require("./content");
const { build, root } = require("./build");

checkContentSite({ root, pages, siteUrl: "https://stocks.solforge.cloud", build });
