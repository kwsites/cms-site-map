
const moment = require('moment');
const _ = require('lodash');

module.exports = {

   /**
    * Use the includePieceTypes array to list the module name of any pieces that should be included
    * eg: ['my-pieces-module']
    */
   includePieceTypes: [],

   /**
    * File name used in the URL for the site map, also used as a key in the cache
    */
   siteMapFile: 'sitemap.xml',

   /**
    * Maximum number of pieces to display in the site map per piece type
    */
   maxPiecesPerType: 50,

   /**
    * Filter used when finding pages, can be overridden here to change the level to find
    * or add any other criteria necessary
    */
   siteMapPageFilter: {
      level: 0,
   },

   /**
    * Set an array of page types to be excluded from the main list of pages in the site map,
    * eg: ['my-secret-page']
    */
   excludePageTypes: ['apostrophe-search'],

   /**
    * Maximum depth to traverse finding child pages
    */
   childPageDepth: 3,

   afterConstruct (self) {
      self.enableCache();
      self.addRoutes();
      self.addTasks();
   },

   construct (self, options) {

      require('./lib/cache')(self, options);
      require('./lib/routes')(self, options);
      require('./lib/tasks')(self, options);

   }

};
