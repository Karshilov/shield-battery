//@ts-check
const fastify = require("fastify")();
const path = require('path');
const fs = require('fs');
const { read } = require('gray-matter');
const { globSync } = require('glob');
const { generateTableOfContent, markdownRender, formatPublishTime } = require("./utils");
const cors = require('@fastify/cors');

/**
 * register plugins
 */

fastify.register(require("@fastify/url-data"));
fastify.register(require("@fastify/view"), {
  engine: {
    ejs: require("ejs"),
  },
});
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'assets'),
  prefix: '/assets/', // optional: default '/'
})

/**
 * posts
 */
const postNames = globSync(path.resolve(process.cwd(), './src/posts/*.md'));

/**
 * 
 * @param {string} p 
 * @returns {string}
 */
const encodedName = (p) => encodeURI(p.split('/posts').reverse()[0].split('.md')[0] ?? '');


/**
 * @param {string} ua
 */
function checkMobile(ua = '') {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * main-page route
 */

fastify.get('/', async (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  const posts = postNames.map((current) => {
    const file = read(path.resolve(process.cwd(), './src/posts/', current));
    return {
      title: file.data.title,
      date: file.data.date,
      tags: file.data.tags,
      description: file.data.description,
      slug: encodedName(current),
    }
  });
  return res.view('./src/layout/main-page.ejs', {
    posts,
    isMobile,
  });
})

/**
 * about-page route
 */

/** 
 * photography route
 */


/**
 * post-name routes
 */

postNames.forEach((current) => {
  fastify.get(`/posts${encodedName(current)}`, (req, res) => {
    const isMobile = checkMobile(req.headers["user-agent"]);
    if (fs.existsSync(path.resolve(process.cwd(), './src/posts/', current))) {

      const file = read(path.resolve(process.cwd(), './src/posts/', current));
      const toc = generateTableOfContent(file.content);
      const content = markdownRender(file.content);
      
      return res.view('./src/layout/post.ejs', {
        toc,
        content,
        pageTitle: file.data.title,
        tags: file.data.tags,
        date: formatPublishTime(file.data.date),
        isMobile,
      });
    }
  })
})

/**
 * archive routes
 */


/**
 * start!
 */

async function start() {
  await fastify.register(cors, {
    origin: true,
  });
  fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    console.log(`Server is now listening on ${address}`);
  })
}

start();