import glob from 'glob';
import path from 'path';
import Router from '@koa/router';

function initRoutes(app, routeSrc) {
  const router = new Router();
  const files = glob.sync('**/!(*.test).js', {
    cwd: routeSrc
  });

  files.forEach((file) => {
    const routes = require(path.join(process.cwd(), ROUTE_SRC, file));
    const basename = path.basename(file);
    let route = path.join('/', path.dirname(file));
    if (basename !== 'index.js') {
      route = path.join(route, path.parse(file).name);
    }
    
    for (let method in routes) {
      let handler = routes[method]();
      if (!Array.isArray(handler)) handler = [handler];
      if (method === 'destroy') method = 'delete';
      console.log(`Mounting route ${method}:${route}`)
      router[method].apply(router, [route].concat(handler));
    }
  });

  app.use(router.routes());
}

export {
  initRoutes
}