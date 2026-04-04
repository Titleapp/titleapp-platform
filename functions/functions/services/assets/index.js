"use strict";

module.exports = {
  get saveAsset() { return require("./assetService").saveAsset; },
  get associateAsset() { return require("./assetService").associateAsset; },
  get deleteAsset() { return require("./assetService").deleteAsset; },
  get listAssets() { return require("./assetService").listAssets; },
  get getAssociatedAssets() { return require("./assetService").getAssociatedAssets; },
};
