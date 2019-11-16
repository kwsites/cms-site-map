
module.exports = (self, options) => {

   self.enableCache = () => {
      self.cache = self.apos.caches.get(self.__meta.name);
   };

   self.setSiteMap = (data) => {
      return new Promise((done, fail) => {
         self.cache.set(options.siteMapFile, data, 0, (err) => {
            err ? fail(err) : done(data);
         });
      });
   };

   self.getSiteMap = () => {
      return new Promise((done, fail) => {
         self.cache.get(options.siteMapFile, (err, file) => {
            if (err) {
               fail(err);
            }

            file ? done(file) : fail(new Error(404));
         });
      });
   };

};
