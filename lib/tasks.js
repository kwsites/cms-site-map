const moment = require('moment');
const _ = require('lodash');

module.exports = (self, options) => {

   function getPieces (req, pieceModule) {
      return new Promise((done, fail) => pieceModule.find(req)
         .limit(options.maxPiecesPerType)
         .published(true)
         .joins(false)
         .areas(false)
         .toArray((err, docs) => {

            if (err) {
               return fail(new Error(err));
            }

            done(docs);
         }));
   }

   /**
    * Given the set of pages, determines which are pages that contain pieces (ie: they're extensions of
    * apostrophe-pieces-page) and fetches the most recently published pieces of that page.
    */
   async function addPieces (req, pages) {
      for (let piecesModules = self.generatePiecesModules(), i = 0; i < piecesModules.length; i++) {
         const pieceModule = piecesModules[i];
         const pieceModuleName = pieceModule.__meta.name;

         const containerPage = pages.find(_.matchesProperty('type', `${ pieceModuleName }-page`));
         const piecePageDepth = containerPage && containerPage.depth + 1 || 0;

         (containerPage && containerPage.children || pages).push(
            ...(await getPieces(req, pieceModule)).map(piece => pageBuilder(piece, piecePageDepth))
         );
      }

      return pages;
   }

   self.getPageCriteria = (overrides = {}) => {
      const pageCriteria = {
         published: true,
      };

      if (options.excludePageTypes.length) {
         pageCriteria.type = {
            $nin: options.excludePageTypes
         };
      }

      return _.assign(pageCriteria, overrides);
   };

   function getPages (req) {
      return new Promise((done, fail) => {

         self.apos.pages.find(req, self.getPageCriteria(options.siteMapPageFilter || {level: 0}))
            .children(self.getPageCriteria({depth: options.childPageDepth}))
            .toArray((err, docs) => {

               if (err) {
                  return fail(new Error(err));
               }

               done(docs.map(doc => pageBuilder(doc, 0)));
            })
      });
   }

   /**
    * Creates a new array of page objects based on the input pages array, with all child pages merged into the
    * top level array immediately after their parent page.
    * @param pages
    */
   function flattenChildPages (pages) {
      const reducer = (all, page) => {
         all.push(page, ...page.children.splice(0).reduce(reducer, []));
         return all;
      };

      return pages.reduce(reducer, []).filter(page => !!page.loc);
   }

   self.tasks = {

      async generate (apos, argv, callback) {
         try {
            const req = self.apos.tasks.getAnonReq();

            const pages = flattenChildPages(await getPages(req));
            const pieces = flattenChildPages(await addPieces(req, pages));

            await self.setSiteMap(toSiteMapXml(pieces));

            callback();
         }
         catch (err) {
            callback(err);
         }
      }

   };

   self.addTasks = () => {
      self.apos.tasks.add(self.__meta.name, 'generate', 'Generate a site map', self.tasks.generate);
   };

   self.generatePiecesModules = () => {
      if (!Array.isArray(options.includePieceTypes)) {
         return [];
      }

      return options.includePieceTypes.map(name => {
         const pieceModule = self.apos.modules[name];

         if (!pieceModule.__meta.chain.find(def => def.name === 'apostrophe-pieces')) {
            throw new Error(`[${ self.__meta.name }:generate] piecesModules option '${name}' does not extend apostrophe-pieces`);
         }

         return pieceModule;
      });

   };

};

function pageBuilder (doc, depth) {
   return {
      children: (doc._children || []).map(child => pageBuilder(child, depth + 1)),
      depth: depth,
      type: doc.type,
      lastMod: moment(doc.updatedAt),
      loc: doc._url,
   };
}

function toSiteMapXml (pages) {
   const depthMultiplier = 0.5 / (pages.reduce((depth, page) => Math.max(depth, page.depth), 0) || 1);
   const urls = pages.map(page => `
   <url>
        <loc>${page.loc}</loc>
        <lastmod>${page.lastMod.format('YYYY-MM-DDTHH:mm:ssZ')}</lastmod>
        <priority>${ (1 - depthMultiplier * page.depth).toPrecision(1) }</priority>
    </url>`);

   return `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ urls.join('') }
</urlset>
`;
}
