
module.exports = (self, options) => {

   self.routes = {

      async siteMap (req, res) {
         try {
            res.contentType('text/xml').send(await self.getSiteMap());
         }

         catch (err) {
            if (err.message === '404') {
               return res.status(404).send('Not Found');
            }

            res.status(500).send('Error');
         }
      }

   };

   self.addRoutes = () => {

      self.apos.app.get(`/${ options.siteMapFile }`, self.routes.siteMap);

   };

};
