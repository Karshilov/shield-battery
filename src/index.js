//@ts-check
require('dotenv').config()

const fastify = require("fastify")();
const path = require('path');
const fs = require('fs');
const { read } = require('gray-matter');
const { globSync } = require('glob');
const { generateTableOfContent, markdownRender, formatPublishTime } = require("./utils");
const cors = require('@fastify/cors');

const basicInfo = {
  fullName: process.env.FULL_NAME,
  firstName: process.env.FIRST_NAME,
  prefix: process.env.CF_DOMAIN,
}

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
const postNames = globSync(path.resolve(process.cwd(), './src/posts/*.md').replace(/\\/g, '/')).map(v => v.replace(/\\/g, '/'));

/**
 * 
 * @param {string} p 
 * @returns {string}
 */
const encodedName = (p) => encodeURI(p.split('/posts/').reverse()[0].split('.md')[0] ?? '');

const posts = postNames.map((current) => {
  const file = read(path.resolve(process.cwd(), './src/posts/', current));
  return {
    title: file.data.title,
    date: file.data.date,
    formattedDate: formatPublishTime(file.data.date),
    tags: file.data.tags,
    description: file.data.description,
    banner: file.data.banner,
    slug: encodedName(current),
  }
}).sort((a, b) => a.date > b.date ? -1 : 1);


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
  
  return res.view('./src/layout/page.ejs', Object.assign(basicInfo, {
    posts,
    isMobile,
    activePage: 1,
    pageTitle: `${basicInfo.firstName}'s Blog`,
  }));
})

/**
 * pagination route
 */
fastify.get('/pages/:id', async (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  // @ts-ignore
  const { id } = req.params;

  if (Number.isInteger(Number(id)) && (Number(id) <= Math.ceil(posts.length / 7))) {
    return res.view('./src/layout/page.ejs', Object.assign(basicInfo, {
      posts,
      isMobile,
      activePage: Number(id),
      pageTitle: `Page ${id}`,
    }));
  } else {
    return res.view('./src/layout/404.ejs', Object.assign(basicInfo, {
      isMobile,
      pageTitle: '404 Not Found',
    }));
  }
})

/**
 * tag routes
 */
fastify.get('/tags/:tag', async (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  // @ts-ignore
  const { tag } = req.params;
  const filteredPosts = posts.filter(post => post.tags.some(cur => cur === tag));

  if (filteredPosts.length) {
    return res.view('./src/layout/page.ejs', Object.assign(basicInfo, {
      posts: filteredPosts,
      isMobile,
      activePage: 1,
      pageTitle: `Tag: ${tag}`,
    }));
  } else {
    return res.view('./src/layout/404.ejs', Object.assign(basicInfo, {
      isMobile,
      pageTitle: '404 Not Found',
    }));
  }
})

/**
 * about-page route
 */
fastify.get('/about', (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  try {
    const file = read(path.resolve(process.cwd(), './src/header-menu-contents/', 'about.md'));
    const toc = generateTableOfContent(file.content);
    const content = markdownRender(file.content);
    return res.view('./src/layout/about.ejs', Object.assign(basicInfo, {
      isMobile,
      toc,
      pageTitle: 'About',
      content,
      date: formatPublishTime(file.data.date),
    }));
  } catch (e) {
    return res.view('./src/layout/404.ejs', Object.assign(basicInfo, {
      isMobile,
      pageTitle: '404 Not Found',
    }));
  }
})

/** 
 * photography route
 */


/**
 * post-name routes
 */
fastify.get(`/posts/:postName`, (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  // @ts-ignore
  const { postName } = req.params;
  const current = path.resolve(process.cwd(), './src/posts/', `${decodeURI(postName)}.md`);
  if (fs.existsSync(path.resolve(process.cwd(), './src/posts/', current))) {
    const file = read(path.resolve(process.cwd(), './src/posts/', current));
    const toc = generateTableOfContent(file.content);
    const content = markdownRender(file.content);
    
    return res.view('./src/layout/post.ejs', Object.assign(basicInfo, {
      toc,
      content,
      pageTitle: file.data.title,
      tags: file.data.tags,
      date: formatPublishTime(file.data.date),
      banner: file.data.banner,
      isMobile,
    }));
  } else {
    return res.view('./src/layout/404.ejs', Object.assign(basicInfo, {
      isMobile,
      pageTitle: '404 Not Found',
    }));
  }
})

/**
 * TODO: archive routes
 */

/**
 * 404 routes
 */
fastify.get('/*', (req, res) => {
  const isMobile = checkMobile(req.headers["user-agent"]);
  return res.view('./src/layout/404.ejs', Object.assign(basicInfo, {
    isMobile,
    pageTitle: '404 Not Found',
  }));
})

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