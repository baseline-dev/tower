import glob from 'glob';
import path from 'path';
import Router from '@koa/router';
import debug from 'debug';

const log = debug('@baseline-dev:tower');

function initRoutes(app, routeSrc, defaultProps = {}) {
  function renderContext() {
    return async (ctx, next) => {
      ctx._render = ctx.render;
      ctx.render = async function(template, props) {
        await ctx._render(template, _.assign(defaultProps, props));
      };
      await next();
    }
  }

  const router = new Router();
  const files = glob.sync('**/!(*.test).js', {
    cwd: routeSrc
  });

  files.forEach((file) => {
    const routes = require(path.join(process.cwd(), routeSrc, file));
    const basename = path.basename(file);
    let route = path.join('/', path.dirname(file));
    if (basename !== 'index.js') {
      route = path.join(route, path.parse(file).name);
    }
    
    for (let method in routes) {
      try {
        let handler = routes[method]();
        if (!Array.isArray(handler)) handler = [handler];
        if (method === 'destroy') method = 'delete';
        log(`Mounting route ${method}:${route}`)
        router[method].apply(router, [route, renderContext()].concat(handler));
      } catch(e) {
        throw new Error(`Could not mount route: ${method} ${route}. Please review the following file: ${file}`);
      }
    }
  });

  app.use(router.routes());
}

export {
  initRoutes
}