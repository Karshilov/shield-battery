// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * 
 * @param {string} title 
 */
function createNewPost(title) {
    const fileName = title.replace(/\s+/g, '_') + '.md';
    const currentDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const metaInfo = `---
title: ${title}
date: ${currentDate}
description: ''
tags:
-
---

`;

    const postsDir = path.join(__dirname, '..', 'posts');
    const filePath = path.join(postsDir, fileName);
    fs.writeFileSync(filePath, metaInfo);

    console.log(`New post created: ${filePath}`);
}

module.exports = { createNewPost };
