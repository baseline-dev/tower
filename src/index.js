import glob from 'glob';
import path from 'path';
import Router from '@koa/router';
import debug from 'debug';
import assign from 'lodash.assign';
import fs from 'fs';

const log = debug('@baseline-dev:tower');

const illegalCharacters = /[\?<>\\:\*\|"]/g;
function sanitizePath(path) {
  return path.replace(illegalCharacters, '');
}

function initRoutes(app, routeSrc, defaultProps = {}) {
  function renderContext(file) {
    let clientJavaScript;
    try {
      const clientFile = path.join(routeSrc, path.dirname(file), `${path.parse(file).name}.client.js`);
      fs.statSync(clientFile);
      clientJavaScript = sanitizePath(path.relative(routeSrc, clientFile));
    } catch(e) {}
    return async (ctx, next) => {
      ctx._render = ctx.render;
      ctx.render = async function(template, props) {
        props = assign(defaultProps, {
          clientJavaScript
        }, props)
        await ctx._render(template, props);
      };
      await next();
    }
  }

  const router = new Router();
  const files = glob.sync('**/!(*.test|*.client).js', {
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
        router[method].apply(router, [route, renderContext(file)].concat(handler));
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