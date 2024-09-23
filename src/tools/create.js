//@ts-check
const { createNewPost } = require('../utils/create');

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Please provide a title for the new post.');
    process.exit(1);
}

const title = args.join(' ');

createNewPost(title);